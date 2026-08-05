import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/api";
import { profileHref } from "@/lib/navigation";
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

  useEffect(() => {
    setIsFollowing(reader.isFollowing);
  }, [reader.isFollowing, reader.id]);

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
        onPress={() => router.push(profileHref(reader.username))}
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
        {reader.streak > 0 && <Text style={styles.streakBadge}>{reader.streak}d streak</Text>}
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
    width: 152,
    padding: 14,
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 18,
    shadowColor: "#1C1C1A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.creamDark,
    borderWidth: 2,
    borderColor: colors.cream,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandWash },
  avatarInitials: { fontFamily: fonts.sansBold, color: colors.brand },
  name: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.charcoal, marginTop: 4 },
  username: { fontSize: 10, color: colors.charcoalMuted, fontFamily: fonts.sans },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 2 },
  genreBadge: {
    fontSize: 9,
    fontFamily: fonts.sansSemiBold,
    color: colors.charcoalMuted,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 88,
    overflow: "hidden",
  },
  streakBadge: {
    fontSize: 9,
    fontFamily: fonts.sansBold,
    color: colors.brand,
    backgroundColor: colors.brandWash,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  followButton: {
    marginTop: 6,
    width: "100%",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.brand,
  },
  followingButton: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  followText: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.white },
  followingText: { color: colors.charcoal },
});
