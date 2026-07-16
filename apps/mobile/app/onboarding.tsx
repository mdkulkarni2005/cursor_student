import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useApiClient } from "@/lib/api";

const DEPARTMENTS = [
  "Mechanical Engineering",
  "Computer Engineering",
  "Information Technology",
  "Electrical Engineering",
  "Civil Engineering",
  "Electronics & Telecommunication",
  "Chemical Engineering",
  "Other",
] as const;
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

// Mirrors apps/web/lib/capabilities.ts CODING_DEPARTMENTS — seeds the coding-track default.
const CODING_DEPARTMENTS = ["Computer Engineering", "Information Technology"];

export default function Onboarding() {
  const client = useApiClient();
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [college, setCollege] = useState("");
  const [semester, setSemester] = useState("1");
  const [codingEnabled, setCodingEnabled] = useState(CODING_DEPARTMENTS.includes(DEPARTMENTS[0]));
  const [codingTouched, setCodingTouched] = useState(false);
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [phone, setPhone] = useState("");
  const [gpa, setGpa] = useState("");
  const [idCardUri, setIdCardUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onDepartment = useCallback(
    (d: string) => {
      setDepartment(d);
      // Seed the coding-track default from the branch — until the user overrides it themselves.
      if (!codingTouched) setCodingEnabled(CODING_DEPARTMENTS.includes(d));
    },
    [codingTouched],
  );

  const pickIdCard = useCallback(async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!res.canceled && res.assets[0]) setIdCardUri(res.assets[0].uri);
  }, []);

  const submit = useCallback(async () => {
    if (!college.trim()) return Alert.alert("Missing info", "Please enter your college name.");
    if (!phone.trim()) return Alert.alert("Missing info", "Please add your phone number.");
    if (!linkedin.trim()) return Alert.alert("Missing info", "Please add your LinkedIn link.");
    if (codingEnabled && !github.trim()) return Alert.alert("Missing info", "GitHub is required for the coding track.");
    if (!idCardUri) return Alert.alert("Missing info", "Please upload a photo of your college ID card.");

    setBusy(true);
    try {
      // Upload the ID card photo straight to R2 via a presigned URL, then submit the key —
      // the same two-step flow every mobile upload uses (see POST /api/mobile/uploads).
      const { key, url } = await client.requestUploadUrl("jpg");
      const bytes = await fetch(idCardUri).then((r) => r.blob());
      await fetch(url, { method: "PUT", body: bytes, headers: { "Content-Type": "image/jpeg" } });

      await client.completeOnboarding({
        department,
        isCustomDepartment: department === "Other",
        college: college.trim(),
        semester,
        codingEnabled,
        github: github.trim(),
        linkedin: linkedin.trim(),
        phone: phone.trim(),
        gpa: gpa.trim() ? Number(gpa) : null,
        careerGoal: null,
        idCardKey: key,
        acceptedLegal: true,
      });
      router.replace("/(app)");
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }, [client, department, college, semester, codingEnabled, github, linkedin, phone, gpa, idCardUri]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>Tell us about you</Text>
        <Text style={styles.hint}>One-time setup — same profile the web app uses.</Text>

        <Text style={styles.label}>Department</Text>
        <View style={styles.chipRow}>
          {DEPARTMENTS.map((d) => (
            <Pressable key={d} onPress={() => onDepartment(d)} style={[styles.chip, department === d && styles.chipActive]}>
              <Text style={[styles.chipText, department === d && styles.chipTextActive]}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>College</Text>
        <TextInput style={styles.input} value={college} onChangeText={setCollege} placeholder="Your college name" />

        <Text style={styles.label}>Semester</Text>
        <View style={styles.chipRow}>
          {SEMESTERS.map((s) => (
            <Pressable key={s} onPress={() => setSemester(s)} style={[styles.chip, semester === s && styles.chipActive]}>
              <Text style={[styles.chipText, semester === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Coding track (DSA excluded on mobile)</Text>
          <Switch
            value={codingEnabled}
            onValueChange={(v) => {
              setCodingEnabled(v);
              setCodingTouched(true);
            }}
          />
        </View>
        <Text style={styles.switchHint}>On by default for CS/IT. Any branch can turn it on or off.</Text>

        <Text style={styles.label}>GitHub {codingEnabled ? "(required)" : "(optional)"}</Text>
        <TextInput style={styles.input} value={github} onChangeText={setGithub} placeholder="https://github.com/you" autoCapitalize="none" />

        <Text style={styles.label}>LinkedIn</Text>
        <TextInput style={styles.input} value={linkedin} onChangeText={setLinkedin} placeholder="https://linkedin.com/in/you" autoCapitalize="none" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+91XXXXXXXXXX" keyboardType="phone-pad" />

        <Text style={styles.label}>GPA (optional)</Text>
        <TextInput style={styles.input} value={gpa} onChangeText={setGpa} placeholder="0–10" keyboardType="decimal-pad" />

        <Text style={styles.label}>College ID card photo</Text>
        <Pressable style={styles.uploadButton} onPress={pickIdCard}>
          <Text style={styles.uploadButtonText}>{idCardUri ? "Photo selected ✓" : "Choose photo"}</Text>
        </Pressable>

        <Pressable style={styles.submitButton} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Continue</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700" },
  hint: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12, fontSize: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "#ddd" },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 13, color: "#333" },
  chipTextActive: { color: "#fff" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  switchHint: { fontSize: 11, color: "#999", marginTop: 4 },
  uploadButton: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, alignItems: "center" },
  uploadButtonText: { fontSize: 14, color: "#333" },
  submitButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 28, marginBottom: 40 },
  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
