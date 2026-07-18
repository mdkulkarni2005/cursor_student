import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, type GestureResponderEvent, type PressableProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, font, gradient, radius } from "@/lib/theme";

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "secondary";
};

/** Primary CTA = web's `bg-accent-gradient`; secondary = flat surface button. */
export function Button({ label, loading, variant = "primary", disabled, style, onPressIn, onPressOut, ...rest }: Props) {
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  const pressIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
    onPressOut?.(e);
  };

  useEffect(() => {
    if (!loading) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [loading, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const indicator = (color: string) => (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Animated.View style={[styles.spinnerRing, { borderColor: color, borderTopColor: "transparent" }]} />
    </Animated.View>
  );

  if (variant === "secondary") {
    return (
      <Pressable
        {...rest}
        disabled={isDisabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={(state) => [styles.pressableWrap, typeof style === "function" ? style(state) : style]}
      >
        <Animated.View style={[styles.secondary, isDisabled && styles.disabled, { transform: [{ scale }] }]}>
          {loading ? indicator(colors.ink) : <Text style={styles.secondaryText}>{label}</Text>}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={(state) => [styles.pressableWrap, typeof style === "function" ? style(state) : style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={[styles.primary, isDisabled && styles.disabled]}>
          {loading ? indicator(colors.onAccent) : <Text style={styles.primaryText}>{label}</Text>}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableWrap: {},
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
  spinnerRing: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
});
