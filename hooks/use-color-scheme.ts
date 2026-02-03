import { useColorScheme as useNativeWindColorScheme } from "nativewind";

export type AppColorScheme = "light" | "dark";

/**
 * NativeWind v4-compatible color scheme hook.
 * Always returns "light" | "dark" (never null/undefined).
 */
export function useColorScheme(): AppColorScheme {
  const { colorScheme } = useNativeWindColorScheme();
  return colorScheme === "dark" ? "dark" : "light";
}
