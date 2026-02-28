import React, { useEffect, useRef } from "react";
import { Animated, Platform } from "react-native";

interface ContentRevealProps {
  visible: boolean;
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  style?: any;
}

export function ContentReveal({
  visible,
  delay = 0,
  duration = 350,
  children,
  style,
}: ContentRevealProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: Platform.OS !== "web",
          easing: appleEaseOut,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: Platform.OS !== "web",
          easing: appleEaseOut,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(12);
    }
  }, [visible, delay, duration, opacity, translateY]);

  return (
    <Animated.View
      style={[
        {
          opacity,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function appleEaseOut(t: number): number {
  const p1x = 0.25, p1y = 0.46, p2x = 0.45, p2y = 0.94;
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const x = cubicBezier(mid, p1x, p2x);
    if (x < t) lo = mid;
    else hi = mid;
  }
  return cubicBezier((lo + hi) / 2, p1y, p2y);
}

function cubicBezier(t: number, p1: number, p2: number): number {
  return 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
}
