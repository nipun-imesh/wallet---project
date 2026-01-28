import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import { getFinanceSummary } from "@/services/financeService";
import type { FinanceSummary } from "@/types/finance";
import { MaterialIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Home = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { showLoader, hideLoader } = useLoader();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "User";
  const photoUrl = user?.photoURL || "";
  const initial = String(displayName).trim().charAt(0).toUpperCase() || "U";

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

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    showLoader();
    try {
      const s = await getFinanceSummary();
      setSummary(s);
    } finally {
      hideLoader();
    }
  }, [hideLoader, showLoader, user]);

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
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                className="w-12 h-12 rounded-full bg-gray-200"
              />
            ) : (
              <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center">
                <Text className="text-gray-700 font-bold">{initial}</Text>
              </View>
            )}

            <View className="ml-3">
              <Text className="text-xs text-gray-500">Good morning,</Text>
              <Text className="text-lg font-semibold text-gray-900">
                {displayName}
              </Text>
            </View>
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
      </ScrollView>
    </View>
  );
};

export default Home;
