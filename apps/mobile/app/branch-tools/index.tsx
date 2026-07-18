import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { useApiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { colors, font, radius, spacing } from "@/lib/theme";
import { BRANCH_FEATURES_WEB_ONLY, BRANCH_SOLVER_FEATURES } from "@/lib/constants";
import type { DocSummary } from "@studentos/api-types";
import { ToolIcon } from "@/components/icons";

const STATUS_TINT: Record<string, string> = { READY: colors.successTint, FAILED: colors.dangerTint, GENERATING: colors.indigoTint, QUEUED: colors.indigoTint, NEEDS_INPUT: colors.dangerTint, DRAFT: colors.line };
const STATUS_LABEL: Record<string, string> = { READY: "Ready", FAILED: "Failed", GENERATING: "Solving…", QUEUED: "Queued", NEEDS_INPUT: "Needs input", DRAFT: "Draft" };

export default function BranchTools() {
  const client = useApiClient();
  const [branchFeatures, setBranchFeatures] = useState<string[] | null>(null);
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [me, { documents }] = await Promise.all([client.me(), client.listBranchSolverDocs()]);
      setBranchFeatures(me.capabilities.branchFeatures);
      setDocs(documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load branch tools.");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  const availableSlugs = (branchFeatures ?? []).filter((slug) => BRANCH_SOLVER_FEATURES[slug]);
  const webOnlySlugs = (branchFeatures ?? []).filter((slug) => BRANCH_FEATURES_WEB_ONLY.includes(slug));

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={docs}
      keyExtractor={(d) => d.id}
      ListHeaderComponent={
        <View>
          <Stack.Screen options={{ title: "Branch Tools" }} />
          <Text style={styles.title}>Branch Tools</Text>
          <Text style={styles.subtitle}>Solvers tailored to your branch.</Text>

          {loading ? <ActivityIndicator color={colors.cyan} style={{ marginTop: spacing.xl }} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!loading && availableSlugs.length === 0 && webOnlySlugs.length === 0 && !error ? (
            <Card style={{ marginTop: spacing.lg }}>
              <Text style={styles.emptyText}>No branch-specific tools are available for your department yet.</Text>
            </Card>
          ) : null}

          {availableSlugs.map((slug) => {
            const f = BRANCH_SOLVER_FEATURES[slug];
            return (
              <Pressable key={slug} onPress={() => router.push(`/branch-tools/new?feature=${slug}`)}>
                <Card style={styles.toolCard}>
                  <View style={styles.toolIcon}>
                    <ToolIcon size={18} color={colors.cyan} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toolLabel}>{f.label}</Text>
                    <Text style={styles.toolBlurb}>{f.blurb}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}

          {webOnlySlugs.length > 0 ? (
            <Card style={{ marginTop: spacing.md, backgroundColor: colors.surface }}>
              <Text style={styles.emptyText}>
                {webOnlySlugs.join(" & ")} {webOnlySlugs.length > 1 ? "are" : "is"} available on the web app — coming soon to mobile.
              </Text>
            </Card>
          ) : null}

          {docs.length > 0 ? <Text style={styles.sectionLabel}>Recent</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/branch-tools/${item.id}`)}>
          <Card style={styles.docCard}>
            <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_TINT[item.status] ?? colors.line }]}>
              <Text style={styles.badgeText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 60 },
  title: { fontFamily: font.display, fontSize: 22, color: colors.ink },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 18 },
  error: { color: colors.danger, fontFamily: font.sans, marginBottom: spacing.md },
  emptyText: { fontFamily: font.sans, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
  toolCard: { flexDirection: "row", gap: spacing.md, alignItems: "center", marginBottom: spacing.sm },
  toolIcon: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.cyanTint, alignItems: "center", justifyContent: "center" },
  toolLabel: { fontFamily: font.sansSemibold, fontSize: 14.5, color: colors.ink },
  toolBlurb: { fontFamily: font.sans, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 },
  sectionLabel: { fontFamily: font.sansSemibold, fontSize: 12, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4, marginTop: spacing.lg, marginBottom: spacing.sm },
  docCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  docTitle: { flex: 1, fontFamily: font.sansMedium, fontSize: 14, color: colors.ink, marginRight: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.ink },
});
