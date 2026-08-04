import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { resolveMediaUrl } from "@/lib/media";

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
  const content = resolved ? (
    <Image source={{ uri: resolved }} style={[styles.cover, { width, height }]} />
  ) : (
    <View style={[styles.cover, styles.fallback, { width, height }]}>
      <Text style={styles.fallbackText} numberOfLines={4}>
        {title}
      </Text>
    </View>
  );

  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  cover: { borderRadius: 8, backgroundColor: "#e8e0d4" },
  fallback: { alignItems: "center", justifyContent: "center", padding: 8 },
  fallbackText: { fontSize: 10, fontWeight: "700", color: "#3f6b4f", textAlign: "center" },
});
