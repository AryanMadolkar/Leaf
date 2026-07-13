"use client";

import React, { useMemo, useState } from "react";
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
import { spineHeightFromSeed } from "./spineUtils";
import type { Book } from "@/data/mockData";
import type { LibraryShelf } from "@/utils/library";
import type { ReadingStatus } from "./spineUtils";
import { Pencil, Plus } from "lucide-react";

function SortableStandingBook({
  book,
  shelfId,
  editable,
  status,
  isFavorite,
  onStatus,
  onFavorite,
  onRemove,
}: {
  book: Book;
  shelfId: string;
  editable: boolean;
  status?: ReadingStatus;
  isFavorite?: boolean;
  onStatus?: (bookId: string, status: "Want to Read" | "Currently Reading" | "Finished") => void;
  onFavorite?: (bookId: string) => void;
  onRemove?: (bookId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${shelfId}::${book.id}`,
    data: { shelfId, bookId: book.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} data-dragging={isDragging ? "true" : undefined}>
      <StandingBook
        book={book}
        editable={editable}
        status={status}
        isFavorite={isFavorite}
        onStatus={onStatus}
        onFavorite={onFavorite}
        onRemove={onRemove}
        dragHandleProps={editable ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

type BookshelfUnitProps = {
  shelf: LibraryShelf;
  books: Book[];
  theme: ShelfThemeId;
  editable?: boolean;
  statusByBookId?: Record<string, ReadingStatus>;
  favoriteBookIds?: Set<string>;
  onRename?: (name: string, note: string) => void;
  onStatus?: (bookId: string, status: "Want to Read" | "Currently Reading" | "Finished") => void;
  onFavorite?: (bookId: string) => void;
  onMoveRequest?: (bookId: string, fromShelfId: string) => void;
  onRemove?: (bookId: string, shelfId: string) => void;
  onReorder?: (shelfId: string, bookIds: string[]) => void;
  onCrossShelfMove?: (bookId: string, fromShelfId: string, toShelfId: string, toIndex: number) => void;
};

export default function BookshelfUnit({
  shelf,
  books,
  theme,
  editable = false,
  statusByBookId,
  favoriteBookIds,
  onRename,
  onStatus,
  onFavorite,
  onMoveRequest,
  onRemove,
  onReorder,
  onCrossShelfMove,
}: BookshelfUnitProps) {
  const themeStyles = SHELF_THEMES[theme];
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shelf.name);
  const [note, setNote] = useState(shelf.note);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const bookMap = new Map(books.map((b) => [b.id, b]));
  const orderedBooks = shelf.bookIds.map((id) => bookMap.get(id)).filter(Boolean) as Book[];

  const tallest = useMemo(() => {
    if (!orderedBooks.length) return 48;
    return Math.max(...orderedBooks.map((b) => spineHeightFromSeed(`${b.id}:${b.title}`, b.pages)));
  }, [orderedBooks]);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeParts = String(active.id).split("::");
    const overParts = String(over.id).split("::");
    const fromShelfId = activeParts[0];
    const bookId = activeParts[1];
    const toShelfId = overParts[0];
    const overBookId = overParts[1];

    if (fromShelfId === toShelfId && fromShelfId === shelf.id) {
      const oldIndex = shelf.bookIds.indexOf(bookId);
      const newIndex = shelf.bookIds.indexOf(overBookId);
      if (oldIndex < 0 || newIndex < 0) return;
      onReorder?.(shelf.id, arrayMove(shelf.bookIds, oldIndex, newIndex));
      return;
    }

    if (toShelfId === shelf.id && fromShelfId !== shelf.id) {
      const toIndex = shelf.bookIds.indexOf(overBookId);
      onCrossShelfMove?.(bookId, fromShelfId, toShelfId, toIndex < 0 ? shelf.bookIds.length : toIndex);
    }
  };

  const activeBook = activeId ? bookMap.get(activeId.split("::")[1] || "") : null;

  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-3 px-0.5">
        <div className="min-w-0 flex-1">
          {editing && editable ? (
            <div className="space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full max-w-sm h-9 px-3 text-sm font-serif font-bold bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Shelf note…"
                className="w-full max-w-md h-8 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal-muted focus:outline-none focus:border-brand-muted"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onRename?.(name.trim() || shelf.name, note);
                    setEditing(false);
                  }}
                  className="px-3 py-1.5 text-[10px] font-bold bg-brand text-cream rounded-lg"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName(shelf.name);
                    setNote(shelf.note);
                    setEditing(false);
                  }}
                  className="px-3 py-1.5 text-[10px] font-bold text-charcoal-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-charcoal">{shelf.name}</h2>
                {shelf.isFavorites && (
                  <span className="text-[9px] uppercase tracking-wider font-bold text-brand/90">
                    Featured
                  </span>
                )}
                <span className="text-[10px] text-charcoal-muted font-medium tabular-nums">
                  {orderedBooks.length}
                </span>
              </div>
              {shelf.note ? (
                <p className="text-xs text-charcoal-muted italic mt-0.5">{shelf.note}</p>
              ) : null}
            </>
          )}
        </div>
        {editable && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-md text-charcoal-muted/70 hover:text-charcoal hover:bg-cream-dark/40"
            title="Edit shelf"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tight shelf — no tall grey container; books define the height */}
      <div className="relative">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedBooks.map((b) => `${shelf.id}::${b.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              className="flex items-end justify-start gap-[3px] overflow-x-auto overflow-y-visible px-0.5 pb-0"
              style={{
                minHeight: orderedBooks.length ? tallest + 8 : 36,
                scrollbarWidth: "thin",
              }}
            >
              {orderedBooks.length === 0 ? (
                <div className="w-full py-1">
                  <p className="text-[11px] text-charcoal-muted/80 italic mb-2 pl-0.5">
                    This shelf is waiting for its first story.
                  </p>
                </div>
              ) : (
                orderedBooks.map((book) => (
                  <SortableStandingBook
                    key={`${shelf.id}-${book.id}`}
                    book={book}
                    shelfId={shelf.id}
                    editable={!!editable}
                    status={statusByBookId?.[book.id]}
                    isFavorite={favoriteBookIds?.has(book.id)}
                    onStatus={onStatus}
                    onFavorite={onFavorite}
                    onRemove={(bookId) => onRemove?.(bookId, shelf.id)}
                  />
                ))
              )}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
            {activeBook ? (
              <div className="opacity-95 scale-[1.04]">
                <StandingBook
                  book={activeBook}
                  status={statusByBookId?.[activeBook.id]}
                  isFavorite={favoriteBookIds?.has(activeBook.id)}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Thin wooden support — sits under books, not a tall frame */}
        <div
          className="relative h-[7px] rounded-[2px] mt-0"
          style={{
            background: themeStyles.plank,
            boxShadow: `0 6px 14px ${themeStyles.shadow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
            borderBottom: `2px solid ${themeStyles.edge}`,
          }}
        />
        <div
          className="h-[3px] mx-1 rounded-b-[1px] opacity-90"
          style={{
            background: `linear-gradient(180deg, ${themeStyles.edge}, transparent)`,
          }}
        />
      </div>
    </section>
  );
}

export function CreateShelfButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-cream-border/80 rounded-xl text-xs font-semibold text-charcoal-muted hover:text-brand hover:border-brand-muted transition-colors"
    >
      <Plus className="w-4 h-4" /> New shelf
    </button>
  );
}
