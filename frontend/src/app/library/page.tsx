"use client";

import React, { useCallback, useEffect, useMemo, useState, useDeferredValue, startTransition } from "react";
import Header from "@/components/Header";
import CoverImage from "@/components/CoverImage";
import ContinuousBookshelf from "@/components/library/ContinuousBookshelf";
import AddBooksModal from "@/components/library/AddBooksModal";
import LibraryToolbar, {
  type SortMode,
  type StatusFilter,
} from "@/components/library/LibraryToolbar";
import type { ShelfThemeId } from "@/components/library/shelfThemes";
import { useLeaf } from "@/context/LeafContext";
import { authFetch } from "@/utils/auth/client";
import type { LibraryPayload, LibraryViewMode } from "@/utils/library";
import type { Book } from "@/data/mockData";
import Link from "next/link";
import { Copy, Check, BookOpen } from "lucide-react";

export default function UserLibraryPage() {
  const { currentUser, logBook, isProfileLoading, diaryLogs, isAuthenticated } = useLeaf();
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("custom");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const deferredSearch = useDeferredValue(search);
  const deferredSort = useDeferredValue(sortMode);
  const deferredFilter = useDeferredValue(statusFilter);

  const needsLogin =
    !isProfileLoading && !isAuthenticated;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await authFetch("/api/library");
      const data = await res.json();
      if (res.status === 401) {
        throw new Error("Your session expired. Please sign in again.");
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not open your library");
      }
      setLibrary(data.library);
    } catch (err: any) {
      console.error(err);
      setLibrary(null);
      setLoadError(err?.message || "Could not open your library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isProfileLoading) return;
    if (needsLogin) {
      setLibrary(null);
      setLoading(false);
      setLoadError(null);
      return;
    }
    if (!currentUser?.id) return;
    load();
  }, [currentUser?.id, isProfileLoading, needsLogin, load]);

  const bookMap = useMemo(() => {
    const m = new Map<string, Book>();
    (library?.books || []).forEach((b) => m.set(b.id, b));
    return m;
  }, [library?.books]);

  const statusByBookId = useMemo(() => {
    const map: Record<string, "Want to Read" | "Currently Reading" | "Finished"> = {};
    diaryLogs
      .filter((l) => l.userId === currentUser.id)
      .forEach((l) => {
        map[l.bookId] = l.status;
      });
    return map;
  }, [diaryLogs, currentUser.id]);

  const favoriteIds = useMemo(() => new Set(library?.favoriteIds || []), [library?.favoriteIds]);

  const collectionOrder = library?.collectionOrder || [];

  const visibleIds = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const set = new Set<string>();
    for (const id of collectionOrder) {
      const book = bookMap.get(id);
      if (!book) continue;
      if (q) {
        const hay = `${book.title} ${book.author} ${(book.genres || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      if (deferredFilter === "Favorite") {
        if (!favoriteIds.has(id)) continue;
      } else if (deferredFilter !== "all") {
        if (statusByBookId[id] !== deferredFilter) continue;
      }
      set.add(id);
    }
    return set;
  }, [collectionOrder, bookMap, deferredSearch, deferredFilter, favoriteIds, statusByBookId]);

  const displayOrder = useMemo(() => {
    if (deferredSort === "custom") return collectionOrder;
    const ids = [...collectionOrder];
    ids.sort((a, b) => {
      const ba = bookMap.get(a);
      const bb = bookMap.get(b);
      if (!ba || !bb) return 0;
      if (deferredSort === "title") return ba.title.localeCompare(bb.title);
      if (deferredSort === "author") return (ba.author || "").localeCompare(bb.author || "");
      if (deferredSort === "pages") return (bb.pages || 0) - (ba.pages || 0);
      if (deferredSort === "year") return (bb.year || 0) - (ba.year || 0);
      return 0;
    });
    return ids;
  }, [collectionOrder, deferredSort, bookMap]);

  const filtersActive = search.trim().length > 0 || statusFilter !== "all";
  const reorderDisabled = sortMode !== "custom" || filtersActive;

  const applyLibrary = useCallback((next: LibraryPayload) => setLibrary(next), []);

  /** Fire-and-forget mutation; UI already updated optimistically */
  const mutate = useCallback(async (method: "PATCH" | "POST", body: Record<string, unknown>) => {
    const res = await authFetch("/api/library", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
    // Only sync server payload for mutations that change book membership
    if (data.library && body.action !== "update_settings") {
      setLibrary(data.library);
    }
    return data;
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<{ viewMode: LibraryViewMode; theme: ShelfThemeId }>) => {
      setLibrary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          settings: {
            ...prev.settings,
            ...(patch.viewMode ? { viewMode: patch.viewMode } : {}),
            ...(patch.theme ? { theme: patch.theme } : {}),
          },
        };
      });
      mutate("POST", { action: "update_settings", ...patch }).catch(() => load());
    },
    [mutate, load],
  );

  const handleReorder = useCallback(
    (bookIds: string[]) => {
      setLibrary((prev) => (prev ? { ...prev, collectionOrder: bookIds } : prev));
      mutate("PATCH", { action: "reorder_collection", bookIds }).catch(() => load());
    },
    [mutate, load],
  );

  const handleFavorite = useCallback(
    (bookId: string) => {
      setLibrary((prev) => {
        if (!prev) return prev;
        const isFav = prev.favoriteIds.includes(bookId);
        let favoriteIds: string[];
        let collectionOrder = [...prev.collectionOrder];
        if (isFav) {
          favoriteIds = prev.favoriteIds.filter((id) => id !== bookId);
        } else {
          if (prev.favoriteIds.length >= 10) {
            alert("Favorites holds at most 10 books.");
            return prev;
          }
          favoriteIds = [...prev.favoriteIds, bookId];
          collectionOrder = [bookId, ...collectionOrder.filter((id) => id !== bookId)];
        }
        return { ...prev, favoriteIds, collectionOrder };
      });
      mutate("PATCH", { action: "toggle_favorite", bookId }).catch((e) => {
        alert(e.message);
        load();
      });
    },
    [mutate, load],
  );

  const handleRemove = useCallback(
    (bookId: string) => {
      setLibrary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          collectionOrder: prev.collectionOrder.filter((id) => id !== bookId),
          favoriteIds: prev.favoriteIds.filter((id) => id !== bookId),
          books: prev.books.filter((b) => b.id !== bookId),
          stats: { ...prev.stats, books: Math.max(0, prev.stats.books - 1) },
        };
      });
      mutate("PATCH", {
        action: "remove_book",
        bookId,
        shelfId: library?.collectionShelfId,
        removeFromLibrary: true,
      }).catch((e) => {
        alert(e.message);
        load();
      });
    },
    [mutate, load, library?.collectionShelfId],
  );

  const handleStatus = useCallback(
    (bookId: string, status: "Want to Read" | "Currently Reading" | "Finished") => {
      logBook(bookId, status);
    },
    [logBook],
  );

  const shareUrl =
    typeof window !== "undefined" && currentUser?.username
      ? `${window.location.origin}/u/${currentUser.username}/library`
      : currentUser?.username
        ? `/u/${currentUser.username}/library`
        : "";

  const theme = (library?.settings.theme || "walnut") as ShelfThemeId;
  const viewMode = library?.settings.viewMode || "bookshelf";

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setSortMode("custom");
  }, []);

  if (isProfileLoading || loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-charcoal-muted font-medium">Opening your study…</p>
        </div>
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <BookOpen className="w-12 h-12 text-charcoal-muted mb-4 opacity-50" />
          <h2 className="font-serif text-2xl font-bold text-charcoal">
            Build your library by signing in
          </h2>
          <p className="text-sm text-charcoal-muted mt-2 leading-relaxed">
            Create an account to shelve books, arrange your bookcase, and share your collection.
          </p>
          <Link
            href="/auth"
            className="mt-6 px-5 py-2.5 bg-brand hover:bg-brand-light text-cream font-bold text-xs rounded-lg shadow-sm transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loadError || !library) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <BookOpen className="w-12 h-12 text-charcoal-muted mb-4 opacity-50" />
          <h2 className="font-serif text-2xl font-bold text-charcoal">Couldn’t open your library</h2>
          <p className="text-sm text-charcoal-muted mt-2 leading-relaxed">
            {loadError || "Something went wrong while loading your shelves."}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => load()}
              className="px-5 py-2.5 bg-brand hover:bg-brand-light text-cream font-bold text-xs rounded-lg shadow-sm transition-colors"
            >
              Try again
            </button>
            {loadError?.toLowerCase().includes("sign in") || loadError?.toLowerCase().includes("session") ? (
              <Link
                href="/auth"
                className="px-5 py-2.5 border border-border text-charcoal font-bold text-xs rounded-lg hover:bg-surface-raised transition-colors"
              >
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <LibraryToolbar
        sortMode={sortMode}
        statusFilter={statusFilter}
        search={search}
        viewMode={viewMode}
        theme={theme}
        filtersActive={filtersActive}
        reorderDisabled={reorderDisabled}
        visibleCount={visibleIds.size}
        totalCount={collectionOrder.length}
        onAdd={() => setAddOpen(true)}
        onShare={() => setShareOpen(true)}
        onSortMode={setSortMode}
        onStatusFilter={setStatusFilter}
        onSearch={(v) => startTransition(() => setSearch(v))}
        onClearFilters={clearFilters}
        onViewMode={(mode) => updateSettings({ viewMode: mode })}
        onTheme={(id) => updateSettings({ theme: id })}
      />

      <main className="flex-1 w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-4">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-charcoal tracking-tight">
            My Library
          </h1>
        </div>

        {viewMode === "bookshelf" && (
          <div
            className="w-full px-4 sm:px-8 md:px-12 lg:px-16 pb-20 pt-6"
            style={{
              background:
                "linear-gradient(180deg, rgba(46,77,56,0.04) 0%, transparent 120px), radial-gradient(ellipse at 50% 0%, rgba(90,60,30,0.06), transparent 55%)",
            }}
          >
            <div className="max-w-6xl mx-auto">
              <ContinuousBookshelf
                bookIds={displayOrder}
                books={library.books}
                theme={theme}
                editable
                visibleIds={filtersActive ? visibleIds : null}
                reorderDisabled={reorderDisabled}
                statusByBookId={statusByBookId}
                favoriteIds={favoriteIds}
                onReorder={handleReorder}
                onStatus={handleStatus}
                onFavorite={handleFavorite}
                onRemove={handleRemove}
              />
            </div>
          </div>
        )}

        {viewMode === "covers" && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {displayOrder
                .filter((id) => !filtersActive || visibleIds.has(id))
                .map((id) => {
                  const book = bookMap.get(id);
                  if (!book) return null;
                  return (
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
                  );
                })}
            </div>
          </div>
        )}

        {viewMode === "compact" && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
            <div className="bg-cream-card border border-cream-border rounded-2xl overflow-hidden divide-y divide-cream-border/60">
              {displayOrder
                .filter((id) => !filtersActive || visibleIds.has(id))
                .map((id) => {
                  const book = bookMap.get(id);
                  if (!book) return null;
                  return (
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
                  );
                })}
            </div>
          </div>
        )}
      </main>

      <AddBooksModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={applyLibrary}
        defaultShelfId={library.collectionShelfId || undefined}
      />

      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-charcoal/40"
            aria-label="Close"
            onClick={() => setShareOpen(false)}
          />
          <div className="relative w-full max-w-md bg-cream border border-cream-border rounded-2xl shadow-2xl z-10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-charcoal">Share Library</h3>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="text-xs font-bold text-charcoal-muted"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Share this link so others can browse your collection.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] bg-cream-dark/40 border border-cream-border rounded-lg px-3 py-2 truncate">
                {shareUrl}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
                className="h-9 px-3 rounded-lg bg-brand text-cream text-[10px] font-bold inline-flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
