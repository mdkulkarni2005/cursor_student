import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useApiClient } from "@/lib/api";
import { useGeneratedDoc } from "@/lib/use-generated-doc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";

/** Mirrors web's `SolutionData` shape (apps/web/app/assignments/[id]/page.tsx) — do not diverge. */
type Turn = { speaker: "student" | "tutor"; content: string };
type SolutionData = {
  questionSummary?: string;
  approach?: string;
  steps?: { heading: string; detail: string }[];
  finalAnswer?: string;
  code?: string;
  conversation?: Turn[];
};

export default function AssignmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const fetchDoc = useCallback(() => client.getAssignment(id), [client, id]);
  const { doc, error, refresh } = useGeneratedDoc(fetchDoc);
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = useCallback(async () => {
    if (!followUp.trim()) return;
    setBusy(true);
    try {
      await client.askAssignment(id, { message: followUp.trim() });
      setFollowUp("");
      refresh();
    } catch (err) {
      Alert.alert("Couldn't send", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }, [client, id, followUp, refresh]);

  const sol = (doc?.content ?? {}) as SolutionData;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: doc?.title ?? "Assignment" }} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!doc ? <ActivityIndicator color={colors.cyan} style={{ marginTop: 40 }} /> : null}

        {doc?.status === "GENERATING" || doc?.status === "QUEUED" ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.cyan} />
            <Text style={styles.stageText}>Solving…</Text>
          </View>
        ) : null}

        {doc && doc.status !== "GENERATING" && doc.status !== "QUEUED" && doc.status !== "FAILED" ? (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sparkBadge}><Text style={styles.sparkGlyph}>✦</Text></View>
              <Text style={styles.sectionHeader}>AI Solver · Step-by-Step</Text>
            </View>

            {sol.questionSummary ? (
              <Card style={styles.infoCard}>
                <Text style={styles.label}>Question</Text>
                <Text style={styles.body}>{sol.questionSummary}</Text>
              </Card>
            ) : null}

            {sol.approach ? (
              <View style={styles.block}>
                <Text style={styles.label}>Approach</Text>
                <Text style={styles.body}>{sol.approach}</Text>
              </View>
            ) : null}

            {sol.steps?.length ? (
              <View style={styles.block}>
                {sol.steps.map((s, i) => (
                  <Card key={i} style={styles.stepCard}>
                    <View style={styles.stepRow}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{i + 1}</Text>
                      </View>
                      <View style={styles.stepText}>
                        <Text style={styles.stepHeading}>{s.heading}</Text>
                        <Text style={styles.stepDetail}>{s.detail}</Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            ) : null}

            {sol.code ? (
              <ScrollView horizontal style={styles.codeBlock} contentContainerStyle={{ padding: spacing.md }}>
                <Text style={styles.codeText}>{sol.code}</Text>
              </ScrollView>
            ) : null}

            {sol.finalAnswer ? (
              <Card style={styles.finalCard}>
                <Text style={styles.finalLabel}>Final Answer</Text>
                <Text style={styles.finalBody}>{sol.finalAnswer}</Text>
              </Card>
            ) : null}

            {doc.status === "READY" ? (
              <View style={styles.tutorSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.tutorBadge}><Text style={styles.tutorGlyph}>🎓</Text></View>
                  <Text style={styles.sectionHeader}>Vidyas AI Tutor</Text>
                </View>
                <Text style={styles.tutorHint}>Not sure about a step? Ask — if your feedback changes the answer, the solution updates too.</Text>

                {sol.conversation?.length ? (
                  <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
                    {sol.conversation.map((t, i) => (
                      <View key={i} style={t.speaker === "student" ? styles.bubbleRowEnd : styles.bubbleRowStart}>
                        <View style={t.speaker === "student" ? styles.bubbleStudent : styles.bubbleTutor}>
                          <Text style={t.speaker === "student" ? styles.bubbleStudentText : styles.bubbleTutorText}>{t.content}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                <TextInput
                  style={styles.input}
                  value={followUp}
                  onChangeText={setFollowUp}
                  placeholder="Ask a follow-up… e.g. redo step 3"
                  placeholderTextColor={colors.faint}
                  multiline
                />
                <Button label="Send" onPress={ask} loading={busy} disabled={busy} style={{ marginTop: spacing.sm }} />
              </View>
            ) : null}
          </View>
        ) : null}

        {doc?.status === "FAILED" ? <Text style={styles.error}>{doc.error ?? "Couldn't solve this — please try again."}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 60 },
  center: { alignItems: "center", marginTop: 40 },
  stageText: { fontFamily: font.sans, marginTop: spacing.md, color: colors.muted },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  sparkBadge: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.cyanTint, alignItems: "center", justifyContent: "center" },
  sparkGlyph: { color: colors.cyan },
  sectionHeader: { fontFamily: font.displaySemibold, fontSize: 15.5, color: colors.ink },
  label: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  body: { fontFamily: font.sans, fontSize: 13.5, color: colors.ink, lineHeight: 19, marginTop: spacing.xs },
  infoCard: { marginBottom: spacing.md },
  block: { marginBottom: spacing.md },
  stepCard: { marginBottom: spacing.sm, padding: spacing.md },
  stepRow: { flexDirection: "row", gap: spacing.md },
  stepBadge: { width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.cyanTint, alignItems: "center", justifyContent: "center" },
  stepBadgeText: { fontFamily: font.sansSemibold, fontSize: 12, color: colors.cyan },
  stepText: { flex: 1 },
  stepHeading: { fontFamily: font.sansSemibold, fontSize: 13.5, color: colors.ink },
  stepDetail: { fontFamily: font.sans, fontSize: 12.5, color: colors.muted, marginTop: spacing.xs, lineHeight: 18 },
  codeBlock: { backgroundColor: "#0b0f1a", borderRadius: radius.lg, marginBottom: spacing.md },
  codeText: { fontFamily: "Menlo", fontSize: 12, color: "rgba(255,255,255,0.9)" },
  finalCard: { backgroundColor: colors.cyanTint, borderColor: "rgba(246, 146, 30, 0.25)", marginBottom: spacing.lg },
  finalLabel: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.cyan, textTransform: "uppercase", letterSpacing: 0.4 },
  finalBody: { fontFamily: font.sans, fontSize: 13.5, color: colors.ink, lineHeight: 19, marginTop: spacing.xs },
  tutorSection: { marginTop: spacing.lg },
  tutorBadge: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.indigoTint, alignItems: "center", justifyContent: "center" },
  tutorGlyph: { fontSize: 14 },
  tutorHint: { fontFamily: font.sans, fontSize: 12, color: colors.muted, marginBottom: spacing.md, lineHeight: 17 },
  bubbleRowEnd: { alignItems: "flex-end" },
  bubbleRowStart: { alignItems: "flex-start" },
  bubbleStudent: { maxWidth: "88%", backgroundColor: colors.cyan, borderRadius: radius.xl, borderBottomRightRadius: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleStudentText: { fontFamily: font.sans, fontSize: 13, color: colors.onAccent },
  bubbleTutor: { maxWidth: "88%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, borderBottomLeftRadius: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleTutorText: { fontFamily: font.sans, fontSize: 13, color: colors.ink },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: spacing.md, fontFamily: font.sans, fontSize: 14, color: colors.ink, backgroundColor: colors.input, minHeight: 70, textAlignVertical: "top" },
  error: { color: colors.danger, fontFamily: font.sans, marginBottom: spacing.md },
});
