import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/constants/colors";

export default function SetupLLMScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const { saveLLMConfig, llmProvider, isLLMConfigured } = useAuth();

  const [provider, setProvider] = useState<"openai" | "anthropic">(llmProvider || "openai");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      const msg = "API key is required.";
      if (Platform.OS !== "web") Alert.alert("Missing Key", msg);
      return;
    }

    setSaving(true);
    try {
      await saveLLMConfig(provider, apiKey.trim());
      router.back();
    } catch (err: any) {
      if (Platform.OS !== "web") Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.form}>
        <View style={styles.header}>
          <Ionicons name="sparkles-outline" size={32} color={colors.tint} />
          <Text style={[styles.headerText, { color: colors.text }]}>
            AI Summary Configuration
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            Provide your own API key to generate AI-powered broker summaries.
            Keys are stored securely on your device.
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Provider</Text>
        <View style={styles.providerRow}>
          <TouchableOpacity
            style={[
              styles.providerOption,
              {
                backgroundColor:
                  provider === "openai" ? colors.tint + "22" : colors.surfaceSecondary,
                borderColor: provider === "openai" ? colors.tint : colors.border,
              },
            ]}
            onPress={() => setProvider("openai")}
          >
            <Text
              style={[
                styles.providerText,
                { color: provider === "openai" ? colors.tint : colors.text },
              ]}
            >
              OpenAI
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.providerOption,
              {
                backgroundColor:
                  provider === "anthropic" ? colors.tint + "22" : colors.surfaceSecondary,
                borderColor: provider === "anthropic" ? colors.tint : colors.border,
              },
            ]}
            onPress={() => setProvider("anthropic")}
          >
            <Text
              style={[
                styles.providerText,
                { color: provider === "anthropic" ? colors.tint : colors.text },
              ]}
            >
              Anthropic
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>API Key</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder={provider === "openai" ? "sk-..." : "sk-ant-..."}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save Configuration"}
          </Text>
        </TouchableOpacity>

        {isLLMConfigured ? (
          <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              Already configured — go back
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  form: {
    gap: 16,
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  subText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 320,
  },
  label: {
    fontSize: 13,
    fontWeight: "500" as const,
    marginLeft: 4,
  },
  providerRow: {
    flexDirection: "row",
    gap: 12,
  },
  providerOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  providerText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  inputGroup: {
    gap: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 14,
    marginTop: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
  },
});
