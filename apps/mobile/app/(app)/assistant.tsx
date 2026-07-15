import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import type { AssistantMessage } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4173";

/**
 * The always-on AI mentor. Reuses the existing /api/assistant route as-is (it already does its
 * own auth + 401 JSON) rather than a /api/mobile/* duplicate — see the plan. Streaming: RN fetch
 * streaming support is inconsistent across devices, so v1 awaits the full response text instead
 * of rendering tokens live (a deliberate simplification, not a missing feature).
 */
export default function Assistant() {
  const client = useApiClient();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    client.getAssistantThread().then((r) => setMessages(r.messages as AssistantMessage[])).catch(() => {});
  }, [client]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        ref={listRef}
        style={{ flex: 1, backgroundColor: "#fff" }}
        contentContainerStyle={{ padding: 16 }}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
            <Text style={item.role === "user" ? styles.userText : styles.aiText}>{item.content}</Text>
          </View>
        )}
      />
      {sending ? <ActivityIndicator style={{ marginBottom: 8 }} /> : null}
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Ask anything…" multiline />
        <Pressable style={styles.sendButton} onPress={send} disabled={sending}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: "85%", borderRadius: 14, padding: 12, marginBottom: 10 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#2563eb" },
  aiBubble: { alignSelf: "flex-start", backgroundColor: "#f1f1f1" },
  userText: { color: "#fff", fontSize: 14 },
  aiText: { color: "#111", fontSize: 14 },
  inputRow: { flexDirection: "row", padding: 12, borderTopWidth: 1, borderColor: "#eee", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 10, maxHeight: 100 },
  sendButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  sendButtonText: { color: "#fff", fontWeight: "600" },
});
