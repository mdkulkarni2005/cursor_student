import { useState, useTransition } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { usePathname } from "expo-router";
import type { FeedbackType } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "BUG", label: "Bug" },
  { value: "FEATURE_REQUEST", label: "Feature request" },
  { value: "IMPROVEMENT", label: "Improvement" },
  { value: "OTHER", label: "Other" },
];

export function FeedbackButton() {
  const client = useApiClient();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("FEATURE_REQUEST");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setSaved(false);
  }

  function submit() {
    setError(null);
    start(async () => {
      try {
        await client.sendFeedback({ type, message, page: pathname });
        setMessage("");
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send.");
      }
    });
  }

  return (
    <>
      <Pressable style={styles.fab} onPress={() => setOpen(true)}>
        <Text style={styles.fabIcon}>💬</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Send feedback</Text>
            <Text style={styles.subtitle}>Bugs, feature requests, or anything we should improve.</Text>

            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => setType(o.value)}
                  style={[styles.typeChip, type === o.value && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, type === o.value && styles.typeChipTextActive]}>{o.label}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="What's on your mind?"
              multiline
              numberOfLines={4}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {saved ? <Text style={styles.saved}>Thanks — feedback sent.</Text> : null}

            <View style={styles.actions}>
              <Pressable style={styles.sendButton} onPress={submit} disabled={pending}>
                {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Send</Text>}
              </Pressable>
              <Pressable style={styles.closeButton} onPress={close}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 28,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 999,
  },
  fabIcon: { fontSize: 20 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#666", marginTop: 4 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  typeChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: "#e5e5e5" },
  typeChipActive: { backgroundColor: "#111", borderColor: "#111" },
  typeChipText: { fontSize: 12.5, fontWeight: "600", color: "#444" },
  typeChipTextActive: { color: "#fff" },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: "top",
  },
  error: { color: "#e11d48", fontSize: 12.5, marginTop: 8 },
  saved: { color: "#16a34a", fontSize: 12.5, marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  sendButton: { flex: 1, backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  sendButtonText: { color: "#fff", fontWeight: "600" },
  closeButton: { flex: 1, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeButtonText: { color: "#444", fontWeight: "600" },
});
