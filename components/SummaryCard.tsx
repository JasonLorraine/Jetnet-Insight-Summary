import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import type { AISummary } from "@/shared/types";

interface SummaryCardProps {
  summary: AISummary;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles-outline" size={18} color={colors.tint} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            AI Summary
          </Text>
        </View>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          {summary.summaryMarkdown}
        </Text>
      </View>

      {summary.keyInsights.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={16} color={colors.success} />
            <Text style={[styles.subTitle, { color: colors.text }]}>
              Key Insights
            </Text>
          </View>
          {summary.keyInsights.map((insight, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.bulletText, { color: colors.text }]}>
                {insight}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {summary.redFlags.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={[styles.subTitle, { color: colors.text }]}>
              Red Flags
            </Text>
          </View>
          {summary.redFlags.map((flag, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={[styles.bulletText, { color: colors.text }]}>
                {flag}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {summary.suggestedNextQuestions.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-outline" size={16} color={colors.accent} />
            <Text style={[styles.subTitle, { color: colors.text }]}>
              Next Questions
            </Text>
          </View>
          {summary.suggestedNextQuestions.map((q, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="arrow-forward-circle" size={14} color={colors.accent} />
              <Text style={[styles.bulletText, { color: colors.text }]}>
                {q}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
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
  subTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});
