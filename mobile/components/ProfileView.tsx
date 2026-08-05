import React, { useCallback, useEffect, useRef, useState } from "react";
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
import type { FullStatsPayload } from "@/lib/stats";
import { colors, fonts, radii, shadows } from "@/constants/theme";
import FollowListModal from "@/components/FollowListModal";
import ProfileStatsCharts from "@/components/ProfileStatsCharts";
import { Eyebrow, PrimaryButton, SecondaryButton } from "@/components/ui";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileView({ username, onLogout }: { username: string; onLogout?: () => void }) {
  const cancelledRef = useRef(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [fullStats, setFullStats] = useState<FullStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followPending, setFollowPending] = useState(false);
  const [listModal, setListModal] = useState<"followers" | "following" | null>(null);

  const loadFullStats = useCallback(async (userId: string) => {
    try {
      const res = await authFetch(`/api/stats?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.charts) {
        if (!cancelledRef.current) setFullStats(null);
        return;
      }
      if (!cancelledRef.current) {
        setFullStats({
          stats: data.stats,
          charts: data.charts,
          genreDistribution: data.genreDistribution || [],
          pace: data.pace,
          insights: data.insights || [],
          timeline: data.timeline || [],
        });
      }
    } catch {
      if (!cancelledRef.current) setFullStats(null);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await authFetch(`/api/profile/${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load profile");
      if (cancelledRef.current) return;
      setProfile(data.profile);
      setStats(data.stats);
      if (data.profile?.id) {
        await loadFullStats(data.profile.id);
      }
    } catch (err: any) {
      if (!cancelledRef.current) setError(err.message || "Could not load profile");
    }
  }, [username, loadFullStats]);

  useEffect(() => {
    cancelledRef.current = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelledRef.current) setLoading(false);
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (!cancelledRef.current) setRefreshing(false);
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
        <Pressable
          style={styles.retryButton}
          onPress={async () => {
            setLoading(true);
            await load();
            if (!cancelledRef.current) setLoading(false);
          }}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
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
        <Eyebrow>{profile.isMe ? "Your profile" : "Reader profile"}</Eyebrow>
        <View style={styles.avatarRing}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials(profile.name)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        <View style={styles.countsRow}>
          <Pressable style={styles.countItem} onPress={() => setListModal("followers")} hitSlop={8}>
            <Text style={styles.countValue}>{profile.followersCount}</Text>
            <Text style={styles.countLabel}>Followers</Text>
          </Pressable>
          <View style={styles.countDivider} />
          <Pressable style={styles.countItem} onPress={() => setListModal("following")} hitSlop={8}>
            <Text style={styles.countValue}>{profile.followingCount}</Text>
            <Text style={styles.countLabel}>Following</Text>
          </Pressable>
        </View>

        {!profile.isMe &&
          (profile.isFollowing ? (
            <SecondaryButton
              label={followPending ? "…" : "Following"}
              onPress={toggleFollow}
              disabled={followPending}
              style={{ marginTop: 14, minWidth: 140 }}
            />
          ) : (
            <PrimaryButton
              label={followPending ? "…" : "Follow"}
              onPress={toggleFollow}
              disabled={followPending}
              style={{ marginTop: 14, minWidth: 140 }}
            />
          ))}
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
            <StatCard label="Current Streak" value={stats.reading_streak} suffix=" days" />
            <StatCard label="Longest Streak" value={stats.longest_streak} suffix=" days" />
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

      {fullStats ? <ProfileStatsCharts data={fullStats} /> : null}

      {profile.isMe && onLogout && (
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      )}

      {listModal && (
        <FollowListModal
          visible
          userId={profile.id}
          type={listModal}
          onClose={() => setListModal(null)}
        />
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream, gap: 12 },
  errorText: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sans },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  retryText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
  content: { padding: 20, gap: 14, paddingBottom: 140 },
  header: { alignItems: "center", gap: 4, paddingVertical: 16 },
  avatarRing: {
    padding: 4,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
    marginBottom: 10,
    ...shadows.soft,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.creamDark },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandWash },
  avatarInitials: { fontSize: 28, fontFamily: fonts.serif, color: colors.brand },
  name: { fontSize: 28, fontFamily: fonts.serif, color: colors.charcoal, letterSpacing: -0.4 },
  username: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sansMedium },
  bio: {
    fontSize: 13,
    color: colors.charcoalLight,
    fontFamily: fonts.sans,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 24,
    lineHeight: 19,
  },
  countsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 16,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 28,
    ...shadows.soft,
  },
  countItem: { alignItems: "center", minWidth: 72 },
  countDivider: { width: 1, height: 28, backgroundColor: colors.creamBorder },
  countValue: { fontSize: 17, fontFamily: fonts.sansBold, color: colors.charcoal },
  countLabel: {
    fontSize: 10,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    fontFamily: fonts.sansSemiBold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  logoutButton: {
    marginTop: 8,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
  },
  logoutText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.lg,
    padding: 16,
    alignItems: "center",
    gap: 4,
    ...shadows.soft,
  },
  statValue: { fontSize: 22, fontFamily: fonts.serif, color: colors.charcoal },
  statLabel: {
    fontSize: 10,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    fontFamily: fonts.sansSemiBold,
    textAlign: "center",
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.lg,
    padding: 16,
    gap: 4,
    ...shadows.soft,
  },
  cardLabel: {
    fontSize: 10,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    fontFamily: fonts.sansSemiBold,
    letterSpacing: 0.5,
  },
  cardValue: { fontSize: 18, fontFamily: fonts.serif, color: colors.charcoal },
});
