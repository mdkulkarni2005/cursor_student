import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import type { VaultDocSummary } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { colors, font, radius, spacing } from "@/lib/theme";
import { LayersIcon, PencilIcon, ResumeIcon, SearchIcon, SlidesIcon, StarIcon, type IconProps } from "@/components/icons";

const DETAIL_ROUTE: Record<string, string> = {
  REPORT: "/reports",
  PPT: "/ppt",
  RESUME: "/resume",
  ASSIGNMENT: "/assignments",
  PROJECT: "/projects",
  LAB_REPORT: "/lab-reports",
};

/** Mirrors web's vault `TYPE_META` (apps/web/app/vault/page.tsx) — only the doc types mobile can create. */
const TYPE_META: Record<string, { icon: (p: IconProps) => ReturnType<typeof SlidesIcon>; tint: string; accent: string }> = {
  REPORT: { icon: SlidesIcon, tint: colors.cyanTint, accent: colors.cyan },
  PPT: { icon: SlidesIcon, tint: colors.indigoTint, accent: colors.primaryDeep },
  ASSIGNMENT: { icon: PencilIcon, tint: colors.dangerTint, accent: colors.danger },
  PROJECT: { icon: StarIcon, tint: colors.indigoTint, accent: colors.primaryDeep },
  RESUME: { icon: ResumeIcon, tint: colors.tealTint, accent: colors.teal },
  LAB_REPORT: { icon: LayersIcon, tint: colors.tealTint, accent: colors.teal },
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

const FILTERS = [
  { label: "All", value: "" },
  { label: "Reports", value: "REPORT" },
  { label: "PPTs", value: "PPT" },
  { label: "Assignments", value: "ASSIGNMENT" },
  { label: "Projects", value: "PROJECT" },
  { label: "Lab Reports", value: "LAB_REPORT" },
  { label: "Resume", value: "RESUME" },
] as const;

function relTime(iso: string): string {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default function Vault() {
  const client = useApiClient();
  const [docs, setDocs] = useState<VaultDocSummary[]>([]);
  // Separate from `refreshing` — seeding FlatList's own `refreshing` prop as true on mount can
  // send SwipeRefreshLayout into a loop where it keeps re-invoking onRefresh (Fabric quirk).
  // `loading` only gates the empty-state copy; `refreshing` is purely user pull-to-refresh.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = useCallback(() => {
    client
      .listVault(typeFilter || undefined)
      .then((r) => setDocs(r.documents))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [client, typeFilter]);

  useEffect(load, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.title.toLowerCase().includes(q));
  }, [docs, query]);

  const onDelete = useCallback(
    (id: string) => {
      Alert.alert("Delete document", "This can't be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => client.deleteVaultDoc(id).then(load).catch(() => {}) },
      ]);
    },
    [client, load],
  );

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={filtered}
      numColumns={2}
      columnWrapperStyle={filtered.length ? styles.row : undefined}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyExtractor={(d) => d.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>Vault</Text>
          <Text style={styles.subtitle}>Your central repository for all academic assets and AI-generated intelligence.</Text>

          <View style={styles.searchBar}>
            <SearchIcon size={16} color={colors.faint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search the Vault…"
              placeholderTextColor={colors.faint}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.chipRow}>
            {FILTERS.map((f) => {
              const active = f.value === typeFilter;
              return (
                <Pressable key={f.label} onPress={() => setTypeFilter(f.value)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      ListEmptyComponent={
        !loading ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{query || typeFilter ? "Nothing matches that." : "Your vault is empty."}</Text>
            <Text style={styles.emptyHint}>Generate a report and it&apos;ll be saved here automatically.</Text>
          </Card>
        ) : null
      }
      renderItem={({ item }) => {
        const meta = TYPE_META[item.type] ?? TYPE_META.REPORT;
        const Icon = meta.icon;
        const status = STATUS_TINT[item.status] ?? STATUS_TINT.DRAFT;
        return (
          <Pressable
            style={styles.cardWrap}
            onPress={() => router.push(`${DETAIL_ROUTE[item.type] ?? "/reports"}/${item.id}` as never)}
            onLongPress={() => onDelete(item.id)}
          >
            <Card style={styles.docCard}>
              <View style={styles.docCardHead}>
                <View style={[styles.iconBadge, { backgroundColor: meta.tint }]}>
                  <Icon size={18} color={meta.accent} />
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusLabel, { color: status.fg }]}>{STATUS_LABEL[item.status] ?? "Draft"}</Text>
                </View>
              </View>
              <Text style={styles.docTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.docMeta}>Modified {relTime(item.updatedAt)}</Text>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg },
  row: { gap: spacing.md },

  title: { fontFamily: font.display, fontSize: 26, color: colors.ink },
  subtitle: { fontFamily: font.sans, fontSize: 13.5, color: colors.muted, marginTop: spacing.xs, lineHeight: 19 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.lg,
  },
  searchInput: { flex: 1, fontFamily: font.sans, fontSize: 14, color: colors.ink, padding: 0 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipActive: { borderColor: colors.cyan, backgroundColor: colors.cyanTint },
  chipLabel: { fontFamily: font.sansMedium, fontSize: 12.5, color: colors.muted },
  chipLabelActive: { color: colors.cyan },

  cardWrap: { flex: 1, maxWidth: "48%" },
  docCard: { padding: spacing.md },
  docCardHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.md },
  iconBadge: { width: 36, height: 36, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  statusBadge: { borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 3 },
  statusLabel: { fontFamily: font.sansSemibold, fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.3 },
  docTitle: { fontFamily: font.sansSemibold, fontSize: 13.5, color: colors.ink },
  docMeta: { fontFamily: font.sans, fontSize: 11, color: colors.muted, marginTop: spacing.sm },

  emptyCard: { alignItems: "center", padding: spacing.xxl, borderStyle: "dashed" },
  emptyTitle: { fontFamily: font.sans, fontSize: 14, color: colors.muted },
  emptyHint: { fontFamily: font.sans, fontSize: 12.5, color: colors.faint, marginTop: spacing.xs, textAlign: "center" },
});
