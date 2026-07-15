import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import type { ProjectDetail, ProjectBundle } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.getProject(id).then(setProject).catch(() => {});
  }, [client, id]);

  const generateBundle = useCallback(async () => {
    setBusy(true);
    try {
      const { bundle: b } = await client.generateProjectBundle(id);
      setBundle(b);
    } catch (err) {
      Alert.alert("Couldn't generate bundle", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, id]);

  const generatePlan = useCallback(async () => {
    setBusy(true);
    try {
      await client.generateProjectPlan(id);
      Alert.alert("Build plan generated");
    } catch (err) {
      Alert.alert("Couldn't generate plan", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, id]);

  const idea = (project?.content as { idea?: { title: string; summary: string; skills?: string[] } } | null)?.idea;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: project?.title ?? "Project" }} />
      {!project ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}

      {idea ? (
        <View>
          <Text style={styles.summary}>{idea.summary}</Text>
          {idea.skills?.length ? <Text style={styles.skills}>{idea.skills.join(" · ")}</Text> : null}
        </View>
      ) : null}

      <Pressable style={styles.actionButton} onPress={generatePlan} disabled={busy}>
        <Text style={styles.actionButtonText}>Generate build plan</Text>
      </Pressable>
      <Pressable style={styles.actionButton} onPress={generateBundle} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Generate report + PPT + viva</Text>}
      </Pressable>

      {bundle ? (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.body}>Report: {bundle.report?.status ?? "—"}</Text>
          <Text style={styles.body}>PPT: {bundle.ppt?.status ?? "—"}</Text>
          <Text style={styles.body}>Viva: {bundle.viva?.status ?? "—"}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: 14, color: "#333", lineHeight: 20 },
  skills: { fontSize: 12, color: "#888", marginTop: 8, marginBottom: 20 },
  actionButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  actionButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  body: { fontSize: 14, color: "#333", marginTop: 4 },
});
