import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import type { ProjectDifficulty, ProjectIdea } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";

const DIFFICULTIES: { value: ProjectDifficulty; label: string }[] = [
  { value: "mini", label: "Mini Project" },
  { value: "major", label: "Major Project" },
  { value: "tpcs", label: "TPCS" },
  { value: "3rd-year", label: "3rd-Year" },
];

export default function ProjectIdeas() {
  const client = useApiClient();
  const [interests, setInterests] = useState("");
  const [difficulty, setDifficulty] = useState<ProjectDifficulty | null>(null);
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [choosingIdx, setChoosingIdx] = useState<number | null>(null);

  const suggest = useCallback(async () => {
    setSuggesting(true);
    try {
      const { ideas: got } = await client.suggestProjectIdeas({ interests: interests.trim() || undefined, difficulty: difficulty ?? undefined });
      setIdeas(got);
    } catch (err) {
      Alert.alert("Couldn't suggest ideas", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSuggesting(false);
    }
  }, [client, interests, difficulty]);

  const pick = useCallback(
    async (idea: ProjectIdea, idx: number) => {
      setChoosingIdx(idx);
      try {
        const { docId } = await client.finalizeProject({ idea });
        router.replace(`/projects/${docId}`);
      } catch (err) {
        Alert.alert("Couldn't finalize", err instanceof Error ? err.message : "Try again.");
        setChoosingIdx(null);
      }
    },
    [client],
  );

  return (
    <ScrollScreen contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Project Ideas" }} />
      <Text style={styles.title}>Find your project</Text>
      <Text style={styles.subtitle}>Tell us your interests — AI suggests project ideas suited to your branch and semester.</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Interests (optional)</Text>
        <TextInput style={styles.input} value={interests} onChangeText={setInterests} placeholder="e.g. IoT, machine learning, web apps" placeholderTextColor={colors.faint} />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Project type (optional)</Text>
        <View style={styles.chipRow}>
          {DIFFICULTIES.map((d) => (
            <Pressable key={d.value} onPress={() => setDifficulty((cur) => (cur === d.value ? null : d.value))} style={[styles.chip, difficulty === d.value && styles.chipActive]}>
              <Text style={[styles.chipText, difficulty === d.value && styles.chipTextActive]}>{d.label}</Text>
            </Pressable>
          ))}
        </View>

        <Button label="Suggest ideas" onPress={suggest} loading={suggesting} disabled={suggesting} style={{ marginTop: spacing.xl }} />
      </Card>

      {ideas.map((idea, i) => (
        <Card key={i} style={styles.ideaCard}>
          <View style={styles.ideaHeadRow}>
            <Text style={styles.ideaTitle}>{idea.title}</Text>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyBadgeText}>{DIFFICULTIES.find((d) => d.value === idea.difficulty)?.label ?? idea.difficulty}</Text>
            </View>
          </View>
          <Text style={styles.ideaSummary}>{idea.summary}</Text>
          {idea.skills?.length ? (
            <View style={styles.skillsRow}>
              {idea.skills.map((s) => (
                <View key={s} style={styles.skillChip}><Text style={styles.skillChipText}>{s}</Text></View>
              ))}
            </View>
          ) : null}
          {idea.hardwareNeeded && idea.hardwareNote ? <Text style={styles.hardwareNote}>⚙ {idea.hardwareNote}</Text> : null}
          {idea.whyGood ? <Text style={styles.whyGood}>{idea.whyGood}</Text> : null}
          <Button label="Choose this" onPress={() => pick(idea, i)} loading={choosingIdx === i} disabled={choosingIdx !== null} style={{ marginTop: spacing.md }} />
        </Card>
      ))}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.display, fontSize: 22, color: colors.ink },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 18 },
  card: { marginBottom: spacing.lg },
  label: { fontFamily: font.sansSemibold, fontSize: 13, color: colors.ink, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, padding: spacing.md, fontFamily: font.sans, fontSize: 15, color: colors.ink, backgroundColor: colors.input },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep },
  chipText: { fontFamily: font.sansMedium, fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.onAccent, fontFamily: font.sansSemibold },
  ideaCard: { marginBottom: spacing.md },
  ideaHeadRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  ideaTitle: { fontFamily: font.displaySemibold, fontSize: 15, color: colors.ink, flex: 1 },
  difficultyBadge: { backgroundColor: colors.indigoTint, borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: spacing.sm },
  difficultyBadgeText: { fontFamily: font.sansSemibold, fontSize: 10, color: colors.primaryDeep, textTransform: "uppercase" },
  ideaSummary: { fontFamily: font.sans, fontSize: 12.5, color: colors.muted, marginTop: spacing.sm, lineHeight: 18 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  skillChip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: spacing.sm },
  skillChipText: { fontFamily: font.sans, fontSize: 11, color: colors.muted },
  hardwareNote: { fontFamily: font.sans, fontSize: 11.5, color: colors.warning, backgroundColor: "rgba(217, 119, 6, 0.1)", borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  whyGood: { fontFamily: font.sans, fontSize: 11.5, color: colors.faint, fontStyle: "italic", marginTop: spacing.sm, lineHeight: 16 },
});
