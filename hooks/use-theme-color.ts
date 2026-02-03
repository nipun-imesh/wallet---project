import { useColorScheme } from "../hooks/use-color-scheme";

type ThemeProps = {
  light?: string;
  dark?: string;
};

type ThemeColorName = "text" | "background";

const FALLBACK: Record<ThemeColorName, { light: string; dark: string }> = {
  text: { light: "#000000", dark: "#FFFFFF" },
  background: { light: "#FFFFFF", dark: "#000000" },
};

/**
 * Minimal theme resolver used by ThemedText/ThemedView.
 * Prefers explicit overrides; otherwise falls back to app black/white theme.
 */
export function useThemeColor(props: ThemeProps, colorName: ThemeColorName) {
  const scheme = useColorScheme();
  const override = scheme === "dark" ? props.dark : props.light;
  return override ?? FALLBACK[colorName][scheme];
}
