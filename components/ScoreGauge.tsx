import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { getScoreColor, useThemeColors } from "@/constants/colors";

interface ScoreGaugeProps {
  score: number;
  label: "HOT" | "WARM" | "NEUTRAL" | "COLD";
  size?: "small" | "large";
}

export function ScoreGauge({ score, label, size = "large" }: ScoreGaugeProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const scoreColor = getScoreColor(score, colorScheme);

  if (size === "small") {
    return (
      <View style={[styles.pillContainer, { backgroundColor: scoreColor + "22" }]}>
        <Text style={[styles.pillScore, { color: scoreColor }]}>{score}</Text>
        <Text style={[styles.pillLabel, { color: scoreColor }]}>{label}</Text>
      </View>
    );
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <View style={styles.container}>
      <View style={styles.gaugeOuter}>
        <View
          style={[
            styles.gaugeRing,
            {
              borderColor: scoreColor + "33",
              width: radius * 2 + 16,
              height: radius * 2 + 16,
              borderRadius: radius + 8,
            },
          ]}
        >
          <View
            style={[
              styles.gaugeInner,
              {
                backgroundColor: scoreColor + "15",
                width: radius * 2,
                height: radius * 2,
                borderRadius: radius,
              },
            ]}
          >
            <Text style={[styles.scoreText, { color: scoreColor }]}>{score}</Text>
            <Text style={[styles.labelText, { color: scoreColor }]}>{label}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function ScorePill({ score, label }: { score: number; label: string }) {
  const colorScheme = useColorScheme();
  const scoreColor = getScoreColor(score, colorScheme);

  return (
    <View style={[styles.pillContainer, { backgroundColor: scoreColor + "22" }]}>
      <Text style={[styles.pillScore, { color: scoreColor }]}>{score}</Text>
      <Text style={[styles.pillLabel, { color: scoreColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 16,
  },
  gaugeOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeRing: {
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 44,
    fontWeight: "700" as const,
    letterSpacing: -1,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "600" as const,
    letterSpacing: 2,
    marginTop: 2,
  },
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pillScore: {
    fontSize: 14,
    fontWeight: "700" as const,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 1,
  },
});
