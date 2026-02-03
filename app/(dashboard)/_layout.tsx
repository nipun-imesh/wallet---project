import { useAuth } from "../../hooks/useAuth";
import { logoutUser } from "../../services/authService";
import {
  confirmBiometric,
  consumeBiometricJustEnabled,
  consumeSuppressedBiometricPrompt,
  consumeSuppressedBiometricPromptForUser,
  ensureBiometricAvailable,
  getBiometricEnabled,
} from "../../services/biometricService";
import { MaterialIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";

const TAB_ACTIVE_LIGHT = "#4F46E5"; // app.primary
const TAB_ACTIVE_DARK = "#818CF8"; // appDark.primary
const TAB_INACTIVE_LIGHT = "#64748B"; // app.textMuted
const TAB_INACTIVE_DARK = "#94A3B8"; // appDark.textMuted
const TAB_BG_LIGHT = "#FFFFFF"; // app.surface
const TAB_BG_DARK = "#111C33"; // appDark.surface2 (higher contrast vs bg)
const TAB_BORDER_LIGHT = "#DDE4F0"; // app.border
const TAB_BORDER_DARK = "#1E2A4A"; // appDark.border

const tabs = [
  { name: "home", icon: "home", title: "Home" },
  { name: "transaction", icon: "swap-horiz", title: "Transaction" },
  { name: "history", icon: "article", title: "History" },
  { name: "settings", icon: "settings", title: "Settings" },
] as const;
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
        tabBarActiveTintColor: isDark ? TAB_ACTIVE_DARK : TAB_ACTIVE_LIGHT,
        tabBarInactiveTintColor: isDark
          ? TAB_INACTIVE_DARK
          : TAB_INACTIVE_LIGHT,
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: Platform.OS === "ios" ? 6 : 8,
        },
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          // Move the floating menu slightly lower.
          bottom: Platform.OS === "ios" ? 8 : 6,
          height: Platform.OS === "ios" ? 72 : 68,
          paddingTop: 10,
          borderTopWidth: 0,
          borderRadius: 26,
          backgroundColor: isDark ? TAB_BG_DARK : TAB_BG_LIGHT,
          borderWidth: 1,
          borderColor: isDark ? TAB_BORDER_DARK : TAB_BORDER_LIGHT,
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
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarLabel: tab.title,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name={tab.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
};

export default DashboardLayout;
