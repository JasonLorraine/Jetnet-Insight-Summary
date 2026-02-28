import React from "react";
import { View, StyleSheet, useColorScheme } from "react-native";
import { useThemeColors } from "@/constants/colors";
import { SkeletonLine } from "./SkeletonLine";

interface SkeletonCardProps {
  lines?: number;
  style?: any;
}

export function SkeletonCard({ lines = 3, style }: SkeletonCardProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  const lineWidths = ["70%", "90%", "55%", "80%", "60%"];

  return (
    <View style={[styles.card, { backgroundColor: colors.secondaryBackground }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={lineWidths[i % lineWidths.length]}
          height={i === 0 ? 20 : 14}
          style={i > 0 ? { marginTop: 10 } : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 2,
  },
});
