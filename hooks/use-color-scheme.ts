import { useColorScheme as useReactNativeColorScheme } from "react-native";

export type AppColorScheme = "light" | "dark";

/**
 * Compatibility hook for Expo template components.
 * Returns a concrete scheme string.
 */
export function useColorScheme(): AppColorScheme {
  const scheme = useReactNativeColorScheme();
  return scheme === "dark" ? "dark" : "light";
}
