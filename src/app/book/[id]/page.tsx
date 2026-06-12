"use client";

import React, { useState } from "react";
import Header, { StarRating } from "@/components/Header";
import ReviewCard, { StarDisplay } from "@/components/ReviewCard";
import BookCard from "@/components/BookCard";
import { useLeaf } from "@/context/LeafContext";
import { BookOpen, Calendar, Check, Heart, Plus, Star, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const {
    books,
    reviews,
    diaryLogs,
    currentUser,
    users,
    logBook,
  } = useLeaf();

  const book = books.find((b) => b.id === id);

  // States for logging review
  const [logStatus, setLogStatus] = useState<"Want to Read" | "Currently Reading" | "Finished" | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [showLogDrawer, setShowLogDrawer] = useState(false);

  if (!book) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <BookOpen className="w-12 h-12 text-charcoal-muted mb-4 opacity-50" />
          <h2 className="font-serif text-xl font-bold text-charcoal">Book Not Found</h2>
          <p className="text-xs text-charcoal-muted mt-1">
            The literary volume you requested could not be located in our archives.
          </p>
        </div>
      </div>
    );
  }

  // Get current user log for this book
  const userLogs = diaryLogs.filter((l) => l.userId === currentUser.id && l.bookId === book.id);
  const currentActiveStatus = userLogs.length > 0 ? userLogs[0].status : null;
  const currentLoggedRating = userLogs.length > 0 ? userLogs[0].rating : undefined;

  // Reviews for this book
  const bookReviews = reviews.filter((r) => r.bookId === book.id);

  // Friends who read it (Emma, Alex, Sophia, Julian)
  const friendLogs = diaryLogs.filter((l) => l.bookId === book.id && l.userId !== currentUser.id && l.status === "Finished");
  const friendsRead = friendLogs.map((log) => {
    const friendUser = users.find((u) => u.id === log.userId);
    return {
      user: friendUser,
      rating: log.rating,
      date: log.dateLogged,
    };
  }).filter((f) => f.user !== undefined);

  // Related books (same genre, exclude this one)
  const relatedBooks = books
    .filter((b) => b.id !== book.id && b.genres.some((g) => book.genres.includes(g)))
    .slice(0, 3);

  const handleLogAction = (status: "Want to Read" | "Currently Reading" | "Finished") => {
    if (status === "Finished") {
      setLogStatus(status);
      setShowLogDrawer(true);
    } else {
      logBook(book.id, status);
      setShowLogDrawer(false);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logBook(book.id, "Finished", rating, reviewText);
    setReviewText("");
    setRating(0);
    setShowLogDrawer(false);
    setLogStatus(null);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        
        {/* Main Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14 items-start">
          
          {/* Left Column: Cover & Logging Widget (1 col) */}
          <div className="space-y-8 flex flex-col items-center lg:items-stretch">
            
            {/* Book Cover Design */}
            <div className="relative w-48 h-72 md:w-56 md:h-84 rounded-xl overflow-hidden book-shadow bg-cream-dark">
              <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-gradient-to-r from-charcoal/25 to-transparent z-10" />
              <div className="absolute top-0 bottom-0 left-[4px] w-[1px] bg-white/25 z-10" />
              <img
                src={book.coverImage}
                alt={book.title}
                className="w-full h-full object-cover select-none"
              />
            </div>

            {/* Reading Status Log Widget */}
            <div className="bg-cream-card border border-cream-border rounded-2xl p-5 w-full max-w-sm shadow-sm space-y-4">
              <div>
                <h4 className="text-[10px] font-semibold text-charcoal uppercase tracking-wider">
                  Log in your Shelf
                </h4>
                {currentActiveStatus && (
                  <p className="text-xs font-semibold text-brand mt-1 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    Shelved as: {currentActiveStatus}
                    {currentLoggedRating !== undefined && ` (★ ${currentLoggedRating})`}
                  </p>
                )}
              </div>

              {/* Status Toggles */}
              <div className="grid grid-cols-3 gap-1.5">
                {(["Want to Read", "Currently Reading", "Finished"] as const).map((status) => {
                  const isActive = currentActiveStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleLogAction(status)}
                      className={`h-9 text-[10px] font-semibold rounded-lg border transition-all ${
                        isActive
                          ? "bg-brand border-brand text-cream shadow-sm"
                          : "bg-cream border-cream-border text-charcoal hover:border-charcoal"
                      }`}
                    >
                      {status === "Want to Read" ? "Want" : status === "Currently Reading" ? "Reading" : "Finished"}
                    </button>
                  );
                })}
              </div>

              {/* Log Review inline expansion drawer */}
              <AnimatePresence>
                {showLogDrawer && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleReviewSubmit}
                    className="space-y-4 pt-3 border-t border-cream-border overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-charcoal uppercase tracking-wider block">
                        Your Rating
                      </label>
                      <StarRating value={rating} onChange={setRating} size={24} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-charcoal uppercase tracking-wider block">
                        Write Review (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Write your review or thoughts..."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="w-full p-2.5 text-xs bg-cream border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-brand hover:bg-brand-light text-cream font-semibold text-xs rounded-lg transition-colors"
                      >
                        Save Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLogDrawer(false)}
                        className="px-3 border border-cream-border hover:bg-cream-dark/30 text-xs font-semibold rounded-lg text-charcoal-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Friends who read this widget */}
            {friendsRead.length > 0 && (
              <div className="bg-cream-card border border-cream-border rounded-2xl p-5 w-full max-w-sm shadow-sm space-y-4">
                <h4 className="text-[10px] font-semibold text-charcoal uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand" />
                  Friends Who Read It
                </h4>
                <div className="space-y-3">
                  {friendsRead.map((logItem, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <img
                          src={logItem.user?.avatar}
                          alt={logItem.user?.name}
                          className="w-5.5 h-5.5 rounded-full object-cover border border-cream-border"
                        />
                        <span className="font-semibold text-charcoal">
                          {logItem.user?.name}
                        </span>
                      </div>
                      {logItem.rating !== undefined && (
                        <div className="bg-cream px-2 py-0.5 rounded border border-cream-border scale-90">
                          <StarDisplay rating={logItem.rating} size={9} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Title, Description, Reviews (2 cols) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Title, Author, Year */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-serif text-sm font-semibold italic text-brand">
                  {book.year}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-cream-border" />
                <span className="text-xs text-charcoal-muted font-medium">
                  {book.pages} pages
                </span>
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-charcoal tracking-tight">
                {book.title}
              </h1>
              <p className="text-sm font-medium text-charcoal-light">
                by <span className="text-brand hover:underline cursor-pointer">{book.author}</span>
              </p>
            </div>

            {/* Ratings Summary Card */}
            <div className="flex items-center gap-6 p-4 bg-cream-card border border-cream-border rounded-xl w-fit">
              <div className="text-center border-r border-cream-border/60 pr-6">
                <p className="text-[10px] font-semibold text-charcoal-muted uppercase">Rating</p>
                <p className="font-serif text-2xl font-bold text-charcoal mt-1">
                  {book.averageRating.toFixed(1)}
                </p>
              </div>
              <div>
                <StarDisplay rating={book.averageRating} size={16} />
                <p className="text-[10px] text-charcoal-muted mt-1 font-semibold uppercase">
                  Based on community logs
                </p>
              </div>
            </div>

            {/* Synopsis */}
            <div className="space-y-2.5">
              <h3 className="text-[10px] font-semibold text-charcoal uppercase tracking-wider">
                Synopsis
              </h3>
              <p className="text-xs md:text-sm text-charcoal-light leading-relaxed font-sans">
                {book.description}
              </p>
            </div>

            {/* Genres */}
            <div className="space-y-2.5">
              <h3 className="text-[10px] font-semibold text-charcoal uppercase tracking-wider">
                Genres
              </h3>
              <div className="flex flex-wrap gap-2">
                {book.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 bg-cream-card border border-cream-border hover:bg-cream-dark/50 hover:border-charcoal-light cursor-pointer text-[10px] font-medium text-charcoal rounded-lg transition-all"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Community Reviews timeline */}
            <div className="space-y-6 pt-6 border-t border-cream-border">
              <h3 className="font-serif text-lg font-bold text-charcoal">
                Reviews ({bookReviews.length})
              </h3>
              
              {bookReviews.length > 0 ? (
                <div className="space-y-6">
                  {bookReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} showBookCover={false} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-cream-card border border-cream-border rounded-xl">
                  <p className="text-xs text-charcoal-muted">No community reviews written yet.</p>
                  <button
                    onClick={() => {
                      setLogStatus("Finished");
                      setShowLogDrawer(true);
                    }}
                    className="text-[10px] font-bold text-brand hover:underline mt-1"
                  >
                    Log this book and write the first review!
                  </button>
                </div>
              )}
            </div>

            {/* Related Recommendations shelf */}
            {relatedBooks.length > 0 && (
              <div className="space-y-6 pt-8 border-t border-cream-border">
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  Similar Volumes
                </h3>
                <div className="grid grid-cols-3 gap-4 justify-items-center">
                  {relatedBooks.map((relBook) => (
                    <div key={relBook.id} className="space-y-2 text-center">
                      <BookCard book={relBook} size="sm" />
                      <p className="text-[10px] font-semibold text-charcoal truncate max-w-[90px] mx-auto">
                        {relBook.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
