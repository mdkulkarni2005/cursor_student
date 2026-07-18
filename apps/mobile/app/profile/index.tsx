import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Share, StyleSheet, Switch, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { ProfileResponse } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";

/** Make a bare handle/URL clickable — mirrors apps/web/app/profile/page.tsx's `normalize`. */
function normalize(v: string): string {
  const s = v.trim().replace(/^@/, "");
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

// apps/web's public base URL isn't exposed as its own env var on mobile yet — EXPO_PUBLIC_API_URL
// happens to point at the same apps/web deployment today, so reuse it for the /u/[handle] share
// link. If mobile and web ever split hosts this should become its own EXPO_PUBLIC_WEB_URL.
const WEB_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://studentos.app";

export default function ProfileScreen() {
  const client = useApiClient();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(() => {
    setError(null);
    client
      .getProfile()
      .then((r) => {
        setProfile(r);
        setVisible(r.recruiterVisible);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your profile."))
      .finally(() => setLoading(false));
  }, [client]);
  useEffect(load, [load]);

  const onToggleVisibility = useCallback(
    async (next: boolean) => {
      setVisible(next); // optimistic
      setTogglingVisibility(true);
      try {
        await client.setRecruiterVisibility({ visible: next });
      } catch {
        setVisible(!next); // revert on failure
      } finally {
        setTogglingVisibility(false);
      }
    },
    [client],
  );

  const onShare = useCallback(async () => {
    setSharing(true);
    try {
      const { handle } = await client.ensureShareHandle();
      const url = `${WEB_BASE_URL}/u/${handle}`;
      await Share.share({ message: `Check out my profile: ${url}` });
    } catch {
      // Non-fatal — user can retry via the same button.
    } finally {
      setSharing(false);
    }
  }, [client]);

  const onDownloadResume = useCallback(async () => {
    if (!profile?.resume) return;
    setDownloading(true);
    try {
      const { url } = await client.resumeDownloadUrl(profile.resume.id);
      await WebBrowser.openBrowserAsync(url);
    } catch {
      // Non-fatal — user can retry via the same button.
    } finally {
      setDownloading(false);
    }
  }, [client, profile]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Profile" }} />
        <ActivityIndicator color={colors.cyan} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Profile" }} />
        <Text style={styles.errorText}>{error ?? "Couldn't load your profile."}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const metaLine = [profile.department, profile.semester ? `Sem ${profile.semester}` : null, profile.institution]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: "Profile" }} />

      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.initials}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.headline}>{profile.headline}</Text>
            {metaLine ? <Text style={styles.metaLine}>{metaLine}</Text> : null}
          </View>
        </View>

        {(profile.links.github || profile.links.linkedin) ? (
          <View style={styles.linksRow}>
            {profile.links.github ? (
              <Text style={styles.linkText} onPress={() => Linking.openURL(normalize(profile.links.github!))}>
                GitHub
              </Text>
            ) : null}
            {profile.links.linkedin ? (
              <Text style={styles.linkText} onPress={() => Linking.openURL(normalize(profile.links.linkedin!))}>
                LinkedIn
              </Text>
            ) : null}
          </View>
        ) : null}

        {profile.gpa != null ? <Text style={styles.gpaText}>GPA: {profile.gpa.toFixed(2)}</Text> : null}

        {profile.resume ? (
          <Button
            label={downloading ? "Opening…" : "Download résumé"}
            variant="secondary"
            loading={downloading}
            onPress={onDownloadResume}
            style={styles.headerButton}
          />
        ) : null}

        <Button
          label={sharing ? "Preparing…" : "Share profile"}
          loading={sharing}
          onPress={onShare}
          style={styles.headerButton}
        />
      </Card>

      <Card style={styles.visibilityCard}>
        <View style={styles.visibilityRow}>
          <View style={styles.visibilityText}>
            <Text style={styles.visibilityLabel}>Visible to recruiters</Text>
            <Text style={styles.visibilityHint}>
              {visible ? "Recruiters can find and view your profile." : "Off — no recruiter can see your profile."}
            </Text>
          </View>
          <Switch
            value={visible}
            disabled={togglingVisibility}
            onValueChange={onToggleVisibility}
            trackColor={{ false: colors.lineStrong, true: colors.cyan }}
            thumbColor={colors.onAccent}
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Top Projects</Text>
      {profile.projects.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.empty}>No projects yet — generate one in the Project Idea Catalyst.</Text>
        </View>
      ) : (
        profile.projects.map((p) => (
          <Pressable key={p.id} onPress={() => router.push(`/projects/${p.id}`)}>
            <Card style={styles.projectCard}>
              <Text style={styles.projectName} numberOfLines={1}>{p.name}</Text>
              {p.summary ? <Text style={styles.projectSummary} numberOfLines={2}>{p.summary}</Text> : null}
            </Card>
          </Pressable>
        ))
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas, padding: spacing.xl },
  errorText: { fontFamily: font.sans, fontSize: 13.5, color: colors.danger, textAlign: "center", marginBottom: spacing.md },
  retryButton: { backgroundColor: colors.cyan, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: spacing.xl },
  retryButtonText: { fontFamily: font.sansSemibold, fontSize: 14, color: colors.onAccent },

  headerCard: { marginBottom: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.cyanTint, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.display, fontSize: 22, color: colors.cyan },
  headerText: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.display, fontSize: 19, color: colors.ink },
  headline: { fontFamily: font.sans, fontSize: 13.5, color: colors.muted, marginTop: 2 },
  metaLine: { fontFamily: font.sans, fontSize: 12, color: colors.faint, marginTop: 2 },

  linksRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  linkText: { fontFamily: font.sansSemibold, fontSize: 12.5, color: colors.cyan },

  gpaText: { fontFamily: font.sansMedium, fontSize: 13, color: colors.ink, marginTop: spacing.md },

  headerButton: { marginTop: spacing.md },

  visibilityCard: { marginBottom: spacing.xl },
  visibilityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  visibilityText: { flex: 1, minWidth: 0 },
  visibilityLabel: { fontFamily: font.sansSemibold, fontSize: 14, color: colors.ink },
  visibilityHint: { fontFamily: font.sans, fontSize: 12, color: colors.faint, marginTop: 2 },

  sectionTitle: { fontFamily: font.displaySemibold, fontSize: 15, color: colors.ink, marginBottom: spacing.md },
  projectCard: { marginBottom: spacing.sm },
  projectName: { fontFamily: font.sansSemibold, fontSize: 14, color: colors.ink },
  projectSummary: { fontFamily: font.sans, fontSize: 12.5, color: colors.muted, marginTop: spacing.xs, lineHeight: 17 },

  emptyState: { paddingVertical: spacing.xl, alignItems: "center" },
  empty: { fontFamily: font.sans, fontSize: 13.5, color: colors.muted, textAlign: "center" },
});
