import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";
import { LifeBuoyIcon } from "@/components/icons";

export default function Support() {
  const client = useApiClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = useCallback(async () => {
    if (!subject.trim() || !message.trim()) return Alert.alert("Fill in both fields", "Add a subject and describe the issue.");
    setBusy(true);
    try {
      await client.createSupportTicket({ subject: subject.trim(), message: message.trim() });
      setSent(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      Alert.alert("Couldn't send", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }, [client, subject, message]);

  return (
    <ScrollScreen contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Support" }} />
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <LifeBuoyIcon size={20} color={colors.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Get help</Text>
          <Text style={styles.subtitle}>Open a ticket and our team will get back to you by email.</Text>
        </View>
      </View>

      {sent ? (
        <Card style={styles.successCard}>
          <Text style={styles.successText}>Ticket sent — we'll follow up by email.</Text>
          <Button label="Send another" variant="secondary" onPress={() => setSent(false)} style={{ marginTop: spacing.md }} />
        </Card>
      ) : (
        <Card>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Can't download my resume PDF"
            placeholderTextColor={colors.faint}
          />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe what's going wrong…"
            placeholderTextColor={colors.faint}
            multiline
          />

          <Button label="Send ticket" onPress={submit} loading={busy} disabled={busy} style={{ marginTop: spacing.xl }} />
        </Card>
      )}

      <Text style={styles.footNote} onPress={() => router.push("/(app)/settings")}>
        Just want to leave quick feedback? Use “Send feedback” in Settings instead.
      </Text>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", marginBottom: spacing.lg },
  iconBadge: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.cyanTint, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.display, fontSize: 20, color: colors.ink },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  label: { fontFamily: font.sansSemibold, fontSize: 13, color: colors.ink, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: spacing.md, fontFamily: font.sans, fontSize: 15, color: colors.ink, backgroundColor: colors.input },
  textArea: { height: 120, textAlignVertical: "top" },
  successCard: { alignItems: "center", padding: spacing.xl },
  successText: { fontFamily: font.sansMedium, fontSize: 14, color: colors.ink, textAlign: "center" },
  footNote: { fontFamily: font.sans, fontSize: 12, color: colors.muted, marginTop: spacing.lg, textAlign: "center", lineHeight: 17 },
});
