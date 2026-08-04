import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Book } from "@/lib/types";
import { paletteFromSeed, spineHeightFromSeed, spineWidthFromPages } from "@/lib/spineUtils";
import { colors, fonts } from "@/constants/theme";

const PLANK_H = 14;
const SIDE_W = 14;
const TOP_H = 14;
const GAP = 2;

const WOOD_LIGHT = "#8a6141";
const WOOD_MID = "#6b4a2f";
const WOOD_DARK = "#4a3220";

function packIntoRows(books: Book[], containerWidth: number): Book[][] {
  if (!books.length || containerWidth <= 0) return [];
  const rows: Book[][] = [];
  let current: Book[] = [];
  let used = 0;

  for (const book of books) {
    const w = spineWidthFromPages(book.pages);
    const next = used === 0 ? w : used + GAP + w;
    if (current.length > 0 && next > containerWidth) {
      rows.push(current);
      current = [book];
      used = w;
    } else {
      current.push(book);
      used = next;
    }
  }
  if (current.length) rows.push(current);
  return rows;
}

function Spine({ book, onPress }: { book: Book; onPress: () => void }) {
  const width = spineWidthFromPages(book.pages);
  const height = spineHeightFromSeed(book.id, book.pages);
  const palette = paletteFromSeed(book.id);

  return (
    <Pressable onPress={onPress} style={{ width, height, marginRight: GAP }}>
      <LinearGradient
        colors={[palette.bg, palette.bg, "#00000030"]}
        locations={[0, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.spine, { borderColor: palette.accent }]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.spineTitle,
            { color: palette.text, width: height - 16, transform: [{ rotate: "-90deg" }] },
          ]}
        >
          {book.title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function Bookshelf({ books, onPressBook }: { books: Book[]; onPressBook: (book: Book) => void }) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - width) > 1) setWidth(w);
  };

  const rows = useMemo(() => packIntoRows(books, width - SIDE_W * 2 - 16), [books, width]);

  if (books.length === 0) {
    return (
      <View onLayout={onLayout}>
        <Text style={styles.emptyText}>Nothing on this shelf yet.</Text>
      </View>
    );
  }

  return (
    <View onLayout={onLayout} style={styles.case}>
      <LinearGradient colors={[WOOD_LIGHT, WOOD_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.topPanel} />

      <View style={styles.middleRow}>
        <LinearGradient colors={[WOOD_LIGHT, WOOD_DARK]} style={styles.sidePanel} />

        <View style={styles.content}>
          {rows.map((row, i) => (
            <View key={i}>
              <View style={styles.row}>
                {row.map((book) => (
                  <Spine key={book.id} book={book} onPress={() => onPressBook(book)} />
                ))}
              </View>
              <LinearGradient colors={[WOOD_MID, WOOD_DARK]} style={styles.plank} />
            </View>
          ))}
        </View>

        <LinearGradient colors={[WOOD_DARK, WOOD_LIGHT]} style={styles.sidePanel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  case: {
    borderRadius: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  topPanel: { height: TOP_H },
  middleRow: { flexDirection: "row" },
  sidePanel: { width: SIDE_W },
  content: { flex: 1, backgroundColor: "#f1ece1", paddingHorizontal: 8, paddingTop: 10, gap: 14 },
  row: { flexDirection: "row", alignItems: "flex-end" },
  plank: {
    height: PLANK_H,
    marginHorizontal: -8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  spine: {
    flex: 1,
    borderRadius: 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  spineTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    textAlign: "center",
  },
  emptyText: { fontSize: 12, color: colors.charcoalMuted, fontStyle: "italic", textAlign: "center", marginTop: 24 },
});
