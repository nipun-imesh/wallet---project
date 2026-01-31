import { AuthProvider } from "@/context/AuthContext";
import { LoaderProvider } from "@/context/LoaderContext";
import { Slot } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

// App.tsx ->
const RootLayout = () => {
  return (
    <LoaderProvider>
      <AuthProvider>
        <SafeAreaView className="flex-1 bg-app-bg">
          <Slot />
        </SafeAreaView>
      </AuthProvider>
    </LoaderProvider>
  );
};

export default RootLayout;
