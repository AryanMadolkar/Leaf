import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { authFetch } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import type { ProfileData, ProfileStats } from "@/lib/profile";
import { colors, fonts } from "@/constants/theme";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileView({ username, onLogout }: { username: string; onLogout?: () => void }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followPending, setFollowPending] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await authFetch(`/api/profile/${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load profile");
      setProfile(data.profile);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || "Could not load profile");
    }
  }, [username]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleFollow = async () => {
    if (!profile || followPending) return;
    setFollowPending(true);
    const next = !profile.isFollowing;
    setProfile({
      ...profile,
      isFollowing: next,
      followersCount: next ? profile.followersCount + 1 : Math.max(0, profile.followersCount - 1),
    });
    try {
      const res = await authFetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
      if (!res.ok) throw new Error("Follow request failed");
    } catch {
      await load();
    } finally {
      setFollowPending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Profile unavailable"}</Text>
      </View>
    );
  }

  const avatar = resolveMediaUrl(profile.avatar);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials(profile.name)}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        <View style={styles.countsRow}>
          <View style={styles.countItem}>
            <Text style={styles.countValue}>{profile.followersCount}</Text>
            <Text style={styles.countLabel}>Followers</Text>
          </View>
          <View style={styles.countItem}>
            <Text style={styles.countValue}>{profile.followingCount}</Text>
            <Text style={styles.countLabel}>Following</Text>
          </View>
        </View>

        {!profile.isMe && (
          <Pressable
            onPress={toggleFollow}
            disabled={followPending}
            style={[styles.followButton, profile.isFollowing && styles.followingButton]}
          >
            {followPending ? (
              <ActivityIndicator size="small" color={profile.isFollowing ? colors.charcoal : colors.white} />
            ) : (
              <Text style={[styles.followText, profile.isFollowing && styles.followingText]}>
                {profile.isFollowing ? "Following" : "Follow"}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      {stats && (
        <>
          <View style={styles.grid}>
            <StatCard label="Books Completed" value={stats.books_completed} />
            <StatCard label="Currently Reading" value={stats.books_reading} />
            <StatCard label="Want to Read" value={stats.books_want_to_read} />
            <StatCard label="Total Pages Read" value={stats.total_pages_read} />
          </View>
          <View style={styles.grid}>
            <StatCard label="Current Streak" value={stats.reading_streak} suffix=" 🔥" />
            <StatCard label="Longest Streak" value={stats.longest_streak} suffix=" 🔥" />
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Favorite Genre</Text>
            <Text style={styles.cardValue}>{stats.favorite_genre || "Fiction"}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Average Rating</Text>
            <Text style={styles.cardValue}>{stats.average_rating ? stats.average_rating.toFixed(1) : "—"} ★</Text>
          </View>
        </>
      )}

      {profile.isMe && onLogout && (
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>
        {value}
        {suffix}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  errorText: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sans },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  header: { alignItems: "center", gap: 4, paddingVertical: 12 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.creamDark, marginBottom: 8 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 24, fontFamily: fonts.sansBold, color: colors.brand },
  name: { fontSize: 24, fontFamily: fonts.serif, color: colors.charcoal },
  username: { fontSize: 12, color: colors.charcoalMuted, fontFamily: fonts.sans },
  bio: { fontSize: 12, color: colors.charcoalLight, fontFamily: fonts.sans, textAlign: "center", marginTop: 6, paddingHorizontal: 24 },
  countsRow: { flexDirection: "row", gap: 28, marginTop: 12 },
  countItem: { alignItems: "center" },
  countValue: { fontSize: 15, fontFamily: fonts.sansBold, color: colors.charcoal },
  countLabel: { fontSize: 10, color: colors.charcoalMuted, textTransform: "uppercase", fontFamily: fonts.sansSemiBold },
  followButton: {
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  followingButton: { backgroundColor: colors.creamDark },
  followText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
  followingText: { color: colors.charcoal },
  logoutButton: {
    marginTop: 8,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  logoutText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: fonts.sansBold, color: colors.charcoal },
  statLabel: { fontSize: 10, color: colors.charcoalMuted, textTransform: "uppercase", fontFamily: fonts.sansSemiBold, textAlign: "center" },
  card: { backgroundColor: colors.creamCard, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: 14, padding: 16, gap: 4 },
  cardLabel: { fontSize: 10, color: colors.charcoalMuted, textTransform: "uppercase", fontFamily: fonts.sansSemiBold },
  cardValue: { fontSize: 18, fontFamily: fonts.sansBold, color: colors.charcoal },
});
