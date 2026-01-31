import { useAuth } from "@/hooks/useAuth";
import {
    confirmBiometric,
    ensureBiometricAvailable,
    getBiometricPrompted,
    markBiometricJustEnabled,
    setBiometricEnabled,
    setBiometricPrompted,
} from "@/services/biometricService";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BiometricSetup = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user?.uid) {
        if (!cancelled) router.replace("/login");
        return;
      }

      try {
        const prompted = await getBiometricPrompted(user.uid);
        if (cancelled) return;

        // If we've already asked before, skip this page.
        if (prompted) {
          router.replace("/home");
          return;
        }

        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, user?.uid]);

  const goHome = useCallback(() => {
    router.replace("/home");
  }, [router]);

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (!user?.uid) return;
      if (busy) return;

      // Turning OFF is allowed without any prompt.
      if (!next) {
        setEnabled(false);
        try {
          await setBiometricEnabled(user.uid, false);
        } catch {
          // ignore
        }
        return;
      }

      // Turning ON should immediately request fingerprint confirmation.
      setBusy(true);
      try {
        const available = await ensureBiometricAvailable();
        if (!available.ok) {
          Alert.alert("Fingerprint", available.reason || "Unavailable");
          setEnabled(false);
          return;
        }

        const ok = await confirmBiometric("Confirm fingerprint to enable");
        if (!ok) {
          setEnabled(false);
          return;
        }

        setEnabled(true);
        await Promise.all([
          setBiometricEnabled(user.uid, true),
          // Prevent an immediate second prompt on the dashboard lock screen.
          markBiometricJustEnabled(user.uid),
        ]);
      } catch (e: any) {
        setEnabled(false);
        Alert.alert("Fingerprint", e?.message || "Failed to enable");
      } finally {
        setBusy(false);
      }
    },
    [busy, user?.uid],
  );

  const handleContinue = useCallback(async () => {
    if (!user?.uid) return;
    if (busy) return;

    setBusy(true);
    try {
      await setBiometricPrompted(user.uid, true);
      goHome();
    } finally {
      setBusy(false);
    }
  }, [busy, goHome, user?.uid]);

  const handleSkip = useCallback(async () => {
    if (!user?.uid) return;
    if (busy) return;

    setBusy(true);
    try {
      setEnabled(false);
      await Promise.all([
        setBiometricEnabled(user.uid, false),
        setBiometricPrompted(user.uid, true),
      ]);
      goHome();
    } finally {
      setBusy(false);
    }
  }, [busy, goHome, user?.uid]);

  if (!ready) {
    return <View className="flex-1 bg-app-bg" />;
  }

  return (
    <View
      className="flex-1 bg-app-bg px-6"
      style={{ paddingTop: insets.top + 24 }}
    >
      <View className="bg-app-surface rounded-3xl border border-app-border p-6">
        <Text className="text-2xl font-semibold text-gray-900">
          Fingerprint
        </Text>
        <Text className="text-gray-600 mt-2">
          Do you want to use fingerprint to unlock the app?
        </Text>

        <View className="flex-row items-center justify-between mt-6">
          <Text className="text-gray-900 font-medium">Use fingerprint</Text>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={busy}
          />
        </View>

        <Pressable
          className={`mt-6 rounded-2xl py-4 ${
            busy ? "bg-app-primary/40" : "bg-app-primary"
          }`}
          disabled={busy}
          onPress={handleContinue}
        >
          <Text className="text-white text-center font-semibold">
            {busy ? "Please wait..." : "Continue"}
          </Text>
        </Pressable>

        <Pressable
          className="mt-3 rounded-2xl py-4 border border-app-border bg-app-surface"
          disabled={busy}
          onPress={handleSkip}
        >
          <Text className="text-gray-900 text-center font-semibold">Skip</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default BiometricSetup;
