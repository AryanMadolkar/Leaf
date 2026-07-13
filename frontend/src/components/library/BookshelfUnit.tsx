"use client";

import React, { useState } from "react";
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
import type { Book } from "@/data/mockData";
import type { LibraryShelf } from "@/utils/library";
import { Pencil, Plus } from "lucide-react";

function SortableStandingBook({
  book,
  shelfId,
  editable,
  onStatus,
  onFavorite,
  onMove,
  onRemove,
}: {
  book: Book;
  shelfId: string;
  editable: boolean;
  onStatus: (status: "Want to Read" | "Currently Reading" | "Finished") => void;
  onFavorite: () => void;
  onMove: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${shelfId}::${book.id}`,
    data: { shelfId, bookId: book.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StandingBook
        book={book}
        editable={editable}
        onStatus={onStatus}
        onFavorite={onFavorite}
        onMove={onMove}
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const bookMap = new Map(books.map((b) => [b.id, b]));
  const orderedBooks = shelf.bookIds.map((id) => bookMap.get(id)).filter(Boolean) as Book[];

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
      const next = arrayMove(shelf.bookIds, oldIndex, newIndex);
      onReorder?.(shelf.id, next);
      return;
    }

    if (toShelfId === shelf.id && fromShelfId !== shelf.id) {
      const toIndex = shelf.bookIds.indexOf(overBookId);
      onCrossShelfMove?.(bookId, fromShelfId, toShelfId, toIndex < 0 ? shelf.bookIds.length : toIndex);
    }
  };

  const activeBook = activeId
    ? bookMap.get(activeId.split("::")[1] || "")
    : null;

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3 px-1">
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
                <h2 className="font-serif text-xl font-bold text-charcoal">{shelf.name}</h2>
                {shelf.isFavorites && (
                  <span className="text-[9px] uppercase tracking-wider font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                    Featured
                  </span>
                )}
                <span className="text-[10px] text-charcoal-muted font-semibold">
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
            className="p-2 rounded-lg border border-cream-border bg-cream-card hover:bg-cream-dark/40 text-charcoal-muted"
            title="Edit shelf"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div
        className="relative rounded-2xl overflow-hidden px-4 pt-8 pb-3"
        style={{ background: themeStyles.wall }}
      >
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
            <div className="flex items-end gap-1.5 min-h-[160px] overflow-x-auto pb-1 px-1">
              {orderedBooks.length === 0 ? (
                <div className="w-full flex items-center justify-center min-h-[140px] text-xs text-charcoal-muted/80 italic">
                  Empty shelf — add books to fill this board.
                </div>
              ) : (
                orderedBooks.map((book) => (
                  <SortableStandingBook
                    key={`${shelf.id}-${book.id}`}
                    book={book}
                    shelfId={shelf.id}
                    editable={!!editable}
                    onStatus={(s) => onStatus?.(book.id, s)}
                    onFavorite={() => onFavorite?.(book.id)}
                    onMove={() => onMoveRequest?.(book.id, shelf.id)}
                    onRemove={() => onRemove?.(book.id, shelf.id)}
                  />
                ))
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeBook ? (
              <div className="opacity-90">
                <StandingBook book={activeBook} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Shelf plank */}
        <div
          className="relative h-3.5 rounded-sm mt-0.5"
          style={{
            background: themeStyles.plank,
            boxShadow: `0 8px 16px ${themeStyles.shadow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
            borderBottom: `3px solid ${themeStyles.edge}`,
          }}
        />
        <div
          className="h-2 mx-2 rounded-b-sm opacity-80"
          style={{ background: themeStyles.edge }}
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
      className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-cream-border rounded-2xl text-xs font-semibold text-charcoal-muted hover:text-brand hover:border-brand-muted hover:bg-cream-card transition-colors"
    >
      <Plus className="w-4 h-4" /> New shelf
    </button>
  );
}
