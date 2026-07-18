import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import type { InterviewRequestSummary, RecruiterMessageSummary } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { ScrollScreen } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { colors, font, radius, spacing } from "@/lib/theme";
import { InboxIcon } from "@/components/icons";

const SCHEDULE_STATUS_LABEL: Record<string, string> = {
  PROPOSED: "Awaiting your response",
  ACCEPTED: "You accepted",
  DECLINED: "You declined",
  RESCHEDULE_REQUESTED: "You suggested another time",
  RESCHEDULE_DECLINED: "Recruiter declined your suggested time",
  CANCELED: "Canceled by recruiter",
  COMPLETED: "Completed",
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MessagesScreen() {
  const client = useApiClient();
  const [interviews, setInterviews] = useState<InterviewRequestSummary[]>([]);
  const [messages, setMessages] = useState<RecruiterMessageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    client
      .listMessages()
      .then((r) => {
        setInterviews(r.interviews);
        setMessages(r.messages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load messages."))
      .finally(() => setLoading(false));
  }, [client]);
  useEffect(load, [load]);

  const respond = useCallback(
    async (id: string, action: "accept" | "decline") => {
      setBusyId(id);
      try {
        await client.respondToSchedule(id, { action });
        load();
      } catch {
        // Non-fatal — user can retry via the same buttons.
      } finally {
        setBusyId(null);
      }
    },
    [client, load],
  );

  const markRead = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await client.markMessageRead(id);
        load();
      } catch {
        // Non-fatal — user can retry.
      } finally {
        setBusyId(null);
      }
    },
    [client, load],
  );

  const bothEmpty = !loading && interviews.length === 0 && messages.length === 0;

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: "Messages" }} />

      {loading ? (
        <ActivityIndicator color={colors.cyan} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : bothEmpty ? (
        <View style={styles.emptyState}>
          <InboxIcon size={28} color={colors.faint} />
          <Text style={styles.empty}>
            No messages yet. This only appears once you&apos;re visible to recruiters in your profile.
          </Text>
        </View>
      ) : (
        <>
          {interviews.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interview requests</Text>
              {interviews.map((s) => (
                <Card key={s.id} style={[styles.itemCard, s.status === "PROPOSED" && styles.itemCardHighlight]}>
                  <Text style={styles.itemTitle}>
                    {s.recruiter.companyName ?? "A recruiter"}
                    {s.recruiter.name ? <Text style={styles.itemTitleSub}> · {s.recruiter.name}</Text> : null}
                  </Text>
                  <Text style={styles.itemMeta}>Proposed: {fmtDateTime(s.proposedAt)}</Text>
                  {s.note ? <Text style={styles.itemBody}>{s.note}</Text> : null}

                  {s.status === "ACCEPTED" ? (
                    <Text style={styles.joinNote}>Join the interview from the web app.</Text>
                  ) : null}

                  <Text style={styles.statusLabel}>{SCHEDULE_STATUS_LABEL[s.status] ?? s.status}</Text>

                  {s.status === "PROPOSED" ? (
                    <View style={styles.buttonRow}>
                      <Button
                        label="Accept"
                        variant="secondary"
                        style={styles.actionButton}
                        loading={busyId === s.id}
                        onPress={() => respond(s.id, "accept")}
                      />
                      <Button
                        label="Decline"
                        variant="secondary"
                        style={styles.actionButton}
                        loading={busyId === s.id}
                        onPress={() => respond(s.id, "decline")}
                      />
                    </View>
                  ) : null}
                </Card>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Messages</Text>
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <InboxIcon size={24} color={colors.faint} />
                <Text style={styles.empty}>
                  No messages yet. This only appears once you&apos;re visible to recruiters in your profile.
                </Text>
              </View>
            ) : (
              messages.map((m) => (
                <Card key={m.id} style={[styles.itemCard, !m.readAt && styles.itemCardHighlight]}>
                  <View style={styles.messageHeaderRow}>
                    <View style={styles.messageHeaderLeft}>
                      {!m.readAt ? <View style={styles.unreadDot} /> : null}
                      <Text style={[styles.itemTitle, !m.readAt && styles.itemTitleUnread]}>
                        {m.recruiter.companyName ?? "A recruiter"}
                        {m.recruiter.name ? <Text style={styles.itemTitleSub}> · {m.recruiter.name}</Text> : null}
                      </Text>
                    </View>
                    {!m.readAt ? (
                      <Pressable disabled={busyId === m.id} onPress={() => markRead(m.id)}>
                        <Text style={styles.markReadText}>{busyId === m.id ? "…" : "Mark read"}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Text style={styles.itemMeta}>{fmtDateTime(m.createdAt)}</Text>
                  <Text style={styles.itemBody}>{m.body}</Text>
                </Card>
              ))
            )}
          </View>
        </>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontFamily: font.displaySemibold, fontSize: 15, color: colors.ink, marginBottom: spacing.md },

  itemCard: { marginBottom: spacing.sm },
  itemCardHighlight: { borderColor: colors.cyan, backgroundColor: colors.cyanTint },

  itemTitle: { fontFamily: font.sansSemibold, fontSize: 14, color: colors.ink },
  itemTitleUnread: { fontFamily: font.display },
  itemTitleSub: { fontFamily: font.sans, color: colors.muted },
  itemMeta: { fontFamily: font.sans, fontSize: 11.5, color: colors.faint, marginTop: 2 },
  itemBody: { fontFamily: font.sans, fontSize: 13.5, color: colors.soft, marginTop: spacing.sm, lineHeight: 19 },
  joinNote: { fontFamily: font.sansMedium, fontSize: 12.5, color: colors.teal, marginTop: spacing.sm },
  statusLabel: { fontFamily: font.sansSemibold, fontSize: 11, color: colors.faint, marginTop: spacing.sm, textTransform: "uppercase" },

  buttonRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actionButton: { flex: 1 },

  messageHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  messageHeaderLeft: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1, minWidth: 0 },
  unreadDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.cyan },
  markReadText: { fontFamily: font.sansSemibold, fontSize: 11.5, color: colors.cyan },

  emptyState: { alignItems: "center", marginTop: 40, paddingHorizontal: spacing.lg, gap: spacing.md },
  empty: { fontFamily: font.sans, fontSize: 13.5, color: colors.muted, textAlign: "center" },
  errorText: { fontFamily: font.sans, fontSize: 13.5, color: colors.danger, textAlign: "center", marginBottom: spacing.md },
  retryButton: { backgroundColor: colors.cyan, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: spacing.xl },
  retryButtonText: { fontFamily: font.sansSemibold, fontSize: 14, color: colors.onAccent },
});
