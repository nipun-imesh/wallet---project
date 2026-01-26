import { AuthProvider } from "@/context/AuthContext";
import { LoaderProvider } from "@/context/LoaderContext";
import { Slot } from "expo-router";
import React from "react";
import { View } from "react-native";
import {
  useSafeAreaInsets
} from "react-native-safe-area-context";

// App.tsx ->
const RootLayout = () => {
  const insets = useSafeAreaInsets();

  return (
    // <SafeAreaView className="flex-1">
    <LoaderProvider>
      <AuthProvider>
        <View style={{ marginTop: insets.top, flex: 1 }}>
          <Slot />
        </View>
      </AuthProvider>
    </LoaderProvider>
    // </SafeAreaView>
  );
};

export default RootLayout;
