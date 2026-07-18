import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import type { WorkspaceResponse } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { colors, font, radius, spacing } from "@/lib/theme";
import { LayersIcon, PencilIcon, SlidesIcon, StarIcon, type IconProps } from "@/components/icons";

/** Only doc types generated into the semester workspace get a mobile detail screen — VIVA has none yet. */
const DETAIL_ROUTE: Record<string, string> = {
  REPORT: "/reports",
  PPT: "/ppt",
  ASSIGNMENT: "/assignments",
  PROJECT: "/projects",
};

const TYPE_META: Record<string, { icon: (p: IconProps) => ReturnType<typeof SlidesIcon>; tint: string; accent: string }> = {
  REPORT: { icon: SlidesIcon, tint: colors.cyanTint, accent: colors.cyan },
  PPT: { icon: SlidesIcon, tint: colors.indigoTint, accent: colors.primaryDeep },
  ASSIGNMENT: { icon: PencilIcon, tint: colors.dangerTint, accent: colors.danger },
  PROJECT: { icon: StarIcon, tint: colors.indigoTint, accent: colors.primaryDeep },
  VIVA: { icon: LayersIcon, tint: colors.tealTint, accent: colors.teal },
};

const STATUS_LABEL: Record<string, string> = {
  READY: "Ready",
  GENERATING: "Generating",
  QUEUED: "Queued",
  NEEDS_INPUT: "Input",
  FAILED: "Failed",
  DRAFT: "Draft",
};
const STATUS_TINT: Record<string, { bg: string; fg: string }> = {
  READY: { bg: colors.successTint, fg: colors.success },
  GENERATING: { bg: colors.cyanTint, fg: colors.cyan },
  QUEUED: { bg: colors.surface, fg: colors.muted },
  NEEDS_INPUT: { bg: colors.indigoTint, fg: colors.primaryDeep },
  FAILED: { bg: colors.dangerTint, fg: colors.danger },
  DRAFT: { bg: colors.surface, fg: colors.muted },
};

export default function Workspace() {
  const client = useApiClient();
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    client
      .getWorkspace()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your workspace."))
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
    <ScrollScreen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}>
      <Stack.Screen options={{ title: "Workspace" }} />
      <Text style={styles.title}>{data?.name ?? "Workspace"}</Text>
      <Text style={styles.subtitle}>
        {(data?.department ?? "Your department")} · {data?.totalCount ?? 0} {data?.totalCount === 1 ? "item" : "items"}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.cyan} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : !data || data.groups.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>This semester&apos;s workspace is empty.</Text>
          <Text style={styles.emptyHint}>Anything you generate this semester lands here, organized by type.</Text>
        </Card>
      ) : (
        <View style={styles.groups}>
          {data.groups.map((g) => (
            <View key={g.type}>
              <View style={styles.groupHead}>
                <Text style={styles.groupLabel}>{g.label}</Text>
                <Text style={styles.groupCount}>{g.documents.length}</Text>
              </View>
              <View style={styles.rows}>
                {g.documents.map((d) => {
                  const meta = TYPE_META[g.type] ?? TYPE_META.REPORT;
                  const Icon = meta.icon;
                  const status = STATUS_TINT[d.status] ?? STATUS_TINT.DRAFT;
                  const route = DETAIL_ROUTE[g.type];
                  const RowInner = (
                    <Card style={styles.row}>
                      <View style={[styles.iconBadge, { backgroundColor: meta.tint }]}>
                        <Icon size={16} color={meta.accent} />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{d.title}</Text>
                        <Text style={styles.rowMeta}>{new Date(d.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.badgeText, { color: status.fg }]}>{STATUS_LABEL[d.status] ?? "Draft"}</Text>
                      </View>
                    </Card>
                  );
                  return route ? (
                    <Pressable key={d.id} onPress={() => router.push(`${route}/${d.id}` as never)}>
                      {RowInner}
                    </Pressable>
                  ) : (
                    <View key={d.id}>{RowInner}</View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.display, fontSize: 22, color: colors.ink },
  subtitle: { fontFamily: font.sans, fontSize: 13.5, color: colors.muted, marginTop: spacing.xs },

  groups: { marginTop: spacing.xl, gap: spacing.xl },
  groupHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  groupLabel: { fontFamily: font.displaySemibold, fontSize: 15.5, color: colors.ink },
  groupCount: { fontFamily: font.sans, fontSize: 12.5, color: colors.faint },
  rows: { gap: spacing.sm },

  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  iconBadge: { width: 36, height: 36, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: font.sansSemibold, fontSize: 14, color: colors.ink },
  rowMeta: { fontFamily: font.sans, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  badge: { borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: { fontFamily: font.sansSemibold, fontSize: 10, textTransform: "uppercase" },

  emptyCard: { alignItems: "center", padding: spacing.xxl, borderStyle: "dashed", marginTop: spacing.xl },
  emptyTitle: { fontFamily: font.sans, fontSize: 14, color: colors.muted },
  emptyHint: { fontFamily: font.sans, fontSize: 12.5, color: colors.faint, marginTop: spacing.xs, textAlign: "center" },

  emptyState: { alignItems: "center", marginTop: 40, paddingHorizontal: spacing.lg },
  errorText: { fontFamily: font.sans, fontSize: 13.5, color: colors.danger, textAlign: "center", marginBottom: spacing.md },
  retryButton: { backgroundColor: colors.cyan, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: spacing.xl },
  retryButtonText: { fontFamily: font.sansSemibold, fontSize: 14, color: colors.onAccent },
});
