import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import type { MeResponse } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";

export default function Settings() {
  const client = useApiClient();
  const { signOut } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [name, setName] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.me().then((r) => {
      setMe(r);
      setName(r.shell.name);
    });
  }, [client]);

  const save = async () => {
    setBusy(true);
    try {
      await client.updateProfile({ name, careerGoal: "", github, linkedin, gpa: null });
      Alert.alert("Saved");
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!me) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.section}>Profile</Text>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Text style={styles.label}>GitHub</Text>
      <TextInput style={styles.input} value={github} onChangeText={setGithub} autoCapitalize="none" />
      <Text style={styles.label}>LinkedIn</Text>
      <TextInput style={styles.input} value={linkedin} onChangeText={setLinkedin} autoCapitalize="none" />
      <Pressable style={styles.saveButton} onPress={save} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
      </Pressable>

      <Text style={[styles.section, { marginTop: 32 }]}>Account</Text>
      <Text style={styles.meta}>{me.email}</Text>
      <Text style={styles.meta}>{me.shell.plan} plan</Text>

      <Pressable style={styles.signOutButton} onPress={() => signOut()}>
        <Text style={styles.signOutButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  section: { fontSize: 13, fontWeight: "700", color: "#888", textTransform: "uppercase" },
  label: { fontSize: 13, fontWeight: "600", marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12, fontSize: 15 },
  saveButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 20 },
  saveButtonText: { color: "#fff", fontWeight: "600" },
  meta: { fontSize: 14, color: "#444", marginTop: 6 },
  signOutButton: { borderWidth: 1, borderColor: "#e11d48", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 20 },
  signOutButtonText: { color: "#e11d48", fontWeight: "600" },
});
