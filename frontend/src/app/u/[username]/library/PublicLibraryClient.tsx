"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ContinuousBookshelf from "@/components/library/ContinuousBookshelf";
import CoverImage from "@/components/CoverImage";
import type { LibraryPayload } from "@/utils/library";
import type { ShelfThemeId } from "@/components/library/shelfThemes";
import { BookOpen } from "lucide-react";

export default function PublicLibraryClient() {
  const params = useParams();
  const username = String(params.username || "");
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/library?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Could not load library");
        }
        if (!cancelled) setLibrary(data.library);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Library unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const favoriteIds = useMemo(() => new Set(library?.favoriteIds || []), [library?.favoriteIds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-xs text-charcoal-muted">Loading bookshelf…</p>
      </div>
    );
  }

  if (error || !library) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-3 px-6">
        <BookOpen className="w-8 h-8 text-charcoal-muted opacity-50" />
        <p className="font-serif text-xl font-bold text-charcoal">Library unavailable</p>
        <p className="text-xs text-charcoal-muted text-center max-w-sm">{error}</p>
        <Link href="/" className="text-xs font-bold text-brand hover:underline mt-2">
          Back to Leaf
        </Link>
      </div>
    );
  }

  const theme = (library.settings.theme || "walnut") as ShelfThemeId;

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-border bg-cream/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <BookOpen className="w-4 h-4 text-brand" />
            <span className="font-serif text-lg font-bold text-charcoal">Leaf</span>
          </Link>
        </div>
      </header>

      <main className="w-full">
        <section className="max-w-6xl mx-auto px-6 pt-10 pb-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Shared collection</p>
          <h1 className="font-serif text-4xl font-bold text-charcoal tracking-tight">
            @{username}&rsquo;s Library
          </h1>
          <p className="text-sm text-charcoal-muted">
            {library.stats.books} books · {library.stats.authors} authors ·{" "}
            {library.stats.pages.toLocaleString()} pages
          </p>
        </section>

        <div
          className="w-full px-4 sm:px-8 md:px-12 lg:px-16 pb-16 pt-6"
          style={{
            background:
              "linear-gradient(180deg, rgba(46,77,56,0.04) 0%, transparent 120px), radial-gradient(ellipse at 50% 0%, rgba(90,60,30,0.06), transparent 55%)",
          }}
        >
          <div className="max-w-6xl mx-auto">
            <ContinuousBookshelf
              bookIds={library.collectionOrder || []}
              books={library.books}
              theme={theme}
              editable={false}
              favoriteIds={favoriteIds}
            />
          </div>
        </div>

        {library.books.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 pt-2 pb-16 border-t border-cream-border">
            <h2 className="font-serif text-lg font-bold text-charcoal mb-4">All covers</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {(library.collectionOrder || library.books.map((b) => b.id)).slice(0, 24).map((id) => {
                const book = library.books.find((b) => b.id === id);
                if (!book) return null;
                return (
                  <Link
                    key={book.id}
                    href={`/book/${book.id}`}
                    className="aspect-[2/3] rounded overflow-hidden shadow border border-cream-border"
                  >
                    <CoverImage
                      src={book.coverImage}
                      title={book.title}
                      author={book.author}
                      bookId={book.id}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover"
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
