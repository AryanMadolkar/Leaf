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
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/api";
import type { Book } from "@/lib/types";
import BookCover from "@/components/BookCover";
import { colors, fonts } from "@/constants/theme";

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
  const router = useRouter();
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
            <BookCover
              uri={featured.coverImage}
              title={featured.title}
              width={90}
              height={132}
              onPress={() => router.push(`/book/${featured.id}` as any)}
            />
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
                  <BookCover
                    uri={item.coverImage}
                    title={item.title}
                    width={100}
                    height={148}
                    onPress={() => router.push(`/book/${item.id}` as any)}
                  />
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
  container: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  content: { padding: 16, gap: 24, paddingBottom: 48 },
  hero: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  heroLabel: {
    fontSize: 9,
    fontFamily: fonts.sansBold,
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroBody: { flexDirection: "row", gap: 12 },
  heroInfo: { flex: 1, gap: 4, justifyContent: "center" },
  heroTitle: { fontSize: 18, fontFamily: fonts.serif, color: colors.charcoal },
  heroAuthor: { fontSize: 11, color: colors.charcoalMuted, fontFamily: fonts.sans },
  heroDescription: { fontSize: 11, color: colors.charcoalLight, fontFamily: fonts.sans, lineHeight: 16 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontFamily: fonts.serif, color: colors.charcoal },
  bookCard: { width: 100, gap: 4 },
  bookTitle: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.charcoal },
  bookAuthor: { fontSize: 10, color: colors.charcoalMuted, fontFamily: fonts.sans },
});
