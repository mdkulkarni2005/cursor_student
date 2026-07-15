import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import type { DocSummary } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";

export default function ReportsList() {
  const client = useApiClient();
  const [reports, setReports] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    client.listReports().then((r) => setReports(r.reports)).finally(() => setLoading(false));
  }, [client]);

  useEffect(load, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Stack.Screen options={{ title: "Reports", headerRight: () => (
        <Pressable onPress={() => router.push("/reports/new")}><Text style={styles.newLink}>New</Text></Pressable>
      ) }} />
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={reports}
        refreshing={loading}
        onRefresh={load}
        keyExtractor={(d) => d.id}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No reports yet — tap New to generate one.</Text> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/reports/${item.id}`)}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.status}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 14, borderBottomWidth: 1, borderColor: "#eee" },
  title: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, color: "#888", marginTop: 2 },
  empty: { textAlign: "center", color: "#999", marginTop: 60 },
  newLink: { color: "#2563eb", fontWeight: "600", fontSize: 15 },
});
