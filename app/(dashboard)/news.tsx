import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import {
    addFinanceTransaction,
    getFinanceSummary,
} from "@/services/financeService";
import type { FinanceSummary } from "@/types/finance";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const News = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoader();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [txAmount, setTxAmount] = useState("");
  const [txNote, setTxNote] = useState("");

  const refreshSummary = useCallback(async () => {
    if (!user) return;
    try {
      const s = await getFinanceSummary();
      setSummary(s);
    } catch {
      // ignore
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      refreshSummary();
    }, [refreshSummary]),
  );

  const handleAddTransaction = useCallback(async () => {
    if (isLoading) return;
    const amount = Number(txAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Transaction", "Enter a valid amount");
      return;
    }

    showLoader();
    try {
      await addFinanceTransaction({
        type: "expense",
        amount,
        note: txNote,
        cardId: summary?.defaultCard?.id,
      });
      setTxAmount("");
      setTxNote("");
      await refreshSummary();
      Alert.alert("Transaction", "Saved");
    } catch (e: any) {
      Alert.alert("Transaction", e?.message || "Failed to save");
    } finally {
      hideLoader();
    }
  }, [
    hideLoader,
    isLoading,
    refreshSummary,
    showLoader,
    summary?.defaultCard?.id,
    txAmount,
    txNote,
  ]);

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: tabBarHeight + 32,
        }}
      >
        <View className="bg-white rounded-3xl border border-gray-200 p-5">
          <Text className="text-lg font-semibold text-gray-900">
            Add expense
          </Text>

          <Text className="text-xs text-gray-500 mt-3">Amount</Text>
          <TextInput
            value={txAmount}
            onChangeText={setTxAmount}
            keyboardType="decimal-pad"
            className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
            placeholder="1000"
            placeholderTextColor="#9CA3AF"
          />

          <Text className="text-xs text-gray-500 mt-3">Note (optional)</Text>
          <TextInput
            value={txNote}
            onChangeText={setTxNote}
            className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
            placeholder="Food, bus, etc"
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity
            onPress={handleAddTransaction}
            className="mt-4 bg-gray-900 rounded-2xl py-3 items-center"
          >
            <Text className="text-white font-semibold">
              {isLoading ? "Please wait..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default News;
