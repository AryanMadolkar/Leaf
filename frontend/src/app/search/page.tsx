"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";
import { Search, Sparkles, BookOpen, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { useLeaf } from "@/context/LeafContext";
import { Book } from "@/data/mockData";

export default function SearchPage() {
  const { addCachedBookToContext } = useLeaf();
  
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Execute API Search
  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setResults(data.books || []);
            // Sync found books to Leaf context so detail pages load them seamlessly
            data.books.forEach((book: Book) => {
              addCachedBookToContext(book);
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch search results:", err);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [debouncedQuery, addCachedBookToContext]);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Title / Info */}
        <div className="space-y-2 text-center max-w-xl mx-auto">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-charcoal">
            Find Your Next Read
          </h1>
          <p className="text-xs text-charcoal-muted leading-relaxed">
            Search across millions of books in the Open Library catalog. Log your reads, write down notes, and share your taste.
          </p>
        </div>

        {/* Premium Search Bar */}
        <div className="max-w-2xl mx-auto relative group">
          <div className="absolute inset-0 bg-brand/5 rounded-2xl blur-xl group-hover:bg-brand/10 transition-all duration-300 pointer-events-none" />
          <div className="relative flex items-center bg-cream-card border border-cream-border rounded-xl shadow-sm overflow-hidden focus-within:border-brand transition-all duration-300">
            <Search className="w-5 h-5 text-charcoal-muted ml-4" />
            <input
              type="text"
              placeholder="Search by title, author, ISBN, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full py-4 pl-3 pr-12 text-sm bg-transparent text-charcoal placeholder-charcoal-muted focus:outline-none font-sans"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-4 w-4 h-4 text-brand animate-spin" />
            )}
          </div>
        </div>

        {/* Results Container */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-cream-border/60 pb-3">
            <h2 className="font-serif text-lg font-bold text-charcoal">
              {query ? `Search Results (${results.length})` : "Popular Books"}
            </h2>
            {query && !loading && results.length === 0 && (
              <span className="text-[10px] text-charcoal-muted font-medium">No matches found</span>
            )}
          </div>

          {/* Results Grid / List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
              <p className="text-xs text-charcoal-muted">Consulting the Open Library archives...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((book) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  onClick={() => addCachedBookToContext(book)}
                  className="flex gap-4 p-4 bg-cream-card border border-cream-border hover:border-brand hover:shadow-md rounded-xl transition-all duration-300 group text-left no-underline"
                >
                  {/* Left Side: Book Cover (sm size) */}
                  <div className="relative w-20 h-28 rounded-md overflow-hidden book-shadow flex-shrink-0 bg-cream-dark">
                    <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-gradient-to-r from-charcoal/20 to-transparent z-10" />
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full p-2 flex flex-col justify-between items-center text-center bg-cream-dark border border-cream-border text-[9px] font-serif font-bold text-charcoal-muted">
                        <span>{book.title}</span>
                        <span className="text-[7px] font-sans">No Cover</span>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Details */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px] text-brand font-serif font-semibold italic">
                        <span>{book.year}</span>
                        <span className="w-1 h-1 rounded-full bg-cream-border" />
                        <span className="text-charcoal-muted font-sans font-medium">{book.pages} p.</span>
                      </div>
                      <h3 className="font-serif text-sm font-bold text-charcoal group-hover:text-brand transition-colors line-clamp-1">
                        {book.title}
                      </h3>
                      <p className="text-[11px] text-charcoal-muted font-medium">
                        by {book.author}
                      </p>
                      <p className="text-[11px] text-charcoal-light font-sans line-clamp-2 leading-relaxed pt-1">
                        {book.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-charcoal-muted pt-2">
                      <div className="flex flex-wrap gap-1.5">
                        {book.genres.slice(0, 2).map((g) => (
                          <span key={g} className="px-2 py-0.5 bg-cream rounded border border-cream-border text-[9px] font-semibold text-charcoal-muted">
                            {g}
                          </span>
                        ))}
                      </div>
                      <span className="text-brand hover:underline font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-cream-card border border-cream-border rounded-xl space-y-3">
              <BookOpen className="w-10 h-10 text-charcoal-muted mx-auto opacity-40" />
              <div className="space-y-1">
                <p className="font-serif text-sm font-bold text-charcoal">No search query entered</p>
                <p className="text-xs text-charcoal-muted max-w-xs mx-auto">
                  Type a book name, author, ISBN or subject keyword into the search bar to find matching volumes.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
