import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { bookHref } from "@/lib/navigation";
import type { Book, Reader } from "@/lib/types";
import ReaderCard from "@/components/ReaderCard";
import BookCover from "@/components/BookCover";
import ReviewCard, { type Review } from "@/components/ReviewCard";
import { AccentMark, ScreenBackdrop, SectionHeader } from "@/components/ui";
import { colors, fonts, radii, shadows } from "@/constants/theme";

async function fetchReviews(): Promise<Review[]> {
  try {
    const res = await authFetch("/api/reviews?limit=10");
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.reviews : [];
  } catch {
    return [];
  }
}

async function fetchReaders(type: "active" | "new"): Promise<Reader[]> {
  try {
    const res = await authFetch(`/api/discover/readers?type=${type}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.readers : [];
  } catch {
    return [];
  }
}

async function fetchRecentlyLogged(): Promise<Book[]> {
  try {
    const res = await authFetch("/api/feed/recently-logged?limit=8");
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.books : [];
  } catch {
    return [];
  }
}

function ReaderSection({ title, readers, loading }: { title: string; readers: Reader[]; loading: boolean }) {
  if (!loading && readers.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 4, paddingRight: 8 }}
        >
          {readers.map((item) => (
            <ReaderCard key={item.id} reader={item} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const cancelledRef = useRef(false);
  const [activeReaders, setActiveReaders] = useState<Reader[]>([]);
  const [newReaders, setNewReaders] = useState<Reader[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReaders, setLoadingReaders] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoadingReaders(true);
    setLoadingBooks(true);
    setLoadingReviews(true);
    const [active, fresh, books, recentReviews] = await Promise.all([
      fetchReaders("active"),
      fetchReaders("new"),
      fetchRecentlyLogged(),
      fetchReviews(),
    ]);
    if (cancelledRef.current) return;
    setActiveReaders(active);
    setNewReaders(fresh);
    setRecentBooks(books);
    setReviews(recentReviews);
    setLoadingReaders(false);
    setLoadingBooks(false);
    setLoadingReviews(false);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    load();
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (!cancelledRef.current) setRefreshing(false);
  }, [load]);

  return (
    <ScreenBackdrop>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.name}>{user?.display_name || "Reader"}</Text>
          <AccentMark style={styles.headerAccent} />
          <Text style={styles.tagline}>Your reading life, gathered in one place.</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Recently logged" subtitle="Fresh from your circle" />
          {loadingBooks ? (
            <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
          ) : recentBooks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No books logged yet — start with Discover.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingVertical: 8, paddingRight: 8 }}
            >
              {recentBooks.map((item) => (
                <View key={item.id} style={styles.bookCard}>
                  <BookCover
                    uri={item.coverImage}
                    title={item.title}
                    width={112}
                    height={166}
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
          )}
        </View>

        <ReaderSection title="Active readers" readers={activeReaders} loading={loadingReaders} />
        <ReaderSection title="New readers" readers={newReaders} loading={loadingReaders} />

        <View style={styles.section}>
          <SectionHeader title="Recent reviews" subtitle="Notes from the community" />
          {loadingReviews ? (
            <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
          ) : reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No reviews yet.</Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 20, gap: 34, paddingBottom: 140 },
  header: { gap: 6, paddingTop: 8, paddingBottom: 4 },
  greeting: {
    fontSize: 12,
    color: colors.brandMuted,
    fontFamily: fonts.sansBold,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  name: {
    fontSize: 36,
    fontFamily: fonts.serif,
    color: colors.charcoal,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  headerAccent: { marginTop: 2 },
  tagline: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.charcoalMuted,
    lineHeight: 20,
    marginTop: 2,
    maxWidth: 280,
  },
  section: { gap: 14 },
  emptyCard: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.lg,
    padding: 16,
    ...shadows.soft,
  },
  emptyText: {
    fontSize: 13,
    color: colors.charcoalMuted,
    fontStyle: "italic",
    fontFamily: fonts.sans,
  },
  bookCard: { width: 112, gap: 8 },
  bookTitle: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.charcoal, lineHeight: 16 },
  bookAuthor: { fontSize: 11, color: colors.charcoalMuted, fontFamily: fonts.sans },
});
