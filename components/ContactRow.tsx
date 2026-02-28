import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import type { Contact } from "@/shared/types";

interface ContactRowProps {
  contact: Contact;
}

const ROLE_CONFIG: Record<
  Contact["roleSignal"],
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  "Decision Maker": { icon: "person", color: "#30D158" },
  Influencer: { icon: "airplane", color: "#FF9F0A" },
  Operational: { icon: "build", color: "#0A84FF" },
};

export function ContactRow({ contact }: ContactRowProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const role = ROLE_CONFIG[contact.roleSignal];

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={[styles.iconCircle, { backgroundColor: role.color + "22" }]}>
        <Ionicons name={role.icon} size={14} color={role.color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {contact.contactName}
        </Text>
        {contact.title ? (
          <Text style={[styles.titleText, { color: colors.textSecondary }]} numberOfLines={1}>
            {contact.title}
          </Text>
        ) : null}
      </View>
      <View style={[styles.roleBadge, { backgroundColor: role.color + "18" }]}>
        <Text style={[styles.roleText, { color: role.color }]}>
          {contact.roleSignal}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  titleText: {
    fontSize: 13,
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
});
