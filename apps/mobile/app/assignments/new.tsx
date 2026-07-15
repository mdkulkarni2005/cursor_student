import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { router, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useApiClient } from "@/lib/api";

/** Mobile's camera is a genuinely better fit here than the web upload flow. */
export default function NewAssignment() {
  const client = useApiClient();
  const [questionText, setQuestionText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Camera access needed", "Enable it in Settings to photograph the question.");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setBusy(true);
    try {
      const { key, url } = await client.requestUploadUrl("jpg");
      const bytes = await fetch(asset.uri).then((r) => r.blob());
      await fetch(url, { method: "PUT", body: bytes, headers: { "Content-Type": "image/jpeg" } });
      setPhotoUri(asset.uri);
      setUploadKey(key);
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client]);

  const submit = useCallback(async () => {
    if (!questionText.trim() && !uploadKey) return Alert.alert("Add the question", "Type it or take a photo.");
    setBusy(true);
    try {
      const { docId } = await client.createAssignment({ questionText: questionText.trim() || undefined, instructions: instructions.trim() || undefined, uploadKey: uploadKey ?? undefined });
      router.replace(`/assignments/${docId}`);
    } catch (err) {
      Alert.alert("Couldn't solve this", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, questionText, instructions, uploadKey]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: "New Assignment" }} />
      <Text style={styles.label}>Photo of the question</Text>
      <Pressable style={styles.uploadButton} onPress={takePhoto}>
        <Text style={styles.uploadButtonText}>{photoUri ? "Photo captured ✓" : "Take photo"}</Text>
      </Pressable>
      {photoUri ? <Image source={{ uri: photoUri }} style={{ width: "100%", height: 180, borderRadius: 10, marginTop: 10 }} /> : null}

      <Text style={styles.label}>Or type the question</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={questionText} onChangeText={setQuestionText} multiline />

      <Text style={styles.label}>Instructions (optional)</Text>
      <TextInput style={styles.input} value={instructions} onChangeText={setInstructions} />

      <Pressable style={styles.submitButton} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Solve</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12, fontSize: 15 },
  uploadButton: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, alignItems: "center" },
  uploadButtonText: { fontSize: 14, color: "#333" },
  submitButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 28, marginBottom: 40 },
  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
