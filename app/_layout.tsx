import { AuthProvider } from "@/context/AuthContext";
import { LoaderProvider } from "@/context/LoaderContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Slot } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const THEME_STORAGE_KEY = "wallet:colorScheme";

// App.tsx ->
const RootLayout = () => {
  const { colorScheme, setColorScheme } = useColorScheme();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (cancelled) return;
        if (saved === "dark" || saved === "light") {
          setColorScheme(saved);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setColorScheme]);

  return (
    <LoaderProvider>
      <AuthProvider>
        <View className={colorScheme === "dark" ? "flex-1 dark" : "flex-1"}>
          <SafeAreaView className="flex-1 bg-app-bg dark:bg-black">
            <Slot />
          </SafeAreaView>
        </View>
      </AuthProvider>
    </LoaderProvider>
  );
};

export default RootLayout;
