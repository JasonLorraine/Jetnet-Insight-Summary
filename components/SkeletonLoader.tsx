import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, useColorScheme, Platform } from "react-native";
import { useThemeColors } from "@/constants/colors";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <SkeletonLoader width="60%" height={24} />
        <SkeletonLoader width="80%" height={16} style={{ marginTop: 8 }} />
        <SkeletonLoader width="40%" height={14} style={{ marginTop: 6 }} />
      </View>
      <View style={styles.card}>
        <SkeletonLoader width={136} height={136} borderRadius={68} style={{ alignSelf: "center" as const }} />
      </View>
      <View style={styles.card}>
        <SkeletonLoader width="50%" height={18} />
        <SkeletonLoader height={6} style={{ marginTop: 12 }} />
        <SkeletonLoader height={6} style={{ marginTop: 8 }} />
        <SkeletonLoader height={6} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
});
