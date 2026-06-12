"use client";

import React from "react";
import Header from "@/components/Header";
import ReviewCard, { StarDisplay } from "@/components/ReviewCard";
import BookCard from "@/components/BookCard";
import { useLeaf } from "@/context/LeafContext";
import Link from "next/link";
import { TrendingUp, Layers, BookOpen, Star, Plus } from "lucide-react";

export default function HomeFeed() {
  const { reviews, books, lists } = useLeaf();

  // Recently finished books for horizontal carousel
  const recentlyFinished = books.slice(0, 4);

  // Trending books
  const trendingBooks = [...books].sort((a, b) => b.averageRating - a.averageRating).slice(0, 3);

  // Popular community lists
  const communityLists = lists.slice(0, 2);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        
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
              Browse Library →
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

            {reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-cream-card border border-cream-border rounded-xl">
                <p className="text-sm text-charcoal-muted">No reviews in the feed yet.</p>
                <p className="text-xs text-charcoal-muted/75 mt-1">Be the first to rate and review a book!</p>
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
                    <span className="font-serif text-xl font-bold text-cream-border/90 group-hover:text-brand transition-colors w-6 flex-shrink-0">
                      0{i + 1}
                    </span>
                    <Link href={`/book/${book.id}`} className="flex-shrink-0">
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-10 h-14 object-cover rounded shadow-sm hover:scale-95 transition-transform"
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={`/book/${book.id}`}
                        className="text-xs font-bold text-charcoal hover:text-brand truncate block"
                      >
                        {book.title}
                      </Link>
                      <p className="text-[10px] text-charcoal-muted truncate">
                        {book.author}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-yellow-500">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span className="text-[9px] font-bold text-charcoal-light">
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
