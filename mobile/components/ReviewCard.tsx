import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { resolveMediaUrl } from "@/lib/media";
import { colors, fonts } from "@/constants/theme";

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

export default function ReviewCard({ review }: { review: Review }) {
  const router = useRouter();
  const avatar = resolveMediaUrl(review.reviewerAvatar);

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => router.push(`/profile/${review.reviewerUsername}` as any)}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewerName} numberOfLines={1}>
            {review.reviewerName}
          </Text>
          <Text style={styles.date}>{review.dateString}</Text>
        </View>
        {review.rating > 0 && <Text style={styles.rating}>{"★".repeat(Math.round(review.rating))}</Text>}
      </Pressable>

      <Pressable onPress={() => router.push(`/book/${review.bookId}` as any)}>
        <Text style={styles.bookLine} numberOfLines={1}>
          {review.bookTitle} <Text style={styles.bookAuthor}>by {review.bookAuthor}</Text>
        </Text>
      </Pressable>

      {!!review.content && (
        <Text style={styles.content} numberOfLines={4}>
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
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.creamDark },
  avatarFallback: {},
  reviewerName: { fontSize: 12, fontFamily: fonts.sansBold, color: colors.charcoal },
  date: { fontSize: 10, color: colors.charcoalMuted, fontFamily: fonts.sans },
  rating: { fontSize: 11, color: colors.gold },
  bookLine: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.brand },
  bookAuthor: { fontFamily: fonts.sans, color: colors.charcoalMuted },
  content: { fontSize: 12, color: colors.charcoalLight, fontFamily: fonts.sans, lineHeight: 17 },
});
