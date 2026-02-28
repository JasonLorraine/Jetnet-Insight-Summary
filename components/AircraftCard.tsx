import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import { ScorePill } from "./ScoreGauge";
import type { AircraftProfile } from "@/shared/types";

interface AircraftCardProps {
  profile: AircraftProfile;
  onPress?: () => void;
  showEvolutionLink?: boolean;
}

export function AircraftCard({ profile, onPress, showEvolutionLink = true }: AircraftCardProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  const owner = profile.relationships.find(
    (r) => r.relationType.toLowerCase() === "owner"
  );

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.regRow}>
            <Ionicons name="airplane" size={18} color={colors.tint} />
            <Text style={[styles.registration, { color: colors.text }]}>
              {profile.registration}
            </Text>
          </View>
          <Text style={[styles.makeModel, { color: colors.textSecondary }]}>
            {profile.yearMfr} {profile.make} {profile.model}
            {profile.series ? ` ${profile.series}` : ""}
          </Text>
          {profile.serialNumber ? (
            <Text style={[styles.serial, { color: colors.textSecondary }]}>
              S/N {profile.serialNumber}
            </Text>
          ) : null}
        </View>
        {profile.hotNotScore ? (
          <ScorePill score={profile.hotNotScore.score} label={profile.hotNotScore.label} />
        ) : null}
      </View>

      {owner ? (
        <View style={[styles.ownerRow, { borderTopColor: colors.border }]}>
          <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.ownerText, { color: colors.textSecondary }]} numberOfLines={1}>
            {owner.companyName}
          </Text>
        </View>
      ) : null}

      <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {profile.baseLocation.city || profile.baseLocation.icao || "Unknown"}
          </Text>
        </View>
        {profile.marketSignals.forSale ? (
          <View style={[styles.forSaleBadge, { backgroundColor: colors.hot + "22" }]}>
            <Text style={[styles.forSaleText, { color: colors.hot }]}>For Sale</Text>
          </View>
        ) : null}
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {profile.lifecycleStatus}
        </Text>
      </View>

      {showEvolutionLink ? (
        <TouchableOpacity
          style={[styles.evolutionRow, { borderTopColor: colors.border }]}
          onPress={() => Linking.openURL(profile.evolutionLink)}
        >
          <Ionicons name="open-outline" size={14} color={colors.accent} />
          <Text style={[styles.evolutionText, { color: colors.accent }]}>
            Open in Evolution
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
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
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  regRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  registration: {
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  makeModel: {
    fontSize: 15,
    marginTop: 4,
  },
  serial: {
    fontSize: 13,
    marginTop: 2,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ownerText: {
    fontSize: 14,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  forSaleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  forSaleText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  evolutionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  evolutionText: {
    fontSize: 13,
    fontWeight: "500" as const,
    flex: 1,
  },
});
