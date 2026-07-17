"use client";

import React, { useMemo } from "react";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";
import CoverImage from "@/components/CoverImage";
import { StarDisplay } from "@/components/ReviewCard";
import { useLeaf } from "@/context/LeafContext";
import Link from "next/link";
import { TrendingUp, Layers, BookOpen, Star, Sparkles, ArrowRight } from "lucide-react";

export default function HomeFeed() {
  const { reviews, books, lists, diaryLogs, currentUser } = useLeaf();

  // Recently finished books for horizontal carousel
  const recentlyFinished = books.slice(0, 4);

  // Trending books
  const trendingBooks = [...books].sort((a, b) => b.averageRating - a.averageRating).slice(0, 3);

  // Popular community lists
  const communityLists = lists.slice(0, 2);

  // New Reads You'll Like recommendation logic
  const loggedBookIds = new Set(diaryLogs.map((log) => log.bookId));
  
  // Find genres of books the user has interacted with
  const userInteractedBooks = diaryLogs
    .map((log) => books.find((b) => b.id === log.bookId))
    .filter((b) => !!b);
  
  const userFavoriteGenres = Array.from(
    new Set(userInteractedBooks.flatMap((b) => b.genres))
  );

  // Filter books not in user's library
  let recommendations = books.filter((b) => !loggedBookIds.has(b.id));

  // Filter by user's favorite genres if available
  if (userFavoriteGenres.length > 0) {
    recommendations = recommendations.filter((b) =>
      b.genres.some((g) => userFavoriteGenres.includes(g))
    );
  }

  // Sort by average rating and slice
  let recommendedReads = recommendations
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 4);

  // Fallback to top rated books not in user's library if not enough recommendations
  if (recommendedReads.length < 4) {
    const fallbackRecs = books
      .filter((b) => !loggedBookIds.has(b.id))
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 4);
    
    // Merge and deduplicate
    const merged = Array.from(new Set([...recommendedReads, ...fallbackRecs])).slice(0, 4);
    recommendedReads = merged;
  }

  const recentActivity = useMemo(() => {
    const uid = currentUser.id;
    if (!uid) return [];

    const reviewsByBook = new Map(
      reviews
        .filter((r) => r.userId === uid)
        .map((r) => [r.bookId, r] as const),
    );

    return [...diaryLogs]
      .filter((log) => log.userId === uid && log.bookId)
      .sort((a, b) => {
        const da = a.dateLogged || "";
        const db = b.dateLogged || "";
        return db.localeCompare(da);
      })
      .map((log) => {
        const book =
          books.find((b) => b.id === log.bookId) ||
          (log.bookTitle
            ? {
                id: log.bookId,
                title: log.bookTitle,
                author: log.bookAuthor || "Unknown Author",
                coverImage: log.bookCover || "",
                year: 0,
                description: "",
                averageRating: 0,
                genres: [] as string[],
                pages: 0,
              }
            : null);
        const review = reviewsByBook.get(log.bookId);
        const content = review?.content || log.review;
        return {
          log,
          book,
          review: content
            ? { ...(review || { rating: log.rating || 0, content }), content }
            : review,
        };
      })
      .filter((item) => !!item.book)
      .slice(0, 12);
  }, [diaryLogs, books, reviews, currentUser.id]);

  const statusLabel = (status: string) => {
    if (status === "Finished") return "Finished";
    if (status === "Currently Reading") return "Started reading";
    return "Want to read";
  };

  const formatActivityDate = (dateLogged: string) => {
    if (!dateLogged) return "";
    const d = new Date(dateLogged.includes("T") ? dateLogged : `${dateLogged}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateLogged;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">

        {/* Library CTA */}
        <section className="mb-8 bg-cream-card border border-cream-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand" />
                <h2 className="font-serif text-xl md:text-2xl font-bold text-charcoal">
                  Curate your own library
                </h2>
              </div>
              <p className="text-sm text-charcoal-muted leading-relaxed max-w-lg">
                Shelve your reads, arrange your bookcase, and share the collection that feels like you.
              </p>
            </div>
            <Link
              href="/library"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-light text-cream font-bold text-xs rounded-lg shadow-sm transition-colors flex-shrink-0"
            >
              Open Library
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
        
        {/* Bookshelf Shelf (Top Carousel Mockup) */}
        <section className="mb-10 bg-cream-card border border-cream-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand" />
              <h2 className="font-serif text-lg font-bold text-charcoal">
                Recently Logged by Friends
              </h2>
            </div>
            <Link
              href="/discover"
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              Browse
            </Link>
          </div>

          {/* Grid of books */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
            {recentlyFinished.map((book) => (
              <div key={book.id} className="space-y-2 text-center">
                <BookCard book={book} size="md" />
                <div className="max-w-[120px] mx-auto min-w-0">
                  <p className="text-xs font-semibold text-charcoal truncate">
                    {book.title}
                  </p>
                  <p className="text-[10px] text-charcoal-muted truncate">
                    {book.author}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Two Column Feed Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left: Main Feed (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-serif text-xl font-bold text-charcoal mb-4 flex items-center gap-2">
              Recent Activity
            </h3>

            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map(({ log, book, review }) => (
                  <div
                    key={log.id}
                    className="bg-cream-card border border-cream-border rounded-xl p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex gap-4">
                      <Link href={`/book/${book!.id}`} className="flex-shrink-0">
                        <div className="relative w-16 h-24 md:w-20 md:h-28 rounded-md overflow-hidden shadow-sm bg-cream-dark">
                          <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-charcoal/20 z-10" />
                          <CoverImage
                            src={book!.coverImage || log.bookCover}
                            title={book!.title}
                            author={book!.author}
                            isbn={book!.id}
                            bookId={book!.id}
                            size="M"
                            priority
                            className="w-full h-full"
                            imgClassName="w-full h-full object-cover"
                          />
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-brand mb-1">
                            {statusLabel(log.status)}
                          </p>
                          <Link
                            href={`/book/${book!.id}`}
                            className="font-serif text-base font-bold text-charcoal hover:text-brand transition-colors"
                          >
                            {book!.title}
                          </Link>
                          <p className="text-xs text-charcoal-muted mt-0.5">
                            by {book!.author}
                          </p>

                          {(log.rating || review?.rating) ? (
                            <div className="mt-2">
                              <StarDisplay rating={log.rating || review?.rating || 0} size={12} />
                            </div>
                          ) : null}

                          {review?.content ? (
                            <p className="mt-2 text-xs text-charcoal-light leading-relaxed line-clamp-3">
                              &ldquo;{review.content}&rdquo;
                            </p>
                          ) : null}
                        </div>

                        <p className="text-[10px] text-charcoal-muted/70">
                          {formatActivityDate(log.dateLogged)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-cream-card border border-cream-border rounded-xl">
                <p className="text-sm text-charcoal-muted">No books logged yet.</p>
                <p className="text-xs text-charcoal-muted/75 mt-1">
                  Use + Log to add a book — it will show up here.
                </p>
              </div>
            )}
          </div>

          {/* Right: Sidebar (1 col) */}
          <div className="space-y-8">
            
            {/* Trending Section */}
            <div className="bg-cream-card border border-cream-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-charcoal">
                <TrendingUp className="w-4 h-4 text-brand" />
                <h4 className="font-serif text-base font-bold">Trending This Week</h4>
              </div>

              <div className="divide-y divide-cream-border/60">
                {trendingBooks.map((book, i) => (
                  <div
                    key={book.id}
                    className="py-3 flex gap-3 first:pt-0 last:pb-0 items-start group"
                  >
                    <span className="font-serif text-xl font-bold text-charcoal/45 group-hover:text-brand transition-colors w-6 flex-shrink-0">
                      0{i + 1}
                    </span>
                    <Link href={`/book/${book.id}`} className="flex-shrink-0 w-10 h-14 rounded overflow-hidden shadow-sm">
                      <CoverImage
                        src={book.coverImage}
                        title={book.title}
                        author={book.author}
                        isbn={book.id}
                        bookId={book.id}
                        size="S"
                        priority
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover hover:scale-95 transition-transform"
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={`/book/${book.id}`}
                        className="text-xs font-bold text-charcoal hover:text-brand truncate block"
                      >
                        {book.title}
                      </Link>
                      <p className="text-[10px] text-charcoal/70 truncate">
                        {book.author}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-amber-600">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span className="text-[9px] font-bold text-charcoal">
                          {book.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* New Reads You'll Like */}
            <div className="bg-cream-card border border-cream-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-charcoal">
                <Sparkles className="w-4 h-4 text-brand" />
                <h4 className="font-serif text-base font-bold">New Reads for You</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {recommendedReads.map((book) => (
                  <div key={book.id} className="space-y-1.5 flex flex-col items-center text-center group">
                    <Link href={`/book/${book.id}`} className="relative block w-20 h-28 rounded overflow-hidden shadow border border-cream-border hover:-translate-y-1 transition-transform duration-300 flex-shrink-0 bg-cream-dark">
                      <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-r from-charcoal/20 to-transparent z-10" />
                      <CoverImage
                        src={book.coverImage}
                        title={book.title}
                        author={book.author}
                        isbn={book.id}
                        bookId={book.id}
                        size="M"
                        priority
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover select-none"
                      />
                    </Link>
                    <div className="min-w-0 max-w-[90px]">
                      <Link
                        href={`/book/${book.id}`}
                        className="text-[10px] font-bold text-charcoal hover:text-brand truncate block"
                        title={book.title}
                      >
                        {book.title}
                      </Link>
                      <p className="text-[8px] text-charcoal-muted truncate">
                        {book.author}
                      </p>
                      <div className="flex items-center justify-center gap-0.5 mt-0.5 text-yellow-500">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span className="text-[8px] font-bold text-charcoal-light">
                          {book.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Curated Lists Sidebar */}
            <div className="bg-cream-card border border-cream-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-charcoal">
                <Layers className="w-4 h-4 text-brand" />
                <h4 className="font-serif text-base font-bold">Curated Collections</h4>
              </div>

              <div className="space-y-4">
                {communityLists.map((list) => (
                  <Link
                    key={list.id}
                    href="/lists"
                    className="block p-3 border border-cream-border/60 hover:border-brand-muted rounded-xl hover:bg-cream-dark/20 transition-all duration-300"
                  >
                    <div className="relative h-28 w-full rounded-lg overflow-hidden bg-charcoal/10 mb-2">
                      <img
                        src={list.coverImage}
                        alt={list.title}
                        className="w-full h-full object-cover opacity-85 hover:scale-102 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent flex flex-col justify-end p-3">
                        <span className="text-[8px] uppercase tracking-wider text-cream/70 font-semibold mb-0.5">
                          {list.bookIds.length} Books
                        </span>
                        <h5 className="font-serif text-sm font-bold text-cream truncate">
                          {list.title}
                        </h5>
                      </div>
                    </div>
                    <p className="text-[10px] text-charcoal-muted line-clamp-2 leading-relaxed">
                      {list.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
