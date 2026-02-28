import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Linking,
  Platform,
  useColorScheme,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useThemeColors, getPersonaAccent } from "@/constants/colors";
import { usePersona } from "@/contexts/PersonaContext";
import { useAuth } from "@/contexts/AuthContext";
import { ContentReveal } from "@/components/ContentReveal";
import { SkeletonCard } from "@/components/skeletons/SkeletonCard";
import { apiRequest } from "@/lib/query-client";
import type { AircraftProfile } from "@/shared/types";
import type { LoadingPhase } from "@/hooks/useAircraftProfile";
import type {
  PersonaIntelResponse,
  PersonaIntelResponseBase,
  OutreachEmail,
  OutreachSMS,
  FinanceResponse,
} from "@/shared/types/persona";

type SummaryState = "pre-generation" | "generating" | "generated";

interface SummaryTabProps {
  registration: string;
  profile: AircraftProfile | undefined;
  phase1Status: LoadingPhase;
  phase2Status: LoadingPhase;
  phase3Status: LoadingPhase;
}

const CHECKLIST_STEPS = [
  { label: "Aircraft identity", delay: 0 },
  { label: "Ownership chain", delay: 800 },
  { label: "Flight patterns", delay: 1600 },
  { label: "Contact ranking", delay: 2400 },
  { label: "Drafting outreach", delay: 3200 },
];

function ChecklistItem({
  label,
  delay,
  accentColor,
  colors,
}: {
  label: string;
  delay: number;
  accentColor: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [done, setDone] = useState(false);
  const opacity = useRef(new Animated.Value(0.4)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDone(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity, scale]);

  return (
    <Animated.View style={[checklistStyles.row, { opacity }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={done ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={done ? colors.systemGreen : colors.tertiaryLabel}
        />
      </Animated.View>
      <Text
        style={[
          checklistStyles.label,
          { color: done ? colors.primaryLabel : colors.tertiaryLabel },
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

const checklistStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
});

function DataReadinessBar({
  phase1Status,
  phase2Status,
  phase3Status,
  accentColor,
  colors,
}: {
  phase1Status: LoadingPhase;
  phase2Status: LoadingPhase;
  phase3Status: LoadingPhase;
  accentColor: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const phases = [phase1Status, phase2Status, phase3Status];
  const loadedCount = phases.filter((p) => p === "loaded").length;
  const progress = loadedCount / 3;

  return (
    <View style={readinessStyles.container}>
      <Text style={[readinessStyles.text, { color: colors.secondaryLabel }]}>
        {loadedCount} of 3 data sources loaded
      </Text>
      <View
        style={[readinessStyles.track, { backgroundColor: colors.separator }]}
      >
        <View
          style={[
            readinessStyles.fill,
            {
              backgroundColor: accentColor,
              width: `${progress * 100}%` as any,
            },
          ]}
        />
      </View>
    </View>
  );
}

const readinessStyles = StyleSheet.create({
  container: { gap: 6 },
  text: { fontSize: 13 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
});

function OutreachCard({
  type,
  email,
  sms,
  accentColor,
  colors,
}: {
  type: "email" | "sms";
  email?: OutreachEmail;
  sms?: OutreachSMS;
  accentColor: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const handleSend = () => {
    if (type === "email" && email) {
      const mailto = `mailto:${email.to.join(",")}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
      Linking.openURL(mailto);
    } else if (type === "sms" && sms) {
      const smsUri = `sms:${sms.to.join(",")}${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(sms.body)}`;
      Linking.openURL(smsUri);
    }
  };

  const handleCopy = async () => {
    const text =
      type === "email" && email
        ? `To: ${email.to.join(", ")}\nSubject: ${email.subject}\n\n${email.body}`
        : sms
          ? `To: ${sms.to.join(", ")}\n${sms.body}`
          : "";
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") {
      Alert.alert("Copied", "Outreach draft copied to clipboard.");
    }
  };

  if (type === "email" && email) {
    return (
      <View
        style={[outreachStyles.card, { backgroundColor: colors.secondaryBackground }]}
      >
        <View style={outreachStyles.header}>
          <Ionicons name="mail-outline" size={18} color={accentColor} />
          <Text style={[outreachStyles.title, { color: colors.primaryLabel }]}>
            Email Draft
          </Text>
        </View>
        <View
          style={[
            outreachStyles.nested,
            { backgroundColor: colors.tertiaryBackground },
          ]}
        >
          <Text style={[outreachStyles.fieldLabel, { color: colors.tertiaryLabel }]}>
            To
          </Text>
          <Text style={[outreachStyles.fieldValue, { color: colors.primaryLabel }]}>
            {email.to.join(", ")}
          </Text>
          <Text
            style={[
              outreachStyles.fieldLabel,
              { color: colors.tertiaryLabel, marginTop: 8 },
            ]}
          >
            Subject
          </Text>
          <Text style={[outreachStyles.fieldValue, { color: colors.primaryLabel }]}>
            {email.subject}
          </Text>
          <Text
            style={[
              outreachStyles.fieldLabel,
              { color: colors.tertiaryLabel, marginTop: 8 },
            ]}
          >
            Body
          </Text>
          <Text style={[outreachStyles.body, { color: colors.secondaryLabel }]}>
            {email.body}
          </Text>
        </View>
        <View style={outreachStyles.actions}>
          <TouchableOpacity
            style={[outreachStyles.actionBtn, { backgroundColor: accentColor }]}
            onPress={handleSend}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={outreachStyles.actionText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[outreachStyles.copyBtn, { borderColor: colors.separator }]}
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={16} color={colors.secondaryLabel} />
            <Text style={[outreachStyles.copyText, { color: colors.secondaryLabel }]}>
              Copy
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (type === "sms" && sms) {
    return (
      <View
        style={[outreachStyles.card, { backgroundColor: colors.secondaryBackground }]}
      >
        <View style={outreachStyles.header}>
          <Ionicons name="chatbubble-outline" size={18} color={accentColor} />
          <Text style={[outreachStyles.title, { color: colors.primaryLabel }]}>
            SMS Draft
          </Text>
        </View>
        <View
          style={[
            outreachStyles.nested,
            { backgroundColor: colors.tertiaryBackground },
          ]}
        >
          <Text style={[outreachStyles.fieldLabel, { color: colors.tertiaryLabel }]}>
            To
          </Text>
          <Text style={[outreachStyles.fieldValue, { color: colors.primaryLabel }]}>
            {sms.to.join(", ")}
          </Text>
          <Text
            style={[
              outreachStyles.fieldLabel,
              { color: colors.tertiaryLabel, marginTop: 8 },
            ]}
          >
            Message
          </Text>
          <Text style={[outreachStyles.body, { color: colors.secondaryLabel }]}>
            {sms.body}
          </Text>
        </View>
        <View style={outreachStyles.actions}>
          <TouchableOpacity
            style={[outreachStyles.actionBtn, { backgroundColor: accentColor }]}
            onPress={handleSend}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble" size={16} color="#fff" />
            <Text style={outreachStyles.actionText}>Open Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[outreachStyles.copyBtn, { borderColor: colors.separator }]}
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={16} color={colors.secondaryLabel} />
            <Text style={[outreachStyles.copyText, { color: colors.secondaryLabel }]}>
              Copy
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const outreachStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  nested: {
    borderRadius: 10,
    padding: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 14,
    marginTop: 2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  copyText: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
});

function ConfidenceMeter({
  score,
  explanations,
  missingData,
  accentColor,
  colors,
}: {
  score: number;
  explanations: string[];
  missingData: string[];
  accentColor: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score, barWidth]);

  return (
    <View style={[meterStyles.container, { backgroundColor: colors.secondaryBackground }]}>
      <View style={meterStyles.header}>
        <MaterialCommunityIcons name="shield-check" size={18} color={accentColor} />
        <Text style={[meterStyles.title, { color: colors.primaryLabel }]}>
          Data Confidence
        </Text>
        <Text style={[meterStyles.score, { color: accentColor }]}>
          {score}%
        </Text>
      </View>
      <View style={[meterStyles.track, { backgroundColor: colors.separator }]}>
        <Animated.View
          style={[
            meterStyles.fill,
            {
              backgroundColor: accentColor,
              width: barWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      {explanations.map((item, i) => (
        <View key={`e-${i}`} style={meterStyles.row}>
          <Ionicons name="checkmark-circle" size={14} color={colors.systemGreen} />
          <Text style={[meterStyles.itemText, { color: colors.secondaryLabel }]}>
            {item}
          </Text>
        </View>
      ))}
      {missingData.map((item, i) => (
        <View key={`m-${i}`} style={meterStyles.row}>
          <Ionicons name="warning" size={14} color={colors.systemOrange} />
          <Text style={[meterStyles.itemText, { color: colors.secondaryLabel }]}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const meterStyles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600" as const,
    flex: 1,
  },
  score: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  itemText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});

function extractOutreachDrafts(response: PersonaIntelResponse): {
  emails: OutreachEmail[];
  smses: OutreachSMS[];
} {
  const emails: OutreachEmail[] = [];
  const smses: OutreachSMS[] = [];

  if ("outreachDrafts" in response && response.outreachDrafts) {
    const drafts = response.outreachDrafts as Record<string, unknown>;
    for (const [key, value] of Object.entries(drafts)) {
      if (!value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      if ("subject" in v && "body" in v) {
        emails.push(v as unknown as OutreachEmail);
      } else if ("body" in v && !("subject" in v)) {
        smses.push(v as unknown as OutreachSMS);
      }
    }
  }

  return { emails, smses };
}

export function SummaryTab({
  registration,
  profile,
  phase1Status,
  phase2Status,
  phase3Status,
}: SummaryTabProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const { personaId, personaConfig } = usePersona();
  const { getLLMApiKey, llmProvider, isLLMConfigured, getSessionToken } = useAuth();
  const accent = getPersonaAccent(personaId ?? "", colorScheme);

  const [state, setState] = useState<SummaryState>("pre-generation");
  const [intelResponse, setIntelResponse] = useState<PersonaIntelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = phase1Status === "loaded" && isLLMConfigured;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || !registration || !llmProvider) return;

    setState("generating");
    setError(null);

    try {
      const apiKey = await getLLMApiKey();
      if (!apiKey) {
        setError("LLM API key not configured. Please set up in Settings.");
        setState("pre-generation");
        return;
      }

      const res = await apiRequest(
        "POST",
        `/api/aircraft/${encodeURIComponent(registration)}/persona-intel`,
        {
          personaId: personaId ?? "dealer_broker",
          provider: llmProvider,
          apiKey,
        }
      );

      const data = await res.json();
      setIntelResponse(data.aiResponse as PersonaIntelResponse);
      setState("generated");
    } catch (err: any) {
      setError(err.message || "Failed to generate analysis.");
      setState("pre-generation");
    }
  }, [canGenerate, registration, llmProvider, personaId, getLLMApiKey]);

  if (state === "pre-generation") {
    return (
      <View style={styles.scrollContent}>
        <View
          style={[
            styles.ctaCard,
            { backgroundColor: colors.secondaryBackground },
          ]}
        >
          <View style={styles.ctaIconRow}>
            <MaterialCommunityIcons
              name="text-box-search-outline"
              size={32}
              color={accent}
            />
          </View>
          <Text style={[styles.ctaTitle, { color: colors.primaryLabel }]}>
            Your {personaConfig?.label ?? "Persona"} analysis for{" "}
            {registration} is ready to generate
          </Text>

          <DataReadinessBar
            phase1Status={phase1Status}
            phase2Status={phase2Status}
            phase3Status={phase3Status}
            accentColor={accent}
            colors={colors}
          />

          {error ? (
            <Text style={[styles.errorText, { color: colors.systemOrange }]}>
              {error}
            </Text>
          ) : null}

          {!isLLMConfigured ? (
            <Text style={[styles.hintText, { color: colors.secondaryLabel }]}>
              Configure your LLM provider in Settings to generate analysis.
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.generateBtn,
              {
                backgroundColor: canGenerate ? accent : colors.separator,
              },
            ]}
            onPress={handleGenerate}
            disabled={!canGenerate}
            activeOpacity={0.7}
          >
            <Ionicons
              name="sparkles"
              size={18}
              color={canGenerate ? "#fff" : colors.tertiaryLabel}
            />
            <Text
              style={[
                styles.generateBtnText,
                { color: canGenerate ? "#fff" : colors.tertiaryLabel },
              ]}
            >
              Generate Analysis
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (state === "generating") {
    return (
      <View style={styles.scrollContent}>
        <View
          style={[
            styles.generatingCard,
            { backgroundColor: colors.secondaryBackground },
          ]}
        >
          <Text style={[styles.generatingTitle, { color: colors.primaryLabel }]}>
            Generating Analysis
          </Text>
          <Text style={[styles.generatingSubtitle, { color: colors.secondaryLabel }]}>
            Building your {personaConfig?.label ?? ""} intelligence report...
          </Text>
          <View style={styles.checklist}>
            {CHECKLIST_STEPS.map((step) => (
              <ChecklistItem
                key={step.label}
                label={step.label}
                delay={step.delay}
                accentColor={accent}
                colors={colors}
              />
            ))}
          </View>
          <SkeletonCard lines={4} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  if (!intelResponse) return null;

  const isFinance = personaId === "finance";
  const isFleetManagement = personaId === "fleet_management";
  const showOutreach = !isFleetManagement && !isFinance;
  const { emails, smses } = extractOutreachDrafts(intelResponse);
  const financeResponse = isFinance ? (intelResponse as FinanceResponse) : null;

  return (
    <View style={styles.scrollContent}>
      <ContentReveal visible={true} delay={0}>
        <View
          style={[
            styles.section,
            { backgroundColor: colors.secondaryBackground },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={18} color={accent} />
            <Text style={[styles.sectionTitle, { color: colors.primaryLabel }]}>
              Executive Summary
            </Text>
          </View>
          {intelResponse.executiveSummary.map((item, i) => (
            <Text
              key={i}
              style={[styles.bodyText, { color: colors.secondaryLabel }]}
            >
              {item}
            </Text>
          ))}
        </View>
      </ContentReveal>

      <ContentReveal visible={true} delay={120}>
        <View
          style={[
            styles.section,
            { backgroundColor: colors.secondaryBackground },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={18} color={accent} />
            <Text style={[styles.sectionTitle, { color: colors.primaryLabel }]}>
              {personaConfig?.label ?? "Persona"} Takeaways
            </Text>
          </View>
          {intelResponse.personaTakeaways.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <View
                style={[styles.bulletDot, { backgroundColor: accent }]}
              />
              <Text
                style={[styles.bulletText, { color: colors.secondaryLabel }]}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      </ContentReveal>

      {intelResponse.whoToContactFirst.length > 0 ? (
        <ContentReveal visible={true} delay={240}>
          <View
            style={[
              styles.section,
              { backgroundColor: colors.secondaryBackground },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={18} color={accent} />
              <Text
                style={[styles.sectionTitle, { color: colors.primaryLabel }]}
              >
                Contact First
              </Text>
            </View>
            {intelResponse.whoToContactFirst.map((contact, i) => (
              <View
                key={i}
                style={[
                  styles.contactFirstCard,
                  { backgroundColor: colors.tertiaryBackground },
                ]}
              >
                <Text
                  style={[styles.contactChannel, { color: accent }]}
                >
                  via {contact.recommendedChannel}
                </Text>
                <Text
                  style={[
                    styles.contactReason,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  {contact.reason}
                </Text>
              </View>
            ))}
          </View>
        </ContentReveal>
      ) : null}

      {showOutreach && (emails.length > 0 || smses.length > 0) ? (
        <ContentReveal visible={true} delay={360}>
          <View style={styles.outreachSection}>
            <Text
              style={[
                styles.outreachHeader,
                { color: colors.primaryLabel },
              ]}
            >
              Outreach Drafts
            </Text>
            {emails.map((email, i) => (
              <OutreachCard
                key={`email-${i}`}
                type="email"
                email={email}
                accentColor={accent}
                colors={colors}
              />
            ))}
            {smses.map((sms, i) => (
              <OutreachCard
                key={`sms-${i}`}
                type="sms"
                sms={sms}
                accentColor={accent}
                colors={colors}
              />
            ))}
          </View>
        </ContentReveal>
      ) : null}

      {intelResponse.recommendedNextActions.length > 0 ? (
        <ContentReveal visible={true} delay={480}>
          <View
            style={[
              styles.section,
              { backgroundColor: colors.secondaryBackground },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={18} color={accent} />
              <Text
                style={[styles.sectionTitle, { color: colors.primaryLabel }]}
              >
                Next Actions
              </Text>
            </View>
            {intelResponse.recommendedNextActions.map((action, i) => (
              <View key={i} style={styles.actionRow}>
                <Text style={[styles.actionNumber, { color: accent }]}>
                  {i + 1}
                </Text>
                <Text
                  style={[
                    styles.actionText,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  {action}
                </Text>
              </View>
            ))}
          </View>
        </ContentReveal>
      ) : null}

      <ContentReveal visible={true} delay={600}>
        <ConfidenceMeter
          score={intelResponse.dataConfidence.score}
          explanations={intelResponse.dataConfidence.explanation}
          missingData={intelResponse.dataConfidence.missingData}
          accentColor={accent}
          colors={colors}
        />
      </ContentReveal>

      {isFinance && financeResponse?.complianceFlags && financeResponse.complianceFlags.length > 0 ? (
        <ContentReveal visible={true} delay={720}>
          <View
            style={[
              styles.section,
              { backgroundColor: colors.secondaryBackground },
            ]}
          >
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="shield-alert-outline"
                size={18}
                color={colors.systemOrange}
              />
              <Text
                style={[styles.sectionTitle, { color: colors.primaryLabel }]}
              >
                Compliance Flags
              </Text>
            </View>
            {financeResponse.complianceFlags.map((flag, i) => {
              const severityColor =
                flag.severity === "high"
                  ? colors.systemRed
                  : flag.severity === "medium"
                    ? colors.systemOrange
                    : colors.secondaryLabel;
              return (
                <View
                  key={i}
                  style={[
                    styles.complianceRow,
                    { borderLeftColor: severityColor },
                  ]}
                >
                  <View style={styles.complianceHeader}>
                    <Text
                      style={[
                        styles.complianceCategory,
                        { color: colors.primaryLabel },
                      ]}
                    >
                      {flag.category}
                    </Text>
                    <Text
                      style={[
                        styles.complianceSeverity,
                        { color: severityColor },
                      ]}
                    >
                      {flag.severity.toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.complianceDetail,
                      { color: colors.secondaryLabel },
                    ]}
                  >
                    {flag.detail}
                  </Text>
                </View>
              );
            })}
          </View>
        </ContentReveal>
      ) : null}

      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  ctaCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  ctaIconRow: {
    marginBottom: 4,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    textAlign: "center" as const,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center" as const,
  },
  hintText: {
    fontSize: 13,
    textAlign: "center" as const,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  generatingCard: {
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
  generatingTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
  generatingSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  checklist: {
    gap: 2,
  },
  section: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 2,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  contactFirstCard: {
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  contactChannel: {
    fontSize: 13,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  contactReason: {
    fontSize: 14,
    lineHeight: 20,
  },
  outreachSection: {
    gap: 12,
  },
  outreachHeader: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  actionNumber: {
    fontSize: 14,
    fontWeight: "700" as const,
    width: 20,
    textAlign: "center" as const,
  },
  actionText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  complianceRow: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 6,
    gap: 2,
  },
  complianceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  complianceCategory: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  complianceSeverity: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  complianceDetail: {
    fontSize: 13,
    lineHeight: 18,
  },
});
