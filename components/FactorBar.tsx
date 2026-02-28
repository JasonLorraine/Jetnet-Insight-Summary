import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { useThemeColors, getScoreColor } from "@/constants/colors";

interface FactorBarProps {
  name: string;
  value: number;
  maxValue?: number;
  weight?: number;
  explanation?: string;
}

export function FactorBar({ name, value, maxValue = 1, weight, explanation }: FactorBarProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const percent = Math.min(1, value / maxValue);
  const barColor = getScoreColor(percent * 100, colorScheme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        {weight !== undefined ? (
          <Text style={[styles.weight, { color: colors.textSecondary }]}>
            {Math.round(weight * 100)}%
          </Text>
        ) : null}
      </View>
      <View style={[styles.barBg, { backgroundColor: colors.surfaceSecondary }]}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              width: `${Math.round(percent * 100)}%`,
            },
          ]}
        />
      </View>
      {explanation ? (
        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
          {explanation}
        </Text>
      ) : null}
    </View>
  );
}

export function DispositionFactorBar({
  name,
  score,
  maxScore,
  explanation,
}: {
  name: string;
  score: number;
  maxScore: number;
  explanation: string;
}) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const percent = maxScore > 0 ? score / maxScore : 0;
  const barColor = getScoreColor(percent * 100, colorScheme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.weight, { color: colors.textSecondary }]}>
          {score}/{maxScore}
        </Text>
      </View>
      <View style={[styles.barBg, { backgroundColor: colors.surfaceSecondary }]}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              width: `${Math.round(percent * 100)}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.explanation, { color: colors.textSecondary }]}>
        {explanation}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  weight: {
    fontSize: 12,
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  explanation: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
});
