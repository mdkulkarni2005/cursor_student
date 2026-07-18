import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useApiClient } from "@/lib/api";
import { useGeneratedDoc } from "@/lib/use-generated-doc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";

/** Mirrors web's `ReportData` (apps/web/app/lab-reports/[id]/page.tsx) — the real
 *  `LabReportSolutionSchema` shape, not sections/conclusion. Do not diverge. */
type Turn = { speaker: "student" | "tutor"; content: string };
type LabReportData = {
  aim?: string;
  apparatus?: string[];
  theory?: string;
  procedure?: string[];
  observations?: { columns: string[]; rows: string[][] };
  calculations?: string;
  result?: string;
  conclusion?: string;
  precautions?: string[];
  conversation?: Turn[];
};

export default function LabReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const fetchDoc = useCallback(() => client.getLabReport(id), [client, id]);
  const { doc, error, refresh } = useGeneratedDoc(fetchDoc);
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const ask = useCallback(async () => {
    if (!followUp.trim()) return;
    setBusy(true);
    try {
      await client.askLabReport(id, { message: followUp.trim() });
      setFollowUp("");
      refresh();
    } catch (err) {
      Alert.alert("Couldn't send", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }, [client, id, followUp, refresh]);

  const download = useCallback(async () => {
    setDownloading(true);
    try {
      const { url } = await client.labReportDownloadUrl(id);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert("Couldn't download", err instanceof Error ? err.message : "Try again.");
    } finally {
      setDownloading(false);
    }
  }, [client, id]);

  const r = (doc?.content ?? {}) as LabReportData;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: doc?.title ?? "Lab Report" }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!doc ? <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} /> : null}

      {doc?.status === "GENERATING" || doc?.status === "QUEUED" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.stageText}>Writing up your lab report…</Text>
        </View>
      ) : null}

      {doc && doc.status !== "GENERATING" && doc.status !== "QUEUED" && doc.status !== "FAILED" ? (
        <View>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sparkBadge}><Text style={styles.sparkGlyph}>✦</Text></View>
            <Text style={styles.sectionHeader}>Lab Report</Text>
          </View>

          {r.aim ? <Field label="Aim"><Text style={styles.body}>{r.aim}</Text></Field> : null}

          {r.apparatus?.length ? (
            <Field label="Apparatus / Materials">
              {r.apparatus.map((a, i) => <Text key={i} style={styles.bullet}>•  {a}</Text>)}
            </Field>
          ) : null}

          {r.theory ? <Field label="Theory"><Text style={styles.body}>{r.theory}</Text></Field> : null}

          {r.procedure?.length ? (
            <Field label="Procedure">
              {r.procedure.map((p, i) => <Text key={i} style={styles.bullet}>{i + 1}.  {p}</Text>)}
            </Field>
          ) : null}

          {r.observations?.columns?.length ? (
            <Field label="Observations">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.table}>
                  <View style={styles.tableRow}>
                    {r.observations.columns.map((c, i) => (
                      <Text key={i} style={[styles.tableCell, styles.tableHeaderCell]}>{c}</Text>
                    ))}
                  </View>
                  {r.observations.rows.map((row, i) => (
                    <View key={i} style={[styles.tableRow, i % 2 ? styles.tableRowAlt : null]}>
                      {row.map((cell, j) => <Text key={j} style={styles.tableCell}>{cell}</Text>)}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Field>
          ) : null}

          {r.calculations ? <Field label="Calculations"><Text style={styles.body}>{r.calculations}</Text></Field> : null}

          {r.result ? (
            <Card style={styles.resultCard}>
              <Text style={styles.resultLabel}>Result</Text>
              <Text style={styles.resultBody}>{r.result}</Text>
            </Card>
          ) : null}

          {r.precautions?.length ? (
            <Field label="Precautions">
              {r.precautions.map((p, i) => <Text key={i} style={styles.bullet}>•  {p}</Text>)}
            </Field>
          ) : null}

          {r.conclusion ? <Field label="Conclusion"><Text style={styles.body}>{r.conclusion}</Text></Field> : null}

          {doc.status === "READY" ? <Button label="Download .docx" onPress={download} loading={downloading} disabled={downloading} style={{ marginTop: spacing.sm, marginBottom: spacing.lg }} /> : null}

          {doc.status === "READY" ? (
            <View style={styles.tutorSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.tutorBadge}><Text style={styles.tutorGlyph}>🎓</Text></View>
                <Text style={styles.sectionHeader}>Vidyas AI Tutor</Text>
              </View>
              <Text style={styles.tutorHint}>Spot a wrong reading or want the conclusion reworded? Ask — the report updates if your feedback changes it.</Text>

              {r.conversation?.length ? (
                <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
                  {r.conversation.map((t, i) => (
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
                placeholder="e.g. Trial 2 reading should be 0.6A, not 0.8A"
                placeholderTextColor={colors.faint}
                multiline
              />
              <Button label="Send" onPress={ask} loading={busy} disabled={busy} style={{ marginTop: spacing.sm }} />
            </View>
          ) : null}
        </View>
      ) : null}

      {doc?.status === "FAILED" ? <Text style={styles.error}>{doc.error ?? "Couldn't generate — please try again."}</Text> : null}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ marginTop: spacing.xs }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 60 },
  center: { alignItems: "center", marginTop: 40 },
  stageText: { fontFamily: font.sans, marginTop: spacing.md, color: colors.muted },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  sparkBadge: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  sparkGlyph: { color: colors.teal },
  sectionHeader: { fontFamily: font.displaySemibold, fontSize: 15.5, color: colors.ink },
  label: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  body: { fontFamily: font.sans, fontSize: 13.5, color: colors.ink, lineHeight: 19 },
  bullet: { fontFamily: font.sans, fontSize: 13, color: colors.ink, lineHeight: 19 },
  block: { marginBottom: spacing.md },
  table: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: "hidden" },
  tableRow: { flexDirection: "row" },
  tableRowAlt: { backgroundColor: colors.surface },
  tableCell: { minWidth: 90, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, fontFamily: font.sans, fontSize: 12.5, color: colors.ink, borderBottomWidth: 1, borderColor: colors.line },
  tableHeaderCell: { backgroundColor: colors.tealTint, fontFamily: font.sansSemibold, color: colors.teal },
  resultCard: { backgroundColor: colors.tealTint, borderColor: "rgba(0, 106, 97, 0.25)", marginBottom: spacing.md },
  resultLabel: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.teal, textTransform: "uppercase", letterSpacing: 0.4 },
  resultBody: { fontFamily: font.sans, fontSize: 13.5, color: colors.ink, lineHeight: 19, marginTop: spacing.xs },
  tutorSection: { marginTop: spacing.sm },
  tutorBadge: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.indigoTint, alignItems: "center", justifyContent: "center" },
  tutorGlyph: { fontSize: 14 },
  tutorHint: { fontFamily: font.sans, fontSize: 12, color: colors.muted, marginBottom: spacing.md, lineHeight: 17 },
  bubbleRowEnd: { alignItems: "flex-end" },
  bubbleRowStart: { alignItems: "flex-start" },
  bubbleStudent: { maxWidth: "88%", backgroundColor: colors.teal, borderRadius: radius.xl, borderBottomRightRadius: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleStudentText: { fontFamily: font.sans, fontSize: 13, color: colors.onAccent },
  bubbleTutor: { maxWidth: "88%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, borderBottomLeftRadius: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleTutorText: { fontFamily: font.sans, fontSize: 13, color: colors.ink },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: spacing.md, fontFamily: font.sans, fontSize: 14, color: colors.ink, backgroundColor: colors.input, minHeight: 70, textAlignVertical: "top" },
  error: { color: colors.danger, fontFamily: font.sans, marginBottom: spacing.md },
});
