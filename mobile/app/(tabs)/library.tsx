import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import type { Book, LibraryPayload, LibraryShelf } from "@/lib/types";
import BookCover from "@/components/BookCover";
import Bookshelf from "@/components/Bookshelf";
import { colors, fonts } from "@/constants/theme";

const ALL_SHELF_ID = "__all__";
type ViewMode = "shelf" | "grid";

export default function LibraryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeShelfId, setActiveShelfId] = useState<string>(ALL_SHELF_ID);
  const [viewMode, setViewMode] = useState<ViewMode>("shelf");
  const [newShelfOpen, setNewShelfOpen] = useState(false);
  const [newShelfName, setNewShelfName] = useState("");
  const [creatingShelf, setCreatingShelf] = useState(false);

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

  const shareLibrary = async () => {
    if (!user) return;
    try {
      await Share.share({
        message: `Check out my bookshelf on Leaf: ${API_BASE_URL}/u/${user.username}/library`,
        url: `${API_BASE_URL}/u/${user.username}/library`,
      });
    } catch {
      // user cancelled or share failed — nothing to do
    }
  };

  const createShelf = async () => {
    const name = newShelfName.trim();
    if (!name) return;
    setCreatingShelf(true);
    try {
      const res = await authFetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_shelf", name }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not create shelf");
      setLibrary(data.library);
      setNewShelfName("");
      setNewShelfOpen(false);
    } catch {
      // silently keep the modal open — user can retry
    } finally {
      setCreatingShelf(false);
    }
  };

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.shelfRow}
        contentContainerStyle={styles.shelfRowContent}
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
        <Pressable style={styles.newShelfChip} onPress={() => setNewShelfOpen(true)}>
          <Ionicons name="add" size={14} color={colors.brand} />
          <Text style={styles.newShelfChipText}>New Shelf</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.toolbar}>
        <Text style={styles.resultsText}>
          {visibleBooks.length} {visibleBooks.length === 1 ? "book" : "books"}
        </Text>

        <View style={styles.toolbarActions}>
          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setViewMode("shelf")}
              style={[styles.viewToggleButton, viewMode === "shelf" && styles.viewToggleButtonActive]}
            >
              <Ionicons name="library" size={15} color={viewMode === "shelf" ? colors.white : colors.charcoalMuted} />
            </Pressable>
            <Pressable
              onPress={() => setViewMode("grid")}
              style={[styles.viewToggleButton, viewMode === "grid" && styles.viewToggleButtonActive]}
            >
              <Ionicons name="grid" size={15} color={viewMode === "grid" ? colors.white : colors.charcoalMuted} />
            </Pressable>
          </View>

          <Pressable onPress={shareLibrary} style={styles.shareButton}>
            <Ionicons name="share-outline" size={16} color={colors.charcoalMuted} />
          </Pressable>
        </View>
      </View>
    </>
  );

  const newShelfModal = (
    <Modal visible={newShelfOpen} transparent animationType="fade" onRequestClose={() => setNewShelfOpen(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>New Shelf</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Shelf name"
            value={newShelfName}
            onChangeText={setNewShelfName}
            autoFocus
          />
          <View style={styles.modalActions}>
            <Pressable
              style={styles.modalCancel}
              onPress={() => {
                setNewShelfOpen(false);
                setNewShelfName("");
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.modalSave} onPress={createShelf} disabled={creatingShelf}>
              {creatingShelf ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.modalSaveText}>Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
        {newShelfModal}
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
      ListFooterComponent={newShelfModal}
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
  statTile: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 20, fontFamily: fonts.sansBold, color: colors.charcoal },
  statLabel: { fontSize: 9, color: colors.charcoalMuted, textTransform: "uppercase", fontFamily: fonts.sansSemiBold, letterSpacing: 0.4 },
  shelfRow: { flexGrow: 0 },
  shelfRowContent: { flexDirection: "row", gap: 8, paddingRight: 4 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 4,
  },
  toolbarActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultsText: { fontSize: 12, color: colors.charcoalMuted, fontFamily: fonts.sans },
  shareButton: {
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  chipTextActive: { color: colors.white },
  newShelfChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: "dashed",
  },
  newShelfChipText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.brand },
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
  modalBackdrop: { flex: 1, backgroundColor: "rgba(28,28,26,0.4)", justifyContent: "center", padding: 24 },
  modalSheet: { backgroundColor: colors.cream, borderRadius: 20, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontFamily: fonts.serif, color: colors.charcoal },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.sans,
    backgroundColor: colors.creamCard,
    color: colors.charcoal,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalCancelText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.charcoalMuted },
  modalSave: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.brand },
  modalSaveText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
});
