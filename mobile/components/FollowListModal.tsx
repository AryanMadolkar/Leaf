import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { profileHref } from "@/lib/navigation";
import { resolveMediaUrl } from "@/lib/media";
import { colors, fonts } from "@/constants/theme";

type FollowUser = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  isFollowing: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function FollowListModal({
  visible,
  userId,
  type,
  onClose,
}: {
  visible: boolean;
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = async (cancelled?: () => boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/follows?userId=${encodeURIComponent(userId)}&type=${type}`);
      const data = await res.json();
      if (cancelled?.()) return;
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load list");
      setUsers(data.users);
    } catch (err: any) {
      if (!cancelled?.()) {
        setUsers([]);
        setError(err.message || "Could not load list");
      }
    } finally {
      if (!cancelled?.()) setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [visible, userId, type]);

  const toggleFollow = async (item: FollowUser) => {
    if (pendingId || item.id === user?.id) return;
    setPendingId(item.id);
    const next = !item.isFollowing;
    setUsers((prev) => prev.map((u) => (u.id === item.id ? { ...u, isFollowing: next } : u)));
    try {
      const res = await authFetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: item.id }),
      });
      if (!res.ok) throw new Error("Follow request failed");
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === item.id ? { ...u, isFollowing: !next } : u)));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{type === "followers" ? "Followers" : "Following"}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.charcoal} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : error ? (
          <View style={styles.stateBlock}>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => load()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(u) => u.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 16 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No one here yet.</Text>}
            renderItem={({ item }) => {
              const avatar = resolveMediaUrl(item.avatar);
              const isMe = item.id === user?.id;
              return (
                <View style={styles.row}>
                  <Pressable
                    style={styles.rowMain}
                    onPress={() => {
                      onClose();
                      router.push(profileHref(item.username));
                    }}
                  >
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarInitials}>{initials(item.name || item.username)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.username} numberOfLines={1}>
                        @{item.username}
                      </Text>
                    </View>
                  </Pressable>
                  {!isMe && (
                    <Pressable
                      onPress={() => toggleFollow(item)}
                      disabled={pendingId === item.id}
                      style={[styles.followButton, item.isFollowing && styles.followingButton]}
                      hitSlop={8}
                    >
                      {pendingId === item.id ? (
                        <ActivityIndicator size="small" color={item.isFollowing ? colors.charcoal : colors.white} />
                      ) : (
                        <Text style={[styles.followText, item.isFollowing && styles.followingText]}>
                          {item.isFollowing ? "Following" : "Follow"}
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamBorder,
  },
  title: { fontSize: 20, fontFamily: fonts.serif, color: colors.charcoal },
  stateBlock: { alignItems: "center", marginTop: 24, gap: 12, paddingHorizontal: 24 },
  emptyText: { fontSize: 12, color: colors.charcoalMuted, fontFamily: fonts.sans, textAlign: "center" },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  retryText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 12,
    padding: 12,
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.creamDark },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 12, fontFamily: fonts.sansBold, color: colors.brand },
  name: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.charcoal },
  username: { fontSize: 11, color: colors.charcoalMuted, fontFamily: fonts.sans },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.brand,
    minWidth: 84,
    alignItems: "center",
  },
  followingButton: { backgroundColor: colors.creamDark },
  followText: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.white },
  followingText: { color: colors.charcoal },
});
