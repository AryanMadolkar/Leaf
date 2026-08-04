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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/api";
import type { Book, LibraryPayload, LibraryShelf } from "@/lib/types";
import BookCover from "@/components/BookCover";
import Bookshelf from "@/components/Bookshelf";
import { colors, fonts } from "@/constants/theme";

const ALL_SHELF_ID = "__all__";
type ViewMode = "shelf" | "grid";

export default function LibraryScreen() {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeShelfId, setActiveShelfId] = useState<string>(ALL_SHELF_ID);
  const [viewMode, setViewMode] = useState<ViewMode>("shelf");

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

  const openBook = (book: Book) => router.push(`/book/${book.id}` as any);

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

  const header = (
    <>
      <View style={styles.statsRow}>
        <StatTile label="Books" value={library.stats.books} />
        <StatTile label="Authors" value={library.stats.authors} />
        <StatTile label="Pages" value={library.stats.pages} />
        <StatTile label="Genres" value={library.stats.genres} />
      </View>

      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 8 }}
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

        <View style={styles.viewToggle}>
          <Pressable
            onPress={() => setViewMode("shelf")}
            style={[styles.viewToggleButton, viewMode === "shelf" && styles.viewToggleButtonActive]}
          >
            <Ionicons name="library" size={16} color={viewMode === "shelf" ? colors.white : colors.charcoalMuted} />
          </Pressable>
          <Pressable
            onPress={() => setViewMode("grid")}
            style={[styles.viewToggleButton, viewMode === "grid" && styles.viewToggleButtonActive]}
          >
            <Ionicons name="grid" size={16} color={viewMode === "grid" ? colors.white : colors.charcoalMuted} />
          </Pressable>
        </View>
      </View>
    </>
  );

  if (viewMode === "shelf") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {header}
        <Bookshelf books={visibleBooks} onPressBook={openBook} />
      </ScrollView>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={visibleBooks}
      keyExtractor={(b) => b.id}
      numColumns={3}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.emptyText}>Nothing on this shelf yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.bookCell}>
          <BookCover uri={item.coverImage} title={item.title} width={100} height={148} onPress={() => openBook(item)} />
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.author}
          </Text>
        </View>
      )}
    />
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
  container: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  errorText: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sans },
  content: { padding: 16, paddingTop: 12, gap: 14, paddingBottom: 48 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  statTile: { alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: fonts.sansBold, color: colors.charcoal },
  statLabel: { fontSize: 10, color: colors.charcoalMuted, textTransform: "uppercase", fontFamily: fonts.sansSemiBold },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  chipTextActive: { color: colors.white },
  viewToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 10,
    overflow: "hidden",
  },
  viewToggleButton: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.creamCard },
  viewToggleButtonActive: { backgroundColor: colors.brand },
  emptyText: { fontSize: 12, color: colors.charcoalMuted, fontStyle: "italic", textAlign: "center", marginTop: 24 },
  bookCell: { flex: 1 / 3, gap: 4, marginBottom: 16 },
  bookTitle: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.charcoal },
  bookAuthor: { fontSize: 10, color: colors.charcoalMuted, fontFamily: fonts.sans },
});
