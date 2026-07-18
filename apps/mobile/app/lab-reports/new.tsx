import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { router, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";

export default function NewLabReport() {
  const client = useApiClient();
  const [readingsText, setReadingsText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Camera access needed", "Enable it in Settings to photograph your readings.");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      const { key, url } = await client.requestUploadUrl("jpg");
      // Not fetch(uri).then(r => r.blob()) — RN's Blob polyfill can't build a Blob from a local
      // file:// URI ("Creating blobs from 'ArrayBuffer' ... are not supported"). uploadAsync
      // streams the file directly instead. See onboarding.tsx for the same fix.
      await FileSystem.uploadAsync(url, asset.uri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": "image/jpeg" },
      });
      setPhotoUri(asset.uri);
      setUploadKey(key);
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setUploading(false);
    }
  }, [client]);

  const submit = useCallback(async () => {
    if (!readingsText.trim() && !uploadKey) return Alert.alert("Add your readings", "Type them or take a photo.");
    setBusy(true);
    try {
      const { docId } = await client.createLabReport({ readingsText: readingsText.trim() || undefined, instructions: instructions.trim() || undefined, uploadKey: uploadKey ?? undefined });
      router.replace(`/lab-reports/${docId}`);
    } catch (err) {
      Alert.alert("Couldn't generate", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, readingsText, instructions, uploadKey]);

  return (
    <ScrollScreen contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "New Lab Report" }} />
      <Text style={styles.title}>Generate a lab report</Text>
      <Text style={styles.subtitle}>Photograph your observation table or type your raw readings — AI writes it up in college format.</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Photo of your observation table / graph</Text>
        <Pressable style={[styles.uploadButton, photoUri && styles.uploadButtonDone]} onPress={takePhoto} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.teal} />
          ) : (
            <Text style={[styles.uploadButtonText, photoUri && styles.uploadButtonTextDone]}>{photoUri ? "Photo captured ✓" : "Take photo"}</Text>
          )}
        </Pressable>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Or type your raw readings</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={readingsText}
          onChangeText={setReadingsText}
          multiline
          placeholder="Trial 1: 0.4A, Trial 2: 0.6A…"
          placeholderTextColor={colors.faint}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Instructions (optional)</Text>
        <TextInput
          style={styles.input}
          value={instructions}
          onChangeText={setInstructions}
          placeholder="e.g. include error analysis"
          placeholderTextColor={colors.faint}
        />

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
  textArea: { height: 90, textAlignVertical: "top" },
  uploadButton: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", backgroundColor: colors.surface },
  uploadButtonDone: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  uploadButtonText: { fontFamily: font.sansMedium, fontSize: 14, color: colors.muted },
  uploadButtonTextDone: { color: colors.teal, fontFamily: font.sansSemibold },
  preview: { width: "100%", height: 180, borderRadius: radius.md, marginTop: spacing.sm },
});
