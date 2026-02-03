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
import { useColorScheme } from "nativewind";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { G, Path } from "react-native-svg";

type Slice = {
  label: string;
  value: number;
  color: string;
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
  const { colorScheme } = useColorScheme();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [monthSlices, setMonthSlices] = useState<Slice[]>([]);
  const [monthTotalBase, setMonthTotalBase] = useState(0);
  const [recentTx, setRecentTx] = useState<FinanceTransaction[]>([]);

  const formatMoney = useCallback((value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }, []);

  const salaryAmount = useMemo(() => {
    return formatMoney(summary?.balance ?? 0);
  }, [formatMoney, summary?.balance]);

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
      setRecentTx(sortedRecent.slice(0, 7));

      const byCategory = new Map<string, number>();
      let totalSpent = 0;
      for (const t of monthTx) {
        if (t.type === "expense") {
          totalSpent += t.amount;
          const { category } = splitNote(t.note);
          byCategory.set(category, (byCategory.get(category) || 0) + t.amount);
        }
      }

      setMonthTotalBase(totalSpent);

      if (totalSpent <= 0 || byCategory.size === 0) {
        setMonthSlices([]);
        return;
      }

      const palette = [
        "#4F46E5", // indigo-600
        "#EC4899", // pink-500
        "#10B981", // emerald-500
        "#F59E0B", // amber-500
        "#8B5CF6", // violet-500
        "#EF4444", // red-500
        "#3B82F6", // blue-500
        "#14B8A6", // teal-500
        "#F97316", // orange-500
        "#06B6D4", // cyan-500
      ];

      const sorted = [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const topTotal = sorted.reduce((acc, [, v]) => acc + v, 0);
      const otherTotal = Math.max(0, totalSpent - topTotal);

      const slices: Slice[] = sorted.map(([label, value], index) => ({
        label,
        value,
        color: palette[index % palette.length],
      }));

      if (otherTotal > 0.01) {
        slices.push({
          label: "Other",
          value: otherTotal,
          color: "#94A3B8", // slate-400
        });
      }

      setMonthSlices(slices);
    } finally {
      hideLoader();
    }
  }, [hideLoader, showLoader, user]);

  const donut = useMemo(() => {
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = 85;
    const rInner = 65;

    if (monthSlices.length === 0) {
      return {
        size,
        cx,
        cy,
        paths: [
          {
            d: makeDonutPath(cx, cy, rOuter, rInner, 0, 2 * Math.PI - 0.0001),
            color: "#E2E8F0", // slate-200
          },
        ],
      };
    }

    const total = monthSlices.reduce((acc, s) => acc + s.value, 0);
    let angle = -Math.PI / 2;
    const paths: Array<{ d: string; color: string }> = [];
    const gap = monthSlices.length > 1 ? 0.05 : 0;

    for (const s of monthSlices) {
      const frac = total > 0 ? s.value / total : 0;
      const sweep = 2 * Math.PI * frac;

      if (monthSlices.length === 1) {
        paths.push({
          d: makeDonutPath(
            cx,
            cy,
            rOuter,
            rInner,
            -Math.PI / 2,
            1.5 * Math.PI - 0.0001,
          ),
          color: s.color,
        });
        break;
      }

      const start = angle;
      const end = angle + sweep - gap;
      if (end > start) {
        paths.push({
          d: makeDonutPath(cx, cy, rOuter, rInner, start, end),
          color: s.color,
        });
      }
      angle += sweep;
    }

    return { size, cx, cy, paths };
  }, [monthSlices]);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary]),
  );

  return (
    <View className="flex-1 bg-app-bg dark:bg-black">
      {/* Header */}
      <View className="bg-white dark:bg-black pb-6 rounded-b-[2.5rem] border-b border-app-border dark:border-white/15">
        <View
          style={{ paddingTop: insets.top + 12 }}
          className="px-6 flex-row justify-between items-center mb-6"
        >
          <View>
            <Text className="text-app-textMuted dark:text-white/70 text-sm font-medium tracking-wide">
              Total Balance
            </Text>
            <Text className="text-4xl font-extrabold text-app-text dark:text-white mt-1 tracking-tight">
              {salaryAmount}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(dashboard)/profile")}
            className="w-12 h-12 rounded-full border border-app-border dark:border-white/15 items-center justify-center bg-app-surface2 dark:bg-white/10"
          >
            <Text className="text-app-primary dark:text-white font-bold text-lg">
              {user?.displayName?.[0]?.toUpperCase() || "U"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Donut + Legend */}
        <View className="px-6">
          <View className="flex-row items-center justify-between">
            <View className="relative items-center justify-center">
              <Svg width={donut.size} height={donut.size}>
                <G>
                  {donut.paths.map((p, i) => (
                    <Path key={i} d={p.d} fill={p.color} />
                  ))}
                </G>
              </Svg>
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-xs text-app-textMuted dark:text-white/70 font-medium uppercase tracking-wider">
                  Spent
                </Text>
                <Text className="text-xl font-bold text-app-text dark:text-white mt-0.5">
                  {formatMoney(monthTotalBase)}
                </Text>
              </View>
            </View>

            <View className="flex-1 ml-6 justify-center">
              {(monthSlices.length === 0
                ? [{ label: "No expenses", value: 0, color: "#E2E8F0" }]
                : monthSlices
              ).map((slice, i) => (
                <View
                  key={`${slice.label}-${i}`}
                  className="flex-row items-center justify-between mb-2"
                >
                  <View className="flex-row items-center flex-1 pr-2">
                    <View
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: slice.color }}
                    />
                    <Text
                      numberOfLines={1}
                      className="text-app-textSecondary dark:text-white/80 text-sm font-medium"
                    >
                      {slice.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Recent */}
      <View className="flex-1 mt-6 px-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-app-text dark:text-white">
            Recent Transactions
          </Text>
          <TouchableOpacity onPress={() => router.push("/(dashboard)/tasks")}>
            <Text className="text-app-primary dark:text-white font-semibold text-sm">
              View All
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        >
          {recentTx.length === 0 ? (
            <View className="items-center justify-center py-10 opacity-60">
              <MaterialIcons
                name="receipt-long"
                size={48}
                color={colorScheme === "dark" ? "#FFFFFF" : "#111827"}
              />
              <Text className="text-app-textMuted dark:text-white/70 mt-3 font-medium">
                No recent activity
              </Text>
            </View>
          ) : (
            <View>
              {recentTx.map((tx) => {
                const { category, detail } = splitNote(tx.note);
                const isIncome = tx.type === "income";

                return (
                  <View
                    key={tx.id}
                    className="flex-row items-center bg-white dark:bg-black p-4 rounded-2xl mb-3 border border-app-border dark:border-white/15"
                  >
                    <View className="w-12 h-12 rounded-full items-center justify-center bg-app-surface2 dark:bg-white/10 border border-app-border dark:border-white/15">
                      <MaterialIcons
                        name={isIncome ? "arrow-downward" : "arrow-upward"}
                        size={24}
                        color={colorScheme === "dark" ? "#FFFFFF" : "#111827"}
                      />
                    </View>

                    <View className="flex-1 ml-4">
                      <Text className="text-app-text dark:text-white font-bold text-base">
                        {category}
                      </Text>
                      <Text className="text-app-textMuted dark:text-white/70 text-xs mt-0.5">
                        {formatShortDate(tx.createdAt)}
                        {detail ? ` • ${detail}` : ""}
                      </Text>
                    </View>

                    <Text className="font-bold text-base text-app-text dark:text-white">
                      {isIncome ? "+" : "-"}
                      {formatMoney(Math.abs(tx.amount))}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.push("/transaction")}
            className="mt-2 bg-app-primary dark:bg-white rounded-2xl py-4 items-center justify-center"
          >
            <Text className="text-white dark:text-black font-semibold text-base">
              Add Record
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
};

export default Home;
