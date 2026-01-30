import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import {
  getFinanceSummary,
  listFinanceTransactions,
} from "@/services/financeService";
import type { FinanceSummary, FinanceTransaction } from "@/types/finance";
import { MaterialIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G, Path } from "react-native-svg";

type Slice = {
  label: string;
  value: number;
  color: string;
};

const sanitizeCategory = (value: string | undefined) => {
  const v = String(value || "").trim();
  if (!v) return "Other";
  const pipe = v.indexOf("|");
  if (pipe >= 0) {
    const left = v.slice(0, pipe).trim();
    return left ? left : "Other";
  }
  return v;
};

const splitNote = (value: string | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return { category: "Other", detail: "" };
  const pipe = raw.indexOf("|");
  if (pipe < 0) return { category: raw, detail: "" };
  return {
    category: raw.slice(0, pipe).trim() || "Other",
    detail: raw.slice(pipe + 1).trim(),
  };
};

const makeDonutPath = (
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
) => {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const x1 = cx + rOuter * Math.cos(startAngle);
  const y1 = cy + rOuter * Math.sin(startAngle);
  const x2 = cx + rOuter * Math.cos(endAngle);
  const y2 = cy + rOuter * Math.sin(endAngle);

  const x3 = cx + rInner * Math.cos(endAngle);
  const y3 = cy + rInner * Math.sin(endAngle);
  const x4 = cx + rInner * Math.cos(startAngle);
  const y4 = cy + rInner * Math.sin(startAngle);

  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
};

const Home = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { showLoader, hideLoader } = useLoader();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [monthSlices, setMonthSlices] = useState<Slice[]>([]);
  const [monthTotalBase, setMonthTotalBase] = useState(0);
  const [recentTx, setRecentTx] = useState<FinanceTransaction[]>([]);

  const salaryLabel = "Balance";

  const formatMoney = useCallback((value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const salaryAmount = useMemo(() => {
    return formatMoney(summary?.balance ?? 0);
  }, [formatMoney, summary?.balance]);

  const monthSpentText = useMemo(() => {
    const spent = monthSlices
      .filter((s) => s.label !== "Remaining")
      .reduce((acc, s) => acc + s.value, 0);
    return formatMoney(spent);
  }, [formatMoney, monthSlices]);

  const formatShortDate = useCallback((value: string | Date) => {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    showLoader();
    try {
      const [s, tx] = await Promise.all([
        getFinanceSummary(),
        listFinanceTransactions(400),
      ]);
      setSummary(s);

      const now = new Date();
      const since = new Date(now);
      since.setDate(since.getDate() - 30);

      const monthTx: FinanceTransaction[] = tx.filter((t) => {
        const d = new Date(t.createdAt);
        return !Number.isNaN(d.getTime()) && d >= since;
      });

      const sortedRecent = [...monthTx].sort((a, b) => {
        const ad = new Date(a.createdAt).getTime();
        const bd = new Date(b.createdAt).getTime();
        return (Number.isNaN(bd) ? 0 : bd) - (Number.isNaN(ad) ? 0 : ad);
      });
      setRecentTx(sortedRecent);

      let income = 0;
      let expense = 0;
      const byCategory = new Map<string, number>();
      for (const t of monthTx) {
        if (t.type === "income") {
          income += t.amount;
        } else {
          expense += t.amount;
          const cat = sanitizeCategory(t.note);
          byCategory.set(cat, (byCategory.get(cat) || 0) + t.amount);
        }
      }

      // Base for the pie: if there is income this month, show how it's allocated (expenses + remaining).
      // Otherwise, show expense distribution only.
      const base = income > 0 ? income : expense;
      setMonthTotalBase(base);

      if (base <= 0 || byCategory.size === 0) {
        setMonthSlices([]);
        return;
      }

      // Colorful palette (Tailwind-like) for category slices.
      // Kept as a fixed list so category->color is stable via hashing.
      const palette = [
        "#2563EB", // blue-600
        "#0EA5E9", // sky-500
        "#14B8A6", // teal-500
        "#22C55E", // green-500
        "#F59E0B", // amber-500
        "#F97316", // orange-500
        "#EF4444", // red-500
        "#8B5CF6", // violet-500
        "#EC4899", // pink-500
        "#10B981", // emerald-500
        "#06B6D4", // cyan-500
        "#A855F7", // purple-500
      ];

      const pickColor = (label: string) => {
        let hash = 0;
        for (let i = 0; i < label.length; i++) {
          hash = (hash * 31 + label.charCodeAt(i)) | 0;
        }
        const idx = Math.abs(hash) % palette.length;
        return palette[idx];
      };

      const sorted = [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

      const slices: Slice[] = sorted.map(([label, value]) => ({
        label,
        value,
        color: pickColor(label),
      }));

      if (income > 0) {
        const remaining = Math.max(income - expense, 0);
        if (remaining > 0) {
          slices.push({
            label: "Remaining",
            value: remaining,
            color: "#D1D5DB",
          });
        }
      }

      setMonthSlices(slices);
    } finally {
      hideLoader();
    }
  }, [hideLoader, showLoader, user]);

  const donut = useMemo(() => {
    const size = 180;
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = 80;
    const rInner = 52;
    const total = monthTotalBase > 0 ? monthTotalBase : 0;
    if (!total || monthSlices.length === 0) {
      const segments = 3;
      const gap = 0.22;
      const sweep = (2 * Math.PI) / segments - gap;
      const paths: Array<{ d: string; color: string }> = [];
      for (let i = 0; i < segments; i++) {
        const start = -Math.PI / 2 + i * ((2 * Math.PI) / segments) + gap / 2;
        const end = start + sweep;
        paths.push({
          d: makeDonutPath(cx, cy, rOuter, rInner, start, end),
          color: "#F3F4F6",
        });
      }
      return { size, cx, cy, rOuter, rInner, paths };
    }

    let angle = -Math.PI / 2;
    const paths: Array<{ d: string; color: string }> = [];

    const gap = monthSlices.length > 1 ? 0.04 : 0;

    for (const s of monthSlices) {
      const frac = s.value / total;
      const sweep = Math.max(0, Math.min(2 * Math.PI, frac * 2 * Math.PI));
      const start = angle + gap / 2;
      const end = angle + sweep - gap / 2;
      if (end - start > 0.0001) {
        paths.push({
          d: makeDonutPath(cx, cy, rOuter, rInner, start, end),
          color: s.color,
        });
      }
      angle = angle + sweep;
    }

    return { size, cx, cy, rOuter, rInner, paths };
  }, [monthSlices, monthTotalBase]);

  const sliceLegend = useMemo(() => {
    const total = monthTotalBase > 0 ? monthTotalBase : 0;
    if (!total || monthSlices.length === 0) return [];
    return monthSlices
      .filter((s) => s.value > 0)
      .map((s) => ({
        ...s,
        percent: (s.value / total) * 100,
      }));
  }, [monthSlices, monthTotalBase]);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary]),
  );

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: tabBarHeight + 24,
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="pr-3">
            <Text className="text-2xl font-semibold text-gray-900">Home</Text>
            <Text className="text-xs text-gray-500 mt-1">
              Track your balance and spending
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            className="w-11 h-11 rounded-2xl bg-white items-center justify-center border border-gray-200"
            onPress={() => {}}
          >
            <MaterialIcons
              name="notifications-none"
              size={24}
              color="#111827"
            />
          </TouchableOpacity>
        </View>

        <View className="mt-5 bg-emerald-800 rounded-3xl overflow-hidden">
          <View className="px-5 pt-5 flex-row  items-center justify-between">
            <Text className="text-white/90 font-semibold  ">{salaryLabel}</Text>
          </View>

          <View className="px-5 pt-6 flex-row items-center justify-between">
            <Text className="text-white text-4xl font-semibold pb-5">
              {salaryAmount}
            </Text>
          </View>
        </View>

        <View className="mt-4 bg-white rounded-3xl border border-gray-200 overflow-hidden">
          <View className="px-5 pt-5 flex-row items-start justify-between">
            <View>
              <Text className="text-lg font-semibold text-gray-900">
                Expenses structure
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              className="w-10 h-10 rounded-2xl items-center justify-center"
              onPress={() => {}}
            >
              <MaterialIcons name="more-vert" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View className="px-5 pt-2">
            <Text className="text-xs text-gray-500 tracking-widest">
              LAST 30 DAYS
            </Text>
            <Text className="text-gray-900 text-3xl font-semibold mt-1">
              {monthSpentText}
            </Text>
          </View>

          <View className="mt-4 items-center px-5 pb-2">
            <Svg width={donut.size} height={donut.size}>
              <G>
                {donut.paths.map((p, idx) => (
                  <Path key={idx} d={p.d} fill={p.color} />
                ))}
                <Circle
                  cx={donut.cx}
                  cy={donut.cy}
                  r={donut.rInner - 8}
                  fill="#ffffff"
                />
              </G>
            </Svg>
          </View>

          {sliceLegend.length > 0 ? (
            <View className="px-5 pb-4">
              {sliceLegend.map((s, idx) => (
                <View
                  key={s.label}
                  className={
                    idx === 0
                      ? "flex-row items-center justify-between py-2"
                      : "flex-row items-center justify-between py-2 border-t border-gray-100"
                  }
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <Text className="text-gray-700 ml-2" numberOfLines={1}>
                      {s.label}
                    </Text>
                  </View>
                  <Text className="text-gray-900 font-medium">
                    {Math.round(s.percent)}%
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View className="mt-2 border-t border-gray-100 px-5 py-4">
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push("/(dashboard)/profile")}
            >
              <Text className="text-blue-600 font-medium">Add Record</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-4 bg-white rounded-3xl border border-gray-200 overflow-hidden">
          <View className="px-5 pt-5 flex-row items-start justify-between">
            <View>
              <Text className="text-lg font-semibold text-gray-900">
                Last records overview
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              className="w-10 h-10 rounded-2xl items-center justify-center"
              onPress={() => {}}
            >
              <MaterialIcons name="more-vert" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View className="px-5 pt-2 pb-2">
            <Text className="text-xs text-gray-500 tracking-widest">
              LAST 30 DAYS
            </Text>
          </View>

          <View className="px-5">
            {recentTx.length === 0 ? (
              <View>
                {[0, 1].map((i) => (
                  <View
                    key={i}
                    className={
                      i === 0
                        ? "flex-row items-center py-4"
                        : "flex-row items-center py-4 border-t border-gray-100"
                    }
                  >
                    <View className="w-12 h-12 rounded-full bg-gray-200" />
                    <View className="flex-1 ml-4">
                      <View className="h-4 bg-gray-200 rounded w-2/3" />
                      <View className="h-3 bg-gray-200 rounded w-1/3 mt-2" />
                    </View>
                    <View className="h-4 bg-gray-200 rounded w-20" />
                  </View>
                ))}
              </View>
            ) : (
              <View>
                {recentTx.slice(0, 5).map((t, idx) => {
                  const parsed = splitNote(t.note);

                  const title =
                    t.type === "income"
                      ? parsed.category === "Other" &&
                        !String(t.note || "").trim()
                        ? "Salary"
                        : parsed.category
                      : parsed.category;

                  const subtitle = parsed.detail
                    ? parsed.detail
                    : formatShortDate(t.createdAt);

                  const amountText = `${t.type === "income" ? "+" : "-"}${formatMoney(Math.abs(t.amount))}`;

                  const row = (
                    <View
                      className={
                        idx === 0
                          ? "flex-row items-center justify-between py-4"
                          : "flex-row items-center justify-between py-4 border-t border-gray-100"
                      }
                    >
                      <View className="flex-row items-center flex-1 pr-3">
                        <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center">
                          <MaterialIcons
                            name={t.type === "income" ? "south" : "north"}
                            size={22}
                            color="#6B7280"
                          />
                        </View>
                        <View className="ml-4 flex-1">
                          <Text
                            className="text-gray-900 font-medium"
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          <Text
                            className="text-xs text-gray-500 mt-1"
                            numberOfLines={1}
                          >
                            {subtitle}
                          </Text>
                        </View>
                      </View>

                      <Text className="text-gray-900 font-semibold">
                        {amountText}
                      </Text>
                    </View>
                  );

                  return <View key={t.id}>{row}</View>;
                })}
              </View>
            )}
          </View>

          <View className="mt-2 border-t border-gray-100 px-5 py-4">
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push("/(dashboard)/profile")}
            >
              <Text className="text-blue-600 font-medium">Add Record</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Home;
