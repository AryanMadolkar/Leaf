import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authFetch } from "@/lib/api";
import { bookHref, paramString } from "@/lib/navigation";
import type { Book } from "@/lib/types";
import BookCover from "@/components/BookCover";
import LogBookModal from "@/components/LogBookModal";
import ReviewCard, { type Review } from "@/components/ReviewCard";
import { Eyebrow, PrimaryButton, SectionHeader } from "@/components/ui";
import { colors, fonts, radii, shadows } from "@/constants/theme";

function genreToShelf(genres: string[]): string {
  const joined = genres.join(" ").toLowerCase();
  if (/sci[\s-]?fi|science fiction/.test(joined)) return "scifi";
  if (/fantas/.test(joined)) return "fantasy";
  if (/myster|thriller|crime/.test(joined)) return "mystery";
  if (/romance/.test(joined)) return "romance";
  if (/historic/.test(joined)) return "historical";
  if (/biograph|memoir/.test(joined)) return "biography";
  if (/non[\s-]?fiction|essay|self.?help/.test(joined)) return "nonfiction";
  if (/literary|classic/.test(joined)) return "literary";
  return "trending";
}

function starLine(rating: number): string {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function estimateReadTime(pages: number): string | null {
  if (!pages || pages <= 0) return null;
  const hours = pages / 45;
  if (hours < 1) return `~${Math.max(15, Math.round(hours * 60))} min read`;
  return `~${hours.toFixed(1).replace(/\.0$/, "")} hr read`;
}

export default function BookDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = paramString(params.id);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similar, setSimilar] = useState<Book[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (bookId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/books/${encodeURIComponent(bookId)}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load book");
      setBook(data.book);
    } catch (err: any) {
      setError(err.message || "Could not load book");
      setBook(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Book not found");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/books/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Could not load book");
        if (!cancelled) setBook(data.book);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Could not load book");
          setBook(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, [id]);

  useEffect(() => {
    if (!book?.id) return;
    let cancelled = false;
    (async () => {
      setExtrasLoading(true);
      try {
        const shelf = genreToShelf(book.genres || []);
        const [reviewsRes, similarRes] = await Promise.all([
          authFetch(`/api/reviews?bookId=${encodeURIComponent(book.id)}&limit=8`),
          authFetch(`/api/books/catalog?shelf=${shelf}&limit=10`),
        ]);
        const reviewsData = await reviewsRes.json().catch(() => null);
        const similarData = await similarRes.json().catch(() => null);
        if (cancelled) return;

        setReviews(
          reviewsRes.ok && reviewsData?.success && Array.isArray(reviewsData.reviews)
            ? reviewsData.reviews
            : []
        );

        const candidates: Book[] =
          similarRes.ok && similarData?.success && Array.isArray(similarData.books)
            ? similarData.books
            : [];
        setSimilar(candidates.filter((b) => b.id !== book.id).slice(0, 8));
      } catch {
        if (!cancelled) {
          setReviews([]);
          setSimilar([]);
        }
      } finally {
        if (!cancelled) setExtrasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book?.id, book?.genres]);

  const readTime = useMemo(() => (book ? estimateReadTime(book.pages) : null), [book]);
  const communityRating = useMemo(() => {
    if (!book) return 0;
    if (reviews.length === 0) return book.averageRating;
    const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
    return parseFloat(avg.toFixed(1));
  }, [book, reviews]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (error || !book) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Book" }} />
        <Text style={styles.errorText}>{error || "Book not found"}</Text>
        {id ? (
          <Pressable style={styles.retryButton} onPress={() => load(id)}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: book.title }} />

      <View style={styles.hero}>
        <BookCover uri={book.coverImage} title={book.title} width={168} height={248} />
        <Eyebrow style={{ marginTop: 14 }}>{book.year > 0 ? String(book.year) : "Edition"}</Eyebrow>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>by {book.author}</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Rating</Text>
          <Text style={styles.statValue}>
            {communityRating > 0 ? communityRating.toFixed(1) : "—"}
          </Text>
          {communityRating > 0 ? (
            <Text style={styles.statStars}>{starLine(communityRating)}</Text>
          ) : null}
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Published</Text>
          <Text style={styles.statValue}>{book.year > 0 ? book.year : "—"}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Length</Text>
          <Text style={styles.statValue}>{book.pages > 0 ? book.pages : "—"}</Text>
          <Text style={styles.statHint}>{book.pages > 0 ? "pages" : ""}</Text>
        </View>
      </View>

      {readTime ? (
        <View style={styles.readTimeRow}>
          <Ionicons name="time-outline" size={14} color={colors.charcoalMuted} />
          <Text style={styles.readTimeText}>{readTime}</Text>
        </View>
      ) : null}

      <PrimaryButton
        label="Add to Library"
        icon={<Ionicons name="add" size={16} color={colors.white} />}
        onPress={() => setModalOpen(true)}
      />
      {justLogged ? <Text style={styles.savedText}>Saved to your library.</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Synopsis</Text>
        <Text style={styles.description}>
          {book.description?.trim() || "No synopsis available for this edition yet."}
        </Text>
      </View>

      {book.genres.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Genres</Text>
          <View style={styles.genreRow}>
            {book.genres.slice(0, 8).map((g) => (
              <View key={g} style={styles.genreBadge}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Details</Text>
        <View style={styles.detailsCard}>
          <DetailRow label="Author" value={book.author} />
          <DetailRow label="Year" value={book.year > 0 ? String(book.year) : "Unknown"} />
          <DetailRow
            label="Pages"
            value={book.pages > 0 ? String(book.pages) : "Unknown"}
          />
          <DetailRow
            label="Avg. rating"
            value={communityRating > 0 ? communityRating.toFixed(1) : "—"}
            last
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Reviews" />
        <Text style={styles.sectionCountInline}>{reviews.length} notes</Text>
        {extrasLoading && reviews.length === 0 ? (
          <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
        ) : reviews.length > 0 ? (
          <View style={styles.reviewList}>
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} showBookCover={false} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No community reviews yet</Text>
            <Text style={styles.emptyBody}>Be the first to finish this and leave a note.</Text>
            <Pressable onPress={() => setModalOpen(true)}>
              <Text style={styles.emptyAction}>Log this book</Text>
            </Pressable>
          </View>
        )}
      </View>

      {similar.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Similar books" subtitle="More in this vein" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.similarRow}
          >
            {similar.map((b) => (
              <Pressable key={b.id} style={styles.similarItem} onPress={() => router.push(bookHref(b.id))}>
                <BookCover uri={b.coverImage} title={b.title} width={92} height={136} />
                <Text style={styles.similarTitle} numberOfLines={2}>
                  {b.title}
                </Text>
                <Text style={styles.similarAuthor} numberOfLines={1}>
                  {b.author}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <LogBookModal
        visible={modalOpen}
        bookId={book.id}
        bookTitle={book.title}
        onClose={() => setModalOpen(false)}
        onLogged={() => {
          setJustLogged(true);
          if (savedTimer.current) clearTimeout(savedTimer.current);
          savedTimer.current = setTimeout(() => setJustLogged(false), 3000);
        }}
      />
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
    gap: 12,
  },
  errorText: { fontSize: 13, color: colors.charcoalMuted, fontFamily: fonts.sans },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.brand,
  },
  retryText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
  content: { padding: 20, paddingBottom: 56, gap: 18 },
  hero: { alignItems: "center", gap: 6, paddingTop: 4 },
  title: {
    fontSize: 28,
    fontFamily: fonts.serif,
    color: colors.charcoal,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 34,
    letterSpacing: -0.4,
    paddingHorizontal: 8,
  },
  author: {
    fontSize: 14,
    color: colors.charcoalMuted,
    fontFamily: fonts.sansMedium,
    textAlign: "center",
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    ...shadows.soft,
  },
  statBlock: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.creamBorder },
  statLabel: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: { fontSize: 20, fontFamily: fonts.serif, color: colors.charcoal, marginTop: 2 },
  statStars: { fontSize: 11, color: colors.gold, letterSpacing: 1 },
  statHint: { fontSize: 10, fontFamily: fonts.sans, color: colors.charcoalMuted },
  readTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: -6,
  },
  readTimeText: { fontSize: 12, fontFamily: fonts.sans, color: colors.charcoalMuted },
  savedText: {
    fontSize: 12,
    fontFamily: fonts.sans,
    color: colors.brand,
    textAlign: "center",
    marginTop: -8,
  },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  sectionCountInline: {
    fontSize: 12,
    fontFamily: fonts.sans,
    color: colors.charcoalMuted,
    marginTop: -6,
  },
  description: {
    fontSize: 14,
    color: colors.charcoalLight,
    fontFamily: fonts.sans,
    lineHeight: 22,
  },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genreBadge: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  genreText: { fontSize: 11, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  detailsCard: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    ...shadows.soft,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamBorder,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 12, fontFamily: fonts.sans, color: colors.charcoalMuted },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.charcoal,
  },
  reviewList: { gap: 10 },
  emptyCard: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.lg,
    padding: 22,
    alignItems: "center",
    gap: 6,
    ...shadows.soft,
  },
  emptyTitle: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  emptyBody: {
    fontSize: 12,
    fontFamily: fonts.sans,
    color: colors.charcoalMuted,
    textAlign: "center",
  },
  emptyAction: { fontSize: 12, fontFamily: fonts.sansBold, color: colors.brand, marginTop: 4 },
  similarRow: { gap: 14, paddingRight: 8, paddingVertical: 4 },
  similarItem: { width: 96, gap: 6 },
  similarTitle: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.charcoal,
    lineHeight: 14,
  },
  similarAuthor: { fontSize: 10, fontFamily: fonts.sans, color: colors.charcoalMuted },
});
