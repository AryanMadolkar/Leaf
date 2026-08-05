import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { authFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import type { Book } from "@/lib/types";
import BookCover from "@/components/BookCover";
import { colors, fonts } from "@/constants/theme";

type ScanMatch = {
  detectedTitle: string;
  detectedAuthor: string;
  match: Book | null;
  alternatives: Book[];
};

type ReviewItem = {
  key: string;
  detectedTitle: string;
  detectedAuthor: string;
  book: Book | null;
  selected: boolean;
  status: "Want to Read" | "Currently Reading" | "Finished";
};

type Phase = "pick" | "scanning" | "review" | "importing";

type PreparedImage = { base64: string; mimeType: string; previewUri: string };

/** ~2.8MB base64 ≈ ~2.1MB binary — denser shelf photos need more detail for OCR */
const MAX_BASE64_CHARS = 2_800_000;

function stripDataUrl(value: string): string {
  const comma = value.indexOf(",");
  return comma >= 0 ? value.slice(comma + 1) : value;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const raw = stripDataUrl(base64);
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(stripDataUrl(String(reader.result || "")));
    reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

async function assetToBlob(asset: ImagePicker.ImagePickerAsset): Promise<Blob> {
  if (asset.base64) {
    return base64ToBlob(asset.base64, asset.mimeType || "image/jpeg");
  }
  const res = await fetch(asset.uri);
  if (!res.ok) throw new Error("Could not load that photo");
  return res.blob();
}

function looksLikeHeic(asset: ImagePicker.ImagePickerAsset, blob: Blob): boolean {
  const mime = `${asset.mimeType || ""} ${blob.type || ""}`.toLowerCase();
  if (mime.includes("heic") || mime.includes("heif")) return true;
  return /\.hei[cf](\?|$)/i.test(asset.fileName || asset.uri || "");
}

/** Browsers can't decode HEIC natively — convert to JPEG via libheif (heic-to). */
async function ensureWebDecodableBlob(
  blob: Blob,
  asset: ImagePicker.ImagePickerAsset
): Promise<Blob> {
  const { isHeic, heicTo } = await import("heic-to");
  const heic = looksLikeHeic(asset, blob) || (await isHeic(blob).catch(() => false));
  if (!heic) return blob;

  try {
    const converted = await heicTo({
      blob,
      type: "image/jpeg",
      quality: 0.85,
    });
    return converted as Blob;
  } catch {
    throw new Error("Could not convert that HEIC photo. Try again or use another image.");
  }
}

/** Web compression via Blob → createImageBitmap → JPEG (avoids huge data: URL img.src limits). */
async function compressBlob(
  blob: Blob,
  maxSide: number,
  quality: number
): Promise<PreparedImage | null> {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return null;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(blob);
    const longest = Math.max(bitmap.width, bitmap.height, 1);
    const scale = Math.min(1, maxSide / longest);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const outBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });
    if (!outBlob) return null;

    const base64 = await blobToBase64(outBlob);
    return {
      base64,
      mimeType: "image/jpeg",
      previewUri: URL.createObjectURL(outBlob),
    };
  } catch {
    return null;
  } finally {
    bitmap?.close?.();
  }
}

async function compressDownWeb(asset: ImagePicker.ImagePickerAsset): Promise<PreparedImage> {
  let blob: Blob;
  try {
    blob = await assetToBlob(asset);
    blob = await ensureWebDecodableBlob(blob, asset);
  } catch (err: any) {
    throw new Error(err?.message || "Could not load that photo.");
  }

  // If decode still fails (mislabeled HEIC), force a conversion attempt.
  let probe = await compressBlob(blob, 64, 0.5);
  if (!probe) {
    try {
      const { heicTo } = await import("heic-to");
      blob = (await heicTo({ blob, type: "image/jpeg", quality: 0.85 })) as Blob;
    } catch {
      throw new Error("Could not process that photo in the browser. Try another image.");
    }
  }

  const attempts: Array<{ maxSide: number; quality: number }> = [
    { maxSide: 1600, quality: 0.72 },
    { maxSide: 1400, quality: 0.6 },
    { maxSide: 1200, quality: 0.5 },
    { maxSide: 960, quality: 0.4 },
    { maxSide: 720, quality: 0.32 },
  ];

  for (const attempt of attempts) {
    const result = await compressBlob(blob, attempt.maxSide, attempt.quality);
    if (result && result.base64.length <= MAX_BASE64_CHARS) return result;
  }

  throw new Error("Photo is too large. Try a closer crop or a lower-resolution image.");
}

async function prepareShelfImageNative(asset: ImagePicker.ImagePickerAsset): Promise<PreparedImage> {
  const uri = asset.uri;
  const attempts: Array<{ width: number; compress: number }> = [
    { width: 1600, compress: 0.7 },
    { width: 1280, compress: 0.55 },
    { width: 960, compress: 0.4 },
  ];

  for (const attempt of attempts) {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: attempt.width } }],
      {
        compress: attempt.compress,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    if (manipulated.base64 && manipulated.base64.length <= MAX_BASE64_CHARS) {
      return { base64: manipulated.base64, mimeType: "image/jpeg", previewUri: manipulated.uri };
    }
  }

  if (asset.base64) {
    const base64 = stripDataUrl(asset.base64);
    if (base64.length <= MAX_BASE64_CHARS) {
      return { base64, mimeType: asset.mimeType || "image/jpeg", previewUri: uri };
    }
  }

  throw new Error("Photo is too large. Try a closer crop or a lower-resolution image.");
}

async function prepareShelfImage(asset: ImagePicker.ImagePickerAsset): Promise<PreparedImage> {
  if (Platform.OS === "web") {
    return compressDownWeb(asset);
  }
  return prepareShelfImageNative(asset);
}

async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) {
    throw new Error(
      res.status === 404
        ? `Scan API not found at ${API_BASE_URL}. Start the frontend (npm run dev in frontend/) or deploy the new route.`
        : `Empty response from server (${res.status}). Is the API running at ${API_BASE_URL}?`
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      res.status >= 500
        ? `Server error (${res.status}). Check GEMINI_API_KEY and the frontend logs.`
        : `Unexpected response (${res.status}). API: ${API_BASE_URL}`
    );
  }
}

export default function ScanShelfScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("pick");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCount = useMemo(() => items.filter((i) => i.selected && i.book).length, [items]);

  const pickImage = async (source: "camera" | "library") => {
    setError(null);
    setMessage(null);

    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Camera permission needed", "Allow camera access to photograph your shelf.");
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo permission needed", "Allow photo library access to upload a shelf photo.");
        return;
      }
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.7,
            base64: true,
            exif: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.7,
            base64: true,
            exif: false,
          });

    if (result.canceled || !result.assets?.[0]) return;

    try {
      const prepared = await prepareShelfImage(result.assets[0]);
      setPreviewUri(prepared.previewUri);
      await runScan(prepared.base64, prepared.mimeType);
    } catch (err: any) {
      const msg =
        (typeof err?.message === "string" && err.message.trim()) ||
        (typeof err === "string" && err) ||
        "Could not read that image.";
      setError(msg);
      setPhase("pick");
    }
  };

  const runScan = async (base64: string, mimeType: string) => {
    setPhase("scanning");
    setError(null);
    setMessage(null);
    setItems([]);
    try {
      const res = await authFetch("/api/books/scan-shelf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || `Scan failed (${res.status})`);

      const books: ScanMatch[] = Array.isArray(data.books) ? data.books : [];
      if (books.length === 0) {
        setMessage(data.message || "No books found in that photo.");
        setPhase("pick");
        return;
      }

      setItems(
        books.map((b, idx) => ({
          key: `${b.detectedTitle}-${idx}`,
          detectedTitle: b.detectedTitle,
          detectedAuthor: b.detectedAuthor,
          book: b.match,
          selected: !!b.match,
          status: "Want to Read" as const,
        }))
      );
      setMessage(
        data.matchedCount != null
          ? `Found ${data.detectedCount} spines · matched ${data.matchedCount} in catalog`
          : null
      );
      setPhase("review");
    } catch (err: any) {
      setError(err.message || "Scan failed");
      setPhase("pick");
    }
  };

  const toggleItem = (key: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, selected: !i.selected } : i)));
  };

  const cycleStatus = (key: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i;
        const next =
          i.status === "Want to Read"
            ? "Currently Reading"
            : i.status === "Currently Reading"
              ? "Finished"
              : "Want to Read";
        return { ...i, status: next };
      })
    );
  };

  const importSelected = async () => {
    const payload = items
      .filter((i) => i.selected && i.book)
      .map((i) => ({
        bookId: i.book!.id,
        status: i.status,
        title: i.book!.title,
        author: i.book!.author,
        coverImage: i.book!.coverImage,
        pages: i.book!.pages,
        year: i.book!.year,
        genres: i.book!.genres,
        description: i.book!.description,
      }));

    if (payload.length === 0) {
      Alert.alert("Nothing selected", "Select at least one matched book to add.");
      return;
    }

    setPhase("importing");
    setError(null);
    try {
      const res = await authFetch("/api/user-books/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books: payload, lite: true }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error || "Import failed");

      const added = (data.imported || 0) + (data.updated || 0);
      // Navigate immediately — Alert.alert is unreliable on Expo web and leaves the spinner stuck.
      router.replace("/(tabs)/library");
      if (Platform.OS !== "web") {
        Alert.alert(
          "Shelf imported",
          `Added ${added} book${added === 1 ? "" : "s"} to your library.`
        );
      }
    } catch (err: any) {
      setError(err.message || "Import failed");
      setPhase("review");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Scan Shelf" }} />

      {(phase === "pick" || phase === "scanning") && (
        <ScrollView contentContainerStyle={styles.pickContent}>
          <Text style={styles.heroTitle}>Scan your bookshelf</Text>
          <Text style={styles.heroBody}>
            Take a photo of your shelf. We’ll read the spines and match them to books you can add in one tap.
          </Text>

          {previewUri ? <Image source={{ uri: previewUri }} style={styles.preview} /> : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.hint}>{message}</Text> : null}

          {phase === "scanning" ? (
            <View style={styles.scanningBox}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.scanningText}>Reading spines…</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable style={styles.primaryButton} onPress={() => pickImage("camera")}>
                <Ionicons name="camera" size={18} color={colors.white} />
                <Text style={styles.primaryButtonText}>Take photo</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => pickImage("library")}>
                <Ionicons name="images-outline" size={18} color={colors.brand} />
                <Text style={styles.secondaryButtonText}>Choose from library</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {(phase === "review" || phase === "importing") && (
        <>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewTitle}>Confirm books</Text>
            {message ? <Text style={styles.hint}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <ScrollView contentContainerStyle={styles.reviewList}>
            {items.map((item) => (
              <Pressable
                key={item.key}
                style={[styles.card, item.selected && item.book && styles.cardSelected]}
                onPress={() => item.book && toggleItem(item.key)}
              >
                {item.book ? (
                  <BookCover uri={item.book.coverImage} title={item.book.title} width={44} height={66} />
                ) : (
                  <View style={styles.noMatchCover}>
                    <Ionicons name="help" size={18} color={colors.charcoalMuted} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.book?.title || item.detectedTitle}
                  </Text>
                  <Text style={styles.cardAuthor} numberOfLines={1}>
                    {item.book?.author || item.detectedAuthor}
                  </Text>
                  {!item.book ? (
                    <Text style={styles.noMatchText}>No catalog match — skipped</Text>
                  ) : (
                    <Pressable onPress={() => cycleStatus(item.key)} hitSlop={6}>
                      <Text style={styles.statusChip}>{item.status}</Text>
                    </Pressable>
                  )}
                </View>
                {item.book ? (
                  <Ionicons
                    name={item.selected ? "checkbox" : "square-outline"}
                    size={22}
                    color={item.selected ? colors.brand : colors.charcoalMuted}
                  />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.secondaryButton} onPress={() => setPhase("pick")} disabled={phase === "importing"}>
              <Text style={styles.secondaryButtonText}>Rescan</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, styles.footerPrimary, (selectedCount === 0 || phase === "importing") && styles.disabled]}
              onPress={importSelected}
              disabled={selectedCount === 0 || phase === "importing"}
            >
              {phase === "importing" ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Add {selectedCount} book{selectedCount === 1 ? "" : "s"}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  pickContent: { padding: 20, gap: 16, paddingBottom: 48 },
  heroTitle: { fontSize: 26, fontFamily: fonts.serif, color: colors.charcoal },
  heroBody: { fontSize: 14, fontFamily: fonts.sans, color: colors.charcoalMuted, lineHeight: 20 },
  preview: { width: "100%", height: 220, borderRadius: 14, backgroundColor: colors.creamDark },
  actions: { gap: 10, marginTop: 8 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButtonText: { fontSize: 14, fontFamily: fonts.sansBold, color: colors.white },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
  },
  secondaryButtonText: { fontSize: 14, fontFamily: fonts.sansSemiBold, color: colors.brand },
  scanningBox: { alignItems: "center", gap: 12, paddingVertical: 28 },
  scanningText: { fontSize: 13, fontFamily: fonts.sans, color: colors.charcoalMuted },
  error: { fontSize: 13, fontFamily: fonts.sans, color: colors.error },
  hint: { fontSize: 12, fontFamily: fonts.sans, color: colors.charcoalMuted },
  reviewHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 4 },
  reviewTitle: { fontSize: 20, fontFamily: fonts.serif, color: colors.charcoal },
  reviewList: { padding: 16, gap: 10, paddingBottom: 120 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamCard,
  },
  cardSelected: { borderColor: colors.brand },
  cardTitle: { fontSize: 13, fontFamily: fonts.sansBold, color: colors.charcoal },
  cardAuthor: { fontSize: 11, fontFamily: fonts.sans, color: colors.charcoalMuted },
  noMatchCover: {
    width: 44,
    height: 66,
    borderRadius: 6,
    backgroundColor: colors.creamDark,
    alignItems: "center",
    justifyContent: "center",
  },
  noMatchText: { fontSize: 10, fontFamily: fonts.sans, color: colors.error, marginTop: 2 },
  statusChip: {
    alignSelf: "flex-start",
    marginTop: 4,
    fontSize: 10,
    fontFamily: fonts.sansBold,
    color: colors.brand,
    backgroundColor: "#e8f0e9",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.creamBorder,
  },
  footerPrimary: { flex: 1 },
  disabled: { opacity: 0.5 },
});
