import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import type { Book } from "@/lib/types";
import { paletteFromSeed, spineHeightFromSeed, spineWidthFromPages } from "@/lib/spineUtils";
import { colors, fonts } from "@/constants/theme";

const PLANK_H = 12;
const GAP = 2;

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
      <View style={[styles.spine, { backgroundColor: palette.bg, borderColor: palette.accent }]}>
        <Text
          numberOfLines={1}
          style={[
            styles.spineTitle,
            { color: palette.text, width: height - 16, transform: [{ rotate: "-90deg" }] },
          ]}
        >
          {book.title}
        </Text>
      </View>
    </Pressable>
  );
}

export default function Bookshelf({ books, onPressBook }: { books: Book[]; onPressBook: (book: Book) => void }) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - width) > 1) setWidth(w);
  };

  const rows = useMemo(() => packIntoRows(books, width - 16), [books, width]);

  return (
    <View onLayout={onLayout} style={{ gap: 18 }}>
      {rows.map((row, i) => (
        <View key={i}>
          <View style={styles.row}>
            {row.map((book) => (
              <Spine key={book.id} book={book} onPress={() => onPressBook(book)} />
            ))}
          </View>
          <View style={styles.plank} />
        </View>
      ))}
      {books.length === 0 && <Text style={styles.emptyText}>Nothing on this shelf yet.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end" },
  plank: {
    height: PLANK_H,
    marginTop: 0,
    backgroundColor: "#6b4a2f",
    borderBottomWidth: 3,
    borderBottomColor: "#4a3220",
    borderRadius: 2,
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
