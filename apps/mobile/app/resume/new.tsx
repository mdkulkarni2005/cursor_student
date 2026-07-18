import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";

export default function NewResume() {
  const client = useApiClient();
  const [targetRole, setTargetRole] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.me().then((me) => {
      setName((v) => v || me.shell.name || "");
      setEmail((v) => v || me.email || "");
    }).catch(() => {});
  }, [client]);

  const submit = useCallback(async () => {
    setBusy(true);
    try {
      const { docId } = await client.createResume({
        targetRole: targetRole.trim() || undefined,
        rawNotes: rawNotes.trim() || undefined,
        contact: {
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          location: location.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
          github: github.trim() || undefined,
        },
      });
      router.replace(`/resume/${docId}`);
    } catch (err) {
      Alert.alert("Couldn't start generation", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, targetRole, rawNotes, name, email, phone, location, linkedin, github]);

  return (
    <ScrollScreen contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "New Resume" }} />
      <Text style={styles.title}>Build a resume</Text>
      <Text style={styles.subtitle}>Dump everything in any shape — we turn it into strong, ATS-friendly bullets in a locked, recruiter-ready format.</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Target role (optional)</Text>
        <TextInput style={styles.input} value={targetRole} onChangeText={setTargetRole} placeholder="e.g. Backend Engineer, ML Intern" placeholderTextColor={colors.faint} />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>About you</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={rawNotes}
          onChangeText={setRawNotes}
          multiline
          placeholder="What you built, tech used, internships, impact (users, %), skills, coursework…"
          placeholderTextColor={colors.faint}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Contact details</Text>
        <View style={styles.contactRow}>
          <TextInput style={[styles.input, styles.contactHalf]} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.faint} />
          <TextInput style={[styles.input, styles.contactHalf]} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.faint} />
        </View>
        <View style={[styles.contactRow, { marginTop: spacing.sm }]}>
          <TextInput style={[styles.input, styles.contactHalf]} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" placeholderTextColor={colors.faint} />
          <TextInput style={[styles.input, styles.contactHalf]} value={location} onChangeText={setLocation} placeholder="City, State" placeholderTextColor={colors.faint} />
        </View>
        <View style={[styles.contactRow, { marginTop: spacing.sm }]}>
          <TextInput style={[styles.input, styles.contactHalf]} value={linkedin} onChangeText={setLinkedin} placeholder="linkedin.com/in/…" autoCapitalize="none" placeholderTextColor={colors.faint} />
          <TextInput style={[styles.input, styles.contactHalf]} value={github} onChangeText={setGithub} placeholder="github.com/… (optional)" autoCapitalize="none" placeholderTextColor={colors.faint} />
        </View>

        <Button label="Generate resume" onPress={submit} loading={busy} disabled={busy} style={{ marginTop: spacing.xl }} />
        <Text style={styles.footnote}>ATS-friendly · your format · exported as Word (.docx)</Text>
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
  textArea: { height: 110, textAlignVertical: "top" },
  contactRow: { flexDirection: "row", gap: spacing.sm },
  contactHalf: { flex: 1 },
  footnote: { fontFamily: font.sans, fontSize: 11.5, color: colors.faint, textAlign: "center", marginTop: spacing.md },
});
