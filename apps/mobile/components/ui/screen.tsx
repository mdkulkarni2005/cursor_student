import type { ComponentProps } from "react";
import { ScrollView, StyleSheet, View, type ViewProps } from "react-native";
import { colors, spacing } from "@/lib/theme";

/** App-wide canvas background (web's `bg-canvas`) + consistent screen padding. */
export function Screen({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.screen, style]} />;
}

export function ScrollScreen({ style, contentContainerStyle, ...rest }: ComponentProps<typeof ScrollView>) {
  return (
    <ScrollView
      {...rest}
      style={[styles.screen, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg },
});
