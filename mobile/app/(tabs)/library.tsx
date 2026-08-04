import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/api";
import type { LibraryPayload, LibraryShelf } from "@/lib/types";
import BookCover from "@/components/BookCover";

const ALL_SHELF_ID = "__all__";

export default function LibraryScreen() {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeShelfId, setActiveShelfId] = useState<string>(ALL_SHELF_ID);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await authFetch("/api/library");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load library");
      setLibrary(data.library);
    } catch (err: any) {
      setError(err.message || "Could not load library");
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

  const shelves: LibraryShelf[] = library?.shelves || [];

  const visibleBooks = useMemo(() => {
    if (!library) return [];
    if (activeShelfId === ALL_SHELF_ID) return library.books;
    const shelf = shelves.find((s) => s.id === activeShelfId);
    if (!shelf) return library.books;
    const idSet = new Set(shelf.bookIds);
    return library.books.filter((b) => idSet.has(b.id));
  }, [library, shelves, activeShelfId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !library) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Library unavailable"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <StatTile label="Books" value={library.stats.books} />
        <StatTile label="Authors" value={library.stats.authors} />
        <StatTile label="Pages" value={library.stats.pages} />
        <StatTile label="Genres" value={library.stats.genres} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.shelfTabs}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        <ShelfChip
          label={`All (${library.books.length})`}
          active={activeShelfId === ALL_SHELF_ID}
          onPress={() => setActiveShelfId(ALL_SHELF_ID)}
        />
        {shelves.map((shelf) => (
          <ShelfChip
            key={shelf.id}
            label={`${shelf.name} (${shelf.bookIds.length})`}
            active={activeShelfId === shelf.id}
            onPress={() => setActiveShelfId(shelf.id)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={visibleBooks}
        keyExtractor={(b) => b.id}
        numColumns={3}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>Nothing on this shelf yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.bookCell}>
            <BookCover
              uri={item.coverImage}
              title={item.title}
              width={100}
              height={148}
              onPress={() => router.push(`/book/${item.id}` as any)}
            />
            <Text style={styles.bookTitle} numberOfLines={2}>
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
}

function ShelfChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7f2" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#faf7f2" },
  errorText: { fontSize: 13, color: "#8a7f72" },
  content: { padding: 16, paddingTop: 12, gap: 14, paddingBottom: 48 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4dccf",
    borderRadius: 16,
    padding: 16,
    margin: 16,
    marginBottom: 12,
  },
  statTile: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: "#2a2420" },
  statLabel: { fontSize: 10, color: "#8a7f72", textTransform: "uppercase", fontWeight: "600" },
  shelfTabs: { flexGrow: 0, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e4dccf",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#3f6b4f", borderColor: "#3f6b4f" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#2a2420" },
  chipTextActive: { color: "#fff" },
  emptyText: { fontSize: 12, color: "#8a7f72", fontStyle: "italic", textAlign: "center", marginTop: 24 },
  bookCell: { flex: 1 / 3, gap: 4, marginBottom: 16 },
  bookTitle: { fontSize: 11, fontWeight: "700", color: "#2a2420" },
  bookAuthor: { fontSize: 10, color: "#8a7f72" },
});
