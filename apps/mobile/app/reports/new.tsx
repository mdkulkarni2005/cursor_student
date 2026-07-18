import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";

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
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const pickTemplate = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      const { key, url } = await client.requestUploadUrl("docx");
      // Not fetch(uri).then(r => r.blob()) — RN's Blob polyfill can't build a Blob from a local
      // file:// URI ("Creating blobs from 'ArrayBuffer' ... are not supported"). uploadAsync
      // streams the file directly instead. See onboarding.tsx for the same fix.
      await FileSystem.uploadAsync(url, asset.uri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      });
      setTemplateKey(key);
      setTemplateName(asset.name);
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setUploading(false);
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
    <ScrollScreen contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "New Report" }} />
      <Text style={styles.title}>Generate a report</Text>
      <Text style={styles.subtitle}>Give us a topic and a few details — AI drafts a complete, college-format report.</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Topic</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. IoT-based smart irrigation system"
          placeholderTextColor={colors.faint}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Report type</Text>
        <View style={styles.chipRow}>
          {REPORT_TYPES.map((t) => (
            <Pressable key={t.value} onPress={() => setReportType(t.value)} style={[styles.chip, reportType === t.value && styles.chipActive]}>
              <Text style={[styles.chipText, reportType === t.value && styles.chipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Guidelines (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={guidelines}
          onChangeText={setGuidelines}
          multiline
          placeholder="Any specific instructions…"
          placeholderTextColor={colors.faint}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>College template (optional)</Text>
        <Pressable style={[styles.uploadButton, templateName && styles.uploadButtonDone]} onPress={pickTemplate} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.teal} />
          ) : (
            <Text style={[styles.uploadButtonText, templateName && styles.uploadButtonTextDone]} numberOfLines={1}>
              {templateName ? `${templateName} ✓` : "Upload .docx template"}
            </Text>
          )}
        </Pressable>

        <Button label="Generate" onPress={submit} loading={busy} disabled={busy} style={{ marginTop: spacing.xl }} />
      </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.display, fontSize: 22, color: colors.ink },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 18 },
  card: {},
  label: { fontFamily: font.sansSemibold, fontSize: 13, color: colors.ink, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: spacing.md, fontFamily: font.sans, fontSize: 15, color: colors.ink, backgroundColor: colors.input },
  textArea: { height: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontFamily: font.sansMedium, fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.onAccent, fontFamily: font.sansSemibold },
  uploadButton: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", backgroundColor: colors.surface },
  uploadButtonDone: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  uploadButtonText: { fontFamily: font.sansMedium, fontSize: 14, color: colors.muted },
  uploadButtonTextDone: { color: colors.teal, fontFamily: font.sansSemibold },
});
