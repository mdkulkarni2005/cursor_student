import { useEffect, useRef } from "react";
import { Animated, type ViewProps } from "react-native";

/** Fades + slides content up on mount — used on auth screens so they don't just snap into view. */
export function FadeIn({ style, children, ...rest }: ViewProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View {...rest} style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
