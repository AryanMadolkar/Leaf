import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { authFetch } from "@/lib/api";
import { colors, fonts } from "@/constants/theme";

const STATUSES = ["Want to Read", "Currently Reading", "Finished"] as const;
type Status = (typeof STATUSES)[number];

export default function LogBookModal({
  visible,
  bookId,
  bookTitle,
  onClose,
  onLogged,
}: {
  visible: boolean;
  bookId: string;
  bookTitle: string;
  onClose: () => void;
  onLogged?: () => void;
}) {
  const [status, setStatus] = useState<Status>("Want to Read");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch("/api/user-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          status,
          rating: status === "Finished" && rating > 0 ? rating : undefined,
          review: status === "Finished" && review ? review : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not save");
      onLogged?.();
      onClose();
      setStatus("Want to Read");
      setRating(0);
      setReview("");
    } catch (err: any) {
      setError(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add to Library</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Log “{bookTitle}” to your reading list.
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={[styles.statusChip, status === s && styles.statusChipActive]}
              >
                <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          {status === "Finished" && (
            <>
              <Text style={styles.label}>Your Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setRating(star)}>
                    <Text style={[styles.star, rating >= star && styles.starActive]}>★</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Write a Review (Optional)</Text>
              <TextInput
                style={styles.textarea}
                placeholder="Share your thoughts..."
                value={review}
                onChangeText={setReview}
                multiline
                numberOfLines={3}
              />
            </>
          )}

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} disabled={saving} style={styles.saveButton}>
              {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveText}>Save</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28,28,26,0.4)", justifyContent: "center", padding: 20 },
  sheet: { backgroundColor: colors.cream, borderRadius: 20, padding: 20, gap: 10 },
  title: { fontSize: 20, fontFamily: fonts.serif, color: colors.charcoal },
  subtitle: { fontSize: 12, color: colors.charcoalMuted, fontFamily: fonts.sans, marginBottom: 6 },
  error: { color: colors.error, fontSize: 12, fontFamily: fonts.sans },
  label: { fontSize: 10, fontFamily: fonts.sansBold, color: colors.charcoalMuted, textTransform: "uppercase", marginTop: 6 },
  statusRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
    alignItems: "center",
  },
  statusChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  statusChipText: { fontSize: 10, fontFamily: fonts.sansBold, color: colors.charcoal, textAlign: "center" },
  statusChipTextActive: { color: colors.white },
  starsRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  star: { fontSize: 28, color: colors.creamBorder },
  starActive: { color: colors.gold },
  textarea: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    fontFamily: fonts.sans,
    backgroundColor: colors.creamCard,
    minHeight: 70,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.charcoalMuted },
  saveButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.brand },
  saveText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
});
