import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import type { DocSummary } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";

export default function LabReportsList() {
  const client = useApiClient();
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    client.listLabReports().then((r) => setDocs(r.labReports)).finally(() => setLoading(false));
  }, [client]);
  useEffect(load, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Stack.Screen options={{ title: "Lab Reports", headerRight: () => (
        <Pressable onPress={() => router.push("/lab-reports/new")}><Text style={styles.newLink}>New</Text></Pressable>
      ) }} />
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={docs}
        refreshing={loading}
        onRefresh={load}
        keyExtractor={(d) => d.id}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No lab reports yet.</Text> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/lab-reports/${item.id}`)}>
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
