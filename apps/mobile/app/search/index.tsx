import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
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

const DEBOUNCE_MS = 300;

export default function Search() {
  const client = useApiClient();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState<VaultDocSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setSubmittedQuery(trimmed);
      if (!trimmed) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      client
        .search(trimmed)
        .then((r) => setResults(r.documents))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    },
    [client],
  );

  const onChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(text), DEBOUNCE_MS);
    },
    [runSearch],
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "Search" }} />
      <View style={styles.searchBar}>
        <SearchIcon size={16} color={colors.faint} />
        <TextInput
          value={query}
          onChangeText={onChangeText}
          onSubmitEditing={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            runSearch(query);
          }}
          placeholder="Search your documents…"
          placeholderTextColor={colors.faint}
          style={styles.searchInput}
          autoFocus
          returnKeyType="search"
        />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={results}
        keyExtractor={(d) => d.id}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.cyan} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.empty}>
                {submittedQuery ? `No documents match ‘${submittedQuery}’.` : "Search your documents by title."}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.REPORT;
          const Icon = meta.icon;
          const status = STATUS_TINT[item.status] ?? STATUS_TINT.DRAFT;
          const route = DETAIL_ROUTE[item.type];
          const RowInner = (
            <Card style={styles.row}>
              <View style={[styles.iconBadge, { backgroundColor: meta.tint }]}>
                <Icon size={16} color={meta.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowMeta}>{new Date(item.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.fg }]}>{STATUS_LABEL[item.status] ?? "Draft"}</Text>
              </View>
            </Card>
          );
          return route ? (
            <Pressable onPress={() => router.push(`${route}/${item.id}` as never)}>{RowInner}</Pressable>
          ) : (
            RowInner
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
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
    margin: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: font.sans, fontSize: 14, color: colors.ink, padding: 0 },

  listContent: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40, gap: spacing.sm },

  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm },
  iconBadge: { width: 36, height: 36, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: font.sansSemibold, fontSize: 14, color: colors.ink },
  rowMeta: { fontFamily: font.sans, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  badge: { borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: { fontFamily: font.sansSemibold, fontSize: 10, textTransform: "uppercase" },

  emptyState: { alignItems: "center", marginTop: 40, paddingHorizontal: spacing.lg },
  empty: { fontFamily: font.sans, fontSize: 13.5, color: colors.muted, textAlign: "center" },
});
