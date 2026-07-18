import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";
import { BRANCH_SOLVER_FEATURES } from "@/lib/constants";

export default function NewBranchSolverDoc() {
  const { feature } = useLocalSearchParams<{ feature: string }>();
  const meta = BRANCH_SOLVER_FEATURES[feature ?? ""];
  const client = useApiClient();
  const [questionText, setQuestionText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Camera access needed", "Enable it in Settings to photograph the question.");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      const { key, url } = await client.requestUploadUrl("jpg");
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
    if (!feature) return;
    if (!questionText.trim() && !uploadKey) return Alert.alert("Add the question", "Type it or take a photo.");
    setBusy(true);
    try {
      const { docId } = await client.createBranchSolverDoc({
        feature,
        questionText: questionText.trim() || undefined,
        instructions: instructions.trim() || undefined,
        uploadKey: uploadKey ?? undefined,
      });
      router.replace(`/branch-tools/${docId}`);
    } catch (err) {
      Alert.alert("Couldn't solve this", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, feature, questionText, instructions, uploadKey]);

  if (!meta) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas, padding: spacing.xl }}>
        <Stack.Screen options={{ title: "Branch Tools" }} />
        <Text style={{ fontFamily: font.sans, color: colors.muted }}>Unknown tool.</Text>
      </View>
    );
  }

  return (
    <ScrollScreen contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: meta.label }} />
      <Text style={styles.title}>{meta.label}</Text>
      <Text style={styles.subtitle}>{meta.blurb}</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Photo of the question</Text>
        <Pressable style={[styles.uploadButton, photoUri && styles.uploadButtonDone]} onPress={takePhoto} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.cyan} />
          ) : (
            <Text style={[styles.uploadButtonText, photoUri && styles.uploadButtonTextDone]}>{photoUri ? "Photo captured ✓" : "Take photo"}</Text>
          )}
        </Pressable>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Or type the question</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={questionText}
          onChangeText={setQuestionText}
          placeholder={meta.placeholder}
          placeholderTextColor={colors.faint}
          multiline
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Instructions (optional)</Text>
        <TextInput
          style={styles.input}
          value={instructions}
          onChangeText={setInstructions}
          placeholder="e.g. show working, use SI units"
          placeholderTextColor={colors.faint}
        />

        <Button label="Solve" onPress={submit} loading={busy} disabled={busy} style={{ marginTop: spacing.xl }} />
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
  uploadButtonDone: { borderColor: colors.cyan, backgroundColor: colors.cyanTint },
  uploadButtonText: { fontFamily: font.sansMedium, fontSize: 14, color: colors.muted },
  uploadButtonTextDone: { color: colors.cyan, fontFamily: font.sansSemibold },
  preview: { width: "100%", height: 180, borderRadius: radius.md, marginTop: spacing.sm },
});
