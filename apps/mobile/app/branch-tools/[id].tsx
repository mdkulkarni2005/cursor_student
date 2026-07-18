import { useCallback } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useApiClient } from "@/lib/api";
import { useGeneratedDoc } from "@/lib/use-generated-doc";
import { Card } from "@/components/ui/card";
import { colors, font, radius, spacing } from "@/lib/theme";

/** Mirrors the branch-solver SolutionData shape — same as assignments (packages/ai/src/branch-solver.ts). */
type SolutionData = {
  questionSummary?: string;
  approach?: string;
  steps?: { heading: string; detail: string }[];
  finalAnswer?: string;
  code?: string;
};

export default function BranchSolverDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const fetchDoc = useCallback(() => client.getBranchSolverDoc(id), [client, id]);
  const { doc, error } = useGeneratedDoc(fetchDoc);
  const sol = (doc?.content ?? {}) as SolutionData;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: doc?.title ?? "Branch Tool" }} />
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
            <Text style={styles.sectionHeader}>Step-by-Step Solution</Text>
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
        </View>
      ) : null}

      {doc?.status === "FAILED" ? <Text style={styles.error}>{doc.error ?? "Couldn't solve this — please try again."}</Text> : null}
    </ScrollView>
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
  error: { color: colors.danger, fontFamily: font.sans, marginBottom: spacing.md },
});
