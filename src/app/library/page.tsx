"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";
import { StarDisplay } from "@/components/ReviewCard";
import { useLeaf } from "@/context/LeafContext";
import { BookOpen, Sparkles, Eye, ArrowRight, Star, Heart, CheckCircle2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function UserLibraryPage() {
  const { books, diaryLogs, currentUser, logBook } = useLeaf();
  
  // States for migration rating/review overlay
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Group books by reading status for current user
  const userLogs = diaryLogs.filter((log) => log.userId === currentUser.id);

  // Helper to get book object for a log
  const getBookForLog = (log: any) => {
    return books.find((b) => b.id === log.bookId);
  };

  // Want to Read shelf
  const wantToRead = userLogs
    .filter((log) => log.status === "Want to Read")
    .map(getBookForLog)
    .filter((b): b is any => b !== undefined);

  // Currently Reading shelf
  const currentlyReading = userLogs
    .filter((log) => log.status === "Currently Reading")
    .map(getBookForLog)
    .filter((b): b is any => b !== undefined);

  // Finished shelf (with optional ratings)
  const finished = userLogs
    .filter((log) => log.status === "Finished")
    .map((log) => {
      const book = books.find((b) => b.id === log.bookId);
      return book ? { ...book, userRating: log.rating, dateLogged: log.dateLogged } : null;
    })
    .filter((b): b is any => b !== null)
    .sort((a, b) => new Date(b.dateLogged).getTime() - new Date(a.dateLogged).getTime());

  // Move a book to a new shelf
  const handleMoveShelf = (bookId: string, newStatus: "Want to Read" | "Currently Reading" | "Finished") => {
    if (newStatus === "Finished") {
      setSelectedBookId(bookId);
      setRating(0);
      setReviewText("");
      setShowReviewModal(true);
    } else {
      logBook(bookId, newStatus);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) return;

    logBook(selectedBookId, "Finished", rating, reviewText);
    setSelectedBookId(null);
    setShowReviewModal(false);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-12">
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-cream-border/60 pb-6 gap-4">
          <div className="flex items-center gap-4 text-center md:text-left">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-14 h-14 rounded-full object-cover border border-cream-border"
            />
            <div>
              <h1 className="font-serif text-3xl font-bold text-charcoal">
                {currentUser.name}&rsquo;s Library
              </h1>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Curating a digital bookshelf of {userLogs.length} logged works
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Link
              href="/search"
              className="px-4 py-2 border border-cream-border bg-cream-card hover:bg-cream-dark/30 text-charcoal text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              Add Books to Library <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 1. Currently Reading Shelf */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand" />
            <h2 className="font-serif text-xl font-bold text-charcoal">
              Currently Reading ({currentlyReading.length})
            </h2>
          </div>

          {currentlyReading.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {currentlyReading.map((book) => (
                <div key={book.id} className="space-y-3 flex flex-col items-center group relative">
                  <BookCard book={book} size="md" />
                  
                  {/* Quick Shelves Migration Control */}
                  <div className="text-center w-full max-w-[130px]">
                    <p className="text-xs font-semibold text-charcoal truncate">{book.title}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-2 bg-cream-card border border-cream-border rounded-lg p-1">
                      <button
                        onClick={() => handleMoveShelf(book.id, "Finished")}
                        className="text-[9px] font-bold text-brand hover:underline px-1.5 py-0.5 rounded hover:bg-brand/10 transition-colors"
                        title="Mark as Finished"
                      >
                        Finish
                      </button>
                      <span className="text-cream-border">|</span>
                      <button
                        onClick={() => handleMoveShelf(book.id, "Want to Read")}
                        className="text-[9px] font-bold text-charcoal-muted hover:text-charcoal px-1.5 py-0.5 rounded hover:bg-cream-dark/50 transition-colors"
                        title="Move to Want to Read"
                      >
                        Shelve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-cream-card border border-cream-border rounded-xl">
              <p className="text-xs text-charcoal-muted">You are not reading any books right now.</p>
              <Link href="/search" className="text-[10px] text-brand hover:underline font-bold mt-1 inline-block">
                Find a book to start reading →
              </Link>
            </div>
          )}
        </section>

        {/* 2. Want to Read Shelf */}
        <section className="space-y-6 pt-6 border-t border-cream-border/60">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-brand" />
            <h2 className="font-serif text-xl font-bold text-charcoal">
              Want to Read ({wantToRead.length})
            </h2>
          </div>

          {wantToRead.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {wantToRead.map((book) => (
                <div key={book.id} className="space-y-3 flex flex-col items-center group relative">
                  <BookCard book={book} size="md" />

                  <div className="text-center w-full max-w-[130px]">
                    <p className="text-xs font-semibold text-charcoal truncate">{book.title}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-2 bg-cream-card border border-cream-border rounded-lg p-1">
                      <button
                        onClick={() => handleMoveShelf(book.id, "Currently Reading")}
                        className="text-[9px] font-bold text-brand hover:underline px-1.5 py-0.5 rounded hover:bg-brand/10 transition-colors"
                        title="Start Reading"
                      >
                        Read
                      </button>
                      <span className="text-cream-border">|</span>
                      <button
                        onClick={() => handleMoveShelf(book.id, "Finished")}
                        className="text-[9px] font-bold text-charcoal-muted hover:text-charcoal px-1.5 py-0.5 rounded hover:bg-cream-dark/50 transition-colors"
                        title="Mark as Finished"
                      >
                        Finish
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-cream-card border border-cream-border rounded-xl">
              <p className="text-xs text-charcoal-muted">No books shelved in Want to Read.</p>
            </div>
          )}
        </section>

        {/* 3. Finished Shelf */}
        <section className="space-y-6 pt-6 border-t border-cream-border/60">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand" />
            <h2 className="font-serif text-xl font-bold text-charcoal">
              Finished Reading ({finished.length})
            </h2>
          </div>

          {finished.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {finished.map((book) => (
                <div key={book.id} className="space-y-3 flex flex-col items-center group relative">
                  <BookCard book={book} size="md" />

                  <div className="text-center w-full max-w-[130px] space-y-1">
                    <p className="text-xs font-semibold text-charcoal truncate">{book.title}</p>
                    {book.userRating ? (
                      <div className="flex justify-center">
                        <StarDisplay rating={book.userRating} size={10} />
                      </div>
                    ) : (
                      <p className="text-[10px] text-charcoal-muted italic">Shelved only</p>
                    )}
                    
                    <div className="flex items-center justify-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-cream-card border border-cream-border rounded-lg p-1">
                      <button
                        onClick={() => handleMoveShelf(book.id, "Currently Reading")}
                        className="text-[9px] font-bold text-brand hover:underline px-1.5 py-0.5 rounded hover:bg-brand/10 transition-colors"
                      >
                        Reread
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-cream-card border border-cream-border rounded-xl">
              <p className="text-xs text-charcoal-muted">You haven&rsquo;t logged any finished books yet.</p>
            </div>
          )}
        </section>

      </main>

      {/* Finished Review / Rating Modal overlay */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReviewModal(false)}
              className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-cream border border-cream-border p-6 rounded-2xl shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-cream-border/60 pb-3">
                <span className="font-serif text-lg font-bold text-charcoal">
                  Finish Reading Log
                </span>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-xs font-bold text-charcoal-muted hover:text-charcoal"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-charcoal uppercase tracking-wider block">
                    Rating (Optional)
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            rating >= star ? "fill-brand stroke-brand" : "text-cream-border"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-charcoal uppercase tracking-wider block">
                    Write review (Optional)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Reflect on this book, key quotes, or thoughts in the margin..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full p-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted placeholder-charcoal-muted"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand hover:bg-brand-light text-cream font-semibold text-xs rounded-lg shadow transition-colors"
                >
                  Save Entry & Move to Finished
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
