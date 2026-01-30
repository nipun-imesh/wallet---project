import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import { logoutUser } from "@/services/authService";
import {
  confirmBiometric,
  ensureBiometricAvailable,
  getBiometricEnabled,
  setBiometricEnabled,
} from "@/services/biometricService";
import {
  addFinanceCard,
  getFinanceSummary,
  listFinanceCards,
  setDefaultFinanceCard,
} from "@/services/financeService";
import type { FinanceCard, FinanceSummary } from "@/types/finance";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  const [biometricEnabled, setBiometricEnabledState] = useState<boolean>(false);

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

  const handleLogout = useCallback(() => {
    if (isLoading) return;
    Alert.alert("Log out", "Do you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          showLoader();
          try {
            await logoutUser();
            router.replace("/(auth)/login");
          } catch (e: any) {
            Alert.alert("Log out", e?.message || "Failed to log out");
          } finally {
            hideLoader();
          }
        },
      },
    ]);
  }, [hideLoader, isLoading, showLoader]);

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
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleLogout}
            className="bg-red-600 rounded-2xl py-3 items-center"
          >
            <Text className="text-white font-semibold">Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;
