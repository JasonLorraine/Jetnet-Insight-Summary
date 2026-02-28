const Colors = {
  light: {
    text: "#1C1C1E",
    textSecondary: "#8E8E93",
    background: "#F2F2F7",
    surface: "#FFFFFF",
    surfaceSecondary: "#E5E5EA",
    tint: "#FF6B5A",
    accent: "#007AFF",
    border: "#D1D1D6",
    tabIconDefault: "#8E8E93",
    tabIconSelected: "#FF6B5A",
    hot: "#FF3B30",
    warm: "#FF9500",
    neutral: "#8E8E93",
    cold: "#007AFF",
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
    cardBackground: "#FFFFFF",
    inputBackground: "#E5E5EA",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#98989F",
    background: "#000000",
    surface: "#1C1C1E",
    surfaceSecondary: "#2C2C2E",
    tint: "#FF6B5A",
    accent: "#0A84FF",
    border: "#38383A",
    tabIconDefault: "#636366",
    tabIconSelected: "#FF6B5A",
    hot: "#FF453A",
    warm: "#FF9F0A",
    neutral: "#636366",
    cold: "#0A84FF",
    success: "#30D158",
    warning: "#FF9F0A",
    error: "#FF453A",
    cardBackground: "#1C1C1E",
    inputBackground: "#2C2C2E",
  },
};

export default Colors;

export function useThemeColors(colorScheme: "light" | "dark" | null | undefined) {
  return colorScheme === "dark" ? Colors.dark : Colors.light;
}

export function getScoreColor(
  score: number,
  colorScheme: "light" | "dark" | null | undefined
) {
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  if (score >= 80) return colors.hot;
  if (score >= 60) return colors.warm;
  if (score >= 40) return colors.neutral;
  return colors.cold;
}

export function getScoreLabel(score: number): "HOT" | "WARM" | "NEUTRAL" | "COLD" {
  if (score >= 80) return "HOT";
  if (score >= 60) return "WARM";
  if (score >= 40) return "NEUTRAL";
  return "COLD";
}
