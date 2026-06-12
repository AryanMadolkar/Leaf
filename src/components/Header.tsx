"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLeaf } from "@/context/LeafContext";
import { Search, Plus, BookOpen, Star, LogOut, Check, X, Calendar } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// Star Rating helper
export const StarRating = ({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => {
        const isFull = displayValue >= index;
        const isHalf = displayValue === index - 0.5;

        return (
          <div
            key={index}
            className="relative cursor-pointer select-none"
            style={{ width: size, height: size }}
          >
            {/* Left half hover area */}
            <div
              className="absolute left-0 top-0 w-1/2 h-full z-20"
              onMouseEnter={() => setHoverValue(index - 0.5)}
              onMouseLeave={() => setHoverValue(null)}
              onClick={() => onChange(index - 0.5)}
            />
            {/* Right half hover area */}
            <div
              className="absolute right-0 top-0 w-1/2 h-full z-20"
              onMouseEnter={() => setHoverValue(index)}
              onMouseLeave={() => setHoverValue(null)}
              onClick={() => onChange(index)}
            />

            {/* SVG Star Rendering */}
            <svg
              viewBox="0 0 24 24"
              className="absolute inset-0 w-full h-full"
              fill="none"
              stroke="#D4CECE"
              strokeWidth="1.5"
            >
              {/* Empty background star */}
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                className="fill-cream-dark stroke-cream-border"
              />

              {/* Filled star color overlay with clipPath for half-stars */}
              <g
                style={{
                  clipPath: isFull
                    ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
                    : isHalf
                    ? "polygon(0 0, 50% 0, 50% 100%, 0 100%)"
                    : "polygon(0 0, 0% 0, 0% 100%, 0 100%)",
                }}
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="#2E4D38"
                  stroke="#2E4D38"
                />
              </g>
            </svg>
          </div>
        );
      })}
      {displayValue > 0 && (
        <span className="text-xs font-medium text-charcoal-muted ml-1.5 mt-0.5">
          {displayValue.toFixed(1)} / 5.0
        </span>
      )}
    </div>
  );
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { books, users, currentUser, logBook, signOut } = useLeaf();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Log Modal state
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [logStatus, setLogStatus] = useState<"Want to Read" | "Currently Reading" | "Finished">("Finished");
  const [logRating, setLogRating] = useState<number>(0);
  const [logReview, setLogReview] = useState("");

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter books/users for header search
  const searchResultsBooks = searchQuery
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.author.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const searchResultsUsers = searchQuery
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const hasSearchResults = searchResultsBooks.length > 0 || searchResultsUsers.length > 0;

  // Filter books for log modal search
  const logBookResults = logSearch
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(logSearch.toLowerCase()) ||
          b.author.toLowerCase().includes(logSearch.toLowerCase())
      )
    : [];

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;

    logBook(selectedBook.id, logStatus, logStatus === "Finished" ? logRating : undefined, logReview);

    // Reset states
    setIsLogOpen(false);
    setSelectedBook(null);
    setLogSearch("");
    setLogRating(0);
    setLogReview("");
    setLogStatus("Finished");

    router.push("/diary");
  };

  const navItems = [
    { label: "Feed", href: "/feed" },
    { label: "Discover", href: "/discover" },
    { label: "Lists", href: "/lists" },
    { label: "Diary", href: "/diary" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass border-b border-cream-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <BookOpen className="w-5 h-5 text-brand group-hover:rotate-6 transition-transform duration-300" />
            <span className="font-serif text-2xl font-bold tracking-tight text-charcoal">
              Leaf
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-brand"
                      : "text-charcoal-muted hover:text-charcoal"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Search & Actions */}
          <div className="flex items-center gap-4 flex-1 justify-end md:flex-initial">
            {/* Search Bar */}
            <div ref={searchRef} className="relative w-full max-w-[200px] md:max-w-[240px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-charcoal-muted" />
                <input
                  type="text"
                  placeholder="Search books, readers..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full h-9 pl-9 pr-4 text-xs bg-cream-dark/50 border border-cream-border rounded-lg text-charcoal placeholder-charcoal-muted focus:outline-none focus:border-brand-muted focus:bg-cream-dark transition-all duration-300"
                />
              </div>

              {/* Search Dropdown Panel */}
              <AnimatePresence>
                {showSearchResults && searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-72 md:w-80 bg-cream-card border border-cream-border rounded-xl shadow-xl overflow-hidden z-50 py-2"
                  >
                    {hasSearchResults ? (
                      <div className="max-h-[350px] overflow-y-auto">
                        {/* Books Section */}
                        {searchResultsBooks.length > 0 && (
                          <div className="mb-2">
                            <h4 className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider px-4 py-1">
                              Books
                            </h4>
                            {searchResultsBooks.map((book) => (
                              <button
                                key={book.id}
                                onClick={() => {
                                  router.push(`/book/${book.id}`);
                                  setSearchQuery("");
                                  setShowSearchResults(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-cream-dark/50 transition-colors duration-200 text-left"
                              >
                                <img
                                  src={book.coverImage}
                                  alt={book.title}
                                  className="w-8 h-12 object-cover rounded shadow-sm flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-charcoal truncate">
                                    {book.title}
                                  </p>
                                  <p className="text-[10px] text-charcoal-muted truncate">
                                    {book.author} • {book.year}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Users Section */}
                        {searchResultsUsers.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider px-4 py-1">
                              Readers
                            </h4>
                            {searchResultsUsers.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => {
                                  router.push(`/profile/${user.username}`);
                                  setSearchQuery("");
                                  setShowSearchResults(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-cream-dark/50 transition-colors duration-200 text-left"
                              >
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-7 h-7 rounded-full object-cover shadow-sm flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-charcoal truncate">
                                    {user.name}
                                  </p>
                                  <p className="text-[10px] text-charcoal-muted truncate">
                                    @{user.username}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-charcoal-muted">
                          No results found for &ldquo;{searchQuery}&rdquo;
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Log Book Action */}
            <button
              onClick={() => setIsLogOpen(true)}
              className="flex items-center gap-1.5 px-3.5 h-9 bg-brand hover:bg-brand-light text-cream font-medium text-xs rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Book</span>
            </button>

            {/* Profile Avatar / Auth */}
            <Link
              href={`/profile/${currentUser.username}`}
              className="w-8 h-8 rounded-full border border-cream-border overflow-hidden hover:scale-105 transition-transform duration-300"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            </Link>

            {/* Sign Out Link */}
            <button
              onClick={() => {
                signOut();
                router.push("/auth");
              }}
              className="p-1.5 hover:bg-cream-dark/50 rounded-lg text-charcoal-muted hover:text-charcoal transition-colors duration-200"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Global Log Book Modal */}
      <AnimatePresence>
        {isLogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsLogOpen(false);
                setSelectedBook(null);
                setLogSearch("");
              }}
              className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-cream border border-cream-border rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-cream-border flex items-center justify-between bg-cream-card">
                <span className="font-serif text-lg font-bold text-charcoal">
                  Log a Book
                </span>
                <button
                  onClick={() => {
                    setIsLogOpen(false);
                    setSelectedBook(null);
                    setLogSearch("");
                  }}
                  className="p-1 hover:bg-cream-dark/50 rounded-lg text-charcoal-muted hover:text-charcoal transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {!selectedBook ? (
                  <div className="space-y-4">
                    <label className="text-xs font-semibold text-charcoal uppercase tracking-wider block">
                      Search Book to Log
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal-muted" />
                      <input
                        type="text"
                        placeholder="Search title, author..."
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 text-sm bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted transition-colors"
                        autoFocus
                      />
                    </div>

                    {/* Filtered Log Search List */}
                    <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
                      {logBookResults.map((book) => (
                        <button
                          key={book.id}
                          onClick={() => setSelectedBook(book)}
                          className="w-full flex items-center gap-4 p-2.5 rounded-xl border border-cream-border hover:bg-cream-dark/30 hover:border-brand-muted transition-all text-left group"
                        >
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="w-10 h-14 object-cover rounded shadow-sm group-hover:scale-95 transition-transform"
                          />
                          <div>
                            <p className="text-sm font-semibold text-charcoal">
                              {book.title}
                            </p>
                            <p className="text-xs text-charcoal-muted">
                              {book.author} ({book.year})
                            </p>
                          </div>
                        </button>
                      ))}
                      {logSearch && logBookResults.length === 0 && (
                        <p className="text-xs text-charcoal-muted text-center py-6">
                          No matching books found. Try searching for &ldquo;Secret&rdquo;, &ldquo;Hail&rdquo;, or &ldquo;Dune&rdquo;.
                        </p>
                      )}
                      {!logSearch && (
                        <div className="text-center py-8 text-charcoal-muted text-xs space-y-1">
                          <p>Type a book name to begin curating your library.</p>
                          <p className="opacity-75">Try: &ldquo;The Secret History&rdquo; or &ldquo;Normal People&rdquo;</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleLogSubmit} className="space-y-6">
                    {/* Selected Book Row */}
                    <div className="flex items-center gap-4 p-3 bg-cream-card border border-cream-border rounded-xl">
                      <img
                        src={selectedBook.coverImage}
                        alt={selectedBook.title}
                        className="w-12 h-18 object-cover rounded shadow-md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-charcoal truncate">
                          {selectedBook.title}
                        </p>
                        <p className="text-xs text-charcoal-muted">
                          {selectedBook.author} • {selectedBook.year}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedBook(null)}
                          className="text-[10px] text-brand hover:underline font-semibold mt-1"
                        >
                          Change Book
                        </button>
                      </div>
                    </div>

                    {/* Status Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-charcoal uppercase tracking-wider block">
                        Reading Status
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Want to Read", "Currently Reading", "Finished"] as const).map((status) => (
                          <button
                            type="button"
                            key={status}
                            onClick={() => setLogStatus(status)}
                            className={`py-2 px-3 text-xs font-medium border rounded-lg transition-all ${
                              logStatus === status
                                ? "bg-brand border-brand text-cream shadow-sm"
                                : "bg-cream-card border-cream-border text-charcoal-muted hover:border-charcoal hover:text-charcoal"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Finished details (Rating & Review) */}
                    {logStatus === "Finished" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-4 overflow-hidden"
                      >
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-charcoal uppercase tracking-wider block">
                            Rating
                          </label>
                          <StarRating value={logRating} onChange={setLogRating} />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-charcoal uppercase tracking-wider block">
                            Review (Optional)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Write a short reflection, thoughts in the margin, or a full review..."
                            value={logReview}
                            onChange={(e) => setLogReview(e.target.value)}
                            className="w-full p-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted placeholder-charcoal-muted"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Date Picker preview */}
                    <div className="flex items-center gap-2 text-xs text-charcoal-muted bg-cream-card border border-cream-border px-3 py-2 rounded-lg w-fit">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Logged on: {new Date().toLocaleDateString()} (Today)</span>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-brand hover:bg-brand-light text-cream font-semibold text-xs rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      Save Reading Entry
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
