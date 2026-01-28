import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import {
  addFinanceCard,
  addFinanceTransaction,
  getFinanceSummary,
  listFinanceCards,
  setDefaultFinanceCard,
} from "@/services/financeService";
import type {
  FinanceCard,
  FinanceSummary,
  TransactionType,
} from "@/types/finance";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  confirmBiometric,
  ensureBiometricAvailable,
  getBiometricEnabled,
  setBiometricEnabled,
} from "@/services/biometricService";

const Profile = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoader();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [cards, setCards] = useState<FinanceCard[]>([]);

  const [cardLabel, setCardLabel] = useState("Main Card");
  const [cardBrand, setCardBrand] = useState<FinanceCard["brand"]>("VISA");
  const [cardLast4, setCardLast4] = useState("");
  const [cardExp, setCardExp] = useState("05/25");

  const [txType, setTxType] = useState<TransactionType>("income");
  const [txAmount, setTxAmount] = useState("");
  const [txNote, setTxNote] = useState("");

  const [biometricEnabled, setBiometricEnabledState] =
    useState<boolean>(false);

  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "User";

  const formatMoney = useCallback((value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const balanceText = useMemo(() => {
    return formatMoney(summary?.balance ?? 0);
  }, [formatMoney, summary?.balance]);

  const refresh = useCallback(async () => {
    if (!user) return;
    showLoader();
    try {
      const [s, c] = await Promise.all([
        getFinanceSummary(),
        listFinanceCards(),
      ]);
      setSummary(s);
      setCards(c);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load profile data");
    } finally {
      hideLoader();
    }
  }, [hideLoader, showLoader, user]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) return;
      try {
        const enabled = await getBiometricEnabled(user.uid);
        if (!cancelled) setBiometricEnabledState(enabled);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleToggleBiometric = useCallback(
    async (next: boolean) => {
      if (!user?.uid) {
        Alert.alert("Security", "Please log in again.");
        return;
      }

      if (isLoading) return;

      if (next) {
        const available = await ensureBiometricAvailable();
        if (!available.ok) {
          Alert.alert("Fingerprint", available.reason || "Unavailable");
          return;
        }

        const ok = await confirmBiometric("Confirm fingerprint to enable");
        if (!ok) {
          Alert.alert("Fingerprint", "Confirmation cancelled");
          return;
        }
      }

      setBiometricEnabledState(next);
      try {
        await setBiometricEnabled(user.uid, next);
      } catch (e: any) {
        setBiometricEnabledState(!next);
        Alert.alert("Security", e?.message || "Failed to save setting");
      }
    },
    [isLoading, user?.uid],
  );

  const parseExp = (exp: string) => {
    const trimmed = String(exp).trim();
    const match = trimmed.match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
    if (!match) return null;
    const month = Number(match[1]);
    let year = Number(match[2]);
    if (year < 100) year = 2000 + year;
    return { month, year };
  };

  const handleAddCard = useCallback(async () => {
    if (isLoading) return;
    const exp = parseExp(cardExp);
    if (!exp) {
      Alert.alert("Card", "Expiry must be like 05/25");
      return;
    }

    showLoader();
    try {
      await addFinanceCard({
        label: cardLabel,
        brand: cardBrand,
        last4: cardLast4,
        expMonth: exp.month,
        expYear: exp.year,
        isDefault: cards.length === 0,
      });
      setCardLast4("");
      await refresh();
      Alert.alert("Card", "Card added");
    } catch (e: any) {
      Alert.alert("Card", e?.message || "Failed to add card");
    } finally {
      hideLoader();
    }
  }, [
    cardBrand,
    cardExp,
    cardLabel,
    cardLast4,
    cards.length,
    hideLoader,
    isLoading,
    refresh,
    showLoader,
  ]);

  const handleSetDefault = useCallback(
    async (cardId: string) => {
      if (isLoading) return;
      showLoader();
      try {
        await setDefaultFinanceCard(cardId);
        await refresh();
      } catch (e: any) {
        Alert.alert("Card", e?.message || "Failed to set default");
      } finally {
        hideLoader();
      }
    },
    [hideLoader, isLoading, refresh, showLoader],
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
        type: txType,
        amount,
        note: txNote,
        cardId: summary?.defaultCard?.id,
      });
      setTxAmount("");
      setTxNote("");
      await refresh();
      Alert.alert("Transaction", "Saved");
    } catch (e: any) {
      Alert.alert("Transaction", e?.message || "Failed to save");
    } finally {
      hideLoader();
    }
  }, [
    hideLoader,
    isLoading,
    refresh,
    showLoader,
    summary?.defaultCard?.id,
    txAmount,
    txNote,
    txType,
  ]);

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="bg-white rounded-3xl border border-gray-200 p-5">
          <Text className="text-xs text-gray-500">Logged in as</Text>
          <Text className="text-lg font-semibold text-gray-900 mt-1">
            {displayName}
          </Text>
          <Text className="text-xs text-gray-500 mt-4">Current balance</Text>
          <Text className="text-3xl font-semibold text-gray-900 mt-1">
            {balanceText}
          </Text>
          <Text className="text-xs text-gray-500 mt-2">
            Income: {formatMoney(summary?.totalIncome ?? 0)} • Expense:{" "}
            {formatMoney(summary?.totalExpense ?? 0)}
          </Text>
        </View>

        <View className="mt-4 bg-white rounded-3xl border border-gray-200 p-5">
          <Text className="text-lg font-semibold text-gray-900">Security</Text>
          <View className="flex-row items-center justify-between mt-4">
            <View className="flex-1 pr-4">
              <Text className="text-gray-900 font-medium">Use fingerprint</Text>
              <Text className="text-xs text-gray-500 mt-1">
                Ask for fingerprint when opening the app
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
            />
          </View>
        </View>

        <View className="mt-4 bg-white rounded-3xl border border-gray-200 p-5">
          <Text className="text-lg font-semibold text-gray-900">Add card</Text>

          <Text className="text-xs text-gray-500 mt-3">Label</Text>
          <TextInput
            value={cardLabel}
            onChangeText={setCardLabel}
            className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
            placeholder="Main Card"
            placeholderTextColor="#9CA3AF"
          />

          <Text className="text-xs text-gray-500 mt-3">Brand</Text>
          <View className="flex-row mt-2">
            {(["VISA", "MASTERCARD", "AMEX", "OTHER"] as const).map((b) => {
              const active = cardBrand === b;
              return (
                <TouchableOpacity
                  key={b}
                  className={`mr-2 px-3 py-2 rounded-full border ${
                    active
                      ? "bg-gray-900 border-gray-900"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => setCardBrand(b)}
                >
                  <Text className={active ? "text-white" : "text-gray-700"}>
                    {b}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="flex-row mt-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-500">Last 4 digits</Text>
              <TextInput
                value={cardLast4}
                onChangeText={setCardLast4}
                keyboardType="number-pad"
                maxLength={4}
                className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
                placeholder="9877"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs text-gray-500">Expiry (MM/YY)</Text>
              <TextInput
                value={cardExp}
                onChangeText={setCardExp}
                className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
                placeholder="05/25"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleAddCard}
            className="mt-4 bg-gray-900 rounded-2xl py-3 items-center"
          >
            <Text className="text-white font-semibold">Save card</Text>
          </TouchableOpacity>

          <Text className="text-sm font-semibold text-gray-900 mt-6">
            Your cards
          </Text>
          {cards.length === 0 ? (
            <Text className="text-gray-500 mt-2">No cards yet.</Text>
          ) : (
            cards.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => handleSetDefault(c.id)}
                className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"
              >
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-gray-900 font-semibold">
                      {c.label} • {c.brand}
                    </Text>
                    <Text className="text-gray-500">
                      •••• {c.last4} • {String(c.expMonth).padStart(2, "0")}/
                      {String(c.expYear).slice(-2)}
                    </Text>
                  </View>
                  {c.isDefault ? (
                    <Text className="text-xs text-green-700 font-semibold">
                      Default
                    </Text>
                  ) : (
                    <Text className="text-xs text-gray-500">Set default</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View className="mt-4 bg-white rounded-3xl border border-gray-200 p-5">
          <Text className="text-lg font-semibold text-gray-900">
            Add salary / expense
          </Text>

          <View className="flex-row mt-3">
            <TouchableOpacity
              className={`flex-1 mr-2 rounded-2xl py-3 items-center border ${
                txType === "income"
                  ? "bg-emerald-700 border-emerald-700"
                  : "bg-white border-gray-200"
              }`}
              onPress={() => setTxType("income")}
            >
              <Text
                className={
                  txType === "income"
                    ? "text-white font-semibold"
                    : "text-gray-700 font-semibold"
                }
              >
                Salary (Income)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 ml-2 rounded-2xl py-3 items-center border ${
                txType === "expense"
                  ? "bg-red-600 border-red-600"
                  : "bg-white border-gray-200"
              }`}
              onPress={() => setTxType("expense")}
            >
              <Text
                className={
                  txType === "expense"
                    ? "text-white font-semibold"
                    : "text-gray-700 font-semibold"
                }
              >
                Expense
              </Text>
            </TouchableOpacity>
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
            <Text className="text-white font-semibold">Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;
