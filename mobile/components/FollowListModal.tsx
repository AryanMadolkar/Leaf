import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authFetch } from "@/lib/api";
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
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/follows?userId=${encodeURIComponent(userId)}&type=${type}`);
        const data = await res.json();
        if (!cancelled && res.ok && data.success) setUsers(data.users);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, userId, type]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{type === "followers" ? "Followers" : "Following"}</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.charcoal} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(u) => u.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No one here yet.</Text>}
            renderItem={({ item }) => {
              const avatar = resolveMediaUrl(item.avatar);
              return (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    onClose();
                    router.push(`/profile/${item.username}` as any);
                  }}
                >
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]} />
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
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, paddingTop: 60 },
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
  emptyText: { fontSize: 12, color: colors.charcoalMuted, fontFamily: fonts.sans, textAlign: "center", marginTop: 24 },
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
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.creamDark },
  avatarFallback: {},
  name: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.charcoal },
  username: { fontSize: 11, color: colors.charcoalMuted, fontFamily: fonts.sans },
});
