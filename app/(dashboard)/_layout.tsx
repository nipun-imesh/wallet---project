import { useAuth } from "@/hooks/useAuth";
import { logoutUser } from "@/services/authService";
import {
  confirmBiometric,
  consumeBiometricJustEnabled,
  ensureBiometricAvailable,
  getBiometricEnabled,
} from "@/services/biometricService";
import { MaterialIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";

const tabs = [
  { name: "home", icon: "home", title: "Home" },
  { name: "news", icon: "article", title: "News" },
  { name: "profile", icon: "person", title: "Profile" },
  { name: "tasks", icon: "list", title: "Tasks" },
] as const;
// DRY - Don't Repeat Yourself
const DashboardLayout = () => {
  const { user } = useAuth();
  const router = useRouter();

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
    return <View className="flex-1 bg-white" />;
  }

  if (needsBiometric && !unlocked) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-lg font-semibold text-gray-900">
          Fingerprint required
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          Please confirm your fingerprint to continue.
        </Text>
        <Pressable
          className="mt-6 bg-gray-900 rounded-2xl px-6 py-3"
          onPress={async () => {
            const ok = await confirmBiometric("Unlock Wallet");
            if (ok) setUnlocked(true);
          }}
        >
          <Text className="text-white font-semibold">Try again</Text>
        </Pressable>
        <Pressable
          className="mt-3 border border-gray-200 rounded-2xl px-6 py-3"
          onPress={async () => {
            await logoutUser();
            router.replace("/login");
          }}
        >
          <Text className="text-gray-900 font-semibold">Logout</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      // tabBar={(props) => <></>}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          name={tab.name}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name={tab.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
      {/* <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" color={color} size={size} />
          )
        }}
      /> */}
      {/* home.tsx */}
      {/* <Tabs.Screen name="tasks" /> tasks.tsx */}
      {/* <Tabs.Screen name="news" /> news.tsx */}
      {/* <Tabs.Screen name="profile" /> profile.tsx */}
    </Tabs>
  );
};

export default DashboardLayout;
