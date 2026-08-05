import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/api";
import { bookHref } from "@/lib/navigation";
import type { Book } from "@/lib/types";
import BookCover from "@/components/BookCover";
import { Eyebrow, ScreenBackdrop, SectionHeader } from "@/components/ui";
import { colors, fonts, radii, shadows } from "@/constants/theme";

const SHELVES: { key: string; title: string }[] = [
  { key: "trending", title: "Trending This Week" },
  { key: "all-time-greats", title: "All-Time Greats" },
  { key: "most-added", title: "Most Added This Month" },
  { key: "booktok", title: "BookTok Favorites" },
  { key: "award-winners", title: "Award Winners" },
  { key: "modern-classics", title: "Modern Classics" },
  { key: "scifi", title: "Sci-Fi Essentials" },
  { key: "fantasy", title: "Fantasy Essentials" },
  { key: "literary", title: "Literary Fiction" },
  { key: "mystery", title: "Mystery & Thriller" },
  { key: "romance", title: "Romance Pillars" },
  { key: "historical", title: "Historical Fiction" },
  { key: "biography", title: "Biography & Memoir" },
  { key: "nonfiction", title: "Non-Fiction Bestsellers" },
];

const PRIORITY_SHELVES = SHELVES.slice(0, 4);
const REST_SHELVES = SHELVES.slice(4);

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

async function fetchShelf(shelf: string, limit = 12): Promise<Book[]> {
  try {
    const res = await authFetch(`/api/books/catalog?shelf=${shelf}&limit=${limit}`);
    const data = await res.json();
    return res.ok && data.success ? data.books : [];
  } catch {
    return [];
  }
}

function toShelfMap(results: { key: string; books: Book[] }[]): Record<string, Book[]> {
  const map: Record<string, Book[]> = {};
  results.forEach((r) => {
    map[r.key] = r.books;
  });
  return map;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [featured, setFeatured] = useState<Book | null>(null);
  const [shelves, setShelves] = useState<Record<string, Book[]>>({});
  const [leaderboard, setLeaderboard] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    cancelledRef.current = false;

    const [featuredBook, priorityResults, lb] = await Promise.all([
      fetchFeatured(),
      Promise.all(PRIORITY_SHELVES.map(async (s) => ({ key: s.key, books: await fetchShelf(s.key) }))),
      fetchShelf("leaderboard", 25),
    ]);

    if (cancelledRef.current) return;

    const priorityMap = toShelfMap(priorityResults);
    setFeatured(featuredBook);
    setShelves(priorityMap);
    setLeaderboard(lb);

    const hasPriority = priorityResults.some((r) => r.books.length > 0);
    const failed = !featuredBook && !hasPriority && lb.length === 0;
    setLoadFailed(failed);
    setLoading(false);

    if (failed || REST_SHELVES.length === 0) return;

    setLoadingMore(true);
    const restResults = await Promise.all(
      REST_SHELVES.map(async (s) => ({ key: s.key, books: await fetchShelf(s.key) }))
    );
    if (cancelledRef.current) return;
    setShelves((prev) => ({ ...prev, ...toShelfMap(restResults) }));
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    load();
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadingMore(false);
    await load();
    if (!cancelledRef.current) setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <ScreenBackdrop>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </ScreenBackdrop>
    );
  }

  if (loadFailed) {
    return (
      <ScreenBackdrop>
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn’t load Discover</Text>
          <Pressable
            style={styles.retryButton}
            onPress={async () => {
              setLoading(true);
              await load();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {featured && (
          <Pressable onPress={() => router.push(bookHref(featured.id))} style={styles.heroWrap}>
            <LinearGradient
              colors={[colors.brandDeep, colors.brand, colors.brandLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroGlow} />
              <Eyebrow style={styles.heroLabel}>Featured Volume of the Day</Eyebrow>
              <View style={styles.heroBody}>
                <BookCover uri={featured.coverImage} title={featured.title} width={102} height={150} />
                <View style={styles.heroInfo}>
                  <Text style={styles.heroTitle} numberOfLines={3}>
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
            </LinearGradient>
          </Pressable>
        )}

        {SHELVES.map((s) => {
          const books = shelves[s.key] || [];
          if (books.length === 0) return null;
          return (
            <View key={s.key} style={styles.section}>
              <SectionHeader title={s.title} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 14, paddingRight: 8, paddingVertical: 4 }}
              >
                {books.map((item) => (
                  <View key={item.id} style={styles.bookCard}>
                    <BookCover
                      uri={item.coverImage}
                      title={item.title}
                      width={108}
                      height={160}
                      onPress={() => router.push(bookHref(item.id))}
                    />
                    <Text style={styles.bookTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>
                      {item.author}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}

        {loadingMore && (
          <View style={styles.moreLoading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        )}

        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Top 25 on Leaf" subtitle="What readers keep returning to" />
            <View style={{ gap: 10 }}>
              {leaderboard.map((book, idx) => (
                <Pressable key={book.id} style={styles.leaderboardRow} onPress={() => router.push(bookHref(book.id))}>
                  <Text style={[styles.rank, idx < 3 && styles.rankTop]}>{idx + 1}</Text>
                  <BookCover uri={book.coverImage} title={book.title} width={44} height={64} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.bookTitle} numberOfLines={1}>
                      {book.title}
                    </Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>
                      {book.author}
                    </Text>
                  </View>
                  {book.averageRating > 0 && <Text style={styles.rating}>★ {book.averageRating.toFixed(1)}</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sans },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.brand,
  },
  retryText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
  content: { padding: 20, gap: 30, paddingBottom: 64 },
  heroWrap: { ...shadows.float, borderRadius: radii.xxl },
  hero: {
    borderRadius: radii.xxl,
    padding: 20,
    gap: 14,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroLabel: {
    color: colors.goldSoft,
  },
  heroBody: { flexDirection: "row", gap: 16 },
  heroInfo: { flex: 1, gap: 6, justifyContent: "center" },
  heroTitle: {
    fontSize: 24,
    fontFamily: fonts.serif,
    color: colors.white,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  heroAuthor: { fontSize: 12, color: "rgba(250,248,245,0.72)", fontFamily: fonts.sans },
  heroDescription: {
    fontSize: 12,
    color: "rgba(250,248,245,0.78)",
    fontFamily: fonts.sans,
    lineHeight: 18,
    marginTop: 2,
  },
  section: { gap: 12 },
  bookCard: { width: 108, gap: 8 },
  bookTitle: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoal, lineHeight: 15 },
  bookAuthor: { fontSize: 11, color: colors.charcoalMuted, fontFamily: fonts.sans },
  moreLoading: { paddingVertical: 8, alignItems: "center" },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.lg,
    padding: 12,
    ...shadows.soft,
  },
  rank: {
    width: 24,
    textAlign: "center",
    fontSize: 16,
    fontFamily: fonts.serif,
    color: colors.brandMuted,
  },
  rankTop: {
    color: colors.brand,
  },
  rating: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.gold },
});
