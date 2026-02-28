import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import type { AircraftSpecs } from "@/shared/types";

interface SpecsSectionProps {
  specs: AircraftSpecs;
  estimatedAFTT: number | null;
}

interface SpecGroup {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  rows: { label: string; value: string }[];
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function buildSpecGroups(specs: AircraftSpecs, estimatedAFTT: number | null): SpecGroup[] {
  const groups: SpecGroup[] = [];

  const powerplant: { label: string; value: string }[] = [];
  if (specs.engineModel) powerplant.push({ label: "Engine", value: specs.engineModel });
  if (specs.engineCount) powerplant.push({ label: "Engine Count", value: String(specs.engineCount) });
  if (specs.engineProgram) powerplant.push({ label: "Program", value: specs.engineProgram });
  if (specs.apuModel) powerplant.push({ label: "APU", value: specs.apuModel });
  if (powerplant.length > 0) groups.push({ title: "Powerplant", icon: "flash-outline", rows: powerplant });

  const performance: { label: string; value: string }[] = [];
  if (specs.rangeNm) performance.push({ label: "Range", value: `${formatNumber(specs.rangeNm)} nm` });
  if (specs.maxSpeed) performance.push({ label: "Max Speed", value: `${formatNumber(specs.maxSpeed)} ktas` });
  if (specs.mtow) performance.push({ label: "MTOW", value: `${formatNumber(specs.mtow)} lbs` });
  if (specs.fuelCapacity) performance.push({ label: "Fuel Capacity", value: `${formatNumber(specs.fuelCapacity)} lbs` });
  if (performance.length > 0) groups.push({ title: "Performance", icon: "speedometer-outline", rows: performance });

  const cabin: { label: string; value: string }[] = [];
  if (specs.cabinSeats) cabin.push({ label: "Seating", value: `${specs.cabinSeats} passengers` });
  if (specs.cabinConfig) cabin.push({ label: "Configuration", value: specs.cabinConfig });
  if (specs.wifiEquipped !== null) cabin.push({ label: "Wi-Fi", value: specs.wifiEquipped ? "Equipped" : "Not Equipped" });
  if (specs.lastIntRefurb) cabin.push({ label: "Last Interior", value: specs.lastIntRefurb });
  if (specs.lastExtPaint) cabin.push({ label: "Last Paint", value: specs.lastExtPaint });
  if (cabin.length > 0) groups.push({ title: "Cabin & Interior", icon: "cube-outline", rows: cabin });

  const airframe: { label: string; value: string }[] = [];
  if (estimatedAFTT) airframe.push({ label: "Total Time", value: `${formatNumber(estimatedAFTT)} hrs` });
  if (specs.totalLandings) airframe.push({ label: "Total Landings", value: formatNumber(specs.totalLandings) });
  if (specs.noiseStage) airframe.push({ label: "Noise Stage", value: specs.noiseStage });
  if (specs.certificate) airframe.push({ label: "Certificate", value: specs.certificate });
  if (airframe.length > 0) groups.push({ title: "Airframe", icon: "construct-outline", rows: airframe });

  const avionics: { label: string; value: string }[] = [];
  if (specs.avionicsSuite) avionics.push({ label: "Avionics", value: specs.avionicsSuite });
  if (specs.operationType) avionics.push({ label: "Operation", value: specs.operationType });
  if (avionics.length > 0) groups.push({ title: "Avionics & Operations", icon: "radio-outline", rows: avionics });

  return groups;
}

function SpecGroupCard({
  group,
  colors,
}: {
  group: SpecGroup;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.groupContainer}>
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.groupTitleRow}>
          <Ionicons name={group.icon} size={14} color={colors.textSecondary} />
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
            {group.title}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {expanded
        ? group.rows.map((row, i) => (
            <View
              key={i}
              style={[
                styles.specRow,
                i < group.rows.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>
                {row.label}
              </Text>
              <Text style={[styles.specValue, { color: colors.text }]}>
                {row.value}
              </Text>
            </View>
          ))
        : null}
    </View>
  );
}

export function SpecsSection({ specs, estimatedAFTT }: SpecsSectionProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  const groups = buildSpecGroups(specs, estimatedAFTT);
  if (groups.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="document-text-outline" size={18} color={colors.tint} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          What is it?
        </Text>
      </View>
      {groups.map((group, i) => (
        <SpecGroupCard key={i} group={group} colors={colors} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  groupContainer: {
    marginBottom: 8,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingLeft: 20,
  },
  specLabel: {
    fontSize: 14,
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    fontWeight: "500" as const,
    fontVariant: ["tabular-nums" as const],
    textAlign: "right" as const,
    flex: 1,
  },
});
