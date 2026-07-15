import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { VaultDocSummary } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";

const DETAIL_ROUTE: Record<string, string> = {
  REPORT: "/reports",
  PPT: "/ppt",
  RESUME: "/resume",
  ASSIGNMENT: "/assignments",
  PROJECT: "/projects",
  LAB_REPORT: "/lab-reports",
  BRANCH_SOLVER: "/lab-reports", // branch-tool detail reuses the generic viewer for now
};

export default function Vault() {
  const client = useApiClient();
  const [docs, setDocs] = useState<VaultDocSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    client
      .listVault()
      .then((r) => setDocs(r.documents))
      .finally(() => setLoading(false));
  }, [client]);

  useEffect(load, [load]);

  const onDelete = useCallback(
    (id: string) => {
      Alert.alert("Delete document", "This can't be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => client.deleteVaultDoc(id).then(load),
        },
      ]);
    },
    [client, load],
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 16 }}
      data={docs}
      refreshing={loading}
      onRefresh={load}
      keyExtractor={(d) => d.id}
      ListEmptyComponent={!loading ? <Text style={styles.empty}>Nothing generated yet.</Text> : null}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => router.push(`${DETAIL_ROUTE[item.type] ?? "/reports"}/${item.id}` as never)}
          onLongPress={() => onDelete(item.id)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.status} · {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", paddingVertical: 14, borderBottomWidth: 1, borderColor: "#eee" },
  title: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, color: "#888", marginTop: 2 },
  empty: { textAlign: "center", color: "#999", marginTop: 60 },
});
