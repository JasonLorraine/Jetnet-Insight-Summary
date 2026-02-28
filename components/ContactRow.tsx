import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/constants/colors";
import type { Contact } from "@/shared/types";

interface ContactRowProps {
  contact: Contact;
  aircraftRegistration?: string;
}

const ROLE_CONFIG: Record<
  Contact["roleSignal"],
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  "Decision Maker": { icon: "person", color: "#30D158" },
  Influencer: { icon: "airplane", color: "#FF9F0A" },
  Operational: { icon: "build", color: "#0A84FF" },
};

function cleanPhone(raw: string): string {
  return raw.replace(/[^+\d]/g, "");
}

async function handleCall(phone: string) {
  const cleaned = cleanPhone(phone);
  if (!cleaned) return;
  const url = `tel:${cleaned}`;
  const supported = await Linking.canOpenURL(url);
  if (!supported) return;
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  Linking.openURL(url);
}

async function handleText(phone: string, registration?: string) {
  const cleaned = cleanPhone(phone);
  if (!cleaned) return;
  const body = registration
    ? encodeURIComponent(`Regarding aircraft ${registration}`)
    : "";
  const sep = Platform.OS === "ios" ? "&" : "?";
  const url = body ? `sms:${cleaned}${sep}body=${body}` : `sms:${cleaned}`;
  const supported = await Linking.canOpenURL(`sms:${cleaned}`);
  if (!supported) return;
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  Linking.openURL(url);
}

async function handleEmail(email: string, registration?: string) {
  const subject = registration
    ? encodeURIComponent(`Regarding Aircraft ${registration}`)
    : "";
  const url = subject ? `mailto:${email}?subject=${subject}` : `mailto:${email}`;
  const supported = await Linking.canOpenURL("mailto:");
  if (!supported) return;
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  Linking.openURL(url);
}

export function ContactRow({ contact, aircraftRegistration }: ContactRowProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const role = ROLE_CONFIG[contact.roleSignal];

  const hasPhone = !!contact.phone;
  const hasMobile = !!contact.mobilePhone;
  const hasEmail = !!contact.email;
  const hasActions = hasPhone || hasMobile || hasEmail;

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={styles.topRow}>
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

      {hasActions ? (
        <View style={styles.actionsRow}>
          {hasPhone ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => handleCall(contact.phone!)}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={16} color="#30D158" />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Call</Text>
            </TouchableOpacity>
          ) : null}

          {hasMobile ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => handleText(contact.mobilePhone!, aircraftRegistration)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble" size={16} color="#0A84FF" />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Text</Text>
            </TouchableOpacity>
          ) : null}

          {hasEmail ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => handleEmail(contact.email!, aircraftRegistration)}
              activeOpacity={0.7}
            >
              <Ionicons name="mail" size={16} color="#FF9F0A" />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
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
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingLeft: 42,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
});
