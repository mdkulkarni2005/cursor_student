import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { BundleItem, ProjectBreakdownContent, ProjectDetail } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";
import { StarIcon } from "@/components/icons";

const DIFFICULTY_LABELS: Record<string, string> = { mini: "Mini Project", major: "Major Project", tpcs: "TPCS", "3rd-year": "3rd-Year" };
const BUNDLE_TINT: Record<string, { bg: string; fg: string }> = {
  ready: { bg: colors.successTint, fg: colors.success },
  needs_input: { bg: "rgba(217, 119, 6, 0.12)", fg: colors.warning },
  failed: { bg: colors.dangerTint, fg: colors.danger },
  skipped: { bg: colors.surface, fg: colors.muted },
  pending: { bg: colors.surface, fg: colors.muted },
};

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bundleBusy, setBundleBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);

  const load = useCallback(() => {
    client.getProject(id).then(setProject).catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this project."));
  }, [client, id]);
  useEffect(load, [load]);

  const generateBundle = useCallback(async () => {
    setBundleBusy(true);
    try {
      const { bundle } = await client.generateProjectBundle(id);
      setProject((p) => (p ? { ...p, content: { ...p.content, bundle } } : p));
    } catch (err) {
      Alert.alert("Couldn't generate bundle", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBundleBusy(false);
    }
  }, [client, id]);

  const generatePlan = useCallback(async () => {
    setPlanBusy(true);
    try {
      const { plan } = await client.generateProjectPlan(id);
      setProject((p) => (p ? { ...p, content: { ...p.content, breakdown: plan } } : p));
    } catch (err) {
      Alert.alert("Couldn't generate build plan", err instanceof Error ? err.message : "Try again.");
    } finally {
      setPlanBusy(false);
    }
  }, [client, id]);

  const openResearch = useCallback((query: string, site: "search" | "youtube") => {
    const q = encodeURIComponent(query);
    const url = site === "search" ? `https://www.google.com/search?q=${q}` : `https://www.youtube.com/results?search_query=${q}`;
    WebBrowser.openBrowserAsync(url);
  }, []);

  if (error) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "Project" }} />
        <Text style={[styles.error, { margin: spacing.lg }]}>{error}</Text>
      </View>
    );
  }
  if (!project) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "Project" }} />
        <ActivityIndicator color={colors.primaryDeep} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const { idea, description, bundle, breakdown } = project.content;
  const hasBundle = !!bundle && (bundle.report || bundle.ppt || bundle.viva);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: idea.title }} />

      <Card style={styles.overviewCard}>
        <View style={styles.overviewHeadRow}>
          <View style={styles.iconBadge}><StarIcon size={16} color={colors.primaryDeep} /></View>
          <Text style={styles.overviewMeta}>{DIFFICULTY_LABELS[idea.difficulty] ?? idea.difficulty} · {idea.hardwareNeeded ? "Hardware project" : "Software project"}</Text>
        </View>
        <Text style={styles.body}>{idea.summary}</Text>
        {idea.skills?.length ? (
          <View style={styles.skillsRow}>
            {idea.skills.map((s) => <View key={s} style={styles.skillChip}><Text style={styles.skillChipText}>{s}</Text></View>)}
          </View>
        ) : null}
        {idea.hardwareNote ? <Text style={styles.hardwareNote}>⚙ {idea.hardwareNote}</Text> : null}
        {description ? <Text style={styles.notes}><Text style={styles.notesLabel}>Your notes: </Text>{description}</Text> : null}
      </Card>

      <Card style={styles.bundleCard}>
        <Text style={styles.sectionTitle}>Academic Bundle</Text>
        <Text style={styles.sectionHint}>Generate report, slide deck, and viva questions from this project in one go.</Text>
        {hasBundle ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md }}>
            <BundleRow label="Report" icon="📄" item={bundle?.report} onPress={bundle?.report?.docId ? () => router.push(`/reports/${bundle.report!.docId}`) : undefined} />
            <BundleRow label="Presentation" icon="📊" item={bundle?.ppt} onPress={bundle?.ppt?.docId ? () => router.push(`/ppt/${bundle.ppt!.docId}`) : undefined} />
            <BundleRow label="Viva questions" icon="🎓" item={bundle?.viva} />
          </View>
        ) : null}
        <Button label={hasBundle ? "Regenerate bundle" : "Generate bundle"} onPress={generateBundle} loading={bundleBusy} disabled={bundleBusy} />
      </Card>

      <Card style={styles.planCard}>
        <View style={styles.planHeadRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Build Plan</Text>
            <Text style={styles.sectionHint}>The full how-to: phased plan, required components, research material, and what makes your build stand out.</Text>
          </View>
        </View>
        <Button label={breakdown ? "Regenerate build plan" : "Generate build plan"} onPress={generatePlan} loading={planBusy} disabled={planBusy} style={{ marginTop: spacing.md, marginBottom: breakdown ? spacing.lg : 0 }} />

        {breakdown ? <BuildPlan breakdown={breakdown} onOpenResearch={openResearch} /> : null}
      </Card>
    </ScrollView>
  );
}

function BundleRow({ label, icon, item, onPress }: { label: string; icon: string; item?: BundleItem; onPress?: () => void }) {
  const status = item?.status ?? "pending";
  const tint = BUNDLE_TINT[status] ?? BUNDLE_TINT.pending;
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.bundleRow} onPress={onPress}>
      <View style={styles.bundleRowLeft}>
        <Text style={styles.bundleIcon}>{icon}</Text>
        <Text style={styles.bundleLabel}>{label}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: tint.bg }]}>
        <Text style={[styles.badgeText, { color: tint.fg }]}>{status.replace("_", " ")}</Text>
      </View>
    </Wrapper>
  );
}

function BuildPlan({ breakdown: b, onOpenResearch }: { breakdown: ProjectBreakdownContent; onOpenResearch: (q: string, site: "search" | "youtube") => void }) {
  return (
    <View style={{ gap: spacing.lg }}>
      {b.problemStatement || b.solution ? (
        <View style={{ gap: spacing.sm }}>
          {b.problemStatement ? (
            <View style={styles.subCard}>
              <Text style={styles.label}>Problem statement</Text>
              <Text style={styles.body}>{b.problemStatement}</Text>
            </View>
          ) : null}
          {b.solution ? (
            <View style={styles.subCard}>
              <Text style={styles.label}>Solution</Text>
              <Text style={styles.body}>{b.solution}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {b.diagrams?.length ? (
        <View>
          <Text style={styles.label}>Diagrams</Text>
          <Text style={styles.diagramHint}>{b.diagrams.map((d) => d.label).join(" · ")} — view rendered diagrams on the web app.</Text>
        </View>
      ) : null}

      {b.phases?.length ? (
        <View>
          <Text style={styles.label}>Implementation phases</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {b.phases.map((p, i) => (
              <View key={p.name} style={styles.subCard}>
                <Text style={styles.phaseTitle}>{i + 1}. {p.name}</Text>
                <Text style={styles.phaseDesc}>{p.description}</Text>
                {p.tasks.map((t) => <Text key={t} style={styles.taskLine}>☐ {t}</Text>)}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {b.components?.length ? (
        <View>
          <Text style={styles.label}>Components</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {b.components.map((c) => (
              <View key={c.name} style={styles.subCard}>
                <Text style={styles.phaseTitle}>{c.name}</Text>
                <Text style={styles.phaseDesc}>{c.purpose}</Text>
                <Text style={styles.componentTech}>{c.tech}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {b.research?.length ? (
        <View>
          <Text style={styles.label}>Research material</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {b.research.map((r) => (
              <View key={r.topic} style={styles.researchRow}>
                <Text style={styles.researchTopic}>{r.topic}</Text>
                <Text style={styles.researchWhy}>{r.why}</Text>
                <View style={styles.researchLinks}>
                  <Pressable style={styles.linkChip} onPress={() => onOpenResearch(r.searchQuery, "search")}><Text style={styles.linkChipText}>Search ↗</Text></Pressable>
                  <Pressable style={styles.linkChip} onPress={() => onOpenResearch(r.searchQuery, "youtube")}><Text style={styles.linkChipText}>YouTube ↗</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {b.differentiators?.length ? (
        <View>
          <Text style={styles.label}>What makes this stand out</Text>
          {b.differentiators.map((d) => <Text key={d} style={styles.diffLine}>✦ {d}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 60 },
  error: { color: colors.danger, fontFamily: font.sans },

  overviewCard: { marginBottom: spacing.md },
  overviewHeadRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  iconBadge: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.indigoTint, alignItems: "center", justifyContent: "center" },
  overviewMeta: { fontFamily: font.sansMedium, fontSize: 12, color: colors.muted },
  body: { fontFamily: font.sans, fontSize: 13.5, color: colors.ink, lineHeight: 19 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  skillChip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: spacing.sm },
  skillChipText: { fontFamily: font.sans, fontSize: 11, color: colors.muted },
  hardwareNote: { fontFamily: font.sans, fontSize: 11.5, color: colors.warning, backgroundColor: "rgba(217, 119, 6, 0.1)", borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  notes: { fontFamily: font.sans, fontSize: 12.5, color: colors.muted, marginTop: spacing.sm, borderTopWidth: 1, borderColor: colors.line, paddingTop: spacing.sm, lineHeight: 18 },
  notesLabel: { fontFamily: font.sansSemibold, color: colors.ink },

  bundleCard: { marginBottom: spacing.md },
  planCard: {},
  planHeadRow: { flexDirection: "row" },
  sectionTitle: { fontFamily: font.displaySemibold, fontSize: 15, color: colors.ink },
  sectionHint: { fontFamily: font.sans, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },

  bundleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surface },
  bundleRowLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bundleIcon: { fontSize: 16 },
  bundleLabel: { fontFamily: font.sansSemibold, fontSize: 13.5, color: colors.ink },
  badge: { borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: spacing.sm },
  badgeText: { fontFamily: font.sansSemibold, fontSize: 10.5, textTransform: "capitalize" },

  label: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  subCard: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surface },
  diagramHint: { fontFamily: font.sans, fontSize: 12, color: colors.faint, marginTop: spacing.xs, fontStyle: "italic" },
  phaseTitle: { fontFamily: font.sansSemibold, fontSize: 13.5, color: colors.ink },
  phaseDesc: { fontFamily: font.sans, fontSize: 12.5, color: colors.muted, marginTop: spacing.xs },
  taskLine: { fontFamily: font.sans, fontSize: 12.5, color: colors.ink, marginTop: spacing.xs },
  componentTech: { fontFamily: font.sans, fontSize: 11.5, color: colors.primaryDeep, marginTop: spacing.xs },
  researchRow: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  researchTopic: { fontFamily: font.sansSemibold, fontSize: 12.5, color: colors.ink },
  researchWhy: { fontFamily: font.sans, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  researchLinks: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  linkChip: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: spacing.sm, backgroundColor: colors.card },
  linkChipText: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.primaryDeep },
  diffLine: { fontFamily: font.sans, fontSize: 12.5, color: colors.ink, marginTop: spacing.xs },
});
