import { useAuth } from "../../../hooks/useAuth";
import { useLoader } from "../../../hooks/useLoader";
import {
  confirmBiometric,
  ensureBiometricAvailable,
  getBiometricEnabled,
  markBiometricJustEnabled,
  setBiometricEnabled,
} from "../../../services/biometricService";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Fingerprint = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoader();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) return;
      try {
        const value = await getBiometricEnabled(user.uid);
        if (!cancelled) setEnabledState(value);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const toggle = useCallback(
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

      setEnabledState(next);
      showLoader();
      try {
        await setBiometricEnabled(user.uid, next);
        if (next) {
          await markBiometricJustEnabled(user.uid);
        }
      } catch (e: any) {
        setEnabledState(!next);
        Alert.alert("Security", e?.message || "Failed to save setting");
      } finally {
        hideLoader();
      }
    },
    [hideLoader, isLoading, showLoader, user?.uid],
  );

  return (
    <View className="flex-1 bg-app-bg dark:bg-appDark-bg">
      <View
        style={{ paddingTop: insets.top + 12 }}
        className="px-6 flex-row items-center justify-between mb-6"
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border"
        >
          <MaterialIcons
            name="arrow-back"
            size={22}
            color={isDark ? "#FFFFFF" : "#111827"}
          />
        </Pressable>
        <Text className="text-lg font-bold text-app-text dark:text-appDark-text">
          Fingerprint
        </Text>
        <View className="w-10 h-10" />
      </View>

      <View className="px-6">
        <View className="bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border rounded-2xl px-4 py-4 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-app-text dark:text-appDark-text font-bold">
              Biometric unlock
            </Text>
            <Text className="text-app-textMuted dark:text-appDark-textMuted text-xs mt-0.5">
              Use fingerprint/face to unlock the app
            </Text>
          </View>

          <Switch
            value={enabled}
            onValueChange={toggle}
            disabled={isLoading}
          />
        </View>
      </View>
    </View>
  );
};

export default Fingerprint;
