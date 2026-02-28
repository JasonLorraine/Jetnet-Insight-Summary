import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import type { FleetAircraft } from "@/shared/types";

interface FleetItemProps {
  aircraft: FleetAircraft;
  onPress?: () => void;
}

export function FleetItem({ aircraft, onPress }: FleetItemProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surfaceSecondary }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.left}>
        <Text style={[styles.reg, { color: colors.text }]}>
          {aircraft.registration}
        </Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]}>
          {aircraft.yearMfr} {aircraft.make} {aircraft.model}
        </Text>
      </View>
      <View style={styles.right}>
        {aircraft.forSale ? (
          <View style={[styles.badge, { backgroundColor: colors.hot + "22" }]}>
            <Text style={[styles.badgeText, { color: colors.hot }]}>For Sale</Text>
          </View>
        ) : null}
        {onPress ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  left: {
    flex: 1,
  },
  reg: {
    fontSize: 15,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
  detail: {
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
});
