import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import type { CompanyProfile } from "@/shared/types";

interface CompanyCardProps {
  company: CompanyProfile;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  const hqParts = [company.headquarters.city, company.headquarters.state, company.headquarters.country].filter(Boolean);
  const hqString = hqParts.length > 0 ? hqParts.join(", ") : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="business-outline" size={18} color={colors.tint} />
          <Text style={[styles.title, { color: colors.text }]}>
            Operating Entity
          </Text>
        </View>
      </View>

      <Text style={[styles.companyName, { color: colors.text }]}>
        {company.companyName}
      </Text>

      <View style={styles.badges}>
        {company.companyType ? (
          <View style={[styles.badge, { backgroundColor: colors.tint + "22" }]}>
            <Text style={[styles.badgeText, { color: colors.tint }]}>
              {company.companyType}
            </Text>
          </View>
        ) : null}
      </View>

      {hqString ? (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {hqString}
          </Text>
        </View>
      ) : null}

      {company.industry ? (
        <View style={styles.infoRow}>
          <Ionicons name="briefcase-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {company.industry}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.evolutionButton, { borderColor: colors.border }]}
        onPress={() => Linking.openURL(company.evolutionLink)}
        testID="company-evolution-link"
      >
        <Ionicons name="open-outline" size={14} color={colors.accent} />
        <Text style={[styles.evolutionText, { color: colors.accent }]}>
          Open in Evolution
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  companyName: {
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 8,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
  },
  evolutionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  evolutionText: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
});
