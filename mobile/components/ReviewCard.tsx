import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { bookHref, profileHref } from "@/lib/navigation";
import { resolveMediaUrl } from "@/lib/media";
import BookCover from "@/components/BookCover";
import { colors, fonts, radii, shadows } from "@/constants/theme";

export type Review = {
  id: string;
  bookId: string;
  rating: number;
  content: string;
  dateString: string;
  reviewerName: string;
  reviewerAvatar: string;
  reviewerUsername: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const roundedUp = rating - full >= 0.75 ? 1 : 0;
  return "★".repeat(full + roundedUp) + (half ? "½" : "");
}

export default function ReviewCard({
  review,
  showBookCover = true,
}: {
  review: Review;
  showBookCover?: boolean;
}) {
  const router = useRouter();
  const avatar = resolveMediaUrl(review.reviewerAvatar);

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => router.push(profileHref(review.reviewerUsername))}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials(review.reviewerName || review.reviewerUsername)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewerName} numberOfLines={1}>
            {review.reviewerName}
          </Text>
          <Text style={styles.date}>{review.dateString}</Text>
        </View>
        {review.rating > 0 && <Text style={styles.rating}>{formatStars(review.rating)}</Text>}
      </Pressable>

      {showBookCover ? (
        <Pressable style={styles.bookRow} onPress={() => router.push(bookHref(review.bookId))}>
          <BookCover uri={review.bookCover} title={review.bookTitle} width={36} height={52} />
          <Text style={styles.bookLine} numberOfLines={2}>
            {review.bookTitle} <Text style={styles.bookAuthor}>by {review.bookAuthor}</Text>
          </Text>
        </Pressable>
      ) : null}

      {!!review.content && (
        <Text style={styles.content} numberOfLines={showBookCover ? 4 : 8}>
          {review.content}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: "#1C1C1A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.creamDark },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandWash },
  avatarInitials: { fontSize: 10, fontFamily: fonts.sansBold, color: colors.brand },
  reviewerName: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  date: { fontSize: 10, color: colors.charcoalMuted, fontFamily: fonts.sans, marginTop: 1 },
  rating: { fontSize: 13, color: colors.gold, letterSpacing: 0.6 },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  bookLine: { flex: 1, fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.brand },
  bookAuthor: { fontFamily: fonts.sans, color: colors.charcoalMuted },
  content: {
    fontSize: 14,
    color: colors.charcoalLight,
    fontFamily: fonts.serif,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
});
