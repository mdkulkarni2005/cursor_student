import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import type { MeResponse } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { colors, font, gradient, radius, spacing } from "@/lib/theme";

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
    <ScrollScreen>
      <View style={styles.brandRow}>
        <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.brandBadge}>
          <Text style={styles.brandGlyph}>✦</Text>
        </LinearGradient>
        <Text style={styles.brandWord}>krackit</Text>
      </View>

      <Text style={styles.greeting}>Hi{me ? `, ${me.shell.name}` : ""} 👋</Text>
      {me ? (
        <Text style={styles.meta}>
          {me.shell.plan} plan · {me.shell.department ?? "No department set"}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {TILES.map((t) => (
          <Link key={t.href} href={t.href as never} asChild>
            <Pressable style={styles.tileWrap}>
              <Card style={styles.tile}>
                <Text style={styles.tileLabel}>{t.label}</Text>
                <Text style={styles.tileHint}>{t.hint}</Text>
              </Card>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  brandBadge: { width: 32, height: 32, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  brandGlyph: { color: colors.onAccent, fontSize: 15 },
  brandWord: { fontFamily: font.display, fontSize: 17, color: colors.ink },
  greeting: { fontFamily: font.display, fontSize: 24, color: colors.ink },
  meta: { fontFamily: font.sans, fontSize: 13, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tileWrap: { width: "47%" },
  tile: { padding: spacing.md },
  tileLabel: { fontFamily: font.sansSemibold, fontSize: 15, color: colors.ink },
  tileHint: { fontFamily: font.sans, fontSize: 12, color: colors.faint, marginTop: spacing.xs },
});
