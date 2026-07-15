import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { router, Stack } from "expo-router";
import { useApiClient } from "@/lib/api";

export default function ResumeStart() {
  const client = useApiClient();
  const [targetRole, setTargetRole] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    setBusy(true);
    try {
      const { docId } = await client.createResume({ targetRole: targetRole.trim() || undefined, rawNotes: rawNotes.trim() || undefined });
      router.replace(`/resume/${docId}`);
    } catch (err) {
      Alert.alert("Couldn't start generation", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, targetRole, rawNotes]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: "Resume" }} />
      <Text style={styles.hint}>ATS-scored, house format, never breaks — same as web.</Text>
      <Text style={styles.label}>Target role (optional)</Text>
      <TextInput style={styles.input} value={targetRole} onChangeText={setTargetRole} placeholder="e.g. Frontend Developer" />
      <Text style={styles.label}>Notes — projects, skills, internships (optional)</Text>
      <TextInput style={[styles.input, { height: 120 }]} value={rawNotes} onChangeText={setRawNotes} multiline />
      <Pressable style={styles.submitButton} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Generate resume</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: "#666", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12, fontSize: 15 },
  submitButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 28, marginBottom: 40 },
  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
