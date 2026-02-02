import { useAuth } from "@/hooks/useAuth";
import { logoutUser } from "@/services/authService";
import {
    confirmBiometric,
    consumeBiometricJustEnabled,
    consumeSuppressedBiometricPrompt,
    consumeSuppressedBiometricPromptForUser,
    ensureBiometricAvailable,
    getBiometricEnabled,
} from "@/services/biometricService";
import { MaterialIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";

const tabs = [
  { name: "home", icon: "home", title: "Home" },
  { name: "transaction", icon: "article", title: "Transaction" },
  { name: "tasks", icon: "assignment", title: "History" },
  { name: "settings", icon: "settings", title: "Settings" },
] as const;
// DRY - Don't Repeat Yourself
const DashboardLayout = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [needsBiometric, setNeedsBiometric] = useState(false);

  const lastAppState = useRef(AppState.currentState);
  const promptInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user?.uid) {
        if (!cancelled) {
          setNeedsBiometric(false);
          setUnlocked(true);
          setChecking(false);
        }
        return;
      }

      try {
        const enabled = await getBiometricEnabled(user.uid);
        if (cancelled) return;
        setNeedsBiometric(enabled);

        if (!enabled) {
          setUnlocked(true);
          setChecking(false);
          return;
        }

        // If we just opened ImagePicker (or similar), don't prompt during the return.
        const suppressed =
          consumeSuppressedBiometricPrompt() ||
          (await consumeSuppressedBiometricPromptForUser(user.uid));
        if (suppressed) {
          setUnlocked(true);
          setChecking(false);
          return;
        }

        // If the user just enabled biometrics in the setup screen, skip an immediate re-prompt.
        const justEnabled = await consumeBiometricJustEnabled(user.uid);
        if (justEnabled) {
          setUnlocked(true);
          setChecking(false);
          return;
        }

        const available = await ensureBiometricAvailable();
        if (!available.ok) {
          setUnlocked(true);
          setChecking(false);
          return;
        }

        const ok = await confirmBiometric("Unlock Wallet");
        if (!cancelled) {
          setUnlocked(ok);
          setChecking(false);
        }
      } catch {
        if (!cancelled) {
          setUnlocked(true);
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    // When app comes back from background/inactive -> active, re-prompt if biometrics enabled.
    const sub = AppState.addEventListener("change", async (nextState) => {
      const prev = lastAppState.current;
      lastAppState.current = nextState;

      if (!user?.uid) return;
      if (nextState !== "active") return;
      if (prev === "active") return;
      if (promptInFlight.current) return;

      // ImagePicker temporarily backgrounds the app; don't lock in that case.
      if (
        consumeSuppressedBiometricPrompt() ||
        (await consumeSuppressedBiometricPromptForUser(user.uid))
      ) {
        return;
      }

      try {
        const enabled = await getBiometricEnabled(user.uid);
        setNeedsBiometric(enabled);
        if (!enabled) return;

        // If the user just enabled biometrics in setup, don't instantly re-prompt.
        const justEnabled = await consumeBiometricJustEnabled(user.uid);
        if (justEnabled) {
          setUnlocked(true);
          return;
        }

        const available = await ensureBiometricAvailable();
        if (!available.ok) {
          setUnlocked(true);
          return;
        }

        // Lock again and request fingerprint on resume.
        setUnlocked(false);
        promptInFlight.current = true;
        const ok = await confirmBiometric("Unlock Wallet");
        setUnlocked(ok);
      } finally {
        promptInFlight.current = false;
      }
    });

    return () => {
      sub.remove();
    };
  }, [user?.uid]);

  if (checking) {
    return <View className="flex-1 bg-app-bg dark:bg-black" />;
  }

  if (needsBiometric && !unlocked) {
    return (
      <View className="flex-1 bg-app-bg dark:bg-black items-center justify-center px-8">
        <Text className="text-lg font-semibold text-app-text dark:text-white">
          Fingerprint required
        </Text>
        <Text className="text-app-textMuted dark:text-white/70 text-center mt-2">
          Please confirm your fingerprint to continue.
        </Text>
        <Pressable
          className="mt-6 bg-app-primary dark:bg-white rounded-2xl px-6 py-3"
          onPress={async () => {
            const ok = await confirmBiometric("Unlock Wallet");
            if (ok) setUnlocked(true);
          }}
        >
          <Text className="text-white dark:text-black font-semibold">
            Try again
          </Text>
        </Pressable>
        <Pressable
          className="mt-3 border border-app-border dark:border-white/15 rounded-2xl px-6 py-3"
          onPress={async () => {
            await logoutUser();
            router.replace("/login");
          }}
        >
          <Text className="text-app-text dark:text-white font-semibold">
            Logout
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? "#FFFFFF" : "#111827",
        tabBarInactiveTintColor: isDark ? "rgba(255,255,255,0.55)" : "#6B7280",
        // We render icon + label together in tabBarIcon to avoid label clipping
        // with custom rounded/absolute-positioned tab bars.
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: Platform.OS === "ios" ? 15 : 2,
          height: Platform.OS === "ios" ? 72 : 68,
          paddingTop: 10,
          borderTopWidth: 0,
          borderRadius: 26,
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
          elevation: 12,
          shadowColor: "#000000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        },
      }}
      // tabBar={(props) => <></>}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => {
              const iconSize = Math.min(26, Math.max(22, size ?? 24));
              return (
                <View className="items-center justify-center" style={{ width: 72 }}>
                  <MaterialIcons name={tab.icon} color={color} size={iconSize} />
                  <Text
                    numberOfLines={1}
                    style={{ color, fontSize: 12, marginTop: 2, includeFontPadding: false }}
                  >
                    {tab.title}
                  </Text>
                </View>
              );
            },
          }}
        />
      ))}
    </Tabs>
  );
};

export default DashboardLayout;
