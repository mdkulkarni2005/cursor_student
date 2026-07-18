import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet } from "react-native";

type Props = {
  size?: number;
  /** Loops a gentle pulse — use while something's in flight (sending an OTP, etc.) so the mark
   * itself communicates "working" instead of a screen that looks frozen. */
  pulsing?: boolean;
};

/** The app's own icon (assets/icon.png) as an animated mark — fades/scales in on mount. */
export function Logo({ size = 64, pulsing = false }: Props) {
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
  }, [entrance]);

  useEffect(() => {
    if (!pulsing) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing, pulse]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        { width: size, height: size, opacity: entrance, transform: [{ scale: Animated.multiply(entrance, pulse) }] },
      ]}
    >
      <Image source={require("@/assets/icon.png")} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", marginBottom: 4 },
});
