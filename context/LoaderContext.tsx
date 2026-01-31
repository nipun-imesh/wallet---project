import React, { createContext, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

interface LoaderContextProps {
  showLoader: () => void;
  hideLoader: () => void;
  isLoading: boolean;
}

export const LoaderContext = createContext<LoaderContextProps>({
  showLoader: () => {},
  hideLoader: () => {},
  isLoading: false,
});

export const LoaderProvider = ({ children }: { children: ReactNode }) => {
  // Ref-counted loader prevents "stuck" state when multiple async operations overlap.
  const [pendingCount, setPendingCount] = useState(0);

  const isLoading = pendingCount > 0;

  const showLoader = () => setPendingCount((c) => c + 1);
  const hideLoader = () => setPendingCount((c) => Math.max(0, c - 1));

  const value = useMemo(
    () => ({ showLoader, hideLoader, isLoading }),
    [isLoading],
  );

  return (
    <LoaderContext.Provider value={value}>
      {children}

      {isLoading && (
        <View
          className="absolute top-0 left-0 right-0 bottom-0 justify-center items-center bg-black/35"
          style={{ zIndex: 9999, elevation: 9999 }}
        >
          <View className="bg-app-surface px-6 py-5 rounded-3xl border border-app-border">
            <ActivityIndicator size="large" color="#4F46E5" />
            <View className="h-3" />
            <View className="w-28 h-1.5 rounded-full bg-gray-200 overflow-hidden" />
          </View>
        </View>
      )}
    </LoaderContext.Provider>
  );
};
