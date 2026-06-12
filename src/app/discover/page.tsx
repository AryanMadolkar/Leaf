"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";
import { useLeaf } from "@/context/LeafContext";
import { Search, Sparkles, BookOpen, Star, Compass } from "lucide-react";

export default function DiscoverPage() {
  const { books } = useLeaf();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState("");

  // Get all unique genres from book list
  const allGenres = Array.from(new Set(books.flatMap((b) => b.genres)));

  // Filter books by genre and search query
  const filteredBooks = books.filter((book) => {
    const matchesGenre = selectedGenre ? book.genres.includes(selectedGenre) : true;
    const matchesSearch = localSearch
      ? book.title.toLowerCase().includes(localSearch.toLowerCase()) ||
        book.author.toLowerCase().includes(localSearch.toLowerCase()) ||
        book.description.toLowerCase().includes(localSearch.toLowerCase())
      : true;
    return matchesGenre && matchesSearch;
  });

  // Editorial Categorization
  const trendingBooks = [...books].sort((a, b) => b.averageRating - a.averageRating).slice(0, 3);
  const hiddenGems = books.filter((b) => b.averageRating > 4.0 && b.year < 2000).slice(0, 2);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-12">
        
        {/* Banner Section */}
        <section className="bg-cream-card border border-cream-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="p-4 bg-brand/10 rounded-2xl text-brand flex-shrink-0">
            <Compass className="w-8 h-8" />
          </div>
          <div className="space-y-2 text-center md:text-left">
            <h1 className="font-serif text-3xl font-bold text-charcoal">
              Discover Your Next Chapter
            </h1>
            <p className="text-xs text-charcoal-muted max-w-lg leading-relaxed">
              Browse the library by genre, search titles, or explore recommendations curated by fellow readers.
            </p>
          </div>
        </section>

        {/* Dynamic Search & Genre Filters Section */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal-muted" />
              <input
                type="text"
                placeholder="Search by title, author, or keywords..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal placeholder-charcoal-muted focus:outline-none focus:border-brand-muted"
              />
            </div>

            {/* Clear Filters indicator */}
            {selectedGenre && (
              <button
                onClick={() => setSelectedGenre(null)}
                className="text-[10px] font-bold text-brand hover:underline"
              >
                Clear Genre Filter ({selectedGenre})
              </button>
            )}
          </div>

          {/* Genre Tags Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedGenre(null)}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition-all flex-shrink-0 ${
                selectedGenre === null
                  ? "bg-brand border-brand text-cream shadow-sm"
                  : "bg-cream-card border-cream-border text-charcoal hover:border-charcoal"
              }`}
            >
              All Genres
            </button>
            {allGenres.map((genre) => {
              const isActive = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition-all flex-shrink-0 ${
                    isActive
                      ? "bg-brand border-brand text-cream shadow-sm"
                      : "bg-cream-card border-cream-border text-charcoal hover:border-charcoal"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </section>

        {/* Grid Catalog */}
        <section className="space-y-6">
          <h3 className="font-serif text-xl font-bold text-charcoal">
            {selectedGenre ? `${selectedGenre} Books` : "Library Catalog"} ({filteredBooks.length})
          </h3>

          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {filteredBooks.map((book) => (
                <div key={book.id} className="space-y-3">
                  <BookCard book={book} size="md" />
                  <div className="text-center max-w-[130px] mx-auto">
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
          ) : (
            <div className="text-center py-20 bg-cream-card border border-cream-border rounded-xl">
              <p className="text-sm text-charcoal-muted">No books match your criteria.</p>
              <p className="text-xs text-charcoal-muted/70 mt-1">Try clearing your search filters.</p>
            </div>
          )}
        </section>

        {/* Editorial Split Panels (Trending & Hidden Gems) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-cream-border">
          
          {/* Trending Panel */}
          <div className="space-y-6 bg-cream-card border border-cream-border rounded-2xl p-6 shadow-sm">
            <h4 className="font-serif text-lg font-bold text-charcoal flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              Highly Rated Community Favorites
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {trendingBooks.map((book) => (
                <div key={book.id} className="space-y-2 text-center">
                  <BookCard book={book} size="sm" />
                  <div className="max-w-[90px] mx-auto">
                    <p className="text-[10px] font-bold text-charcoal truncate">{book.title}</p>
                    <div className="flex items-center gap-0.5 justify-center text-yellow-500 mt-0.5">
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

          {/* Hidden Gems Panel */}
          <div className="space-y-6 bg-cream-card border border-cream-border rounded-2xl p-6 shadow-sm">
            <h4 className="font-serif text-lg font-bold text-charcoal flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand" />
              Hidden Classics & Gems
            </h4>
            <div className="grid grid-cols-2 gap-6 items-center">
              {hiddenGems.map((book) => (
                <div key={book.id} className="flex gap-3 items-start">
                  <BookCard book={book} size="sm" />
                  <div className="min-w-0">
                    <h5 className="font-serif text-xs font-bold text-charcoal line-clamp-2">{book.title}</h5>
                    <p className="text-[9px] text-charcoal-muted mt-0.5">{book.author} ({book.year})</p>
                    <p className="text-[9px] text-charcoal-light line-clamp-3 mt-1 leading-normal font-sans">
                      {book.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
