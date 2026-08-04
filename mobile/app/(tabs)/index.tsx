import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Book, Reader } from "@/lib/types";
import ReaderCard from "@/components/ReaderCard";

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
  const { user, logout } = useAuth();
  const [activeReaders, setActiveReaders] = useState<Reader[]>([]);
  const [newReaders, setNewReaders] = useState<Reader[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [loadingReaders, setLoadingReaders] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoadingReaders(true);
    setLoadingBooks(true);
    const [active, fresh, books] = await Promise.all([
      fetchReaders("active"),
      fetchReaders("new"),
      fetchRecentlyLogged(),
    ]);
    setActiveReaders(active);
    setNewReaders(fresh);
    setRecentBooks(books);
    setLoadingReaders(false);
    setLoadingBooks(false);
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
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.display_name || "Reader"}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
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
                {item.coverImage ? (
                  <Image source={{ uri: item.coverImage }} style={styles.bookCover} />
                ) : (
                  <View style={[styles.bookCover, styles.bookCoverFallback]}>
                    <Text style={styles.bookCoverTitle} numberOfLines={3}>
                      {item.title}
                    </Text>
                  </View>
                )}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7f2" },
  content: { padding: 20, gap: 28, paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { fontSize: 13, color: "#8a7f72" },
  name: { fontSize: 22, fontWeight: "700", color: "#2a2420" },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e4dccf",
  },
  logoutText: { fontSize: 12, fontWeight: "600", color: "#2a2420" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#2a2420" },
  emptyText: { fontSize: 12, color: "#8a7f72", fontStyle: "italic" },
  bookCard: { width: 100, gap: 4 },
  bookCover: { width: 100, height: 148, borderRadius: 8, backgroundColor: "#e8e0d4" },
  bookCoverFallback: { alignItems: "center", justifyContent: "center", padding: 8 },
  bookCoverTitle: { fontSize: 10, fontWeight: "700", color: "#3f6b4f", textAlign: "center" },
  bookTitle: { fontSize: 11, fontWeight: "700", color: "#2a2420" },
  bookAuthor: { fontSize: 10, color: "#8a7f72" },
});
