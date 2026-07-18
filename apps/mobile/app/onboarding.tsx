import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { useApiClient } from "@/lib/api";
import { colors, font, radius, spacing } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { FadeIn } from "@/components/ui/fade-in";
import { CODING_DEPARTMENTS, DEPARTMENTS, SEMESTERS } from "@/lib/constants";

// On-device draft so a dropped connection or a killed app doesn't send the student back to a
// blank form — there's no server-side draft (see apps/web/lib/onboarding.ts, one-shot submit on
// both platforms), so this is local-only and cleared the moment the real submit succeeds.
const DRAFT_KEY = "studentos.onboarding.draft";

// idCardUri is deliberately NOT part of the draft — expo-image-picker's URI points into a cache
// dir that can be evicted after the app is killed, so restoring it would show "Photo selected ✓"
// over a dead file and fail the same way as this whole bug report. Cheaper to just have the
// student re-pick the photo (last field, one tap) than to validate/track file survival.
type Draft = {
  department: string;
  college: string;
  semester: string;
  codingEnabled: boolean;
  codingTouched: boolean;
  github: string;
  linkedin: string;
  phone: string;
  gpa: string;
};

function SectionKicker({ label }: { label: string }) {
  return (
    <View style={styles.kickerRow}>
      <View style={styles.kickerDot} />
      <Text style={styles.kickerText}>{label}</Text>
    </View>
  );
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
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
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Restore whatever the student already filled in before we start persisting new changes.
  useEffect(() => {
    SecureStore.getItemAsync(DRAFT_KEY)
      .then((raw) => {
        if (!raw) return;
        const draft = JSON.parse(raw) as Draft;
        setDepartment(draft.department);
        setCollege(draft.college);
        setSemester(draft.semester);
        setCodingEnabled(draft.codingEnabled);
        setCodingTouched(draft.codingTouched);
        setGithub(draft.github);
        setLinkedin(draft.linkedin);
        setPhone(draft.phone);
        setGpa(draft.gpa);
      })
      .catch(() => {})
      .finally(() => setDraftLoaded(true));
  }, []);

  // Persist on every change, once the initial restore has happened (otherwise the restore
  // itself would immediately overwrite the just-loaded draft with the still-default state).
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftLoaded) return;
    const draft: Draft = { department, college, semester, codingEnabled, codingTouched, github, linkedin, phone, gpa };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draftLoaded, department, college, semester, codingEnabled, codingTouched, github, linkedin, phone, gpa]);

  // This screen is reached via a Redirect (see (app)/_layout.tsx) — there's no prior screen in
  // the stack to go "back" to, so a hardware back press here fell through to exiting the whole
  // app outright, mid-form. Draft autosave means no data is actually lost, but silently getting
  // kicked out while filling a long form is still a bad surprise — confirm first.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert("Exit onboarding?", "Your answers are saved on this device — you can pick up where you left off.", [
        { text: "Keep going", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    });
    return () => sub.remove();
  }, []);

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

  // Live completion meter — required fields only, so the number always reaches 100% on submit.
  // Purely a "you're getting somewhere" signal on an otherwise long single-scroll form.
  const progress = useMemo(() => {
    const required = [college.trim(), phone.trim(), linkedin.trim(), codingEnabled ? github.trim() : "ok", idCardUri];
    const done = required.filter(Boolean).length;
    return done / required.length;
  }, [college, phone, linkedin, codingEnabled, github, idCardUri]);

  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 320, useNativeDriver: false }).start();
  }, [progress, progressAnim]);
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["6%", "100%"] });

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
      // NOT fetch(uri).then(r => r.blob()) — React Native's fetch/Blob polyfill can't turn a
      // local file:// URI into a Blob ("Creating blobs from 'ArrayBuffer' and 'ArrayBufferView'
      // are not supported"), a real RN limitation that has nothing to do with the emulator.
      // FileSystem.uploadAsync streams the file's bytes directly, no Blob involved.
      const { key, url } = await client.requestUploadUrl("jpg");
      await FileSystem.uploadAsync(url, idCardUri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": "image/jpeg" },
      });

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
      await SecureStore.deleteItemAsync(DRAFT_KEY).catch(() => {});
      router.replace("/(app)");
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Please try again. Your answers are saved on this device.");
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
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <FadeIn>
          <View style={styles.header}>
            <Logo size={44} pulsing={busy} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Tell us about you</Text>
              <Text style={styles.hint}>One-time setup — same profile the web app uses.</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          <SectionKicker label="Academic details" />
          <Card style={styles.card}>
            <Text style={styles.label}>Department</Text>
            <View style={styles.chipRow}>
              {DEPARTMENTS.map((d) => (
                <Pressable key={d} onPress={() => onDepartment(d)} style={[styles.chip, department === d && styles.chipActive]}>
                  <Text style={[styles.chipText, department === d && styles.chipTextActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>College</Text>
            <TextInput style={styles.input} value={college} onChangeText={setCollege} placeholder="Your college name" placeholderTextColor={colors.faint} />

            <Text style={styles.label}>Semester</Text>
            <View style={styles.chipRow}>
              {SEMESTERS.map((s) => (
                <Pressable key={s} onPress={() => setSemester(s)} style={[styles.chip, styles.chipRound, semester === s && styles.chipActive]}>
                  <Text style={[styles.chipText, semester === s && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <SectionKicker label="Coding track" />
          <Card style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Coding track (DSA excluded on mobile)</Text>
              <Switch
                value={codingEnabled}
                onValueChange={(v) => {
                  setCodingEnabled(v);
                  setCodingTouched(true);
                }}
                trackColor={{ false: colors.raised, true: colors.cyan }}
                thumbColor={colors.base}
              />
            </View>
            <Text style={styles.switchHint}>On by default for CS/IT. Any branch can turn it on or off.</Text>

            <Text style={styles.label}>GitHub {codingEnabled ? "(required)" : "(optional)"}</Text>
            <TextInput style={styles.input} value={github} onChangeText={setGithub} placeholder="https://github.com/you" placeholderTextColor={colors.faint} autoCapitalize="none" />
          </Card>

          <SectionKicker label="Contact & links" />
          <Card style={styles.card}>
            <Text style={styles.label}>LinkedIn</Text>
            <TextInput style={styles.input} value={linkedin} onChangeText={setLinkedin} placeholder="https://linkedin.com/in/you" placeholderTextColor={colors.faint} autoCapitalize="none" />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+91XXXXXXXXXX" placeholderTextColor={colors.faint} keyboardType="phone-pad" />

            <Text style={styles.label}>GPA (optional)</Text>
            <TextInput style={styles.input} value={gpa} onChangeText={setGpa} placeholder="0–10" placeholderTextColor={colors.faint} keyboardType="decimal-pad" />
          </Card>

          <SectionKicker label="Verification" />
          <Card style={styles.card}>
            <Text style={styles.label}>College ID card photo</Text>
            <Pressable style={styles.uploadButton} onPress={pickIdCard}>
              <Text style={styles.uploadButtonText}>{idCardUri ? "Photo selected ✓" : "Choose photo"}</Text>
            </Pressable>
          </Card>

          <Button label="Continue" onPress={submit} disabled={busy} loading={busy} style={styles.submitButton} />
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontFamily: font.display, color: colors.ink },
  hint: { fontSize: 13, fontFamily: font.sans, color: colors.muted, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: radius.pill, backgroundColor: colors.raised, overflow: "hidden", marginBottom: spacing.xl },
  progressFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.cyan },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm, marginTop: spacing.xs },
  kickerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan },
  kickerText: { fontSize: 11, fontFamily: font.sansSemibold, color: colors.cyan, textTransform: "uppercase", letterSpacing: 0.6 },
  card: { marginBottom: spacing.xl },
  label: { fontSize: 13, fontFamily: font.sansSemibold, color: colors.ink, marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: 12, fontSize: 15, fontFamily: font.sans, color: colors.ink, backgroundColor: colors.input },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  chipRound: { minWidth: 40, alignItems: "center" },
  chipActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  chipText: { fontSize: 13, fontFamily: font.sansMedium, color: colors.muted },
  chipTextActive: { color: colors.onAccent },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, gap: spacing.md },
  switchHint: { fontSize: 11, fontFamily: font.sans, color: colors.faint, marginTop: 4 },
  uploadButton: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: 12, alignItems: "center", backgroundColor: colors.surface },
  uploadButtonText: { fontSize: 14, fontFamily: font.sansMedium, color: colors.ink },
  submitButton: { marginBottom: 40 },
});
