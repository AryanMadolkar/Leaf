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
import { SectionHeader } from "@/components/ui";
import { colors, fonts } from "@/constants/theme";

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
          contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back</Text>
        <Text style={styles.name}>{user?.display_name || "Reader"}</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recently logged" subtitle="Fresh from your circle" />
        {loadingBooks ? (
          <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
        ) : recentBooks.length === 0 ? (
          <Text style={styles.emptyText}>No books logged yet.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14, paddingVertical: 6 }}
          >
            {recentBooks.map((item) => (
              <View key={item.id} style={styles.bookCard}>
                <BookCover
                  uri={item.coverImage}
                  title={item.title}
                  width={104}
                  height={154}
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
          <Text style={styles.emptyText}>No reviews yet.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 30, paddingBottom: 56 },
  header: { gap: 2, paddingTop: 4, paddingBottom: 8 },
  greeting: { fontSize: 15, color: colors.charcoalMuted, fontFamily: fonts.sans },
  name: {
    fontSize: 28,
    fontFamily: fonts.serif,
    color: colors.charcoal,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  section: { gap: 12 },
  emptyText: {
    fontSize: 13,
    color: colors.charcoalMuted,
    fontStyle: "italic",
    fontFamily: fonts.sans,
    paddingVertical: 8,
  },
  bookCard: { width: 104, gap: 6 },
  bookTitle: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoal, lineHeight: 15 },
  bookAuthor: { fontSize: 11, color: colors.charcoalMuted, fontFamily: fonts.sans },
});
