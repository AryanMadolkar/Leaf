import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/api";
import type { ReadingLog } from "@/lib/types";
import BookCover from "@/components/BookCover";
import { colors, fonts } from "@/constants/theme";

const STATUS_STYLES: Record<ReadingLog["status"], { label: string; bg: string; fg: string }> = {
  "Currently Reading": { label: "Reading", bg: "#e8f0e9", fg: colors.brand },
  "Want to Read": { label: "Want to Read", bg: "#fdf3e0", fg: "#8a6b1f" },
  "Did Not Finish": { label: "Did Not Finish", bg: "#fbe9e7", fg: "#a33f36" },
  Finished: { label: "Finished", bg: colors.creamDark, fg: "#5c5347" },
};

export default function DiaryScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authFetch("/api/init");
      const data = await res.json();
      if (res.ok && data.success) {
        const sorted = [...(data.diaryLogs || [])].sort((a: ReadingLog, b: ReadingLog) =>
          (b.dateLogged || "").localeCompare(a.dateLogged || "")
        );
        setLogs(sorted);
      }
    } catch {
      // keep whatever was already loaded
    }
  }, []);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={logs}
      keyExtractor={(l) => l.id}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <Text style={styles.emptyText}>Your diary is empty — log a book to start your timeline.</Text>
      }
      renderItem={({ item }) => {
        const meta = STATUS_STYLES[item.status] || STATUS_STYLES.Finished;
        return (
          <Pressable style={styles.row} onPress={() => item.bookId && router.push(`/book/${item.bookId}` as any)}>
            <BookCover uri={item.bookCover} title={item.bookTitle || "Untitled"} width={52} height={78} />
            <View style={styles.rowInfo}>
              <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                <Text style={[styles.statusText, { color: meta.fg }]}>{meta.label}</Text>
              </View>
              <Text style={styles.bookTitle} numberOfLines={1}>
                {item.bookTitle || "Untitled"}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {item.bookAuthor}
              </Text>
              {item.rating ? <Text style={styles.rating}>{"★".repeat(Math.round(item.rating))}</Text> : null}
              <Text style={styles.date}>{item.dateLogged}</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  emptyText: { fontSize: 12, color: colors.charcoalMuted, fontStyle: "italic", textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 12,
    padding: 12,
  },
  rowInfo: { flex: 1, gap: 3, justifyContent: "center" },
  statusBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 9, fontFamily: fonts.sansBold, textTransform: "uppercase" },
  bookTitle: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.charcoal },
  bookAuthor: { fontSize: 11, color: colors.charcoalMuted, fontFamily: fonts.sans },
  rating: { fontSize: 11, color: colors.gold },
  date: { fontSize: 10, color: colors.charcoalMuted, fontFamily: fonts.sans },
});
