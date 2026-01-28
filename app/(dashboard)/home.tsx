import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import {
  confirmBiometric,
  ensureBiometricAvailable,
  getBiometricEnabled,
  getBiometricPrompted,
  setBiometricEnabled,
  setBiometricPrompted,
} from "@/services/biometricService";
import { getFinanceSummary } from "@/services/financeService";
import type { FinanceSummary } from "@/types/finance";
import { MaterialIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Home = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { showLoader, hideLoader } = useLoader();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricPrompted, setBiometricPromptedState] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

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

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) return;
      try {
        const [enabled, prompted] = await Promise.all([
          getBiometricEnabled(user.uid),
          getBiometricPrompted(user.uid),
        ]);
        if (!cancelled) {
          setBiometricEnabledState(enabled);
          setBiometricPromptedState(prompted);
        }
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
      if (!user?.uid) return;
      if (biometricBusy) return;

      // Only allow enabling via this switch.
      // If they don't want it, they can tap "Not now".
      if (!next) return;

      setBiometricBusy(true);
      try {
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

        setBiometricEnabledState(true);
        setBiometricPromptedState(true);
        await Promise.all([
          setBiometricEnabled(user.uid, true),
          setBiometricPrompted(user.uid, true),
        ]);
      } catch (e: any) {
        Alert.alert("Fingerprint", e?.message || "Failed to enable");
      } finally {
        setBiometricBusy(false);
      }
    },
    [biometricBusy, user?.uid],
  );

  const handleSkipBiometric = useCallback(async () => {
    if (!user?.uid) return;
    if (biometricBusy) return;
    setBiometricBusy(true);
    try {
      setBiometricEnabledState(false);
      setBiometricPromptedState(true);
      await Promise.all([
        setBiometricEnabled(user.uid, false),
        setBiometricPrompted(user.uid, true),
      ]);
    } finally {
      setBiometricBusy(false);
    }
  }, [biometricBusy, user?.uid]);

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

        {!biometricPrompted && !!user?.uid ? (
          <View className="mt-4 bg-white rounded-3xl border border-gray-200 p-5">
            <Text className="text-lg font-semibold text-gray-900">
              Fingerprint
            </Text>
            <View className="flex-row items-center justify-between mt-4">
              <View className="flex-1 pr-4">
                <Text className="text-gray-900 font-medium">
                  Use fingerprint to unlock
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  You can change this later in Profile.
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                disabled={biometricBusy}
              />
            </View>
            <TouchableOpacity
              className="mt-3"
              disabled={biometricBusy}
              onPress={handleSkipBiometric}
            >
              <Text className="text-gray-500">Not now</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
