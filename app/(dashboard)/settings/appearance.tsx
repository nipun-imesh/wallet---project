import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const THEME_STORAGE_KEY = "wallet:colorScheme";

type Scheme = "light" | "dark";

const Appearance = () => {
  const insets = useSafeAreaInsets();
  const { colorScheme, setColorScheme } = useColorScheme();

  const selectScheme = useCallback(
    async (scheme: Scheme) => {
      setColorScheme(scheme);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
      } catch {
        // ignore
      }
    },
    [setColorScheme],
  );

  const isDark = colorScheme === "dark";

  return (
    <View className="flex-1 bg-app-bg dark:bg-black">
      <View
        style={{ paddingTop: insets.top + 12 }}
        className="px-6 flex-row items-center justify-between mb-6"
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center bg-white dark:bg-black border border-app-border dark:border-white/15"
        >
          <MaterialIcons
            name="arrow-back"
            size={22}
            color={isDark ? "#FFFFFF" : "#111827"}
          />
        </Pressable>
        <Text className="text-lg font-bold text-app-text dark:text-white">
          Appearance
        </Text>
        <View className="w-10 h-10" />
      </View>

      <View className="px-6">
        <Pressable
          onPress={() => selectScheme("light")}
          className="bg-white dark:bg-black border border-app-border dark:border-white/15 rounded-2xl px-4 py-4 mb-3 flex-row items-center justify-between"
        >
          <Text className="text-app-text dark:text-white font-semibold">
            Light
          </Text>
          <MaterialIcons
            name={isDark ? "radio-button-unchecked" : "radio-button-checked"}
            size={22}
            color={isDark ? "rgba(255,255,255,0.7)" : "#111827"}
          />
        </Pressable>

        <Pressable
          onPress={() => selectScheme("dark")}
          className="bg-white dark:bg-black border border-app-border dark:border-white/15 rounded-2xl px-4 py-4 mb-3 flex-row items-center justify-between"
        >
          <Text className="text-app-text dark:text-white font-semibold">
            Dark
          </Text>
          <MaterialIcons
            name={isDark ? "radio-button-checked" : "radio-button-unchecked"}
            size={22}
            color={isDark ? "#FFFFFF" : "rgba(17,24,39,0.7)"}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default Appearance;
