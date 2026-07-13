"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import CoverImage from "@/components/CoverImage";
import BookshelfUnit, { CreateShelfButton } from "@/components/library/BookshelfUnit";
import AddBooksModal from "@/components/library/AddBooksModal";
import { SHELF_THEMES, type ShelfThemeId } from "@/components/library/shelfThemes";
import { useLeaf } from "@/context/LeafContext";
import { authFetch } from "@/utils/auth/client";
import type { LibraryPayload, LibraryShelf, LibraryViewMode } from "@/utils/library";
import type { Book } from "@/data/mockData";
import Link from "next/link";
import {
  Plus,
  Share2,
  LayoutGrid,
  Columns3,
  List,
  BookOpen,
  Users,
  ScrollText,
  Sparkles,
  Globe,
  Lock,
  Copy,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UserLibraryPage() {
  const { currentUser, logBook, isProfileLoading } = useLeaf();
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createShelfOpen, setCreateShelfOpen] = useState(false);
  const [newShelfName, setNewShelfName] = useState("");
  const [moveTarget, setMoveTarget] = useState<{ bookId: string; fromShelfId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/library");
      const data = await res.json();
      if (data.success) setLibrary(data.library);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.id || isProfileLoading) return;
    load();
  }, [currentUser?.id, isProfileLoading, load]);

  const bookMap = useMemo(() => {
    const m = new Map<string, Book>();
    (library?.books || []).forEach((b) => m.set(b.id, b));
    return m;
  }, [library?.books]);

  const applyLibrary = (next: LibraryPayload) => setLibrary(next);

  const patch = async (body: Record<string, unknown>) => {
    const res = await authFetch("/api/library", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
    applyLibrary(data.library);
  };

  const post = async (body: Record<string, unknown>) => {
    const res = await authFetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Request failed");
    applyLibrary(data.library);
    return data;
  };

  const shareUrl =
    typeof window !== "undefined" && currentUser?.username
      ? `${window.location.origin}/u/${currentUser.username}/library`
      : currentUser?.username
        ? `/u/${currentUser.username}/library`
        : "";

  const theme = (library?.settings.theme || "walnut") as ShelfThemeId;
  const viewMode = library?.settings.viewMode || "bookshelf";
  const stats = library?.stats;

  if (loading || isProfileLoading || !library) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-charcoal-muted font-medium">Opening your shelves…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <section className="space-y-5 pb-8 border-b border-cream-border">
          <div className="space-y-2 max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Collection</p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-charcoal tracking-tight">
              My Library
            </h1>
            <p className="text-sm text-charcoal-muted leading-relaxed">
              A collection of every book that tells your story. Organize your books, build beautiful
              shelves, and share your library with friends.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-5 h-11 bg-brand hover:bg-brand-light text-cream text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Books
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 px-5 h-11 bg-cream-card border border-cream-border hover:bg-cream-dark/40 text-charcoal text-xs font-bold rounded-xl transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share Library
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            {[
              { label: "Books", value: stats?.books ?? 0, icon: BookOpen },
              { label: "Authors", value: stats?.authors ?? 0, icon: Users },
              { label: "Pages", value: (stats?.pages ?? 0).toLocaleString(), icon: ScrollText },
              { label: "Genres", value: stats?.genres ?? 0, icon: Sparkles },
              { label: "Years", value: stats?.years ?? 0, icon: Globe },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-cream-card border border-cream-border rounded-2xl px-4 py-3 shadow-xs"
              >
                <div className="flex items-center justify-between text-charcoal-muted mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest">{s.label}</span>
                  <s.icon className="w-3.5 h-3.5 text-brand" />
                </div>
                <p className="font-serif text-2xl font-bold text-charcoal">{s.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Toolbar: views + themes */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="inline-flex p-1 bg-cream-card border border-cream-border rounded-xl">
            {(
              [
                { id: "bookshelf", label: "Bookshelf", icon: Columns3 },
                { id: "covers", label: "Covers", icon: LayoutGrid },
                { id: "compact", label: "Compact", icon: List },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => post({ action: "update_settings", viewMode: v.id })}
                className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[10px] font-bold transition-colors ${
                  viewMode === v.id
                    ? "bg-brand text-cream shadow-sm"
                    : "text-charcoal-muted hover:text-charcoal"
                }`}
              >
                <v.icon className="w-3.5 h-3.5" /> {v.label}
              </button>
            ))}
          </div>

          {viewMode === "bookshelf" && (
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SHELF_THEMES) as ShelfThemeId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => post({ action: "update_settings", theme: id })}
                  title={SHELF_THEMES[id].label}
                  className={`px-2.5 h-8 rounded-lg text-[9px] font-bold border transition-all ${
                    theme === id
                      ? "border-brand text-brand bg-brand/5"
                      : "border-cream-border text-charcoal-muted hover:border-charcoal/30"
                  }`}
                >
                  {SHELF_THEMES[id].label}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Views */}
        {viewMode === "bookshelf" && (
          <div className="space-y-10">
            {library.shelves.map((shelf) => (
              <BookshelfUnit
                key={shelf.id}
                shelf={shelf}
                books={library.books}
                theme={theme}
                editable
                onRename={(name, note) =>
                  patch({ action: "rename_shelf", shelfId: shelf.id, name, note }).catch((e) =>
                    alert(e.message),
                  )
                }
                onStatus={(bookId, status) => logBook(bookId, status)}
                onFavorite={(bookId) => {
                  const fav = library.shelves.find((s) => s.isFavorites);
                  if (!fav) return;
                  patch({
                    action: "move_book",
                    bookId,
                    fromShelfId: shelf.id,
                    toShelfId: fav.id,
                    toIndex: 0,
                  }).catch((e) => alert(e.message));
                }}
                onMoveRequest={(bookId, fromShelfId) => setMoveTarget({ bookId, fromShelfId })}
                onRemove={(bookId, shelfId) =>
                  patch({ action: "remove_book", bookId, shelfId }).catch((e) => alert(e.message))
                }
                onReorder={(shelfId, bookIds) => {
                  setLibrary((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      shelves: prev.shelves.map((s) =>
                        s.id === shelfId ? { ...s, bookIds } : s,
                      ),
                    };
                  });
                  patch({ action: "reorder_books", shelfId, bookIds }).catch(() => load());
                }}
                onCrossShelfMove={(bookId, fromShelfId, toShelfId, toIndex) =>
                  patch({ action: "move_book", bookId, fromShelfId, toShelfId, toIndex }).catch((e) =>
                    alert(e.message),
                  )
                }
              />
            ))}
            <CreateShelfButton onClick={() => setCreateShelfOpen(true)} />
          </div>
        )}

        {viewMode === "covers" && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {library.books.map((book) => (
              <Link key={book.id} href={`/book/${book.id}`} className="group space-y-2">
                <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-md border border-cream-border group-hover:-translate-y-1 transition-transform bg-cream-dark">
                  <CoverImage
                    src={book.coverImage}
                    title={book.title}
                    author={book.author}
                    bookId={book.id}
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[10px] font-bold text-charcoal truncate">{book.title}</p>
              </Link>
            ))}
          </div>
        )}

        {viewMode === "compact" && (
          <div className="bg-cream-card border border-cream-border rounded-2xl overflow-hidden divide-y divide-cream-border/60">
            {library.books.map((book) => (
              <Link
                key={book.id}
                href={`/book/${book.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream-dark/30 transition-colors"
              >
                <CoverImage
                  src={book.coverImage}
                  title={book.title}
                  author={book.author}
                  bookId={book.id}
                  className="w-8 h-11 rounded shadow-sm flex-shrink-0"
                  imgClassName="w-full h-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-charcoal truncate">{book.title}</p>
                  <p className="text-[10px] text-charcoal-muted truncate">{book.author}</p>
                </div>
                <span className="text-[10px] text-charcoal-muted">{book.pages}p</span>
              </Link>
            ))}
          </div>
        )}
      </main>

      <AddBooksModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={applyLibrary}
      />

      {/* Create shelf */}
      <AnimatePresence>
        {createShelfOpen && (
          <ModalShell onClose={() => setCreateShelfOpen(false)} title="New shelf">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await post({ action: "create_shelf", name: newShelfName });
                  setNewShelfName("");
                  setCreateShelfOpen(false);
                } catch (err: any) {
                  alert(err.message);
                }
              }}
            >
              <input
                autoFocus
                value={newShelfName}
                onChange={(e) => setNewShelfName(e.target.value)}
                placeholder="e.g. Fantasy, 2026 Reads, Signed Editions"
                className="w-full h-11 px-3 text-sm bg-cream-card border border-cream-border rounded-xl focus:outline-none focus:border-brand-muted"
              />
              <button
                type="submit"
                className="w-full h-10 bg-brand text-cream text-xs font-bold rounded-xl"
              >
                Create shelf
              </button>
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Move to shelf */}
      <AnimatePresence>
        {moveTarget && (
          <ModalShell onClose={() => setMoveTarget(null)} title="Move to shelf">
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {library.shelves.map((s: LibraryShelf) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={async () => {
                    try {
                      await patch({
                        action: "move_book",
                        bookId: moveTarget.bookId,
                        fromShelfId: moveTarget.fromShelfId,
                        toShelfId: s.id,
                        toIndex: 0,
                      });
                      setMoveTarget(null);
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-cream-border hover:border-brand-muted text-xs font-semibold text-charcoal"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Share */}
      <AnimatePresence>
        {shareOpen && (
          <ModalShell onClose={() => setShareOpen(false)} title="Share Library">
            <div className="space-y-4">
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Anyone with the link can browse your collection when privacy is Public.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] bg-cream-dark/40 border border-cream-border rounded-lg px-3 py-2 truncate">
                  {shareUrl}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="h-9 px-3 rounded-lg bg-brand text-cream text-[10px] font-bold inline-flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="flex gap-2">
                {(
                  [
                    { id: "public", label: "Public", icon: Globe },
                    { id: "friends", label: "Friends", icon: Users },
                    { id: "private", label: "Private", icon: Lock },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => post({ action: "update_settings", privacy: p.id })}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[10px] font-bold border ${
                      library.settings.privacy === p.id
                        ? "bg-brand text-cream border-brand"
                        : "border-cream-border text-charcoal-muted"
                    }`}
                  >
                    <p.icon className="w-3.5 h-3.5" /> {p.label}
                  </button>
                ))}
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-md bg-cream border border-cream-border rounded-2xl shadow-2xl z-10 p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-charcoal">{title}</h3>
          <button type="button" onClick={onClose} className="text-xs font-bold text-charcoal-muted">
            Close
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
