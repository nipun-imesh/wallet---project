import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import {
    addFinanceTransaction,
    deleteFinanceTransaction,
    getFinanceSummary,
    listFinanceTransactions,
    updateFinanceTransaction,
} from "@/services/financeService";
import type { FinanceSummary, FinanceTransaction } from "@/types/finance";
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

const formatShortDate = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const News = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoader();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [history, setHistory] = useState<FinanceTransaction[]>([]);
  const [txAmount, setTxAmount] = useState("");
  const [txNote, setTxNote] = useState("");
  const [txCategory, setTxCategory] = useState("Other");

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("Other");
  const [editNote, setEditNote] = useState("");

  const formatMoney = useCallback((value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const categories = [
    "Food & Drinks",
    "Transport",
    "Bills",
    "Shopping",
    "Groceries",
    "Entertainment",
    "Health",
    "Education",
    "Rent",
    "Travel",
    "Personal Care",
    "Gifts & Donations",
    "EMI / Loans",
    "Other",
  ];

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const [s, tx] = await Promise.all([
        getFinanceSummary(),
        listFinanceTransactions(400),
      ]);
      setSummary(s);

      const now = new Date();
      const since = new Date(now);
      since.setDate(since.getDate() - 31);

      const recent = tx.filter((t) => {
        const d = new Date(t.createdAt);
        return !Number.isNaN(d.getTime()) && d >= since;
      });
      setHistory(recent);
    } catch {
      // ignore
    }
  }, [user]);

  const beginEditTx = useCallback((t: FinanceTransaction) => {
    const parsed = splitNote(t.note);
    setEditingTxId(t.id);
    setEditAmount(String(Math.abs(t.amount ?? 0)));

    if (t.type === "expense") {
      setEditCategory(parsed.category || "Other");
      setEditNote(parsed.detail || "");
    } else {
      setEditCategory("Other");
      setEditNote(String(t.note || "").trim());
    }
  }, []);

  const handleUpdateTx = useCallback(
    async (t: FinanceTransaction) => {
      if (isLoading) return;
      const amount = Number(editAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        Alert.alert("Record", "Enter a valid amount");
        return;
      }

      showLoader();
      try {
        const nextNote =
          t.type === "expense"
            ? (() => {
                const c = String(editCategory || "").trim() || "Other";
                const d = String(editNote || "").trim();
                return d ? `${c}|${d}` : c;
              })()
            : String(editNote || "").trim();

        await updateFinanceTransaction(t.id, {
          amount,
          note: nextNote,
        });

        setEditingTxId(null);
        await refreshData();
        Alert.alert("Record", "Updated");
      } catch (e: any) {
        Alert.alert("Record", e?.message || "Failed to update");
      } finally {
        hideLoader();
      }
    },
    [
      editAmount,
      editCategory,
      editNote,
      hideLoader,
      isLoading,
      refreshData,
      showLoader,
    ],
  );

  const handleDeleteTx = useCallback(
    (t: FinanceTransaction) => {
      Alert.alert("Delete record", "Delete this record?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (isLoading) return;
            showLoader();
            try {
              await deleteFinanceTransaction(t.id);
              setEditingTxId(null);
              await refreshData();
            } catch (e: any) {
              Alert.alert("Delete", e?.message || "Failed to delete");
            } finally {
              hideLoader();
            }
          },
        },
      ]);
    },
    [hideLoader, isLoading, refreshData, showLoader],
  );

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData]),
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
      const category = String(txCategory || "").trim() || "Other";
      const detail = String(txNote || "").trim();
      const encodedNote = detail ? `${category}|${detail}` : category;

      await addFinanceTransaction({
        type: "expense",
        amount,
        note: encodedNote,
        cardId: summary?.defaultCard?.id,
      });
      setTxAmount("");
      setTxNote("");
      setTxCategory("Other");
      await refreshData();
      Alert.alert("Transaction", "Saved");
    } catch (e: any) {
      Alert.alert("Transaction", e?.message || "Failed to save");
    } finally {
      hideLoader();
    }
  }, [
    hideLoader,
    isLoading,
    refreshData,
    showLoader,
    summary?.defaultCard?.id,
    txAmount,
    txCategory,
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

          <Text className="text-xs text-gray-500 mt-3">Category</Text>
          <View className="flex-row flex-wrap mt-2">
            {categories.map((c) => {
              const active = txCategory === c;
              return (
                <TouchableOpacity
                  key={c}
                  className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                    active
                      ? "bg-gray-900 border-gray-900"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => setTxCategory(c)}
                >
                  <Text className={active ? "text-white" : "text-gray-700"}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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

        <View className="mt-4 bg-white rounded-3xl border border-gray-200 overflow-hidden">
          <View className="px-5 pt-5">
            <Text className="text-lg font-semibold text-gray-900">
              Expense / Income history
            </Text>
            <Text className="text-xs text-gray-500 tracking-widest mt-2">
              LAST 31 DAYS
            </Text>
          </View>

          <View className="px-5 mt-2">
            {history.length === 0 ? (
              <Text className="text-gray-500 py-4">No records yet.</Text>
            ) : (
              <View>
                {history.map((t, idx) => {
                  const parsed = splitNote(t.note);
                  const dateText = formatShortDate(t.createdAt);
                  const subtitle = parsed.detail
                    ? `${parsed.detail} • ${dateText}`
                    : dateText;
                  const title =
                    t.type === "expense"
                      ? parsed.category
                      : parsed.category && parsed.category !== "Other"
                        ? parsed.category
                        : "Income";
                  const amountText = `${t.type === "income" ? "+" : "-"}${formatMoney(Math.abs(t.amount))}`;

                  const row = (
                    <View
                      className={
                        idx === 0
                          ? "flex-row items-center justify-between py-4"
                          : "flex-row items-center justify-between py-4 border-t border-gray-100"
                      }
                    >
                      <View className="flex-1 pr-4">
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
                      <Text className="text-gray-900 font-semibold">
                        {amountText}
                      </Text>
                    </View>
                  );

                  return (
                    <View key={t.id}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.8}
                        onPress={() => {
                          if (editingTxId === t.id) {
                            setEditingTxId(null);
                          } else {
                            beginEditTx(t);
                          }
                        }}
                      >
                        {row}
                      </TouchableOpacity>

                      {editingTxId === t.id ? (
                        <View className="pb-4 border-b border-gray-100">
                          <Text className="text-xs text-gray-500">Amount</Text>
                          <TextInput
                            value={editAmount}
                            onChangeText={setEditAmount}
                            keyboardType="decimal-pad"
                            className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
                            placeholder="1000"
                            placeholderTextColor="#9CA3AF"
                          />

                          {t.type === "expense" ? (
                            <>
                              <Text className="text-xs text-gray-500 mt-3">
                                Category
                              </Text>
                              <View className="flex-row flex-wrap mt-2">
                                {categories.map((c) => {
                                  const active = editCategory === c;
                                  return (
                                    <TouchableOpacity
                                      key={c}
                                      className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                                        active
                                          ? "bg-gray-900 border-gray-900"
                                          : "bg-white border-gray-200"
                                      }`}
                                      onPress={() => setEditCategory(c)}
                                    >
                                      <Text
                                        className={
                                          active
                                            ? "text-white"
                                            : "text-gray-700"
                                        }
                                      >
                                        {c}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>

                              <Text className="text-xs text-gray-500 mt-1">
                                Note (optional)
                              </Text>
                              <TextInput
                                value={editNote}
                                onChangeText={setEditNote}
                                className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
                                placeholder="Food, bus, etc"
                                placeholderTextColor="#9CA3AF"
                              />
                            </>
                          ) : (
                            <>
                              <Text className="text-xs text-gray-500 mt-3">
                                Note (optional)
                              </Text>
                              <TextInput
                                value={editNote}
                                onChangeText={setEditNote}
                                className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
                                placeholder="January salary"
                                placeholderTextColor="#9CA3AF"
                              />
                            </>
                          )}

                          <View className="flex-row mt-4">
                            <TouchableOpacity
                              accessibilityRole="button"
                              className="flex-1 bg-gray-900 rounded-2xl py-3 items-center"
                              onPress={() => handleUpdateTx(t)}
                            >
                              <Text className="text-white font-semibold">
                                Update
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              accessibilityRole="button"
                              className="ml-2 px-4 rounded-2xl border border-gray-200 items-center justify-center"
                              onPress={() => setEditingTxId(null)}
                            >
                              <Text className="text-gray-900 font-semibold">
                                Cancel
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              accessibilityRole="button"
                              className="ml-2 px-4 rounded-2xl bg-red-600 items-center justify-center"
                              onPress={() => handleDeleteTx(t)}
                            >
                              <Text className="text-white font-semibold">
                                Delete
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default News;
