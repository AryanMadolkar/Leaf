import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { bookHref } from "@/lib/navigation";
import type { Book, LibraryPayload, LibraryShelf } from "@/lib/types";
import BookCover from "@/components/BookCover";
import Bookshelf from "@/components/Bookshelf";
import { ScreenBackdrop } from "@/components/ui";
import { colors, fonts, radii, shadows } from "@/constants/theme";

const ALL_SHELF_ID = "__all__";
const GRID_GAP = 12;
const GRID_COLS = 3;
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
  const [createShelfError, setCreateShelfError] = useState<string | null>(null);
  const [contentWidth, setContentWidth] = useState(Dimensions.get("window").width - 32);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await authFetch("/api/library");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load library");
      if (!cancelledRef.current) setLibrary(data.library);
    } catch (err: any) {
      if (!cancelledRef.current) setError(err.message || "Could not load library");
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelledRef.current) setLoading(false);
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (!cancelledRef.current) setRefreshing(false);
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

  const coverWidth = Math.floor((contentWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
  const coverHeight = Math.round(coverWidth * 1.48);

  const openBook = (book: Book) => router.push(bookHref(book.id));

  const shareLibrary = async () => {
    if (!user) {
      Alert.alert("Sign in required", "Sign in to share your library.");
      return;
    }
    try {
      const url = `${API_BASE_URL}/u/${user.username}/library`;
      await Share.share({
        message: `Check out my bookshelf on Leaf: ${url}`,
        url,
      });
    } catch (err: any) {
      if (err?.message && !/cancel|dismiss/i.test(err.message)) {
        Alert.alert("Couldn’t share", err.message);
      }
    }
  };

  const createShelf = async () => {
    const name = newShelfName.trim();
    if (!name) return;
    setCreatingShelf(true);
    setCreateShelfError(null);
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
      setCreateShelfError(null);
      setNewShelfOpen(false);
    } catch (err: any) {
      setCreateShelfError(err.message || "Could not create shelf");
    } finally {
      setCreatingShelf(false);
    }
  };

  const closeNewShelfModal = () => {
    setNewShelfOpen(false);
    setNewShelfName("");
    setCreateShelfError(null);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (error || !library) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Library unavailable"}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={async () => {
            setLoading(true);
            await load();
            setLoading(false);
          }}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScreenBackdrop>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        nestedScrollEnabled
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width - 32;
          if (w > 0 && Math.abs(w - contentWidth) > 1) setContentWidth(w);
        }}
      >
        <View style={styles.statsRow}>
          <StatTile label="Books" value={library.stats.books} />
          <StatTile label="Authors" value={library.stats.authors} />
          <StatTile label="Pages" value={library.stats.pages} />
          <StatTile label="Genres" value={library.stats.genres} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
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
                hitSlop={4}
              >
                <Ionicons name="library" size={15} color={viewMode === "shelf" ? colors.white : colors.charcoalMuted} />
              </Pressable>
              <Pressable
                onPress={() => setViewMode("grid")}
                style={[styles.viewToggleButton, viewMode === "grid" && styles.viewToggleButtonActive]}
                hitSlop={4}
              >
                <Ionicons name="grid" size={15} color={viewMode === "grid" ? colors.white : colors.charcoalMuted} />
              </Pressable>
            </View>

            <Pressable onPress={() => router.push("/scan-shelf")} style={styles.shareButton} hitSlop={4}>
              <Ionicons name="camera-outline" size={16} color={colors.charcoalMuted} />
            </Pressable>

            <Pressable onPress={shareLibrary} style={styles.shareButton} hitSlop={4}>
              <Ionicons name="share-outline" size={16} color={colors.charcoalMuted} />
            </Pressable>
          </View>
        </View>

        {viewMode === "shelf" ? (
          <Bookshelf books={visibleBooks} onPressBook={openBook} />
        ) : visibleBooks.length === 0 ? (
          <Text style={styles.emptyText}>Nothing on this shelf yet.</Text>
        ) : (
          <View style={styles.grid}>
            {visibleBooks.map((item) => (
              <View key={item.id} style={[styles.bookCell, { width: coverWidth }]}>
                <BookCover
                  uri={item.coverImage}
                  title={item.title}
                  width={coverWidth}
                  height={coverHeight}
                  onPress={() => openBook(item)}
                />
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {item.author}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={newShelfOpen} transparent animationType="fade" onRequestClose={closeNewShelfModal}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeNewShelfModal} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Shelf</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Shelf name"
              placeholderTextColor={colors.charcoalMuted}
              value={newShelfName}
              onChangeText={(text) => {
                setNewShelfName(text);
                if (createShelfError) setCreateShelfError(null);
              }}
              autoFocus
            />
            {createShelfError && <Text style={styles.modalError}>{createShelfError}</Text>}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={closeNewShelfModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSave, (!newShelfName.trim() || creatingShelf) && styles.modalSaveDisabled]}
                onPress={createShelf}
                disabled={creatingShelf || !newShelfName.trim()}
              >
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
    </ScreenBackdrop>
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
  scroll: { flex: 1, backgroundColor: "transparent" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream, gap: 12 },
  errorText: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sans },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  retryText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
  content: { padding: 16, paddingTop: 12, paddingBottom: 48, gap: 16 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.xl,
    padding: 18,
    ...shadows.card,
  },
  statTile: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 22, fontFamily: fonts.serif, color: colors.charcoal },
  statLabel: {
    fontSize: 9,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    fontFamily: fonts.sansSemiBold,
    letterSpacing: 0.5,
  },
  shelfRow: { flexGrow: 0 },
  shelfRowContent: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 4 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toolbarActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultsText: { fontSize: 12, color: colors.charcoalMuted, fontFamily: fonts.sans },
  shareButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoalMuted },
  chipTextActive: { color: colors.white },
  newShelfChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.brandWash,
    borderWidth: 1,
    borderColor: "rgba(46,77,56,0.16)",
  },
  newShelfChipText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.brand },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  viewToggleButton: {
    width: 32,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleButtonActive: { backgroundColor: colors.brand },
  emptyText: {
    fontSize: 13,
    color: colors.charcoalMuted,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 24,
    fontFamily: fonts.sans,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  bookCell: { gap: 6 },
  bookTitle: { fontSize: 11, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  bookAuthor: { fontSize: 10, color: colors.charcoalMuted, fontFamily: fonts.sans },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(28,28,26,0.35)", justifyContent: "center", padding: 24 },
  modalSheet: {
    backgroundColor: colors.creamCard,
    borderRadius: radii.xl,
    padding: 20,
    gap: 12,
    ...shadows.float,
  },
  modalTitle: { fontSize: 22, fontFamily: fonts.serif, color: colors.charcoal },
  modalError: { fontSize: 12, color: colors.error, fontFamily: fonts.sans },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.sans,
    backgroundColor: colors.cream,
    color: colors.charcoal,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalCancelText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.charcoalMuted },
  modalSave: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: radii.md, backgroundColor: colors.brand },
  modalSaveDisabled: { opacity: 0.5 },
  modalSaveText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
});
