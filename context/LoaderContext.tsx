// context/LoaderContext.tsx
import React, { createContext, ReactNode, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

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
  const [isLoading, setIsLoading] = useState(false);

  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader, isLoading }}>
      <View className="flex-1" style={styles.container}>
        {children}

        {isLoading && (
          <View
            pointerEvents="auto"
            className="justify-center items-center bg-black/30"
            style={styles.overlay}
          >
            <View className="bg-white p-6 rounded-2xl shadow-lg">
              <ActivityIndicator size="large" color="#4ade80" />
            </View>
          </View>
        )}
      </View>
    </LoaderContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});
