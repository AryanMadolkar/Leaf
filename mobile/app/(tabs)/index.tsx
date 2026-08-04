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
import { useAuth } from "@/lib/auth";
import type { Book, Reader } from "@/lib/types";
import ReaderCard from "@/components/ReaderCard";
import BookCover from "@/components/BookCover";
import ReviewCard, { type Review } from "@/components/ReviewCard";
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
      <Text style={styles.sectionTitle}>{title}</Text>
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 16 }} />
      ) : (
        <FlatList
          data={readers}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => <ReaderCard reader={item} />}
        />
      )}
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
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
    setActiveReaders(active);
    setNewReaders(fresh);
    setRecentBooks(books);
    setReviews(recentReviews);
    setLoadingReaders(false);
    setLoadingBooks(false);
    setLoadingReviews(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.display_name || "Reader"}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recently Logged</Text>
        {loadingBooks ? (
          <ActivityIndicator style={{ marginVertical: 16 }} />
        ) : recentBooks.length === 0 ? (
          <Text style={styles.emptyText}>No books logged yet.</Text>
        ) : (
          <FlatList
            data={recentBooks}
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
        )}
      </View>

      <ReaderSection title="Active Readers" readers={activeReaders} loading={loadingReaders} />
      <ReaderSection title="New Readers" readers={newReaders} loading={loadingReaders} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Reviews</Text>
        {loadingReviews ? (
          <ActivityIndicator style={{ marginVertical: 16 }} />
        ) : reviews.length === 0 ? (
          <Text style={styles.emptyText}>No reviews yet.</Text>
        ) : (
          <View style={{ gap: 10 }}>
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
  content: { padding: 20, gap: 28, paddingBottom: 48 },
  header: { gap: 2 },
  greeting: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sans },
  name: { fontSize: 26, fontFamily: fonts.serif, color: colors.charcoal },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontFamily: fonts.serif, color: colors.charcoal },
  emptyText: { fontSize: 12, color: colors.charcoalMuted, fontStyle: "italic", fontFamily: fonts.sans },
  bookCard: { width: 100, gap: 4 },
  bookTitle: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.charcoal },
  bookAuthor: { fontSize: 10, color: colors.charcoalMuted, fontFamily: fonts.sans },
});
