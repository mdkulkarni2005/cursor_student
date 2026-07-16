import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, font, gradient, radius } from "@/lib/theme";

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "secondary";
};

/** Primary CTA = web's `bg-accent-gradient`; secondary = flat surface button. */
export function Button({ label, loading, variant = "primary", disabled, style, ...rest }: Props) {
  const isDisabled = disabled || loading;

  if (variant === "secondary") {
    return (
      <Pressable
        {...rest}
        disabled={isDisabled}
        style={(state) => [
          styles.secondary,
          isDisabled && styles.disabled,
          typeof style === "function" ? style(state) : style,
        ]}
      >
        {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.secondaryText}>{label}</Text>}
      </Pressable>
    );
  }

  return (
    <Pressable {...rest} disabled={isDisabled} style={(state) => (typeof style === "function" ? style(state) : style)}>
      <LinearGradient
        colors={gradient.colors}
        start={gradient.start}
        end={gradient.end}
        style={[styles.primary, isDisabled && styles.disabled]}
      >
        {loading ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryText}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: { borderRadius: radius.lg, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: colors.onAccent, fontFamily: font.sansSemibold, fontSize: 15 },
  secondary: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  secondaryText: { color: colors.ink, fontFamily: font.sansSemibold, fontSize: 15 },
  disabled: { opacity: 0.6 },
});
