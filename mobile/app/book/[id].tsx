import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { authFetch } from "@/lib/api";
import type { Book } from "@/lib/types";
import BookCover from "@/components/BookCover";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <Text style={styles.errorText}>{error || "Book not found"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7f2" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#faf7f2" },
  errorText: { fontSize: 13, color: "#8a7f72" },
  content: { padding: 20, gap: 20, paddingBottom: 48 },
  hero: { flexDirection: "row", gap: 16 },
  heroInfo: { flex: 1, gap: 4, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#2a2420" },
  author: { fontSize: 13, color: "#8a7f72" },
  meta: { fontSize: 12, color: "#a89d8e", marginTop: 4 },
  rating: { fontSize: 13, fontWeight: "700", color: "#c9a13b", marginTop: 6 },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genreBadge: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4dccf",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreText: { fontSize: 11, fontWeight: "600", color: "#8a7f72" },
  description: { fontSize: 13, color: "#4a4238", lineHeight: 20 },
});
