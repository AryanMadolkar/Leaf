import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { resolveMediaUrl } from "@/lib/media";
import { colors, fonts, radii, shadows } from "@/constants/theme";

export default function BookCover({
  uri,
  title,
  width = 100,
  height = 148,
  onPress,
}: {
  uri?: string;
  title: string;
  width?: number;
  height?: number;
  onPress?: () => void;
}) {
  const resolved = resolveMediaUrl(uri);
  const content = (
    <View style={[styles.shell, { width, height }, shadows.cover]}>
      {resolved ? (
        <Image source={{ uri: resolved }} style={[styles.cover, { width, height }]} />
      ) : (
        <View style={[styles.cover, styles.fallback, { width, height }]}>
          <Text style={styles.fallbackText} numberOfLines={4}>
            {title}
          </Text>
        </View>
      )}
      {/* Spine highlight — same language as the web book-shadow treatment */}
      <LinearGradient
        colors={["rgba(28,28,26,0.28)", "rgba(28,28,26,0.08)", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.spine}
        pointerEvents="none"
      />
      <View style={styles.spineLine} pointerEvents="none" />
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radii.sm,
    backgroundColor: colors.creamDark,
    overflow: "hidden",
  },
  cover: {
    borderRadius: radii.sm,
    backgroundColor: colors.creamDark,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    backgroundColor: colors.creamDark,
  },
  fallbackText: {
    fontSize: 11,
    fontFamily: fonts.serif,
    color: colors.brand,
    textAlign: "center",
    lineHeight: 15,
  },
  spine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 10,
  },
  spineLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 3,
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
