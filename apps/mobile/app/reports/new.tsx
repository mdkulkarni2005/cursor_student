import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useApiClient } from "@/lib/api";

const REPORT_TYPES = [
  { value: "seminar", label: "Seminar Report" },
  { value: "mini-project", label: "Mini Project Report" },
  { value: "internship", label: "Internship Report" },
  { value: "lab", label: "Lab Report" },
  { value: "research", label: "Research Report" },
];

export default function NewReport() {
  const client = useApiClient();
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState(REPORT_TYPES[0].value);
  const [guidelines, setGuidelines] = useState("");
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickTemplate = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setBusy(true);
    try {
      const { key, url } = await client.requestUploadUrl("docx");
      const bytes = await fetch(asset.uri).then((r) => r.blob());
      await fetch(url, { method: "PUT", body: bytes, headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" } });
      setTemplateKey(key);
      setTemplateName(asset.name);
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client]);

  const submit = useCallback(async () => {
    if (title.trim().length < 4) return Alert.alert("Add a title", "At least 4 characters.");
    setBusy(true);
    try {
      const { docId } = await client.createReport({ title: title.trim(), reportType, guidelines: guidelines.trim() || undefined, templateKey: templateKey ?? undefined });
      router.replace(`/reports/${docId}`);
    } catch (err) {
      Alert.alert("Couldn't start generation", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, title, reportType, guidelines, templateKey]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: "New Report" }} />

      <Text style={styles.label}>Topic</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. IoT-based smart irrigation system" />

      <Text style={styles.label}>Report type</Text>
      <View style={styles.chipRow}>
        {REPORT_TYPES.map((t) => (
          <Pressable key={t.value} onPress={() => setReportType(t.value)} style={[styles.chip, reportType === t.value && styles.chipActive]}>
            <Text style={[styles.chipText, reportType === t.value && styles.chipTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Guidelines (optional)</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={guidelines} onChangeText={setGuidelines} multiline placeholder="Any specific instructions…" />

      <Text style={styles.label}>College template (optional)</Text>
      <Pressable style={styles.uploadButton} onPress={pickTemplate}>
        <Text style={styles.uploadButtonText}>{templateName ?? "Upload .docx template"}</Text>
      </Pressable>

      <Pressable style={styles.submitButton} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Generate</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12, fontSize: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "#ddd" },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 13, color: "#333" },
  chipTextActive: { color: "#fff" },
  uploadButton: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, alignItems: "center" },
  uploadButtonText: { fontSize: 14, color: "#333" },
  submitButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 28, marginBottom: 40 },
  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
