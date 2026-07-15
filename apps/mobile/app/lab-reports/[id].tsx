import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useApiClient } from "@/lib/api";
import { useGeneratedDoc } from "@/lib/use-generated-doc";

export default function LabReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const fetchDoc = useCallback(() => client.getLabReport(id), [client, id]);
  const { doc, error, refresh } = useGeneratedDoc(fetchDoc);
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = useCallback(async () => {
    if (!followUp.trim()) return;
    setBusy(true);
    try {
      await client.askLabReport(id, { message: followUp.trim() });
      setFollowUp("");
      refresh();
    } finally {
      setBusy(false);
    }
  }, [client, id, followUp, refresh]);

  const content = doc?.content as { conclusion?: string; sections?: { heading: string; content: string }[] } | null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: doc?.title ?? "Lab Report" }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!doc ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}

      {doc?.status === "GENERATING" || doc?.status === "QUEUED" ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.stageText}>Generating…</Text>
        </View>
      ) : null}

      {doc?.status === "READY" ? (
        <View>
          {content?.sections?.map((s, i) => (
            <View key={i} style={{ marginBottom: 14 }}>
              <Text style={styles.sectionHeading}>{s.heading}</Text>
              <Text style={styles.body}>{s.content}</Text>
            </View>
          ))}

          <Text style={styles.section}>Ask a follow-up</Text>
          <TextInput style={styles.input} value={followUp} onChangeText={setFollowUp} placeholder="e.g. add error analysis" />
          <Pressable style={styles.primaryButton} onPress={ask} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Ask</Text>}
          </Pressable>
        </View>
      ) : null}

      {doc?.status === "FAILED" ? <Text style={styles.error}>{doc.error ?? "Couldn't generate — please try again."}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", marginTop: 40 },
  stageText: { marginTop: 12, color: "#666" },
  sectionHeading: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  body: { fontSize: 14, color: "#333", lineHeight: 20 },
  section: { fontSize: 15, fontWeight: "700", marginTop: 24, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12, fontSize: 15 },
  primaryButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 12, marginBottom: 40 },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  error: { color: "#e11d48", marginBottom: 12 },
});
