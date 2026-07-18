import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import type { MeResponse } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { colors, font, gradient, radius, spacing } from "@/lib/theme";
import { LayersIcon, PencilIcon, ResumeIcon, SlidesIcon, StarIcon, type IconProps } from "@/components/icons";

/** Mirrors web's dashboard `ACCELERATORS` (apps/web/app/dashboard/page.tsx) minus Interview Prep — no DSA/interview on mobile. */
const ACCELERATORS: {
  label: string;
  href: string;
  blurb: string;
  cta: string;
  icon: (p: IconProps) => ReturnType<typeof PencilIcon>;
  tint: string;
  accent: string;
}[] = [
  { label: "Assignments", href: "/assignments", blurb: "Keep track of upcoming deadlines and snap-and-solve with AI.", cta: "Go to Tracker", icon: PencilIcon, tint: colors.cyanTint, accent: colors.cyan },
  { label: "Reports", href: "/reports", blurb: "Generate polished, college-format reports in minutes.", cta: "Create Doc", icon: SlidesIcon, tint: colors.tealTint, accent: colors.teal },
  { label: "PPTs", href: "/ppt", blurb: "Slide decks with your college theme, generated for you.", cta: "Create Deck", icon: SlidesIcon, tint: colors.indigoTint, accent: colors.primaryDeep },
  { label: "Resume Builder", href: "/resume", blurb: "Update your tech stack with your latest project contributions.", cta: "Open Builder", icon: ResumeIcon, tint: colors.cyanTint, accent: colors.cyan },
  { label: "Lab Reports", href: "/lab-reports", blurb: "Turn raw readings into a complete, college-format lab report.", cta: "Generate Report", icon: LayersIcon, tint: colors.tealTint, accent: colors.teal },
  { label: "Project Ideas", href: "/projects", blurb: "Ideas, build plan, report + PPT and viva prep — end to end.", cta: "Explore Ideas", icon: StarIcon, tint: colors.indigoTint, accent: colors.primaryDeep },
];

export default function Home() {
  const client = useApiClient();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    client.me().then(setMe).catch(() => {});
  }, [client]);

  const firstName = me?.shell.name?.split(" ")[0] ?? "there";

  return (
    <ScrollScreen>
      <View style={styles.brandRow}>
        <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.brandBadge}>
          <Text style={styles.brandGlyph}>✦</Text>
        </LinearGradient>
        <Text style={styles.brandWord}>krackit</Text>
      </View>

      <Text style={styles.eyebrow}>Hi{me ? `, ${firstName}` : ""} 👋</Text>
      <Text style={styles.title}>Welcome back{me ? `, ${firstName}` : ""}!</Text>
      <Text style={styles.subtitle}>Ready to create something today? Pick a tool below to get started.</Text>
      {me ? (
        <Text style={styles.meta}>
          {me.shell.plan} plan · {me.shell.department ?? "No department set"}
        </Text>
      ) : null}

      <Text style={styles.sectionTitle}>Workflow Accelerators</Text>
      <View style={styles.grid}>
        {ACCELERATORS.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href as never} asChild>
              <Pressable style={styles.tileWrap}>
                <Card style={styles.tile}>
                  <View style={[styles.iconBadge, { backgroundColor: a.tint }]}>
                    <Icon size={20} color={a.accent} />
                  </View>
                  <Text style={styles.tileLabel}>{a.label}</Text>
                  <Text style={styles.tileHint}>{a.blurb}</Text>
                  <Text style={[styles.tileCta, { color: a.accent }]}>{a.cta} →</Text>
                </Card>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  brandBadge: { width: 32, height: 32, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  brandGlyph: { color: colors.onAccent, fontSize: 15 },
  brandWord: { fontFamily: font.display, fontSize: 17, color: colors.ink },
  eyebrow: { fontFamily: font.sans, fontSize: 13, color: colors.muted },
  title: { fontFamily: font.display, fontSize: 26, color: colors.ink, marginTop: spacing.xs },
  subtitle: { fontFamily: font.sans, fontSize: 13.5, color: colors.muted, marginTop: spacing.sm, lineHeight: 19 },
  meta: { fontFamily: font.sans, fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  sectionTitle: { fontFamily: font.displaySemibold, fontSize: 17, color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tileWrap: { width: "47%" },
  tile: { padding: spacing.md },
  iconBadge: { width: 40, height: 40, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  tileLabel: { fontFamily: font.displaySemibold, fontSize: 15, color: colors.ink },
  tileHint: { fontFamily: font.sans, fontSize: 12, color: colors.faint, marginTop: spacing.xs, lineHeight: 16 },
  tileCta: { fontFamily: font.sansSemibold, fontSize: 12, marginTop: spacing.sm },
});
