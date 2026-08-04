import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authFetch } from "@/lib/api";
import type { Book } from "@/lib/types";
import BookCover from "@/components/BookCover";
import LogBookModal from "@/components/LogBookModal";
import { colors, fonts } from "@/constants/theme";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/books/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Could not load book");
        if (!cancelled) setBook(data.book);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not load book");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !book) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Book" }} />
        <Text style={styles.errorText}>{error || "Book not found"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: book.title }} />
      <View style={styles.hero}>
        <BookCover uri={book.coverImage} title={book.title} width={130} height={192} />
        <View style={styles.heroInfo}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>by {book.author}</Text>
          <Text style={styles.meta}>
            {book.year > 0 ? book.year : "—"} · {book.pages > 0 ? `${book.pages} pages` : ""}
          </Text>
          {book.averageRating > 0 && <Text style={styles.rating}>★ {book.averageRating.toFixed(1)}</Text>}
        </View>
      </View>

      <Pressable style={styles.addButton} onPress={() => setModalOpen(true)}>
        <Ionicons name="add" size={16} color={colors.white} />
        <Text style={styles.addButtonText}>Add to Library</Text>
      </Pressable>
      {justLogged && <Text style={styles.savedText}>Saved to your library.</Text>}

      {book.genres.length > 0 && (
        <View style={styles.genreRow}>
          {book.genres.slice(0, 5).map((g) => (
            <View key={g} style={styles.genreBadge}>
              <Text style={styles.genreText}>{g}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.description}>{book.description}</Text>

      <LogBookModal
        visible={modalOpen}
        bookId={book.id}
        bookTitle={book.title}
        onClose={() => setModalOpen(false)}
        onLogged={() => {
          setJustLogged(true);
          setTimeout(() => setJustLogged(false), 3000);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  errorText: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sans },
  content: { padding: 20, gap: 20, paddingBottom: 48 },
  hero: { flexDirection: "row", gap: 16 },
  heroInfo: { flex: 1, gap: 4, justifyContent: "center" },
  title: { fontSize: 22, fontFamily: fonts.serif, color: colors.charcoal },
  author: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sans },
  meta: { fontSize: 12, color: colors.charcoalMuted, fontFamily: fonts.sans, marginTop: 4 },
  rating: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.gold, marginTop: 6 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: -8,
  },
  addButtonText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
  savedText: { fontSize: 12, fontFamily: fonts.sans, color: colors.brand, textAlign: "center", marginTop: -12 },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genreBadge: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreText: { fontSize: 11, fontFamily: fonts.sansSemiBold, color: colors.charcoalMuted },
  description: { fontSize: 13, color: colors.charcoalLight, fontFamily: fonts.sans, lineHeight: 20 },
});
