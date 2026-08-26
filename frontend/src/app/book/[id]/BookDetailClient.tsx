"use client";

import React, { useState, useEffect, useMemo } from "react";
import Header, { StarRating } from "@/components/Header";
import ReviewCard, { StarDisplay } from "@/components/ReviewCard";
import BookCard from "@/components/BookCard";
import { useLeaf } from "@/context/LeafContext";
import { Book, Review } from "@/data/mockData";
import { BookOpen, Calendar, Check, Heart, Plus, Star, Users, Award, RotateCcw, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "@/components/UserAvatar";
import CoverImage from "@/components/CoverImage";
import { authFetch } from "@/utils/auth/client";

interface BookDetailClientProps {
  book: Book;
}

export default function BookDetailClient({ book: initialBook }: BookDetailClientProps) {
  const {
    books,
    reviews,
    diaryLogs,
    currentUser,
    users,
    logBook,
    addCachedBookToContext,
    readingSessions,
    logReadingSession,
    updateBookProgressDirectly,
  } = useLeaf();

  const [book, setBook] = useState<Book>(initialBook);
  const [bookPageReviews, setBookPageReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // States for logging review
  const [logStatus, setLogStatus] = useState<"Want to Read" | "Currently Reading" | "Finished" | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [showLogDrawer, setShowLogDrawer] = useState(false);

  // Page progress logging states inside book detail page
  const [detailLogMethod, setDetailLogMethod] = useState<"increment" | "absolute">("increment");
  const [detailPagesRead, setDetailPagesRead] = useState("");
  const [detailCurrentPage, setDetailCurrentPage] = useState("");
  const [detailMinutes, setDetailMinutes] = useState("");
  const [detailNote, setDetailNote] = useState("");

  // Completion states
  const [showDetailCompletion, setShowDetailCompletion] = useState(false);
  const [detailRating, setDetailRating] = useState(0);
  const [detailReview, setDetailReview] = useState("");
  const [showStatusSelect, setShowStatusSelect] = useState(false);

  // Sync book data to the client Leaf context on mount
  useEffect(() => {
    if (initialBook) {
      addCachedBookToContext(initialBook);
    }
  }, [initialBook, addCachedBookToContext]);

  // Load community reviews for this specific book (context only keeps a recent feed slice)
  useEffect(() => {
    let cancelled = false;
    async function loadBookReviews() {
      setReviewsLoading(true);
      try {
        const res = await authFetch(
          `/api/reviews?bookId=${encodeURIComponent(initialBook.id)}&limit=50`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.reviews)) {
          setBookPageReviews(data.reviews);
        }
      } catch (err) {
        console.error("Failed to load book reviews:", err);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    }
    loadBookReviews();
    return () => {
      cancelled = true;
    };
  }, [initialBook.id]);

  // Synchronise book data with context if it updates (e.g. metadata refresh)
  useEffect(() => {
    const cached = books.find(
      (b) => b.id === initialBook.id || b.id.toLowerCase() === initialBook.id.toLowerCase()
    );
    if (cached) {
      setBook(cached);
    }
  }, [books, initialBook.id]);

  // Get current user log for this book
  const userLogs = diaryLogs.filter((l) => l.userId === currentUser.id && l.bookId === book.id);
  const currentActiveStatus = userLogs.length > 0 ? userLogs[0].status : null;
  const currentLoggedRating = userLogs.length > 0 ? userLogs[0].rating : undefined;

  // Reviews for this book — prefer book-scoped fetch, fall back to context feed
  const bookReviews = useMemo(() => {
    const fromPage = bookPageReviews.filter((r) => r.bookId === book.id || r.bookId === initialBook.id);
    if (fromPage.length > 0) return fromPage;
    return reviews.filter((r) => r.bookId === book.id || r.bookId === initialBook.id);
  }, [bookPageReviews, reviews, book.id, initialBook.id]);

  // Friends who read it
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

  const handleReadAgain = async () => {
    await logBook(book.id, "Currently Reading");
    setShowLogDrawer(false);
    setLogStatus(null);
  };

  const handleDidNotFinish = async () => {
    await logBook(book.id, "Did Not Finish");
    setShowLogDrawer(false);
    setShowStatusSelect(false);
    setLogStatus(null);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logBook(book.id, "Finished", rating, reviewText);
    setReviewText("");
    setRating(0);
    setShowLogDrawer(false);
    setLogStatus(null);
  };

  const handleDetailProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let res = null;
    if (detailLogMethod === "increment") {
      const pRead = parseInt(detailPagesRead) || 0;
      if (pRead <= 0 || pRead >= book.pages) return;
      res = await logReadingSession(
        book.id,
        pRead,
        detailNote || undefined,
        parseInt(detailMinutes) || undefined
      );
    } else {
      const curPage = parseInt(detailCurrentPage) || 0;
      if (curPage <= 0 || curPage >= book.pages) return;
      res = await updateBookProgressDirectly(
        book.id,
        curPage,
        detailNote || undefined,
        parseInt(detailMinutes) || undefined
      );
    }

    if (res && res.success) {
      // Clear inputs
      setDetailPagesRead("");
      setDetailCurrentPage("");
      setDetailMinutes("");
      setDetailNote("");

      if (res.autoFinished) {
        setShowDetailCompletion(true);
      }
    }
  };

  const handleDetailCompletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await logBook(book.id, "Finished", detailRating || undefined, detailReview);
    setShowDetailCompletion(false);
    setDetailRating(0);
    setDetailReview("");
  };

  const bookSessions = readingSessions
    ? readingSessions.filter((s) => s.book_id === book.id && s.user_id === currentUser.id)
    : [];

  // Calculate dynamic average rating based on actual loaded review entries if available
  const computedAverageRating = bookReviews.length > 0
    ? parseFloat((bookReviews.reduce((sum, r) => sum + r.rating, 0) / bookReviews.length).toFixed(1))
    : book.averageRating;

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
              <CoverImage
                src={book.coverImage}
                title={book.title}
                author={book.author}
                bookId={book.id}
                className="w-full h-full"
                imgClassName="w-full h-full object-cover select-none"
              />
            </div>

            {currentActiveStatus === "Currently Reading" ? (
              <div className="bg-cream-card border border-cream-border rounded-2xl p-5 w-full max-w-sm shadow-sm space-y-4">
                {showDetailCompletion ? (
                  <form onSubmit={handleDetailCompletionSubmit} className="space-y-4">
                    <div className="text-center py-2">
                      <Award className="w-10 h-10 text-brand mx-auto mb-2" />
                      <h4 className="font-serif text-base font-bold text-charcoal">Finished!</h4>
                      <p className="text-[11px] text-charcoal-muted mt-0.5">Rate & review this book to complete your entry.</p>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-charcoal uppercase tracking-wider block">Rating</label>
                      <StarRating value={detailRating} onChange={setDetailRating} size={24} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-charcoal uppercase tracking-wider block">Review (Optional)</label>
                      <textarea
                        rows={3}
                        placeholder="Write a reflection..."
                        value={detailReview}
                        onChange={(e) => setDetailReview(e.target.value)}
                        className="w-full p-2.5 text-xs bg-cream border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-brand hover:bg-brand-light text-cream font-semibold text-xs rounded-lg shadow transition-colors"
                    >
                      Publish Review
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider">
                          Currently Reading
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Check className="w-3.5 h-3.5 text-brand stroke-[3px]" />
                          <span className="text-xs font-bold text-brand">Active Companion</span>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowStatusSelect(!showStatusSelect)}
                          className="text-[10px] font-bold text-brand hover:underline"
                        >
                          Change Status
                        </button>
                        
                        {showStatusSelect && (
                          <div className="absolute right-0 mt-2 w-40 bg-cream border border-cream-border rounded-xl shadow-lg py-1 z-20">
                            {(["Want to Read", "Currently Reading", "Finished", "Did Not Finish"] as const).map((status) => (
                              <button
                                type="button"
                                key={status}
                                onClick={() => {
                                  if (status === "Did Not Finish") {
                                    handleDidNotFinish();
                                  } else {
                                    handleLogAction(status);
                                    setShowStatusSelect(false);
                                  }
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-charcoal hover:bg-cream-dark/50"
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress details */}
                    {(() => {
                      const currentPage = userLogs[0]?.currentPage || 0;
                      const totalPages = book.pages || 300;
                      const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
                      const pagesRemaining = Math.max(0, totalPages - currentPage);

                      // Estimate completion date
                      let estDate = null;
                      if (bookSessions.length > 0 && pagesRemaining > 0) {
                        const avgPagesPerSession = bookSessions.reduce((acc, s) => acc + s.pages_read, 0) / bookSessions.length;
                        const daysLeft = Math.ceil(pagesRemaining / (avgPagesPerSession || 1));
                        const d = new Date();
                        d.setDate(d.getDate() + daysLeft);
                        estDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }

                      return (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold text-charcoal">
                              <span>Progress</span>
                              <span className="text-brand font-serif italic">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-cream-dark h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-brand h-full rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-charcoal-muted pt-0.5">
                              <span>{pagesRemaining} pages left</span>
                              {estDate && <span>Est. complete: {estDate}</span>}
                            </div>
                          </div>

                          {/* Log session subform */}
                          <form onSubmit={handleDetailProgressSubmit} className="space-y-3 pt-2 border-t border-cream-border">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-charcoal uppercase tracking-wider">Log Progress</span>
                              <div className="flex rounded bg-cream-dark p-0.5">
                                {(["increment", "absolute"] as const).map((method) => (
                                  <button
                                    type="button"
                                    key={method}
                                    onClick={() => setDetailLogMethod(method)}
                                    className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${
                                      detailLogMethod === method
                                        ? "bg-cream text-brand shadow-xs"
                                        : "text-charcoal-muted"
                                    }`}
                                  >
                                    {method === "increment" ? "+ Pages" : "Page #"}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {detailLogMethod === "increment" ? (
                              <div className="space-y-2">
                                <input
                                  type="number"
                                  min="1"
                                  max={Math.max(1, totalPages - 1)}
                                  placeholder="Pages read"
                                  value={detailPagesRead}
                                  onChange={(e) => setDetailPagesRead(e.target.value)}
                                  className="w-full h-8 px-2.5 text-xs bg-cream border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                                  required
                                />
                                <div className="flex gap-1">
                                  {[10, 25, 50].map((p) => {
                                    const disabled = p >= totalPages;
                                    return (
                                      <button
                                        type="button"
                                        key={p}
                                        disabled={disabled}
                                        onClick={() => setDetailPagesRead(p.toString())}
                                        className={`flex-1 text-[9px] py-1 border rounded font-semibold ${
                                          disabled
                                            ? "opacity-40 cursor-not-allowed border-cream-border text-charcoal-muted"
                                            : "bg-cream border-cream-border hover:border-brand hover:text-brand"
                                        }`}
                                      >
                                        +{p}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                max={Math.max(1, totalPages - 1)}
                                placeholder={`Page 1–${Math.max(1, totalPages - 1)}`}
                                value={detailCurrentPage}
                                onChange={(e) => setDetailCurrentPage(e.target.value)}
                                className="w-full h-8 px-2.5 text-xs bg-cream border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                                required
                              />
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[8px] font-bold text-charcoal-muted uppercase block mb-0.5">Mins Read</label>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Minutes"
                                  value={detailMinutes}
                                  onChange={(e) => setDetailMinutes(e.target.value)}
                                  className="w-full h-8 px-2 text-xs bg-cream border border-cream-border rounded-lg text-charcoal focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] font-bold text-charcoal-muted uppercase block mb-0.5">Note</label>
                                <input
                                  type="text"
                                  placeholder="Note"
                                  value={detailNote}
                                  onChange={(e) => setDetailNote(e.target.value)}
                                  className="w-full h-8 px-2 text-xs bg-cream border border-cream-border rounded-lg text-charcoal focus:outline-none"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-brand hover:bg-brand-light text-cream font-bold text-xs rounded-lg shadow-sm transition-colors mt-2"
                            >
                              Log Progress
                            </button>
                          </form>

                          <button
                            type="button"
                            onClick={handleDidNotFinish}
                            className="w-full h-10 flex items-center justify-center gap-2 text-xs font-bold rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Did Not Finish
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
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

                {currentActiveStatus === "Finished" && (
                  <button
                    type="button"
                    onClick={handleReadAgain}
                    className="w-full h-10 flex items-center justify-center gap-2 text-xs font-bold rounded-lg border border-brand/30 bg-brand/5 text-brand hover:bg-brand hover:text-cream transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Read Again
                  </button>
                )}

                {currentActiveStatus === "Did Not Finish" && (
                  <button
                    type="button"
                    onClick={handleReadAgain}
                    className="w-full h-10 flex items-center justify-center gap-2 text-xs font-bold rounded-lg border border-brand/30 bg-brand/5 text-brand hover:bg-brand hover:text-cream transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Resume Reading
                  </button>
                )}

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
            )}

            {/* Book session timeline logs */}
            {currentActiveStatus === "Currently Reading" && bookSessions.length > 0 && (
              <div className="bg-cream-card border border-cream-border rounded-2xl p-5 w-full max-w-sm shadow-sm space-y-4">
                <h4 className="text-[10px] font-semibold text-charcoal uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand" />
                  Your Sessions
                </h4>
                <div className="relative border-l border-cream-border pl-3 ml-1.5 space-y-4">
                  {bookSessions.slice(0, 5).map((session) => {
                    const sDate = new Date(session.logged_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <div key={session.id} className="relative text-xs">
                        <div className="absolute -left-[16px] top-1 w-2.5 h-2.5 rounded-full border-2 border-brand bg-cream" />
                        <div className="flex justify-between font-semibold text-charcoal">
                          <span>+{session.pages_read} pages</span>
                          <span className="text-[10px] text-charcoal-muted font-normal">{sDate}</span>
                        </div>
                        {session.reading_minutes && (
                          <p className="text-[10px] text-charcoal-muted mt-0.5">Read for {session.reading_minutes} mins</p>
                        )}
                        {session.note && (
                          <p className="text-[11px] text-charcoal-light italic mt-1 font-serif bg-cream p-1.5 border border-cream-border/50 rounded-lg">
                            &ldquo;{session.note}&rdquo;
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                        <UserAvatar
                          avatarUrl={logItem.user?.avatar}
                          name={logItem.user?.name}
                          size={22}
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
                  {computedAverageRating.toFixed(1)}
                </p>
              </div>
              <div>
                <StarDisplay rating={computedAverageRating} size={16} />
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
                Reviews {reviewsLoading ? "" : `(${bookReviews.length})`}
              </h3>
              
              {reviewsLoading ? (
                <div className="space-y-4">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-28 bg-cream-card border border-cream-border rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : bookReviews.length > 0 ? (
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
