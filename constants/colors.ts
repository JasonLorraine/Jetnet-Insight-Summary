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
    primaryLabel: "#000000",
    secondaryLabel: "rgba(60,60,67,0.6)",
    tertiaryLabel: "rgba(60,60,67,0.3)",
    separator: "rgba(60,60,67,0.12)",
    systemBackground: "#F2F2F7",
    secondaryBackground: "#FFFFFF",
    tertiaryBackground: "#F2F2F7",
    systemBlue: "#007AFF",
    systemGreen: "#34C759",
    systemOrange: "#FF9500",
    systemRed: "#FF3B30",
    skeletonBase: "#E8E8ED",
    skeletonHighlight: "#F2F2F7",
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
    primaryLabel: "#FFFFFF",
    secondaryLabel: "rgba(235,235,245,0.6)",
    tertiaryLabel: "rgba(235,235,245,0.3)",
    separator: "rgba(84,84,88,0.6)",
    systemBackground: "#000000",
    secondaryBackground: "#1C1C1E",
    tertiaryBackground: "#2C2C2E",
    systemBlue: "#0A84FF",
    systemGreen: "#30D158",
    systemOrange: "#FF9F0A",
    systemRed: "#FF453A",
    skeletonBase: "#2C2C2E",
    skeletonHighlight: "#3A3A3C",
  },
};

export const PersonaAccentColors: Record<string, { light: string; dark: string }> = {
  dealer_broker: { light: "#007AFF", dark: "#0A84FF" },
  fbo: { light: "#5856D6", dark: "#5E5CE6" },
  mro: { light: "#FF9500", dark: "#FF9F0A" },
  charter: { light: "#34C759", dark: "#30D158" },
  fleet_management: { light: "#AF52DE", dark: "#BF5AF2" },
  finance: { light: "#000000", dark: "#FFFFFF" },
  catering: { light: "#FF2D55", dark: "#FF375F" },
  ground_transportation: { light: "#5AC8FA", dark: "#64D2FF" },
  detailing: { light: "#FFCC00", dark: "#FFD60A" },
};

export function getPersonaAccent(personaId: string, colorScheme: "light" | "dark" | null | undefined): string {
  const entry = PersonaAccentColors[personaId];
  if (!entry) return colorScheme === "dark" ? "#0A84FF" : "#007AFF";
  return colorScheme === "dark" ? entry.dark : entry.light;
}

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
