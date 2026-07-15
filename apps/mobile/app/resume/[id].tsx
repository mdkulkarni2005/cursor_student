import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { ResumeDetail } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";

export default function ResumeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const [doc, setDoc] = useState<ResumeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const next = await client.getResume(id);
      setDoc(next);
      if (next.status === "GENERATING" || next.status === "QUEUED") setTimeout(poll, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load resume.");
    }
  }, [client, id]);

  useEffect(() => {
    poll();
  }, [poll]);

  const download = useCallback(async () => {
    try {
      const { url } = await client.resumeDownloadUrl(id);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert("Couldn't download", err instanceof Error ? err.message : "Try again.");
    }
  }, [client, id]);

  const resume = doc?.resume as { summary?: string; skills?: string[]; experience?: { title: string; company: string }[] } | null;
  const ats = (doc?.meta as { ats?: { score?: number } } | null)?.ats;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: doc?.title ?? "Resume" }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!doc ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}

      {doc?.status === "GENERATING" || doc?.status === "QUEUED" ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.stageText}>Building your resume…</Text>
        </View>
      ) : null}

      {doc?.status === "READY" ? (
        <View>
          {ats?.score !== undefined ? <Text style={styles.atsScore}>ATS score: {ats.score}/100</Text> : null}
          {resume?.summary ? <Text style={styles.body}>{resume.summary}</Text> : null}
          {resume?.skills?.length ? <Text style={styles.body}>Skills: {resume.skills.join(", ")}</Text> : null}
          {resume?.experience?.map((e, i) => (
            <Text key={i} style={styles.body}>{e.title} — {e.company}</Text>
          ))}
          <Pressable style={styles.primaryButton} onPress={download}>
            <Text style={styles.primaryButtonText}>Download .docx</Text>
          </Pressable>
        </View>
      ) : null}

      {doc?.status === "FAILED" ? <Text style={styles.error}>{doc.error ?? "Generation failed — please try again."}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", marginTop: 40 },
  stageText: { marginTop: 12, color: "#666" },
  atsScore: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  body: { fontSize: 14, color: "#333", lineHeight: 20, marginBottom: 8 },
  primaryButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 10, marginBottom: 40 },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  error: { color: "#e11d48", marginBottom: 12 },
});
