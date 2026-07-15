import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import type { ProjectIdea } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";

export default function ProjectIdeas() {
  const client = useApiClient();
  const [interests, setInterests] = useState("");
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [busy, setBusy] = useState(false);

  const suggest = useCallback(async () => {
    setBusy(true);
    try {
      const { ideas: got } = await client.suggestProjectIdeas({ interests: interests.trim() || undefined });
      setIdeas(got);
    } catch (err) {
      Alert.alert("Couldn't suggest ideas", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [client, interests]);

  const pick = useCallback(
    async (idea: ProjectIdea) => {
      setBusy(true);
      try {
        const { docId } = await client.finalizeProject({ idea });
        router.replace(`/projects/${docId}`);
      } catch (err) {
        Alert.alert("Couldn't finalize", err instanceof Error ? err.message : "Try again.");
      } finally {
        setBusy(false);
      }
    },
    [client],
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: "Project Ideas" }} />
      <Text style={styles.label}>Interests (optional)</Text>
      <TextInput style={styles.input} value={interests} onChangeText={setInterests} placeholder="e.g. IoT, machine learning, web apps" />
      <Pressable style={styles.suggestButton} onPress={suggest} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.suggestButtonText}>Suggest ideas</Text>}
      </Pressable>

      {ideas.map((idea, i) => (
        <View key={i} style={styles.ideaCard}>
          <Text style={styles.ideaTitle}>{idea.title}</Text>
          <Text style={styles.ideaSummary}>{idea.summary}</Text>
          {idea.skills?.length ? <Text style={styles.ideaSkills}>{idea.skills.join(" · ")}</Text> : null}
          <Pressable style={styles.pickButton} onPress={() => pick(idea)} disabled={busy}>
            <Text style={styles.pickButtonText}>Choose this</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 12, fontSize: 15 },
  suggestButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16, marginBottom: 20 },
  suggestButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  ideaCard: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 14, marginBottom: 12 },
  ideaTitle: { fontSize: 15, fontWeight: "700" },
  ideaSummary: { fontSize: 13, color: "#444", marginTop: 4 },
  ideaSkills: { fontSize: 12, color: "#888", marginTop: 6 },
  pickButton: { backgroundColor: "#111", borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 10 },
  pickButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
