import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/api";
import { bookHref } from "@/lib/navigation";
import type { ReadingLog } from "@/lib/types";
import BookCover from "@/components/BookCover";
import { colors, fonts } from "@/constants/theme";

const STATUS_STYLES: Record<ReadingLog["status"], { label: string; bg: string; fg: string }> = {
  "Currently Reading": { label: "Reading", bg: "#e8f0e9", fg: colors.brand },
  "Want to Read": { label: "Want to Read", bg: "#fdf3e0", fg: "#8a6b1f" },
  "Did Not Finish": { label: "Did Not Finish", bg: "#fbe9e7", fg: "#a33f36" },
  Finished: { label: "Finished", bg: colors.creamDark, fg: "#5c5347" },
};

function formatStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const roundedUp = rating - full >= 0.75 ? 1 : 0;
  return "★".repeat(full + roundedUp) + (half ? "½" : "");
}

export default function DiaryScreen() {
  const router = useRouter();
  const cancelledRef = useRef(false);
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await authFetch("/api/init");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load diary");
      const sorted = [...(data.diaryLogs || [])].sort((a: ReadingLog, b: ReadingLog) =>
        (b.dateLogged || "").localeCompare(a.dateLogged || "")
      );
      if (!cancelledRef.current) setLogs(sorted);
    } catch (err: any) {
      if (!cancelledRef.current) setError(err.message || "Could not load diary");
    }
  }, []);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && logs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
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
          <Pressable
            style={styles.row}
            onPress={() => item.bookId && router.push(bookHref(item.bookId))}
          >
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
              {item.rating ? <Text style={styles.rating}>{formatStars(item.rating)}</Text> : null}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream, gap: 12 },
  errorText: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sans },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  retryText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
  content: { padding: 16, gap: 12, paddingBottom: 140 },
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
