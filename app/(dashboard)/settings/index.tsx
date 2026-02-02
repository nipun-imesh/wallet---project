import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Row = {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  href: string;
};

const Settings = () => {
  const insets = useSafeAreaInsets();

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
    <View className="flex-1 bg-app-bg dark:bg-black">
      <View
        style={{ paddingTop: insets.top + 12 }}
        className="px-6 pb-6"
      >
        <Text className="text-2xl font-extrabold text-app-text dark:text-white">
          Settings
        </Text>
        <Text className="text-app-textMuted dark:text-white/70 mt-1">
          Manage your account and app preferences
        </Text>
      </View>

      <View className="px-6">
        {rows.map((row) => (
          <Pressable
            key={row.title}
            onPress={() => router.push(row.href as any)}
            className="bg-white dark:bg-black border border-app-border dark:border-white/15 rounded-2xl px-4 py-4 mb-3 flex-row items-center"
          >
            <View className="w-10 h-10 rounded-full items-center justify-center bg-app-surface2 dark:bg-white/10 border border-app-border dark:border-white/15">
              <MaterialIcons name={row.icon} size={22} color="#111827" />
            </View>

            <View className="flex-1 ml-4">
              <Text className="text-app-text dark:text-white font-bold text-base">
                {row.title}
              </Text>
              <Text className="text-app-textMuted dark:text-white/70 text-xs mt-0.5">
                {row.subtitle}
              </Text>
            </View>

            <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default Settings;
