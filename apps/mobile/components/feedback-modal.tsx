import { useState, useTransition } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { usePathname } from "expo-router";
import type { FeedbackType } from "@studentos/api-types";
import { useApiClient } from "@/lib/api";
import { colors, font, radius, spacing } from "@/lib/theme";

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "BUG", label: "Bug" },
  { value: "FEATURE_REQUEST", label: "Feature request" },
  { value: "IMPROVEMENT", label: "Improvement" },
  { value: "OTHER", label: "Other" },
];

/** Opened from a row in Settings — previously a floating FAB on every screen, which overlapped content. */
export function FeedbackModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const client = useApiClient();
  const pathname = usePathname();
  const [type, setType] = useState<FeedbackType>("FEATURE_REQUEST");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function close() {
    onClose();
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
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
            placeholderTextColor={colors.faint}
            multiline
            numberOfLines={4}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saved ? <Text style={styles.saved}>Thanks — feedback sent.</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.sendButton} onPress={submit} disabled={pending}>
              {pending ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.sendButtonText}>Send</Text>}
            </Pressable>
            <Pressable style={styles.closeButton} onPress={close}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.base, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl },
  title: { fontFamily: font.displaySemibold, fontSize: 17, color: colors.ink },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  typeChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  typeChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  typeChipText: { fontFamily: font.sansSemibold, fontSize: 12.5, color: colors.muted },
  typeChipTextActive: { color: colors.onAccent },
  input: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: font.sans,
    fontSize: 14,
    color: colors.ink,
    minHeight: 90,
    textAlignVertical: "top",
    backgroundColor: colors.input,
  },
  error: { color: colors.danger, fontFamily: font.sans, fontSize: 12.5, marginTop: spacing.sm },
  saved: { color: colors.success, fontFamily: font.sans, fontSize: 12.5, marginTop: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  sendButton: { flex: 1, backgroundColor: colors.cyan, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  sendButtonText: { color: colors.onAccent, fontFamily: font.sansSemibold, fontSize: 15 },
  closeButton: { flex: 1, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  closeButtonText: { color: colors.muted, fontFamily: font.sansSemibold, fontSize: 15 },
});
