import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { StyleSheet } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import type { MeResponse, PlansResponse } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, gradient, radius, spacing } from "@/lib/theme";
import { ChatIcon, LogOutIcon } from "@/components/icons";
import { DEPARTMENTS, SEMESTERS } from "@/lib/constants";
import { FeedbackModal } from "@/components/feedback-modal";

function money(cents: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : currency + " ";
  return `${symbol}${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SectionLabel({ label }: { label: string }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionDot} />
      <Text style={styles.sectionText}>{label}</Text>
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export default function Settings() {
  const client = useApiClient();
  const { signOut } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [college, setCollege] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [gpa, setGpa] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const load = useCallback(() => {
    setLoadError(false);
    client
      .me()
      .then((r) => {
        setMe(r);
        setName(r.shell.name);
        setDepartment(r.shell.department ?? DEPARTMENTS[0]);
        setSemester(r.shell.semester ?? SEMESTERS[0]);
        setCollege(r.profile.college ?? "");
        setCompanyName(r.profile.companyName ?? "");
        setJobTitle(r.profile.jobTitle ?? "");
        setYearsOfExperience(r.profile.yearsOfExperience != null ? String(r.profile.yearsOfExperience) : "");
        setCareerGoal(r.profile.careerGoal ?? "");
        setGithub(r.profile.github ?? "");
        setLinkedin(r.profile.linkedin ?? "");
        setGpa(r.profile.gpa != null ? String(r.profile.gpa) : "");
      })
      .catch(() => setLoadError(true));
    client.getPlans().then(setPlans).catch(() => {});
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  const initials = useMemo(() => initialsOf(name || me?.shell.name || "?"), [name, me]);
  const githubRequired = me?.shell.codingEnabled ?? false;

  const save = async () => {
    if (!name.trim()) return Alert.alert("Missing info", "Please enter your name.");
    if (!linkedin.trim()) return Alert.alert("Missing info", "Please add your LinkedIn link.");
    if (me?.userType === "PROFESSIONAL") {
      if (!companyName.trim()) return Alert.alert("Missing info", "Please enter your company name.");
      if (!jobTitle.trim()) return Alert.alert("Missing info", "Please enter your job title.");
      if (!github.trim()) return Alert.alert("Missing info", "Please add your GitHub link.");
    } else {
      if (college.trim().length < 2) return Alert.alert("Missing info", "Please enter your college name.");
      if (githubRequired && !github.trim()) return Alert.alert("Missing info", "GitHub is required for the coding track.");
    }

    setBusy(true);
    setSaved(false);
    try {
      await client.updateProfile({
        name: name.trim(),
        careerGoal: careerGoal.trim(),
        github: github.trim(),
        linkedin: linkedin.trim(),
        gpa: gpa.trim() ? Number(gpa) : null,
        ...(me?.userType === "PROFESSIONAL"
          ? { companyName: companyName.trim(), jobTitle: jobTitle.trim(), yearsOfExperience: yearsOfExperience.trim() ? Number(yearsOfExperience) : null }
          : { department, semester, college: college.trim() }),
      });
      setSaved(true);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Couldn't load your settings</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!me) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.cyan} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <ScrollScreen keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.profileHeader}>
          <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={styles.profileHeaderText}>
            <Text style={styles.name}>{me.shell.name}</Text>
            <Text style={styles.email}>{me.email}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{me.userType === "PROFESSIONAL" ? "Professional" : "Student"}</Text>
              </View>
              <View style={[styles.badge, styles.badgeTeal]}>
                <Text style={[styles.badgeText, styles.badgeTealText]}>{me.shell.plan} plan</Text>
              </View>
            </View>
          </View>
        </View>

        <SectionLabel label="Plan & Usage" />
        <Card style={styles.card}>
          <View style={styles.planRow}>
            <View>
              <Text style={styles.planName}>{me.shell.plan}</Text>
              <Text style={styles.hint}>
                {plans && plans.tiers.find((t) => t.id === plans.currentTierId)?.priceCents
                  ? `${money(plans.tiers.find((t) => t.id === plans.currentTierId)!.priceCents, plans.tiers.find((t) => t.id === plans.currentTierId)!.currency)} / month`
                  : "Free"}
              </Text>
            </View>
            <Pressable style={styles.changePlanButton} onPress={() => router.push("/plans" as never)}>
              <Text style={styles.changePlanButtonText}>Change plan</Text>
            </Pressable>
          </View>
          {plans?.credits ? (
            <View style={styles.usageRow}>
              <View style={styles.usageRowTop}>
                <Text style={[styles.usageLabel, { color: colors.teal }]}>Credits</Text>
                <Text style={styles.usageCount}>
                  {plans.credits.used} / {plans.credits.limit === null ? "∞" : plans.credits.limit}
                </Text>
              </View>
              <View style={styles.usageTrack}>
                <View
                  style={[
                    styles.usageFill,
                    {
                      width: `${plans.credits.limit ? Math.min(100, Math.round((plans.credits.used / plans.credits.limit) * 100)) : 8}%`,
                      backgroundColor: plans.credits.limit !== null && plans.credits.remaining === 0 ? colors.danger : colors.teal,
                    },
                  ]}
                />
              </View>
              <Text style={styles.hint}>Every generation and every edit spends credits.</Text>
            </View>
          ) : null}
          {plans?.usage.map((row) => (
            <View key={row.kind} style={styles.usageRow}>
              <View style={styles.usageRowTop}>
                <Text style={styles.usageLabel}>{row.label}</Text>
                <Text style={styles.usageCount}>
                  {row.used} / {row.limit === null ? "∞" : row.limit}
                </Text>
              </View>
              <View style={styles.usageTrack}>
                <View
                  style={[
                    styles.usageFill,
                    {
                      width: `${row.limit ? Math.min(100, Math.round((row.used / row.limit) * 100)) : 8}%`,
                      backgroundColor: row.limit !== null && row.remaining === 0 ? colors.danger : colors.cyan,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </Card>

        <SectionLabel label="Profile" />
        <Card style={styles.card}>
          <Field label="Full name">
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.faint} />
          </Field>

          <Field label="Email">
            <TextInput style={[styles.input, styles.inputDisabled]} value={me.email} editable={false} />
          </Field>

          {me.userType === "PROFESSIONAL" ? (
            <>
              <Field label="Company">
                <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholderTextColor={colors.faint} />
              </Field>
              <Field label="Job title">
                <TextInput style={styles.input} value={jobTitle} onChangeText={setJobTitle} placeholderTextColor={colors.faint} />
              </Field>
              <Field label="Years of experience">
                <TextInput
                  style={styles.input}
                  value={yearsOfExperience}
                  onChangeText={setYearsOfExperience}
                  keyboardType="number-pad"
                  placeholder="0–60"
                  placeholderTextColor={colors.faint}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Department">
                <View style={styles.chipRow}>
                  {DEPARTMENTS.map((d) => (
                    <Pressable key={d} onPress={() => setDepartment(d)} style={[styles.chip, department === d && styles.chipActive]}>
                      <Text style={[styles.chipText, department === d && styles.chipTextActive]}>{d}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
              <Field label="Semester">
                <View style={styles.chipRow}>
                  {SEMESTERS.map((s) => (
                    <Pressable key={s} onPress={() => setSemester(s)} style={[styles.chip, styles.chipRound, semester === s && styles.chipActive]}>
                      <Text style={[styles.chipText, semester === s && styles.chipTextActive]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
              <Field label="College / University">
                <TextInput style={styles.input} value={college} onChangeText={setCollege} placeholderTextColor={colors.faint} />
              </Field>
            </>
          )}

          <Field label="Career goal" hint="Optional — shapes AI-generated content to your ambition.">
            <TextInput style={styles.input} value={careerGoal} onChangeText={setCareerGoal} placeholderTextColor={colors.faint} />
          </Field>

          <Field label={`GitHub${githubRequired || me.userType === "PROFESSIONAL" ? "" : " (optional)"}`} hint={githubRequired || me.userType === "PROFESSIONAL" ? undefined : "Only needed for the coding track."}>
            <TextInput
              style={styles.input}
              value={github}
              onChangeText={setGithub}
              autoCapitalize="none"
              placeholder="github.com/yourname"
              placeholderTextColor={colors.faint}
            />
          </Field>

          <Field label="LinkedIn">
            <TextInput
              style={styles.input}
              value={linkedin}
              onChangeText={setLinkedin}
              autoCapitalize="none"
              placeholder="linkedin.com/in/yourname"
              placeholderTextColor={colors.faint}
            />
          </Field>

          <Field label="GPA / CGPA" hint="Optional, out of 10.">
            <TextInput style={styles.input} value={gpa} onChangeText={setGpa} keyboardType="decimal-pad" placeholder="0–10" placeholderTextColor={colors.faint} />
          </Field>

          {saved ? <Text style={styles.savedText}>Saved.</Text> : null}
          <Button label="Save changes" onPress={save} disabled={busy} loading={busy} style={styles.saveButton} />
        </Card>

        <SectionLabel label="Account" />
        <Card style={styles.card}>
          <Pressable style={styles.accountRow} onPress={() => setFeedbackOpen(true)}>
            <View style={styles.feedbackIconBadge}>
              <ChatIcon size={18} color={colors.cyan} />
            </View>
            <Text style={styles.accountRowText}>Send feedback</Text>
          </Pressable>
          <View style={styles.accountDivider} />
          <Pressable
            style={styles.accountRow}
            onPress={() =>
              Alert.alert("Sign out?", "You'll need to sign in again to keep using krackit.", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign out", style: "destructive", onPress: () => signOut() },
              ])
            }
          >
            <View style={styles.signOutIconBadge}>
              <LogOutIcon size={18} color={colors.danger} />
            </View>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </Card>
      </ScrollScreen>
      <FeedbackModal visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas, padding: spacing.xl },
  errorTitle: { fontFamily: font.displaySemibold, fontSize: 16, color: colors.ink, marginBottom: spacing.lg, textAlign: "center" },
  retryButton: { backgroundColor: colors.cyan, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: spacing.xl },
  retryButtonText: { fontFamily: font.sansSemibold, fontSize: 15, color: colors.onAccent },

  profileHeader: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.xl },
  avatar: { width: 64, height: 64, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.display, fontSize: 22, color: colors.onAccent },
  profileHeaderText: { flex: 1 },
  name: { fontFamily: font.display, fontSize: 19, color: colors.ink },
  email: { fontFamily: font.sans, fontSize: 13.5, color: colors.muted, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  badge: { backgroundColor: colors.cyanTint, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  badgeTeal: { backgroundColor: colors.tealTint },
  badgeText: { fontFamily: font.sansSemibold, fontSize: 10.5, color: colors.cyan, textTransform: "uppercase", letterSpacing: 0.4 },
  badgeTealText: { color: colors.teal },

  sectionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm, marginTop: spacing.xs },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan },
  sectionText: { fontSize: 11, fontFamily: font.sansSemibold, color: colors.cyan, textTransform: "uppercase", letterSpacing: 0.6 },
  card: { marginBottom: spacing.xl },

  planRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  planName: { fontFamily: font.display, fontSize: 17, color: colors.ink },
  changePlanButton: { backgroundColor: colors.cyan, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 14 },
  changePlanButtonText: { fontFamily: font.sansSemibold, fontSize: 12.5, color: colors.onAccent },
  usageRow: { marginTop: spacing.sm },
  usageRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  usageLabel: { fontFamily: font.sans, fontSize: 13, color: colors.ink },
  usageCount: { fontFamily: font.displaySemibold, fontSize: 13, color: colors.ink },
  usageTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surface, marginTop: 5, overflow: "hidden" },
  usageFill: { height: "100%", borderRadius: 3 },

  field: { marginBottom: spacing.md },
  label: { fontSize: 13, fontFamily: font.sansSemibold, color: colors.ink, marginBottom: 6 },
  hint: { fontSize: 11.5, fontFamily: font.sans, color: colors.faint, marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: 12, fontSize: 15, fontFamily: font.sans, color: colors.ink, backgroundColor: colors.input },
  inputDisabled: { color: colors.faint, backgroundColor: colors.surface },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  chipRound: { minWidth: 40, alignItems: "center" },
  chipActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  chipText: { fontSize: 13, fontFamily: font.sansMedium, color: colors.muted },
  chipTextActive: { color: colors.onAccent },

  savedText: { fontSize: 12.5, fontFamily: font.sansMedium, color: colors.teal, marginBottom: spacing.sm },
  saveButton: { marginTop: spacing.xs },

  accountRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  accountDivider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },
  accountRowText: { fontFamily: font.sansSemibold, fontSize: 15, color: colors.ink },
  feedbackIconBadge: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.cyanTint, alignItems: "center", justifyContent: "center" },
  signOutIconBadge: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.dangerTint, alignItems: "center", justifyContent: "center" },
  signOutText: { fontFamily: font.sansSemibold, fontSize: 15, color: colors.danger },
});
