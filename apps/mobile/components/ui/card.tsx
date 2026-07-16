import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radius, shadow, spacing } from "@/lib/theme";

/** Web's `.rounded-2xl border border-line bg-card` card shell. */
export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    ...shadow.card,
  },
});
