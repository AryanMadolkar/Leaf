import React, { useMemo, useState } from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Book } from "@/lib/types";
import {
  paletteFromSeed,
  spineHeightFromSeed,
  spineWidthFromPages,
  titleFontSize,
} from "@/lib/spineUtils";
import { colors, fonts } from "@/constants/theme";

/** White built-in case — matched to the reference bookshelf photo. */
const FRAME = "#FFFFFF";
const FRAME_EDGE = "#D6D3CD";
const WALL = "#C9C6C0";
const PLANK_H = 20;
const SIDE_W = 16;
const TOP_H = 22;
const BOOK_GAP = 0;
const H_PAD = 8;
const SHELF_MIN_H = 220;

function packIntoRows(books: Book[], containerWidth: number): Book[][] {
  if (!books.length || containerWidth <= 0) return [];
  const rows: Book[][] = [];
  let current: Book[] = [];
  let used = 0;

  for (const book of books) {
    const w = spineWidthFromPages(book.pages);
    const next = used === 0 ? w : used + BOOK_GAP + w;
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

/**
 * Title-only spine label, centered along the spine.
 *
 * RN clips overflow before transforms, so web uses CSS writing-mode and native
 * uses a dimension-swapped rotated box — both kept outside overflow:hidden.
 */
function SpineTitle({
  title,
  color,
  fontSize,
  width,
  height,
}: {
  title: string;
  color: string;
  fontSize: number;
  width: number;
  height: number;
}) {
  const titleRun = height - 28;

  if (Platform.OS === "web") {
    return (
      <View style={styles.webLabelCol} pointerEvents="none">
        <Text
          numberOfLines={1}
          style={[
            {
              color,
              fontSize,
              fontFamily: fonts.sansBold,
              height: titleRun,
              maxHeight: titleRun,
              lineHeight: width - 6,
              textAlign: "center",
            },
            {
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: [{ rotate: "180deg" }],
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: 0.5,
            } as object,
          ]}
        >
          {title}
        </Text>
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: titleRun,
        height: width,
        left: (width - titleRun) / 2,
        top: (height - width) / 2,
        transform: [{ rotate: "-90deg" }],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          color,
          fontSize,
          fontFamily: fonts.sansBold,
          width: titleRun,
          textAlign: "center",
          includeFontPadding: false,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function Spine({ book, onPress }: { book: Book; onPress: () => void }) {
  const seed = `${book.id}:${book.title}`;
  const width = spineWidthFromPages(book.pages);
  const height = spineHeightFromSeed(seed, book.pages);
  const palette = paletteFromSeed(seed);
  const fontSize = titleFontSize(width, book.title.length);
  const titleColor = palette.foil ? palette.accent : palette.text;

  return (
    <Pressable
      onPress={onPress}
      style={{ width, height }}
      accessibilityLabel={`${book.title} by ${book.author}`}
    >
      <View style={[styles.spineFace, { width, height }]}>
        <LinearGradient
          colors={[palette.bgDeep, palette.bg, palette.bg, palette.bgDeep, "rgba(0,0,0,0.35)"]}
          locations={[0, 0.12, 0.78, 0.92, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.28)", "transparent"]}
          style={styles.spineTopShade}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.22)"]}
          style={styles.spineBottomShade}
          pointerEvents="none"
        />
        <View style={styles.spineLeftEdge} pointerEvents="none" />
        <View style={styles.spineRightEdge} pointerEvents="none" />
        <View style={styles.spineLeftHighlight} pointerEvents="none" />
        <View
          style={[
            styles.spineRule,
            styles.spineRuleTop,
            { backgroundColor: palette.foil ? palette.accent : `${palette.text}88` },
          ]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.spineRule,
            styles.spineRuleBottom,
            { backgroundColor: palette.foil ? palette.accent : `${palette.text}88` },
          ]}
          pointerEvents="none"
        />
      </View>

      <View style={[styles.labelSlot, { width, height }]} pointerEvents="none">
        <SpineTitle title={book.title} color={titleColor} fontSize={fontSize} width={width} height={height} />
      </View>
    </Pressable>
  );
}

function FrameBar({ height, topMolding }: { height: number; topMolding?: boolean }) {
  return (
    <View style={[styles.frameBar, { height }, topMolding && styles.topMolding]}>
      <LinearGradient
        colors={["rgba(255,255,255,0.95)", "rgba(245,245,245,0.4)", "rgba(0,0,0,0.07)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.frameBarEdge} />
    </View>
  );
}

function SideRail({ side }: { side: "left" | "right" }) {
  return (
    <View style={[styles.sideRail, side === "right" && styles.sideRailRight]}>
      <LinearGradient
        colors={
          side === "left"
            ? ["rgba(255,255,255,0.85)", "rgba(0,0,0,0.05)"]
            : ["rgba(0,0,0,0.05)", "rgba(255,255,255,0.7)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

function ShelfCubby({
  books,
  onPressBook,
  empty,
}: {
  books: Book[];
  onPressBook: (book: Book) => void;
  empty?: boolean;
}) {
  return (
    <View style={styles.cubby}>
      <LinearGradient
        colors={["rgba(0,0,0,0.22)", "rgba(0,0,0,0.08)", "transparent"]}
        locations={[0, 0.4, 1]}
        style={styles.cubbyShade}
        pointerEvents="none"
      />
      <View style={styles.cubbyFloor} pointerEvents="none" />
      <View style={styles.row}>
        {empty ? null : books.map((book) => <Spine key={book.id} book={book} onPress={() => onPressBook(book)} />)}
      </View>
    </View>
  );
}

export default function Bookshelf({ books, onPressBook }: { books: Book[]; onPressBook: (book: Book) => void }) {
  const [width, setWidth] = useState(() => Math.max(0, Dimensions.get("window").width - 32));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
  };

  const innerWidth = Math.max(0, width - SIDE_W * 2 - H_PAD * 2);
  const rows = useMemo(() => packIntoRows(books, innerWidth), [books, innerWidth]);

  const displayRows = useMemo(() => {
    const next = [...rows];
    while (next.length < 3) next.push([]);
    return next;
  }, [rows]);

  const caseBody = (
    <>
      <FrameBar height={TOP_H} topMolding />
      <View style={styles.middleRow}>
        <SideRail side="left" />
        <View style={styles.column}>
          {displayRows.map((row, i) => (
            <View key={i}>
              <ShelfCubby books={row} onPressBook={onPressBook} empty={row.length === 0} />
              <FrameBar height={PLANK_H} />
            </View>
          ))}
        </View>
        <SideRail side="right" />
      </View>
    </>
  );

  if (books.length === 0) {
    return (
      <View onLayout={onLayout} style={styles.case}>
        {caseBody}
        <Text style={styles.emptyText}>Nothing on this shelf yet.</Text>
      </View>
    );
  }

  return (
    <View onLayout={onLayout} style={styles.case}>
      {caseBody}
    </View>
  );
}

const styles = StyleSheet.create({
  case: {
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: FRAME,
    borderWidth: 1,
    borderColor: FRAME_EDGE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  frameBar: {
    backgroundColor: FRAME,
  },
  topMolding: {
    borderBottomWidth: 1,
    borderBottomColor: FRAME_EDGE,
  },
  frameBarEdge: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  middleRow: { flexDirection: "row" },
  sideRail: {
    width: SIDE_W,
    backgroundColor: FRAME,
    borderRightWidth: 1,
    borderRightColor: FRAME_EDGE,
  },
  sideRailRight: {
    borderRightWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: FRAME_EDGE,
  },
  column: { flex: 1, backgroundColor: WALL },
  cubby: {
    minHeight: SHELF_MIN_H,
    backgroundColor: WALL,
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  cubbyShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 36,
  },
  cubbyFloor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  spineFace: {
    ...Platform.select({
      default: { overflow: "hidden" },
    }),
  },
  spineTopShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "18%",
  },
  spineBottomShade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "12%",
  },
  spineLeftEdge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 1.5,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  spineRightEdge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  spineLeftHighlight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 2,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  spineRule: {
    position: "absolute",
    left: "15%",
    right: "15%",
    height: 1,
    opacity: 0.75,
  },
  spineRuleTop: { top: "10%" },
  spineRuleBottom: { bottom: "14%" },
  labelSlot: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    // Critical: do NOT set overflow: 'hidden' here
  },
  webLabelCol: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  emptyText: {
    position: "absolute",
    alignSelf: "center",
    top: "42%",
    fontSize: 12,
    color: colors.charcoalMuted,
    fontStyle: "italic",
    fontFamily: fonts.sans,
  },
});
