import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { router, Stack } from "expo-router";
import { useApiClient } from "@/lib/api";

export default function NewPpt() {
  const client = useApiClient();
  const [title, setTitle] = useState("");
  const [slideCount, setSlideCount] = useState("8");
  const [guidelines, setGuidelines] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    if (title.trim().length < 4) return Alert.alert("Add a topic", "At least 4 characters.");
    setBusy(true);
    try {
      const { docId } = await client.createPpt({ title: title.trim(), slideCount: Number(slideCount) || 8, guidelines: guidelines.trim() || undefined });
      router.replace(`/ppt/${docId}`);
    } catch (err) {
      Alert.alert("Couldn't start generation", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, title, slideCount, guidelines]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: "New Presentation" }} />
      <Text style={styles.label}>Topic</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Machine Learning in Healthcare" />
      <Text style={styles.label}>Number of slides</Text>
      <TextInput style={styles.input} value={slideCount} onChangeText={setSlideCount} keyboardType="number-pad" />
      <Text style={styles.label}>Guidelines (optional)</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={guidelines} onChangeText={setGuidelines} multiline />
      <Pressable style={styles.submitButton} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Generate</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12, fontSize: 15 },
  submitButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 28, marginBottom: 40 },
  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
