"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import StandingBook from "./StandingBook";
import { SHELF_THEMES, type ShelfThemeId } from "./shelfThemes";
import {
  spineHeightFromSeed,
  spineWidthFromPages,
  type ReadingStatus,
} from "./spineUtils";
import type { Book } from "@/data/mockData";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BREATHING = 28;
const PLANK_H = 14;
const SIDE_W = 18;
const TOP_H = 18;
const BOOK_GAP = 0;
/** Fixed shelves per physical bookcase — overflow opens a new case */
export const SHELVES_PER_CASE = 4;
const EMPTY_SHELF_H = 260;
const BOOK_INSET = 4;

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

function chunkIntoCases(rows: Book[][]): Book[][][] {
  const cases: Book[][][] = [];
  if (!rows.length) {
    return [Array.from({ length: SHELVES_PER_CASE }, () => [] as Book[])];
  }
  for (let i = 0; i < rows.length; i += SHELVES_PER_CASE) {
    const chunk = rows.slice(i, i + SHELVES_PER_CASE);
    while (chunk.length < SHELVES_PER_CASE) chunk.push([]);
    cases.push(chunk);
  }
  return cases;
}

function WoodBar({
  themeStyles,
  height,
  className = "",
  face = "plank",
}: {
  themeStyles: (typeof SHELF_THEMES)[ShelfThemeId];
  height: number;
  className?: string;
  /** top = underside of a shelf (casts onto books); plank = front edge */
  face?: "plank" | "top";
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        height,
        background: themeStyles.plank,
        boxShadow:
          face === "top"
            ? `inset 0 -2px 0 ${themeStyles.edge}, 0 6px 10px -2px rgba(40,28,12,0.28)`
            : `inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -2px 3px rgba(0,0,0,0.18), 0 3px 8px ${themeStyles.shadow}`,
      }}
      aria-hidden
    >
      {/* Bevel — top highlight / bottom shadow for thickness */}
      <div
        className="absolute inset-x-0 top-0 h-[35%] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none"
        style={{
          background: "linear-gradient(0deg, rgba(0,0,0,0.22) 0%, transparent 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: themeStyles.edge }} />
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 13px, rgba(0,0,0,0.05) 13px 14px)",
        }}
      />
    </div>
  );
}

const SortableBook = memo(function SortableBook({
  book,
  editable,
  status,
  isFavorite,
  disabled,
  onStatus,
  onFavorite,
  onRemove,
}: {
  book: Book;
  editable: boolean;
  status?: ReadingStatus;
  isFavorite?: boolean;
  disabled?: boolean;
  onStatus?: (bookId: string, status: "Want to Read" | "Currently Reading" | "Finished" | "Did Not Finish") => void;
  onFavorite?: (bookId: string) => void;
  onRemove?: (bookId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: book.id,
    disabled: disabled || !editable,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 180ms ease",
    opacity: isDragging ? 0.2 : 1,
    zIndex: isDragging ? 40 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative hover:z-50">
      <StandingBook
        book={book}
        editable={editable}
        status={status}
        isFavorite={isFavorite}
        onStatus={onStatus}
        onFavorite={onFavorite}
        onRemove={onRemove}
        dragHandleProps={editable && !disabled ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
});

export type ContinuousBookshelfProps = {
  bookIds: string[];
  books: Book[];
  theme: ShelfThemeId;
  editable?: boolean;
  visibleIds?: Set<string> | null;
  reorderDisabled?: boolean;
  statusByBookId?: Record<string, ReadingStatus>;
  favoriteIds?: Set<string>;
  onReorder?: (bookIds: string[]) => void;
  onStatus?: (bookId: string, status: "Want to Read" | "Currently Reading" | "Finished" | "Did Not Finish") => void;
  onFavorite?: (bookId: string) => void;
  onRemove?: (bookId: string) => void;
};

const ContinuousBookshelf = memo(function ContinuousBookshelf({
  bookIds,
  books,
  theme,
  editable = false,
  visibleIds = null,
  reorderDisabled = false,
  statusByBookId,
  favoriteIds,
  onReorder,
  onStatus,
  onFavorite,
  onRemove,
}: ContinuousBookshelfProps) {
  const themeStyles = SHELF_THEMES[theme];
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [caseIndex, setCaseIndex] = useState(0);

  const bookMap = useMemo(() => {
    const m = new Map<string, Book>();
    books.forEach((b) => m.set(b.id, b));
    return m;
  }, [books]);

  const orderedBooks = useMemo(() => {
    return bookIds.map((id) => bookMap.get(id)).filter(Boolean) as Book[];
  }, [bookIds, bookMap]);

  const displayBooks = useMemo(() => {
    if (!visibleIds) return orderedBooks;
    return orderedBooks.filter((b) => visibleIds.has(b.id));
  }, [orderedBooks, visibleIds]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      setWidth(Math.max(0, el.clientWidth - SIDE_W * 2 - BOOK_INSET * 2));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const packedRows = useMemo(() => packIntoRows(displayBooks, width), [displayBooks, width]);
  const bookcases = useMemo(() => chunkIntoCases(packedRows), [packedRows]);

  // Keep switcher on a valid case when packing changes
  useEffect(() => {
    setCaseIndex((i) => Math.min(i, Math.max(0, bookcases.length - 1)));
  }, [bookcases.length]);

  const activeCase = bookcases[Math.min(caseIndex, bookcases.length - 1)] || bookcases[0];
  const caseBooks = useMemo(() => activeCase.flat(), [activeCase]);
  const sortableIds = useMemo(() => caseBooks.map((b) => b.id), [caseBooks]);

  const shelfBayH = useMemo(() => {
    const pool = caseBooks.length ? caseBooks : displayBooks;
    if (!pool.length) return EMPTY_SHELF_H;
    const tallest = Math.max(
      ...pool.map((b) => spineHeightFromSeed(`${b.id}:${b.title}`, b.pages)),
    );
    return tallest + BREATHING;
  }, [caseBooks, displayBooks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      if (reorderDisabled || !editable || !onReorder) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const caseIds = caseBooks.map((b) => b.id);
      const oldIndex = caseIds.indexOf(String(active.id));
      const newIndex = caseIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      const nextCase = arrayMove(caseIds, oldIndex, newIndex);
      const caseSet = new Set(caseIds);

      // Splice reordered case books back into the full display order
      const nextDisplay: string[] = [];
      let ci = 0;
      for (const id of displayBooks.map((b) => b.id)) {
        if (caseSet.has(id)) {
          nextDisplay.push(nextCase[ci++]);
        } else {
          nextDisplay.push(id);
        }
      }

      if (!visibleIds) {
        onReorder(nextDisplay);
        return;
      }

      const nextFull: string[] = [];
      let vi = 0;
      for (const id of bookIds) {
        if (visibleIds.has(id)) {
          nextFull.push(nextDisplay[vi++]);
        } else {
          nextFull.push(id);
        }
      }
      onReorder(nextFull);
    },
    [reorderDisabled, editable, onReorder, caseBooks, displayBooks, visibleIds, bookIds],
  );

  const activeBook = activeId ? bookMap.get(activeId) : null;
  const canDrag = editable && !reorderDisabled;
  const multiCase = bookcases.length > 1;

  return (
    <div className="w-full space-y-4">
      {multiCase && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setCaseIndex((i) => Math.max(0, i - 1))}
            disabled={caseIndex <= 0}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-cream-border bg-cream-card text-charcoal disabled:opacity-30 hover:bg-cream-dark/40 transition-colors"
            aria-label="Previous bookcase"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            {bookcases.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCaseIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === caseIndex ? "w-6 bg-brand" : "w-2 bg-charcoal/20 hover:bg-charcoal/35"
                }`}
                aria-label={`Bookcase ${i + 1}`}
                aria-current={i === caseIndex ? "true" : undefined}
              />
            ))}
          </div>

          <p className="text-[11px] font-bold text-charcoal-muted tabular-nums min-w-[7.5rem] text-center">
            Bookcase {caseIndex + 1} of {bookcases.length}
          </p>

          <button
            type="button"
            onClick={() => setCaseIndex((i) => Math.min(bookcases.length - 1, i + 1))}
            disabled={caseIndex >= bookcases.length - 1}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-cream-border bg-cream-card text-charcoal disabled:opacity-30 hover:bg-cream-dark/40 transition-colors"
            aria-label="Next bookcase"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div ref={containerRef} className="w-full">
        {width <= 0 ? (
          <div className="h-48" aria-hidden />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
              <div
                className="relative w-full overflow-visible rounded-[2px]"
                style={{
                  boxShadow: `0 18px 40px ${themeStyles.shadow}, 0 4px 10px rgba(40,28,12,0.18)`,
                }}
              >
                <WoodBar themeStyles={themeStyles} height={TOP_H} className="w-full" face="top" />

                <div className="flex w-full items-stretch">
                  <div
                    className="flex-shrink-0 self-stretch relative"
                    style={{
                      width: SIDE_W,
                      background: themeStyles.plank,
                      boxShadow: `inset -3px 0 6px rgba(0,0,0,0.18), inset 1px 0 0 rgba(255,255,255,0.2)`,
                    }}
                    aria-hidden
                  >
                    <div
                      className="absolute inset-y-0 right-0 w-[55%]"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.22))",
                      }}
                    />
                  </div>

                  <div
                    className="flex-1 min-w-0 flex flex-col relative"
                    style={{
                      background: themeStyles.wall,
                      boxShadow:
                        "inset 14px 0 18px -12px rgba(60,40,15,0.18), inset -14px 0 18px -12px rgba(60,40,15,0.18)",
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 z-0"
                      style={{
                        background:
                          "radial-gradient(ellipse 78% 70% at 50% 42%, rgba(255,248,235,0.55) 0%, rgba(210,190,160,0.35) 55%, rgba(170,145,110,0.45) 100%)",
                      }}
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-0 z-0"
                      style={{
                        opacity: 0.035,
                        backgroundImage: `
                        url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")
                      `,
                        backgroundSize: "220px 220px",
                        mixBlendMode: "multiply",
                      }}
                      aria-hidden
                    />

                    {activeCase.map((row, rowIndex) => {
                      const isLast = rowIndex === activeCase.length - 1;
                      return (
                        <div key={`row-${caseIndex}-${rowIndex}`} className="relative w-full z-[1]">
                          {/* Recessed bay — top lip shadow + side occlusion */}
                          <div
                            className="relative flex items-end justify-start min-h-0 overflow-hidden"
                            style={{
                              height: shelfBayH,
                              gap: BOOK_GAP,
                              paddingLeft: BOOK_INSET,
                              paddingRight: BOOK_INSET,
                              boxShadow:
                                "inset 0 16px 22px -8px rgba(30,20,8,0.38), inset 0 -4px 8px rgba(30,20,8,0.12)",
                            }}
                          >
                            {/* Soft top cast from shelf above */}
                            <div
                              className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-10"
                              style={{
                                background:
                                  "linear-gradient(180deg, rgba(25,16,6,0.42) 0%, rgba(25,16,6,0.18) 45%, transparent 100%)",
                              }}
                              aria-hidden
                            />
                            {/* Side wall depth inside bay */}
                            <div
                              className="pointer-events-none absolute inset-y-0 left-0 z-[3] w-3"
                              style={{
                                background: "linear-gradient(90deg, rgba(40,28,12,0.22), transparent)",
                              }}
                              aria-hidden
                            />
                            <div
                              className="pointer-events-none absolute inset-y-0 right-0 z-[3] w-3"
                              style={{
                                background: "linear-gradient(270deg, rgba(40,28,12,0.22), transparent)",
                              }}
                              aria-hidden
                            />

                            {row.map((book) => (
                              <SortableBook
                                key={book.id}
                                book={book}
                                editable={editable}
                                disabled={!canDrag}
                                status={statusByBookId?.[book.id]}
                                isFavorite={favoriteIds?.has(book.id)}
                                onStatus={onStatus}
                                onFavorite={onFavorite}
                                onRemove={onRemove}
                              />
                            ))}
                          </div>
                          <div
                            className="pointer-events-none absolute left-0 right-0 z-[2]"
                            style={{
                              bottom: isLast ? PLANK_H + 4 : PLANK_H,
                              height: 18,
                              background:
                                "linear-gradient(180deg, transparent 0%, rgba(40,28,12,0.08) 55%, rgba(40,28,12,0.16) 100%)",
                            }}
                            aria-hidden
                          />
                          <WoodBar
                            themeStyles={themeStyles}
                            height={isLast ? PLANK_H + 6 : PLANK_H}
                            className="relative z-[3] w-full"
                            face="plank"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="flex-shrink-0 self-stretch relative"
                    style={{
                      width: SIDE_W,
                      background: themeStyles.plank,
                      boxShadow: `inset 3px 0 6px rgba(0,0,0,0.18), inset -1px 0 0 rgba(255,255,255,0.15)`,
                    }}
                    aria-hidden
                  >
                    <div
                      className="absolute inset-y-0 left-0 w-[55%]"
                      style={{
                        background: "linear-gradient(270deg, transparent, rgba(0,0,0,0.22))",
                      }}
                    />
                  </div>
                </div>
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {activeBook ? (
                <StandingBook
                  book={activeBook}
                  status={statusByBookId?.[activeBook.id]}
                  isFavorite={favoriteIds?.has(activeBook.id)}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
});

export default ContinuousBookshelf;
