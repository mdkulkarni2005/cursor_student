import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import type { DocSummary } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { colors, font, radius, spacing } from "@/lib/theme";
import { ResumeIcon } from "@/components/icons";

const STATUS_TINT: Record<string, { bg: string; fg: string }> = {
  READY: { bg: colors.successTint, fg: colors.success },
  GENERATING: { bg: colors.cyanTint, fg: colors.cyan },
  QUEUED: { bg: colors.cyanTint, fg: colors.cyan },
  FAILED: { bg: colors.dangerTint, fg: colors.danger },
  DRAFT: { bg: colors.surface, fg: colors.muted },
};
const STATUS_LABEL: Record<string, string> = {
  READY: "Ready",
  GENERATING: "Writing",
  QUEUED: "Queued",
  FAILED: "Failed",
  DRAFT: "Draft",
};

export default function ResumeList() {
  const client = useApiClient();
  const [resumes, setResumes] = useState<DocSummary[]>([]);
  // Separate from `refreshing` — seeding FlatList's own `refreshing` prop as true on mount can
  // send SwipeRefreshLayout into a loop where it keeps re-invoking onRefresh (Fabric quirk).
  // `loading` only gates the empty-state copy; `refreshing` is purely user pull-to-refresh.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    client
      .listResumes()
      .then((r) => setResumes(r.resumes))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load resumes."))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [client]);
  useEffect(load, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "Resumes",
          headerRight: () => (
            <Pressable onPress={() => router.push("/resume/new")}>
              <Text style={styles.newLink}>New</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        contentContainerStyle={styles.listContent}
        data={resumes}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(d) => d.id}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.title}>Resume Builder</Text>
            <Text style={styles.subtitle}>ATS-friendly resume in a recruiter-ready format — you bring the content, we write strong bullets and lock the layout.</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.cyan} style={{ marginTop: 60 }} />
          ) : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={load}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.empty}>No resumes yet — tap New to generate your first, editable.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const tint = STATUS_TINT[item.status] ?? STATUS_TINT.DRAFT;
          return (
            <Pressable onPress={() => router.push(`/resume/${item.id}`)}>
              <Card style={styles.row}>
                <View style={styles.rowIconBadge}>
                  <ResumeIcon size={16} color={colors.cyan} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.rowMeta}>{new Date(item.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: tint.bg }]}>
                  <Text style={[styles.badgeText, { color: tint.fg }]}>{STATUS_LABEL[item.status] ?? "Draft"}</Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  listContent: { padding: spacing.lg, paddingBottom: 40 },
  intro: { marginBottom: spacing.lg },
  title: { fontFamily: font.display, fontSize: 22, color: colors.ink },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.muted, marginTop: spacing.xs, lineHeight: 18 },
  newLink: { color: colors.cyan, fontFamily: font.sansSemibold, fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm },
  rowIconBadge: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.cyanTint, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: font.sansSemibold, fontSize: 14, color: colors.ink },
  rowMeta: { fontFamily: font.sans, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  badge: { borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: { fontFamily: font.sansSemibold, fontSize: 10, textTransform: "uppercase" },
  emptyState: { alignItems: "center", marginTop: 40, paddingHorizontal: spacing.lg },
  empty: { fontFamily: font.sans, fontSize: 13.5, color: colors.muted, textAlign: "center" },
  errorText: { fontFamily: font.sans, fontSize: 13.5, color: colors.danger, textAlign: "center", marginBottom: spacing.md },
  retryButton: { backgroundColor: colors.cyan, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: spacing.xl },
  retryButtonText: { fontFamily: font.sansSemibold, fontSize: 14, color: colors.onAccent },
});
