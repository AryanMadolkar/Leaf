import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authFetch } from "@/lib/api";
import { colors, fonts } from "@/constants/theme";

const STATUSES = ["Want to Read", "Currently Reading", "Finished", "Did Not Finish"] as const;
type Status = (typeof STATUSES)[number];

const DNF_REASONS = [
  { id: "too_slow", label: "Too slow" },
  { id: "boring", label: "Boring" },
  { id: "no_connection", label: "No character connection" },
  { id: "writing", label: "Didn't like the writing" },
  { id: "confusing", label: "Too confusing" },
  { id: "not_expected", label: "Not what I expected" },
  { id: "come_back", label: "I'll come back later" },
  { id: "other", label: "Other" },
] as const;

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
  const [dnfReasons, setDnfReasons] = useState<string[]>([]);
  const [dnfNote, setDnfNote] = useState("");
  const [stoppedPage, setStoppedPage] = useState("");
  const [stoppedChapter, setStoppedChapter] = useState("");

  const toggleReason = (id: string) => {
    setDnfReasons((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (status === "Did Not Finish" && dnfReasons.length === 0) {
      setError("Pick at least one reason.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const pageNum = stoppedPage.trim() ? parseInt(stoppedPage, 10) : null;
      const res = await authFetch("/api/user-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          status,
          rating: status === "Finished" && rating > 0 ? rating : undefined,
          review: status === "Finished" && review ? review : undefined,
          ...(status === "Did Not Finish"
            ? {
                dnfReasons,
                dnfNote: dnfNote.trim() || undefined,
                stoppedAtPage: pageNum && !Number.isNaN(pageNum) ? pageNum : null,
                stoppedAtChapter: stoppedChapter.trim() || null,
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not save");
      onLogged?.();
      onClose();
      setStatus("Want to Read");
      setRating(0);
      setReview("");
      setDnfReasons([]);
      setDnfNote("");
      setStoppedPage("");
      setStoppedChapter("");
    } catch (err: any) {
      setError(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Add to Library</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {status === "Did Not Finish"
                ? "Not every book is meant to be finished."
                : `Log “${bookTitle}” to your reading list.`}
            </Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <Text style={styles.label}>Status</Text>
            <View style={styles.statusWrap}>
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
                    <Pressable key={star} onPress={() => setRating(star)} hitSlop={6}>
                      <Text style={[styles.star, rating >= star && styles.starActive]}>★</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Write a Review (Optional)</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Share your thoughts..."
                  placeholderTextColor={colors.charcoalMuted}
                  value={review}
                  onChangeText={setReview}
                  multiline
                  numberOfLines={3}
                />
              </>
            )}

            {status === "Did Not Finish" && (
              <>
                <Text style={styles.label}>Why did you stop?</Text>
                <View style={styles.statusWrap}>
                  {DNF_REASONS.map((r) => {
                    const active = dnfReasons.includes(r.id);
                    return (
                      <Pressable
                        key={r.id}
                        onPress={() => toggleReason(r.id)}
                        style={[styles.reasonChip, active && styles.statusChipActive]}
                      >
                        <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{r.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.label}>Stopped at page (optional)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="Page #"
                  placeholderTextColor={colors.charcoalMuted}
                  value={stoppedPage}
                  onChangeText={setStoppedPage}
                />
                <Text style={styles.label}>Chapter (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Chapter"
                  placeholderTextColor={colors.charcoalMuted}
                  value={stoppedChapter}
                  onChangeText={setStoppedChapter}
                />
                <Text style={styles.label}>Note (optional)</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Anything else?"
                  placeholderTextColor={colors.charcoalMuted}
                  value={dnfNote}
                  onChangeText={setDnfNote}
                  multiline
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28,28,26,0.4)", justifyContent: "center", padding: 20 },
  sheet: {
    backgroundColor: colors.cream,
    borderRadius: 20,
    padding: 20,
    maxHeight: "88%",
  },
  title: { fontSize: 20, fontFamily: fonts.serif, color: colors.charcoal },
  subtitle: { fontSize: 12, color: colors.charcoalMuted, fontFamily: fonts.sans, marginBottom: 6, marginTop: 4 },
  error: { color: colors.error, fontSize: 12, fontFamily: fonts.sans, marginTop: 6 },
  label: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    marginTop: 10,
  },
  statusWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
    alignItems: "center",
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
  },
  statusChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  statusChipText: { fontSize: 10, fontFamily: fonts.sansBold, color: colors.charcoal, textAlign: "center" },
  statusChipTextActive: { color: colors.white },
  starsRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  star: { fontSize: 28, color: colors.creamBorder },
  starActive: { color: colors.gold },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: fonts.sans,
    backgroundColor: colors.creamCard,
    color: colors.charcoal,
  },
  textarea: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    fontFamily: fonts.sans,
    backgroundColor: colors.creamCard,
    color: colors.charcoal,
    minHeight: 70,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16, marginBottom: 4 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.charcoalMuted },
  saveButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.brand },
  saveText: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.white },
});
