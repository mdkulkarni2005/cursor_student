import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@clerk/clerk-expo";
import type { AssistantMessage, MeResponse } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { colors, font, gradient, radius, spacing } from "@/lib/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4173";

/** Mirrors web's `QUICK_ACTIONS` (apps/web/components/assistant/assistant-panel.tsx), swapped to mobile's route set. */
const QUICK_ACTIONS = [
  { label: "Write a report", href: "/reports" },
  { label: "Build a PPT", href: "/ppt" },
  { label: "Solve an assignment", href: "/assignments" },
  { label: "Project ideas", href: "/projects" },
] as const;

/**
 * The always-on AI mentor. Reuses the existing /api/assistant route as-is (it already does its
 * own auth + 401 JSON) rather than a /api/mobile/* duplicate — see the plan. Streaming: RN fetch
 * streaming support is inconsistent across devices, so v1 awaits the full response text instead
 * of rendering tokens live (a deliberate simplification, not a missing feature).
 */
export default function Assistant() {
  const client = useApiClient();
  const { getToken } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  // Guards against the thread-load response clobbering an optimistic send if it resolves late.
  const sentRef = useRef(false);

  useEffect(() => {
    client.me().then(setMe).catch(() => {});
    client
      .getAssistantThread()
      .then((r) => {
        if (!sentRef.current) setMessages(r.messages as AssistantMessage[]);
      })
      .catch(() => {});
  }, [client]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    sentRef.current = true;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages: next }),
      });
      const reply = res.ok ? await res.text() : "Something hiccuped — try again.";
      setMessages((cur) => [...cur, { role: "assistant", content: reply }]);
    } catch {
      setMessages((cur) => [...cur, { role: "assistant", content: "Something hiccuped — try again." }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, sending, messages, getToken]);

  const firstName = me?.shell.name?.split(" ")[0] ?? "there";
  const canSend = !!input.trim() && !sending;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
      <View style={styles.flex}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.avatar}>
              <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.avatarFill}>
                <Text style={styles.avatarGlyph}>✦</Text>
              </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>Hi {firstName} 👋</Text>
            <Text style={styles.emptySubtitle}>
              I&apos;m grounded in your department and recent work. Ask me anything, or jump in:
            </Text>
            <View style={styles.chipRow}>
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.href} href={a.href as never} asChild>
                  <Pressable style={styles.chip}>
                    <Text style={styles.chipText}>{a.label}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.flex}
            contentContainerStyle={styles.listContent}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => {
              const isUser = item.role === "user";
              return (
                <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
                  {!isUser ? (
                    <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.msgAvatar}>
                      <Text style={styles.msgAvatarGlyph}>✦</Text>
                    </LinearGradient>
                  ) : null}
                  {isUser ? (
                    <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={[styles.bubble, styles.userBubble]}>
                      <Text style={styles.userText}>{item.content}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.bubble, styles.aiBubble]}>
                      <Text style={styles.aiText}>{item.content}</Text>
                    </View>
                  )}
                </View>
              );
            }}
            ListFooterComponent={
              sending ? (
                <View style={[styles.row, styles.rowAssistant]}>
                  <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.msgAvatar}>
                    <Text style={styles.msgAvatarGlyph}>✦</Text>
                  </LinearGradient>
                  <View style={[styles.bubble, styles.aiBubble, styles.thinkingBubble]}>
                    <ActivityIndicator size="small" color={colors.faint} />
                    <Text style={styles.thinkingText}>Thinking…</Text>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything…"
            placeholderTextColor={colors.faint}
            multiline
          />
          <Pressable onPress={send} disabled={!canSend} style={styles.sendButtonWrap}>
            <LinearGradient
              colors={gradient.colors}
              start={gradient.start}
              end={gradient.end}
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  avatar: { marginBottom: spacing.lg },
  avatarFill: { width: 56, height: 56, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  avatarGlyph: { color: colors.onAccent, fontSize: 24 },
  emptyTitle: { fontFamily: font.display, fontSize: 20, color: colors.ink },
  emptySubtitle: {
    fontFamily: font.sans,
    fontSize: 13.5,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 19,
    maxWidth: 280,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xl },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipText: { fontFamily: font.sansMedium, fontSize: 12.5, color: colors.ink },
  listContent: { padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "flex-end", marginBottom: spacing.md, gap: spacing.xs },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },
  msgAvatar: { width: 24, height: 24, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  msgAvatarGlyph: { color: colors.onAccent, fontSize: 11 },
  bubble: { maxWidth: "78%", borderRadius: radius.xl, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  userBubble: { borderBottomRightRadius: radius.sm },
  aiBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: radius.sm },
  userText: { color: colors.onAccent, fontFamily: font.sans, fontSize: 14, lineHeight: 20 },
  aiText: { color: colors.ink, fontFamily: font.sans, fontSize: 14, lineHeight: 20 },
  thinkingBubble: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  thinkingText: { fontFamily: font.sans, fontSize: 13, color: colors.faint },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.base,
  },
  input: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxHeight: 100,
  },
  sendButtonWrap: { borderRadius: radius.pill },
  sendButton: { width: 42, height: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: colors.onAccent, fontSize: 18, fontFamily: font.sansSemibold },
});
