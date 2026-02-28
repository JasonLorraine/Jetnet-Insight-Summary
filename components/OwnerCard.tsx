import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, getScoreColor } from "@/constants/colors";
import { DispositionFactorBar } from "./FactorBar";
import type { OwnerIntelligence } from "@/shared/types";

interface OwnerCardProps {
  intel: OwnerIntelligence;
}

export function OwnerCard({ intel }: OwnerCardProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const sellColor = getScoreColor(intel.sellProbability, colorScheme);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="person-outline" size={18} color={colors.tint} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Owner Intelligence
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatItem
          label="Ownership"
          value={`${intel.ownershipYears}yr`}
          colors={colors}
        />
        <StatItem label="Archetype" value={intel.ownerArchetype} colors={colors} />
        <StatItem
          label="Cycle"
          value={intel.replacementCycleStatus}
          colors={colors}
        />
        <StatItem
          label="Brand Loyalty"
          value={intel.brandLoyalty}
          colors={colors}
        />
      </View>

      <View style={[styles.sellRow, { borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.sellLabel, { color: colors.textSecondary }]}>
            Sell Probability
          </Text>
          <Text style={[styles.sellValue, { color: sellColor }]}>
            {intel.sellProbability}/100
          </Text>
        </View>
        <View style={styles.sellRight}>
          <Text style={[styles.windowLabel, { color: colors.textSecondary }]}>
            Predicted Window
          </Text>
          <Text style={[styles.windowValue, { color: colors.text }]}>
            {intel.predictedSellWindow}
          </Text>
        </View>
      </View>

      {intel.fleetSize > 0 ? (
        <View style={[styles.fleetRow, { borderTopColor: colors.border }]}>
          <Ionicons name="albums-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.fleetText, { color: colors.textSecondary }]}>
            Fleet: {intel.fleetSize} aircraft ({intel.fleetTrend})
          </Text>
        </View>
      ) : null}

      <View style={[styles.factorsSection, { borderTopColor: colors.border }]}>
        <Text style={[styles.factorsTitle, { color: colors.textSecondary }]}>
          Disposition Factors
        </Text>
        {intel.explanationFactors.map((f, i) => (
          <DispositionFactorBar
            key={i}
            name={f.name}
            score={f.score}
            maxScore={f.maxScore}
            explanation={f.explanation}
          />
        ))}
      </View>

      <View style={[styles.confidenceRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.confidenceLabel, { color: colors.textSecondary }]}>
          Confidence: {Math.round(intel.confidence * 100)}%
        </Text>
      </View>
    </View>
  );
}

function StatItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    width: "46%" as any,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  sellRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  sellLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  },
  sellValue: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  sellRight: {
    alignItems: "flex-end",
  },
  windowLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  },
  windowValue: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  fleetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  fleetText: {
    fontSize: 13,
  },
  factorsSection: {
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  factorsTitle: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 12,
  },
  confidenceRow: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  confidenceLabel: {
    fontSize: 12,
  },
});
