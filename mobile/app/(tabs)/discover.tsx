import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { authFetch } from "@/lib/api";
import type { Book } from "@/lib/types";
import BookCover from "@/components/BookCover";

const SHELVES: { key: string; title: string }[] = [
  { key: "trending", title: "Trending This Week" },
  { key: "all-time-greats", title: "All-Time Greats" },
  { key: "award-winners", title: "Award Winners" },
];

async function fetchFeatured(): Promise<Book | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await authFetch(`/api/books/featured?date=${today}`);
    const data = await res.json();
    return res.ok && data.success ? data.book : null;
  } catch {
    return null;
  }
}

async function fetchShelf(shelf: string): Promise<Book[]> {
  try {
    const res = await authFetch(`/api/books/catalog?shelf=${shelf}&limit=12`);
    const data = await res.json();
    return res.ok && data.success ? data.books : [];
  } catch {
    return [];
  }
}

export default function DiscoverScreen() {
  const [featured, setFeatured] = useState<Book | null>(null);
  const [shelves, setShelves] = useState<Record<string, Book[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [featuredBook, shelfResults] = await Promise.all([
      fetchFeatured(),
      Promise.all(SHELVES.map(async (s) => ({ key: s.key, books: await fetchShelf(s.key) }))),
    ]);
    setFeatured(featuredBook);
    const map: Record<string, Book[]> = {};
    shelfResults.forEach((r) => {
      map[r.key] = r.books;
    });
    setShelves(map);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {featured && (
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Featured Volume of the Day</Text>
          <View style={styles.heroBody}>
            <BookCover uri={featured.coverImage} title={featured.title} width={90} height={132} />
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {featured.title}
              </Text>
              <Text style={styles.heroAuthor} numberOfLines={1}>
                by {featured.author}
              </Text>
              <Text style={styles.heroDescription} numberOfLines={4}>
                {featured.description}
              </Text>
            </View>
          </View>
        </View>
      )}

      {SHELVES.map((s) => {
        const books = shelves[s.key] || [];
        if (books.length === 0) return null;
        return (
          <View key={s.key} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <FlatList
              data={books}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(b) => b.id}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <View style={styles.bookCard}>
                  <BookCover uri={item.coverImage} title={item.title} width={100} height={148} />
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {item.author}
                  </Text>
                </View>
              )}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7f2" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#faf7f2" },
  content: { padding: 16, gap: 24, paddingBottom: 48 },
  hero: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4dccf",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  heroLabel: { fontSize: 9, fontWeight: "700", color: "#3f6b4f", textTransform: "uppercase", letterSpacing: 0.5 },
  heroBody: { flexDirection: "row", gap: 12 },
  heroInfo: { flex: 1, gap: 4, justifyContent: "center" },
  heroTitle: { fontSize: 16, fontWeight: "700", color: "#2a2420" },
  heroAuthor: { fontSize: 11, color: "#8a7f72" },
  heroDescription: { fontSize: 11, color: "#6b6255", lineHeight: 16 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#2a2420" },
  bookCard: { width: 100, gap: 4 },
  bookTitle: { fontSize: 11, fontWeight: "700", color: "#2a2420" },
  bookAuthor: { fontSize: 10, color: "#8a7f72" },
});
