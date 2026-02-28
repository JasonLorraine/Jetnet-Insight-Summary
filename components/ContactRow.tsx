import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  useColorScheme,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useThemeColors } from "@/constants/colors";
import type { Contact, BrokerContact } from "@/shared/types";

const BADGE_COLORS: Record<string, string> = {
  "Owner Rep": "#30D158",
  "Owner": "#30D158",
  "Operator": "#FF9F0A",
  "Management": "#0A84FF",
  "DOM": "#5E5CE6",
  "Chief Pilot": "#BF5AF2",
  "Scheduler": "#64D2FF",
  "Controller/CFO": "#FF375F",
  "CFO": "#FF375F",
  "Director of Aviation": "#AC8E68",
};

const ROLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Owner Rep": "person",
  "Owner": "person",
  "Operator": "airplane",
  "Management": "briefcase",
  "DOM": "construct",
  "Chief Pilot": "navigate",
  "Scheduler": "calendar",
  "Controller/CFO": "cash",
  "CFO": "cash",
  "Director of Aviation": "shield",
};

const LEGACY_ROLE_CONFIG: Record<
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
    ? encodeURIComponent(`Quick question on ${registration}`)
    : "";
  const url = subject ? `mailto:${email}?subject=${subject}` : `mailto:${email}`;
  const supported = await Linking.canOpenURL("mailto:");
  if (!supported) return;
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  Linking.openURL(url);
}

function buildVCardText(contact: BrokerContact): string {
  const lines: string[] = [];
  lines.push(`${contact.firstName} ${contact.lastName}`);
  if (contact.title) lines.push(contact.title);
  lines.push(contact.companyName);
  if (contact.roleBadge) lines.push(`Role: ${contact.roleBadge}`);
  if (contact.emails.length > 0) lines.push(`Email: ${contact.emails.join(", ")}`);
  if (contact.phones.mobile) lines.push(`Mobile: ${contact.phones.mobile}`);
  if (contact.phones.work) lines.push(`Work: ${contact.phones.work}`);
  return lines.join("\n");
}

interface ContactRowProps {
  contact: Contact;
  aircraftRegistration?: string;
}

interface BrokerContactRowProps {
  contact: BrokerContact;
  aircraftRegistration?: string;
}

export function ContactRow({ contact, aircraftRegistration }: ContactRowProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const role = LEGACY_ROLE_CONFIG[contact.roleSignal];

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
          {contact.companyName ? (
            <Text style={[styles.companyText, { color: colors.textSecondary }]} numberOfLines={1}>
              {contact.companyName}
            </Text>
          ) : null}
        </View>
        <View style={[styles.roleBadge, { backgroundColor: role.color + "18" }]}>
          <Text style={[styles.roleText, { color: role.color }]}>
            {contact.roleBadge || contact.roleSignal}
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
            </TouchableOpacity>
          ) : null}

          {hasMobile ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => handleText(contact.mobilePhone!, aircraftRegistration)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble" size={16} color="#0A84FF" />
            </TouchableOpacity>
          ) : null}

          {hasEmail ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => handleEmail(contact.email!, aircraftRegistration)}
              activeOpacity={0.7}
            >
              <Ionicons name="mail" size={16} color="#FF9F0A" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function BrokerContactRow({ contact, aircraftRegistration }: BrokerContactRowProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const [showAddContact, setShowAddContact] = useState(false);

  const badgeColor = BADGE_COLORS[contact.roleBadge] || "#8E8E93";
  const badgeIcon = ROLE_ICONS[contact.roleBadge] || ("person" as keyof typeof Ionicons.glyphMap);

  const hasCall = !!(contact.phones.work || contact.phones.mobile);
  const hasMobile = !!contact.phones.mobile;
  const hasEmail = contact.emails.length > 0;
  const hasName = !!(contact.firstName || contact.lastName);

  const callPhone = contact.phones.mobile || contact.phones.work || "";
  const primaryEmail = contact.emails[0] || "";
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();

  async function handleAddToContacts() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (Platform.OS === "web") {
      const text = buildVCardText(contact);
      try {
        await Clipboard.setStringAsync(text);
        Alert.alert("Copied", "Contact details copied to clipboard");
      } catch {
        Alert.alert("Contact Details", text);
      }
    } else {
      setShowAddContact(true);
    }
  }

  function handleCloseModal() {
    setShowAddContact(false);
  }

  async function handleCopyFromModal() {
    const text = buildVCardText(contact);
    try {
      await Clipboard.setStringAsync(text);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
    setShowAddContact(false);
  }

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: badgeColor + "22" }]}>
          <Ionicons name={badgeIcon} size={14} color={badgeColor} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {fullName}
          </Text>
          {contact.title ? (
            <Text style={[styles.titleText, { color: colors.textSecondary }]} numberOfLines={1}>
              {contact.title}
            </Text>
          ) : null}
          <Text style={[styles.companyText, { color: colors.textSecondary }]} numberOfLines={1}>
            {contact.companyName}
          </Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: badgeColor + "18" }]}>
          <Text style={[styles.roleText, { color: badgeColor }]}>
            {contact.roleBadge}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {hasCall ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => handleCall(callPhone)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={16} color="#30D158" />
          </TouchableOpacity>
        ) : null}

        {hasMobile ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => handleText(contact.phones.mobile!, aircraftRegistration)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble" size={16} color="#0A84FF" />
          </TouchableOpacity>
        ) : null}

        {hasEmail ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => handleEmail(primaryEmail, aircraftRegistration)}
            activeOpacity={0.7}
          >
            <Ionicons name="mail" size={16} color="#FF9F0A" />
          </TouchableOpacity>
        ) : null}

        {hasName ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={handleAddToContacts}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={16} color="#5E5CE6" />
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={showAddContact}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Contact Details</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.modalField, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Name</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>{fullName}</Text>
              </View>

              {contact.title ? (
                <View style={[styles.modalField, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Title</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{contact.title}</Text>
                </View>
              ) : null}

              <View style={[styles.modalField, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Company</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>{contact.companyName}</Text>
              </View>

              <View style={[styles.modalField, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Role</Text>
                <Text style={[styles.modalValue, { color: badgeColor }]}>{contact.roleBadge}</Text>
              </View>

              {hasEmail ? (
                <View style={[styles.modalField, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Email</Text>
                  <Text style={[styles.modalValue, { color: colors.accent }]}>{contact.emails.join(", ")}</Text>
                </View>
              ) : null}

              {contact.phones.mobile ? (
                <View style={[styles.modalField, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Mobile</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{contact.phones.mobile}</Text>
                </View>
              ) : null}

              {contact.phones.work ? (
                <View style={[styles.modalField, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Work</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{contact.phones.work}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.copyButton, { backgroundColor: "#5E5CE6" }]}
              onPress={handleCopyFromModal}
              activeOpacity={0.7}
            >
              <Ionicons name="copy" size={18} color="#FFFFFF" />
              <Text style={styles.copyButtonText}>Copy Contact Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  companyText: {
    fontSize: 12,
    marginTop: 1,
    fontStyle: "italic" as const,
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
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalField: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalValue: {
    fontSize: 15,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
});
