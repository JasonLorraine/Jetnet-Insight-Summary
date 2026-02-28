import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";
import { PERSONA_LIST } from "@/constants/personas";
import { usePersona } from "@/contexts/PersonaContext";
import type { PersonaId } from "@/shared/types/persona";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  handshake: "swap-horizontal-outline",
  "building-2": "business-outline",
  wrench: "construct-outline",
  plane: "airplane-outline",
  "layout-grid": "grid-outline",
  landmark: "cash-outline",
  utensils: "restaurant-outline",
  car: "car-outline",
  sparkles: "sparkles-outline",
};

const ACCENT_COLORS = [
  "#FF6B5A",
  "#007AFF",
  "#FF9500",
  "#34C759",
  "#AF52DE",
  "#5856D6",
  "#FF2D55",
  "#00C7BE",
  "#FFD60A",
];

interface PersonaCardProps {
  id: PersonaId;
  label: string;
  icon: string;
  coreMission: string;
  accentColor: string;
  colors: ReturnType<typeof useThemeColors>;
  onSelect: (id: PersonaId) => void;
}

function PersonaCard({ id, label, icon, coreMission, accentColor, colors, onSelect }: PersonaCardProps) {
  const ionIconName = ICON_MAP[icon] || ("help-outline" as keyof typeof Ionicons.glyphMap);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onSelect(id)}
      activeOpacity={0.7}
      testID={`persona-card-${id}`}
    >
      <View style={[styles.iconCircle, { backgroundColor: accentColor + "18" }]}>
        <Ionicons name={ionIconName} size={26} color={accentColor} />
      </View>
      <Text style={[styles.cardLabel, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
        {coreMission}
      </Text>
    </TouchableOpacity>
  );
}

export default function SelectPersonaScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const { setPersona } = usePersona();

  const handleSelect = useCallback(async (id: PersonaId) => {
    await setPersona(id);

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/search");
    }
  }, [router, setPersona]);

  const topPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Choose Your Role</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Select how you interact with aircraft data. This shapes your AI analysis, contact priorities, and outreach.
        </Text>
      </View>

      <View style={styles.grid}>
        {PERSONA_LIST.map((persona, index) => (
          <PersonaCard
            key={persona.id}
            id={persona.id}
            label={persona.label}
            icon={persona.icon}
            coreMission={persona.coreMission}
            accentColor={ACCENT_COLORS[index % ACCENT_COLORS.length]}
            colors={colors}
            onSelect={handleSelect}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "31%",
    minWidth: 100,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  cardDescription: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
  },
});
