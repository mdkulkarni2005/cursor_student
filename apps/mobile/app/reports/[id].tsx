import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { ClarifyQuestion } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { useGeneratedDoc } from "@/lib/use-generated-doc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";

const STAGE_LABEL: Record<string, string> = { draft: "Drafting your report", review: "Checking for missing details", format: "Formatting & finalizing" };

/** Mirrors web's `ReportData` shape (apps/web/app/reports/[id]/page.tsx) — do not diverge. */
type ReportData = {
  abstract?: string;
  sections?: { heading: string; content: string }[];
  references?: string[];
};

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const fetchDoc = useCallback(() => client.getReport(id), [client, id]);
  const { doc, error, refresh } = useGeneratedDoc(fetchDoc);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const submitAnswers = useCallback(async () => {
    setBusy(true);
    try {
      await client.resumeReport(id, answers);
      refresh();
    } catch (err) {
      Alert.alert("Couldn't continue", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }, [client, id, answers, refresh]);

  const download = useCallback(async () => {
    setDownloading(true);
    try {
      const { url } = await client.reportDownloadUrl(id);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert("Couldn't download", err instanceof Error ? err.message : "Try again.");
    } finally {
      setDownloading(false);
    }
  }, [client, id]);

  const data = (doc?.content ?? {}) as ReportData;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: doc?.title ?? "Report" }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!doc ? <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} /> : null}

      {doc?.status === "GENERATING" || doc?.status === "QUEUED" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.stageText}>{STAGE_LABEL[doc.stage ?? ""] ?? "Working on it…"}</Text>
        </View>
      ) : null}

      {doc?.status === "NEEDS_INPUT" && doc.questions ? (
        <View>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sparkBadge}><Text style={styles.sparkGlyph}>✦</Text></View>
            <Text style={styles.sectionHeader}>A couple of quick questions</Text>
          </View>
          <Text style={styles.hint}>We drafted what we could from your topic — answer these and we&apos;ll complete it.</Text>
          {(doc.questions as ClarifyQuestion[]).map((q) => (
            <View key={q.id} style={styles.questionBlock}>
              <Text style={styles.label}>{q.question}</Text>
              {q.options.length ? (
                <View style={styles.chipRow}>
                  {q.options.map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      style={[styles.chip, answers[q.id] === opt && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, answers[q.id] === opt && styles.chipTextActive]}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={answers[q.id] ?? ""}
                  onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                  placeholder="Your answer"
                  placeholderTextColor={colors.faint}
                />
              )}
            </View>
          ))}
          <Button label="Continue generating" onPress={submitAnswers} loading={busy} disabled={busy} style={{ marginTop: spacing.md }} />
        </View>
      ) : null}

      {doc && doc.status !== "GENERATING" && doc.status !== "QUEUED" && doc.status !== "NEEDS_INPUT" && doc.status !== "FAILED" ? (
        <View>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sparkBadge}><Text style={styles.sparkGlyph}>✦</Text></View>
            <Text style={styles.sectionHeader}>Academic Submission</Text>
          </View>

          {data.abstract ? (
            <Card style={styles.infoCard}>
              <Text style={styles.label}>Abstract</Text>
              <Text style={styles.body}>{data.abstract}</Text>
            </Card>
          ) : null}

          {data.sections?.length ? (
            <View style={styles.block}>
              {data.sections.map((s, i) => (
                <Card key={i} style={styles.stepCard}>
                  <View style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{i + 1}</Text>
                    </View>
                    <View style={styles.stepText}>
                      <Text style={styles.stepHeading}>{s.heading}</Text>
                      <Text style={styles.stepDetail}>{s.content}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ) : null}

          {data.references?.length ? (
            <Card style={styles.infoCard}>
              <Text style={styles.label}>References</Text>
              {data.references.map((ref, i) => (
                <Text key={i} style={styles.refItem}>{i + 1}. {ref}</Text>
              ))}
            </Card>
          ) : null}

          {doc.status === "READY" ? (
            <Button label="Download .docx" onPress={download} loading={downloading} disabled={downloading} style={{ marginTop: spacing.lg }} />
          ) : null}
        </View>
      ) : null}

      {doc?.status === "FAILED" ? <Text style={styles.error}>{doc.error ?? "Generation failed — please try again."}</Text> : null}
    </ScrollView>
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
  hint: { fontFamily: font.sans, fontSize: 12.5, color: colors.muted, marginTop: -spacing.sm, marginBottom: spacing.md, lineHeight: 18 },
  label: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  body: { fontFamily: font.sans, fontSize: 13.5, color: colors.ink, lineHeight: 19, marginTop: spacing.xs },
  infoCard: { marginBottom: spacing.md },
  block: { marginBottom: spacing.md },
  questionBlock: { marginBottom: spacing.md },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: spacing.md, fontFamily: font.sans, fontSize: 14, color: colors.ink, backgroundColor: colors.input, marginTop: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontFamily: font.sansMedium, fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.onAccent, fontFamily: font.sansSemibold },
  stepCard: { marginBottom: spacing.sm, padding: spacing.md },
  stepRow: { flexDirection: "row", gap: spacing.md },
  stepBadge: { width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  stepBadgeText: { fontFamily: font.sansSemibold, fontSize: 12, color: colors.teal },
  stepText: { flex: 1 },
  stepHeading: { fontFamily: font.sansSemibold, fontSize: 13.5, color: colors.ink },
  stepDetail: { fontFamily: font.sans, fontSize: 12.5, color: colors.muted, marginTop: spacing.xs, lineHeight: 18 },
  refItem: { fontFamily: font.sans, fontSize: 12.5, color: colors.ink, marginTop: spacing.xs, lineHeight: 18 },
  error: { color: colors.danger, fontFamily: font.sans, marginBottom: spacing.md },
});
