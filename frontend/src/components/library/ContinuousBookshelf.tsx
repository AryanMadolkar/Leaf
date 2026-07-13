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

const BREATHING = 20; // 16–24px above tallest book
const PLANK_H = 10;
const SIDE_W = 12;
const TOP_H = 14;
const BOOK_GAP = 3; // 2–4px tight packing
const MIN_SHELVES = 4;
/** Fallback when the case is empty — matches a typical filled bay */
const EMPTY_SHELF_H = 260;
const BOOK_INSET = 6;

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

function WoodBar({
  themeStyles,
  height,
  className = "",
}: {
  themeStyles: (typeof SHELF_THEMES)[ShelfThemeId];
  height: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        height,
        background: themeStyles.plank,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 6px ${themeStyles.shadow}`,
      }}
      aria-hidden
    >
      <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: themeStyles.edge }} />
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 11px, rgba(0,0,0,0.06) 11px 12px)",
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
  onStatus?: (bookId: string, status: "Want to Read" | "Currently Reading" | "Finished") => void;
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
    <div ref={setNodeRef} style={style}>
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
  onStatus?: (bookId: string, status: "Want to Read" | "Currently Reading" | "Finished") => void;
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

  const sortableIds = useMemo(() => displayBooks.map((b) => b.id), [displayBooks]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      // Pack into the bay between side rails, minus book inset
      setWidth(Math.max(0, el.clientWidth - SIDE_W * 2 - BOOK_INSET * 2));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const packedRows = useMemo(() => packIntoRows(displayBooks, width), [displayBooks, width]);

  // Always render a full bookcase (4 shelves); grow beyond that when books overflow
  const rows = useMemo(() => {
    const next = [...packedRows];
    while (next.length < MIN_SHELVES) next.push([]);
    return next;
  }, [packedRows]);

  // One bay height for every shelf — tallest book in the collection + breathing room
  const shelfBayH = useMemo(() => {
    if (!displayBooks.length) return EMPTY_SHELF_H;
    const tallest = Math.max(
      ...displayBooks.map((b) => spineHeightFromSeed(`${b.id}:${b.title}`, b.pages)),
    );
    return tallest + BREATHING;
  }, [displayBooks]);

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

      const displayIds = displayBooks.map((b) => b.id);
      const oldIndex = displayIds.indexOf(String(active.id));
      const newIndex = displayIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      const nextDisplay = arrayMove(displayIds, oldIndex, newIndex);

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
    [reorderDisabled, editable, onReorder, displayBooks, visibleIds, bookIds],
  );

  const activeBook = activeId ? bookMap.get(activeId) : null;
  const canDrag = editable && !reorderDisabled;

  return (
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
              className="relative w-full overflow-hidden"
              style={{
                backgroundColor: "rgba(46, 40, 30, 0.035)",
                boxShadow: `0 12px 28px ${themeStyles.shadow}`,
              }}
            >
              {/* Top crown — full width */}
              <WoodBar themeStyles={themeStyles} height={TOP_H} className="w-full" />

              {/* Sides + shelves as one connected frame */}
              <div className="flex w-full items-stretch">
                <div
                  className="flex-shrink-0 self-stretch"
                  style={{
                    width: SIDE_W,
                    background: themeStyles.plank,
                    boxShadow: `inset -1px 0 0 ${themeStyles.edge}`,
                  }}
                  aria-hidden
                />

                <div className="flex-1 min-w-0 flex flex-col">
                  {rows.map((row, rowIndex) => {
                    // Uniform bay height across the whole bookcase
                    const isLast = rowIndex === rows.length - 1;
                    return (
                      <div key={`row-${rowIndex}`} className="relative w-full">
                        <div
                          className="relative flex items-end justify-start min-h-0"
                          style={{
                            height: shelfBayH,
                            gap: BOOK_GAP,
                            paddingLeft: BOOK_INSET,
                            paddingRight: BOOK_INSET,
                          }}
                        >
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
                        <WoodBar
                          themeStyles={themeStyles}
                          height={isLast ? PLANK_H + 4 : PLANK_H}
                          className="w-full"
                        />
                      </div>
                    );
                  })}
                </div>

                <div
                  className="flex-shrink-0 self-stretch"
                  style={{
                    width: SIDE_W,
                    background: themeStyles.plank,
                    boxShadow: `inset 1px 0 0 ${themeStyles.edge}`,
                  }}
                  aria-hidden
                />
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
  );
});

export default ContinuousBookshelf;
