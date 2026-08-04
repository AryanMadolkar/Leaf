import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import type { Reader } from "@/lib/types";
import { colors, fonts } from "@/constants/theme";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ReaderCard({ reader }: { reader: Reader }) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(reader.isFollowing);
  const [pending, setPending] = useState(false);
  const avatar = resolveMediaUrl(reader.avatar);

  const toggleFollow = async () => {
    if (pending) return;
    setPending(true);
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      const res = await authFetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: reader.id }),
      });
      if (!res.ok) throw new Error("Follow request failed");
    } catch {
      setIsFollowing(!next);
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={styles.card}>
      <Pressable
        style={{ alignItems: "center" }}
        onPress={() => router.push(`/profile/${reader.username}` as any)}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials(reader.name)}</Text>
          </View>
        )}

        <Text style={styles.name} numberOfLines={1}>
          {reader.name}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{reader.username}
        </Text>
      </Pressable>

      <View style={styles.badgeRow}>
        <Text style={styles.genreBadge} numberOfLines={1}>
          {reader.topGenre}
        </Text>
        {reader.streak > 0 && <Text style={styles.streakBadge}>🔥 {reader.streak}</Text>}
      </View>

      <Pressable
        onPress={toggleFollow}
        disabled={pending}
        style={[styles.followButton, isFollowing && styles.followingButton]}
      >
        {pending ? (
          <ActivityIndicator size="small" color={isFollowing ? colors.charcoal : colors.white} />
        ) : (
          <Text style={[styles.followText, isFollowing && styles.followingText]}>
            {isFollowing ? "Following" : "Follow"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 148,
    padding: 14,
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 16,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.creamDark },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontFamily: fonts.sansBold, color: colors.brand },
  name: { fontSize: 12, fontFamily: fonts.sansBold, color: colors.charcoal },
  username: { fontSize: 10, color: colors.charcoalMuted, fontFamily: fonts.sans },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  genreBadge: {
    fontSize: 9,
    fontFamily: fonts.sansSemiBold,
    color: colors.charcoalMuted,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: 80,
  },
  streakBadge: {
    fontSize: 9,
    fontFamily: fonts.sansBold,
    color: colors.brand,
    backgroundColor: "#e8f0e9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  followButton: {
    marginTop: 4,
    width: "100%",
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: colors.brand,
  },
  followingButton: { backgroundColor: colors.creamDark },
  followText: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.white },
  followingText: { color: colors.charcoal },
});
