import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { useThemeColors } from "@/constants/colors";
import { SkeletonLine } from "./SkeletonLine";

interface SkeletonSectionProps {
  title: string;
  rows?: number;
  style?: any;
}

export function SkeletonSection({ title, rows = 4, style }: SkeletonSectionProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: colors.tertiaryLabel }]}>
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.secondaryBackground }]}>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={styles.row}>
            <SkeletonLine width="35%" height={13} />
            <SkeletonLine width="45%" height={17} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 44,
  },
});
