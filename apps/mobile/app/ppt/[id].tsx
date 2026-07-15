import { useCallback } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useApiClient } from "@/lib/api";
import { useGeneratedDoc } from "@/lib/use-generated-doc";

const STAGE_LABEL: Record<string, string> = { draft: "Drafting your slides", review: "Checking for missing details", format: "Formatting & finalizing" };

export default function PptDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useApiClient();
  const fetchDoc = useCallback(() => client.getPpt(id), [client, id]);
  const { doc, error } = useGeneratedDoc(fetchDoc);

  const download = useCallback(async () => {
    try {
      const { url } = await client.pptDownloadUrl(id);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert("Couldn't download", err instanceof Error ? err.message : "Try again.");
    }
  }, [client, id]);

  const slides = (doc?.content as { slides?: { heading: string; bullets: string[] }[] } | null)?.slides ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: doc?.title ?? "Presentation" }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!doc ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}

      {doc?.status === "GENERATING" || doc?.status === "QUEUED" ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.stageText}>{STAGE_LABEL[doc.stage ?? ""] ?? "Working on it…"}</Text>
        </View>
      ) : null}

      {doc?.status === "READY" ? (
        <View>
          {slides.map((s, i) => (
            <View key={i} style={styles.slideCard}>
              <Text style={styles.slideHeading}>{i + 1}. {s.heading}</Text>
              {s.bullets.map((b, j) => (
                <Text key={j} style={styles.bullet}>• {b}</Text>
              ))}
            </View>
          ))}
          <Pressable style={styles.primaryButton} onPress={download}>
            <Text style={styles.primaryButtonText}>Download .pptx</Text>
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
  slideCard: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 12 },
  slideHeading: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  bullet: { fontSize: 13, color: "#444", marginTop: 2 },
  primaryButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 10, marginBottom: 40 },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  error: { color: "#e11d48", marginBottom: 12 },
});
