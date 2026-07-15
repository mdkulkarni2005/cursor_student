import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import type { MeResponse } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";

const TILES: { label: string; href: string; hint: string }[] = [
  { label: "Reports", href: "/reports", hint: "College-format reports, generated" },
  { label: "PPTs", href: "/ppt", hint: "Slide decks with your college theme" },
  { label: "Resume", href: "/resume", hint: "ATS-scored, one house format" },
  { label: "Assignments", href: "/assignments", hint: "Photo of the question → solved" },
  { label: "Lab Reports", href: "/lab-reports", hint: "Readings in, formatted report out" },
  { label: "Projects", href: "/projects", hint: "Ideas, build plan, report + PPT + viva" },
];

export default function Home() {
  const client = useApiClient();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    client.me().then(setMe).catch(() => {});
  }, [client]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.greeting}>Hi{me ? `, ${me.shell.name}` : ""} 👋</Text>
      {me ? (
        <Text style={styles.meta}>
          {me.shell.plan} plan · {me.shell.department ?? "No department set"}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {TILES.map((t) => (
          <Link key={t.href} href={t.href as never} asChild>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileHint}>{t.hint}</Text>
            </View>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  greeting: { fontSize: 24, fontWeight: "700" },
  meta: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47%", borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 14, backgroundColor: "#fafafa" },
  tileLabel: { fontSize: 15, fontWeight: "600" },
  tileHint: { fontSize: 12, color: "#777", marginTop: 4 },
});
