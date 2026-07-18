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

const SLIDE_COUNTS = [6, 8, 10, 12];

export default function NewPpt() {
  const client = useApiClient();
  const [title, setTitle] = useState("");
  const [slideCount, setSlideCount] = useState(8);
  const [guidelines, setGuidelines] = useState("");
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const pickTemplate = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      const { key, url } = await client.requestUploadUrl("pptx");
      // Not fetch(uri).then(r => r.blob()) — RN's Blob polyfill can't build a Blob from a local
      // file:// URI ("Creating blobs from 'ArrayBuffer' ... are not supported"). uploadAsync
      // streams the file directly instead. See onboarding.tsx for the same fix.
      await FileSystem.uploadAsync(url, asset.uri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
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
    if (title.trim().length < 4) return Alert.alert("Add a topic", "At least 4 characters.");
    setBusy(true);
    try {
      const { docId } = await client.createPpt({ title: title.trim(), slideCount, guidelines: guidelines.trim() || undefined, templateKey: templateKey ?? undefined });
      router.replace(`/ppt/${docId}`);
    } catch (err) {
      Alert.alert("Couldn't start generation", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, title, slideCount, guidelines, templateKey]);

  return (
    <ScrollScreen contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "New Presentation" }} />
      <Text style={styles.title}>Build a deck</Text>
      <Text style={styles.subtitle}>Give us a topic — AI drafts slides, speaker notes, and visuals for you.</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Presentation topic</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Smart Energy Meter using IoT"
          placeholderTextColor={colors.faint}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Number of slides</Text>
        <View style={styles.chipRow}>
          {SLIDE_COUNTS.map((n) => (
            <Pressable key={n} onPress={() => setSlideCount(n)} style={[styles.chip, slideCount === n && styles.chipActive]}>
              <Text style={[styles.chipText, slideCount === n && styles.chipTextActive]}>{n} slides</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Guidelines (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={guidelines}
          onChangeText={setGuidelines}
          multiline
          placeholder="Anything specific to cover or emphasize…"
          placeholderTextColor={colors.faint}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>College template (optional)</Text>
        <Pressable style={[styles.uploadButton, templateName && styles.uploadButtonDone]} onPress={pickTemplate} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.primaryDeep} />
          ) : (
            <Text style={[styles.uploadButtonText, templateName && styles.uploadButtonTextDone]} numberOfLines={1}>
              {templateName ? `${templateName} ✓` : "Upload .pptx template"}
            </Text>
          )}
        </Pressable>
        <Text style={styles.hint}>We match your template&apos;s brand colors and fonts — your format stays intact.</Text>

        <Button label="Generate PPT" onPress={submit} loading={busy} disabled={busy} style={{ marginTop: spacing.xl }} />
        <Text style={styles.footnote}>Speaker notes included · exported as PPTX</Text>
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
  chipActive: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep },
  chipText: { fontFamily: font.sansMedium, fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.onAccent, fontFamily: font.sansSemibold },
  uploadButton: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", backgroundColor: colors.surface },
  uploadButtonDone: { borderColor: colors.primaryDeep, backgroundColor: colors.indigoTint },
  uploadButtonText: { fontFamily: font.sansMedium, fontSize: 14, color: colors.muted },
  uploadButtonTextDone: { color: colors.primaryDeep, fontFamily: font.sansSemibold },
  hint: { fontFamily: font.sans, fontSize: 11.5, color: colors.faint, marginTop: spacing.sm, lineHeight: 16 },
  footnote: { fontFamily: font.sans, fontSize: 11.5, color: colors.faint, textAlign: "center", marginTop: spacing.md },
});
