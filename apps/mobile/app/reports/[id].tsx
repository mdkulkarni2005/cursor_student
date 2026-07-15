import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { ClarifyQuestion } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { useGeneratedDoc } from "@/lib/use-generated-doc";

const STAGE_LABEL: Record<string, string> = { draft: "Drafting your report", review: "Checking for missing details", format: "Formatting & finalizing" };

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const fetchDoc = useCallback(() => client.getReport(id), [client, id]);
  const { doc, error, refresh } = useGeneratedDoc(fetchDoc);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submitAnswers = useCallback(async () => {
    setBusy(true);
    try {
      await client.resumeReport(id, answers);
      refresh();
    } finally {
      setBusy(false);
    }
  }, [client, id, answers, refresh]);

  const download = useCallback(async () => {
    try {
      const { url } = await client.reportDownloadUrl(id);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert("Couldn't download", err instanceof Error ? err.message : "Try again.");
    }
  }, [client, id]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: doc?.title ?? "Report" }} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!doc ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}

      {doc?.status === "GENERATING" || doc?.status === "QUEUED" ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.stageText}>{STAGE_LABEL[doc.stage ?? ""] ?? "Working on it…"}</Text>
        </View>
      ) : null}

      {doc?.status === "NEEDS_INPUT" && doc.questions ? (
        <View>
          <Text style={styles.section}>A couple of quick questions</Text>
          {(doc.questions as ClarifyQuestion[]).map((q) => (
            <View key={q.id} style={{ marginBottom: 14 }}>
              <Text style={styles.label}>{q.question}</Text>
              <TextInput
                style={styles.input}
                value={answers[q.id] ?? ""}
                onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                placeholder={q.options.length ? q.options.join(" / ") : "Your answer"}
              />
            </View>
          ))}
          <Pressable style={styles.primaryButton} onPress={submitAnswers} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Continue generating</Text>}
          </Pressable>
        </View>
      ) : null}

      {doc?.status === "READY" ? (
        <View>
          <Text style={styles.section}>Ready</Text>
          <Text style={styles.body}>{(doc.content as { abstract?: string })?.abstract ?? "Report generated successfully."}</Text>
          <Pressable style={styles.primaryButton} onPress={download}>
            <Text style={styles.primaryButtonText}>Download .docx</Text>
          </Pressable>
        </View>
      ) : null}

      {doc?.status === "FAILED" ? <Text style={styles.error}>{doc.error ?? "Generation failed — please try again."}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", marginTop: 40 },
  stageText: { marginTop: 12, color: "#666" },
  section: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12, fontSize: 15 },
  body: { fontSize: 14, color: "#333", lineHeight: 20, marginBottom: 20 },
  primaryButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  error: { color: "#e11d48", marginBottom: 12 },
});
