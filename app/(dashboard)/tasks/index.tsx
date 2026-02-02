import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import { listFinanceTransactions } from "@/services/financeService";
import type { FinanceTransaction } from "@/types/finance";
import { MaterialIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tasks = () => {
  const { showLoader, hideLoader, isLoading } = useLoader();
  const { user } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);

  const formatMoney = useCallback((value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    showLoader();
    try {
      const tx = await listFinanceTransactions(400);
      setTransactions(tx);
    } catch (e: any) {
      Alert.alert("Tasks", e?.message || "Failed to load data");
    } finally {
      hideLoader();
    }
  }, [hideLoader, showLoader, user?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const monthModel = useMemo(() => {
    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let thisIncome = 0;
    let thisExpense = 0;
    let lastIncome = 0;
    let lastExpense = 0;

    for (const t of transactions) {
      const d = new Date(String(t.createdAt || ""));
      if (Number.isNaN(d.getTime())) continue;

      const isThis = d >= startThisMonth && d < startNextMonth;
      const isLast = d >= startLastMonth && d < startThisMonth;
      if (!isThis && !isLast) continue;

      const amt = Number(t.amount || 0);
      if (!Number.isFinite(amt) || amt <= 0) continue;

      if (isThis) {
        if (t.type === "income") thisIncome += amt;
        else thisExpense += amt;
      } else if (isLast) {
        if (t.type === "income") lastIncome += amt;
        else lastExpense += amt;
      }
    }

    const thisBal = thisIncome - thisExpense;
    const lastBal = lastIncome - lastExpense;

    const maxExpense = Math.max(thisExpense, lastExpense, 1);
    const thisExpenseRatio = thisExpense / maxExpense;
    const lastExpenseRatio = lastExpense / maxExpense;

    const thisLabel = startThisMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const lastLabel = startLastMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    return {
      this: {
        label: thisLabel,
        income: thisIncome,
        expense: thisExpense,
        balance: thisBal,
        ratio: thisExpenseRatio,
      },
      last: {
        label: lastLabel,
        income: lastIncome,
        expense: lastExpense,
        balance: lastBal,
        ratio: lastExpenseRatio,
      },
    };
  }, [transactions]);

  return (
    <View
      className="flex-1 bg-app-bg dark:bg-appDark-bg"
      style={{ paddingTop: insets.top }}
    >
      <View className="bg-app-surface dark:bg-appDark-surface px-6 py-4 flex-row items-center justify-between border-b border-app-border dark:border-appDark-border">
        <View>
          <Text className="text-xs text-app-textMuted dark:text-appDark-textMuted">
            Compare
          </Text>
          <Text className="text-xl font-semibold text-app-text dark:text-appDark-text">
            This month vs last month
          </Text>
        </View>
        <MaterialIcons
          name="bar-chart"
          size={22}
          color={colorScheme === "dark" ? "#FFFFFF" : "#111827"}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingBottom: tabBarHeight + 24,
        }}
      >
        <View className="bg-app-surface dark:bg-appDark-surface rounded-3xl border border-app-border dark:border-appDark-border p-5">
          <Text className="text-lg font-semibold text-app-text dark:text-appDark-text">
            Bar chart
          </Text>
          <Text className="text-xs text-app-textMuted dark:text-appDark-textMuted mt-1">
            Expenses comparison (last month vs this month)
          </Text>

          <View className="mt-5">
            <View className="mb-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-app-text dark:text-appDark-text">
                  {monthModel.last.label}
                </Text>
                <Text className="text-sm font-semibold text-app-text dark:text-appDark-text">
                  {formatMoney(monthModel.last.expense)}
                </Text>
              </View>
              <View className="mt-2 h-3 rounded-full bg-app-surface2 dark:bg-appDark-surface2 overflow-hidden">
                <View
                  className="h-3 bg-app-danger dark:bg-appDark-danger"
                  style={{ width: `${monthModel.last.ratio * 100}%` }}
                />
              </View>
              <Text className="text-xs text-app-textMuted dark:text-appDark-textMuted mt-2">
                Income {formatMoney(monthModel.last.income)} • Remaining{" "}
                {formatMoney(monthModel.last.balance)}
              </Text>
            </View>

            <View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-app-text dark:text-appDark-text">
                  {monthModel.this.label}
                </Text>
                <Text className="text-sm font-semibold text-app-text dark:text-appDark-text">
                  {formatMoney(monthModel.this.expense)}
                </Text>
              </View>
              <View className="mt-2 h-3 rounded-full bg-app-surface2 dark:bg-appDark-surface2 overflow-hidden">
                <View
                  className="h-3 bg-app-danger dark:bg-appDark-danger"
                  style={{ width: `${monthModel.this.ratio * 100}%` }}
                />
              </View>
              <Text className="text-xs text-app-textMuted dark:text-appDark-textMuted mt-2">
                Income {formatMoney(monthModel.this.income)} • Remaining{" "}
                {formatMoney(monthModel.this.balance)}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-4 bg-app-surface dark:bg-appDark-surface rounded-3xl border border-app-border dark:border-appDark-border p-5">
          <Text className="text-lg font-semibold text-app-text dark:text-appDark-text">
            Summary
          </Text>

          <View className="mt-4 flex-row">
            <View className="flex-1 bg-app-surface2 dark:bg-appDark-surface2 border border-app-border dark:border-appDark-border rounded-2xl p-4">
              <Text className="text-xs text-app-textMuted dark:text-appDark-textMuted">
                Last month
              </Text>
              <Text className="text-sm font-semibold text-app-text dark:text-appDark-text mt-1">
                {formatMoney(monthModel.last.balance)}
              </Text>
              <Text className="text-xs text-app-textMuted dark:text-appDark-textMuted mt-2">
                Expense {formatMoney(monthModel.last.expense)}
              </Text>
            </View>
            <View className="w-3" />
            <View className="flex-1 bg-app-surface2 dark:bg-appDark-surface2 border border-app-border dark:border-appDark-border rounded-2xl p-4">
              <Text className="text-xs text-app-textMuted dark:text-appDark-textMuted">
                This month
              </Text>
              <Text className="text-sm font-semibold text-app-text dark:text-appDark-text mt-1">
                {formatMoney(monthModel.this.balance)}
              </Text>
              <Text className="text-xs text-app-textMuted dark:text-appDark-textMuted mt-2">
                Expense {formatMoney(monthModel.this.expense)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Tasks;
