import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { logoutUser } from "../../../services/authService";

type Row = {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  href: string;
};

const Settings = () => {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const iconColor = isDark ? "#FFFFFF" : "#111827";
  const chevronColor = isDark ? "rgba(255,255,255,0.6)" : "#6B7280";
  const dangerIconColor = isDark ? "#F87171" : "#DC2626";

  const confirmLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      setShowLogoutModal(false);
      router.replace("/(auth)/login" as any);
    } catch (e: any) {
      Alert.alert("Log out", e?.message || "Failed to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut]);


  const rows: Row[] = useMemo(
    () => [
      {
        title: "Profile",
        subtitle: "Update name and photo",
        icon: "person",
        href: "/(dashboard)/settings/profile",
      },
      {
        title: "Change Password",
        subtitle: "Update your password",
        icon: "lock",
        href: "/(dashboard)/settings/password",
      },
      {
        title: "Appearance",
        subtitle: "Light or dark mode",
        icon: "palette",
        href: "/(dashboard)/settings/appearance",
      },
      {
        title: "Fingerprint",
        subtitle: "Enable biometric unlock",
        icon: "fingerprint",
        href: "/(dashboard)/settings/fingerprint",
      },
    ],
    [],
  );

  return (
    <View className="flex-1 bg-app-bg dark:bg-appDark-bg">
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isLoggingOut) setShowLogoutModal(false);
        }}
      >
        <Pressable
          className="flex-1 items-center justify-center px-6 bg-appDark-bg/70"
          onPress={() => {
            if (!isLoggingOut) setShowLogoutModal(false);
          }}
        >
          <Pressable
            className="w-full max-w-md bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border rounded-3xl p-5"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-extrabold text-app-text dark:text-appDark-text">
              Log out
            </Text>
            <Text className="mt-1 text-app-textMuted dark:text-appDark-textMuted">
              Are you sure you want to log out?
            </Text>

            <View className="mt-5 flex-row">
              <Pressable
                disabled={isLoggingOut}
                onPress={() => setShowLogoutModal(false)}
                className="flex-1 rounded-2xl py-3 items-center border border-app-border dark:border-appDark-border"
              >
                <Text className="text-app-text dark:text-appDark-text font-semibold">
                  Cancel
                </Text>
              </Pressable>
              <View className="w-3" />
              <Pressable
                disabled={isLoggingOut}
                onPress={confirmLogout}
                className="flex-1 rounded-2xl py-3 items-center bg-app-danger dark:bg-appDark-danger"
              >
                <Text className="text-white dark:text-appDark-onPrimary font-semibold">
                  {isLoggingOut ? "Please wait..." : "Log out"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View
        style={{ paddingTop: insets.top + 12 }}
        className="px-6 pb-6"
      >
        <Text className="text-2xl font-extrabold text-app-text dark:text-appDark-text">
          Settings
        </Text>
        <Text className="text-app-textMuted dark:text-appDark-textMuted mt-1">
          Manage your account and app preferences
        </Text>
      </View>

      <View className="px-6">
        {rows.map((row) => (
          <Pressable
            key={row.title}
            onPress={() => router.push(row.href as any)}
            className="bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border rounded-2xl px-4 py-4 mb-3 flex-row items-center"
          >
            <View className="w-10 h-10 rounded-full items-center justify-center bg-app-surface2 dark:bg-appDark-surface2 border border-app-border dark:border-appDark-border">
              <MaterialIcons name={row.icon} size={22} color={iconColor} />
            </View>

            <View className="flex-1 ml-4">
              <Text className="text-app-text dark:text-appDark-text font-bold text-base">
                {row.title}
              </Text>
              <Text className="text-app-textMuted dark:text-appDark-textMuted text-xs mt-0.5">
                {row.subtitle}
              </Text>
            </View>

            <MaterialIcons name="chevron-right" size={24} color={chevronColor} />
          </Pressable>
        ))}

        <Pressable
          onPress={() => {
            setShowLogoutModal(true);
          }}
          className="bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border rounded-2xl px-4 py-4 mt-2 flex-row items-center"
        >
          <View className="w-10 h-10 rounded-full items-center justify-center bg-app-surface2 dark:bg-appDark-surface2 border border-app-border dark:border-appDark-border">
            <MaterialIcons name="logout" size={22} color={dangerIconColor} />
          </View>

          <View className="flex-1 ml-4">
            <Text className="text-app-danger dark:text-appDark-danger font-bold text-base">
              Log out
            </Text>
            <Text className="text-app-textMuted dark:text-appDark-textMuted text-xs mt-0.5">
              Sign out of this account
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

export default Settings;
