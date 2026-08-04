import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { authFetch } from "@/lib/api";
import type { ReadingLog } from "@/lib/types";
import BookCover from "@/components/BookCover";

const STATUS_STYLES: Record<ReadingLog["status"], { label: string; bg: string; fg: string }> = {
  "Currently Reading": { label: "Reading", bg: "#e8f0e9", fg: "#3f6b4f" },
  "Want to Read": { label: "Want to Read", bg: "#fdf3e0", fg: "#8a6b1f" },
  "Did Not Finish": { label: "Did Not Finish", bg: "#fbe9e7", fg: "#a33f36" },
  Finished: { label: "Finished", bg: "#efe9de", fg: "#5c5347" },
};

export default function DiaryScreen() {
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
          <View style={styles.row}>
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
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7f2" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#faf7f2" },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  emptyText: { fontSize: 12, color: "#8a7f72", fontStyle: "italic", textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4dccf",
    borderRadius: 12,
    padding: 12,
  },
  rowInfo: { flex: 1, gap: 3, justifyContent: "center" },
  statusBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  bookTitle: { fontSize: 13, fontWeight: "700", color: "#2a2420" },
  bookAuthor: { fontSize: 11, color: "#8a7f72" },
  rating: { fontSize: 11, color: "#c9a13b" },
  date: { fontSize: 10, color: "#a89d8e" },
});
