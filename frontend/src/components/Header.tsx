"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLeaf } from "@/context/LeafContext";
import { useTheme } from "@/context/ThemeContext";
import { Book } from "@/data/mockData";
import { Search, Plus, BookOpen, Star, LogOut, LogIn, Check, X, Calendar, Clock, Book as BookIcon, Activity, CheckCircle, ChevronRight, Award, Bookmark, User, Settings, UserPlus, UserCheck, Menu, Sun, Moon, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import UserAvatar from "@/components/UserAvatar";

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
  const { theme, toggleTheme } = useTheme();
  const {
    books, 
    currentUser,
    isProfileLoading,
    isAuthenticated,
    logBook, 
    signOut, 
    addCachedBookToContext,
    diaryLogs,
    readingSessions,
    logReadingSession,
    updateBookProgressDirectly,
    toggleFollowUser,
  } = useLeaf();

  const isGuest =
    currentUser?.id === "guest-user-id" ||
    currentUser?.id === "currentUser" ||
    (!isProfileLoading && !isAuthenticated && !currentUser?.id);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [headerSearchResults, setHeaderSearchResults] = useState<Book[]>([]);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [searchResultsUsers, setSearchResultsUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Account dropdown state
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close account dropdown / mobile nav when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAccountDropdown(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowAccountDropdown(false);
        setMobileNavOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Log Modal state
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logSearchResults, setLogSearchResults] = useState<Book[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [logStatus, setLogStatus] = useState<"Want to Read" | "Currently Reading" | "Finished">("Finished");
  const [logRating, setLogRating] = useState<number>(0);
  const [logReview, setLogReview] = useState("");

  // Reading Companion Drawer state
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [selectedCompanionBookId, setSelectedCompanionBookId] = useState<string | null>(null);
  const [logMethod, setLogMethod] = useState<"increment" | "absolute">("increment");
  const [pagesReadInput, setPagesReadInput] = useState("");
  const [currentPageInput, setCurrentPageInput] = useState("");
  const [readingMinutesInput, setReadingMinutesInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  
  // Companion Search (for starting new books)
  const [companionSearch, setCompanionSearch] = useState("");
  const [companionSearchResults, setCompanionSearchResults] = useState<Book[]>([]);
  const [companionLoading, setCompanionLoading] = useState(false);

  // Completion Form State
  const [showCompletionSuccess, setShowCompletionSuccess] = useState(false);
  const [completedBookInfo, setCompletedBookInfo] = useState<any>(null);
  const [completionRating, setCompletionRating] = useState(0);
  const [completionReview, setCompletionReview] = useState("");

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

  // Header Search Debounced Fetch
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setHeaderSearchResults([]);
      return;
    }

    setHeaderLoading(true);
    const handler = setTimeout(async () => {
      const q = searchQuery.trim().toLowerCase();
      const localFallback = books
        .filter(
          (b) =>
            b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
        )
        .slice(0, 8);

      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.books) && data.books.length > 0) {
            setHeaderSearchResults(data.books);
            data.books.forEach((book: Book) => addCachedBookToContext(book));
            return;
          }
        }
        setHeaderSearchResults(localFallback);
      } catch (err) {
        console.error("Header search API failed:", err);
        setHeaderSearchResults(localFallback);
      } finally {
        setHeaderLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, addCachedBookToContext, books]);

  // Debounced reader search from Supabase profiles
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 1) {
      setSearchResultsUsers([]);
      return;
    }

    setUsersLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSearchResultsUsers(data.users || []);
          }
        }
      } catch (err) {
        console.error("Header user search failed:", err);
      } finally {
        setUsersLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Log Modal Search Debounced Fetch
  useEffect(() => {
    if (!logSearch || logSearch.trim().length < 2) {
      setLogSearchResults([]);
      return;
    }

    setLogLoading(true);
    const handler = setTimeout(async () => {
      const q = logSearch.trim().toLowerCase();
      const localFallback = books
        .filter(
          (b) =>
            b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
        )
        .slice(0, 15);

      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(logSearch.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.books) && data.books.length > 0) {
            setLogSearchResults(data.books);
            data.books.forEach((book: Book) => addCachedBookToContext(book));
            return;
          }
        }
        // API empty/failed — still show local catalog matches
        setLogSearchResults(localFallback);
      } catch (err) {
        console.error("Log modal search API failed:", err);
        setLogSearchResults(localFallback);
      } finally {
        setLogLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [logSearch, addCachedBookToContext, books]);

  // Companion Search Debounced Fetch
  useEffect(() => {
    if (!companionSearch || companionSearch.trim().length < 2) {
      setCompanionSearchResults([]);
      return;
    }

    setCompanionLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(companionSearch)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setCompanionSearchResults(data.books || []);
            data.books.forEach((book: Book) => {
              addCachedBookToContext(book);
            });
          }
        }
      } catch (err) {
        console.error("Companion search API failed:", err);
      } finally {
        setCompanionLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [companionSearch, addCachedBookToContext]);

  const hasSearchResults =
    headerSearchResults.length > 0 || searchResultsUsers.length > 0 || headerLoading || usersLoading;

  const handleFollowFromSearch = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (!currentUser?.id || currentUser.id === "guest-user-id") {
      router.push("/auth");
      return;
    }
    setFollowBusyId(userId);
    const prev = searchResultsUsers;
    setSearchResultsUsers((list) =>
      list.map((u) =>
        u.id === userId
          ? {
              ...u,
              isFollowing: !u.isFollowing,
              followersCount: u.isFollowing
                ? Math.max(0, (u.followersCount || 0) - 1)
                : (u.followersCount || 0) + 1,
            }
          : u
      )
    );
    try {
      await toggleFollowUser(userId);
    } catch {
      setSearchResultsUsers(prev);
    } finally {
      setFollowBusyId(null);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;

    const book = selectedBook;
    const status = logStatus;
    const rating = logStatus === "Finished" ? logRating : undefined;
    const review = logReview;

    // Reset UI first so the modal closes instantly
    setIsLogOpen(false);
    setSelectedBook(null);
    setLogSearch("");
    setLogRating(0);
    setLogReview("");
    setLogStatus("Finished");

    try {
      await logBook(book.id, status, rating, review);
      router.push("/diary");
    } catch (err: any) {
      console.error("Log submit failed:", err);
      alert(err?.message || "Could not save this book. Please try again.");
    }
  };

  // Get active "Currently Reading" books
  const currentlyReading = diaryLogs
    ? (diaryLogs
        .filter((log) => log.userId === currentUser.id && log.status === "Currently Reading")
        .map((log) => {
          const book = books.find((b) => b.id === log.bookId);
          return book ? { ...book, currentPage: log.currentPage || 0 } : null;
        })
        .filter(Boolean) as any[])
    : [];

  useEffect(() => {
    if (currentlyReading.length > 0 && !selectedCompanionBookId) {
      setSelectedCompanionBookId(currentlyReading[0].id);
    }
  }, [currentlyReading, selectedCompanionBookId]);

  const handleCompanionSubmit = async (e: React.FormEvent, book: any) => {
    e.preventDefault();
    if (!book) return;

    let res = null;
    if (logMethod === "increment") {
      const pRead = parseInt(pagesReadInput) || 0;
      if (pRead <= 0) return;
      res = await logReadingSession(
        book.id,
        pRead,
        noteInput || undefined,
        parseInt(readingMinutesInput) || undefined
      );
    } else {
      const curPage = parseInt(currentPageInput) || 0;
      if (curPage <= 0 || curPage <= book.currentPage) return;
      res = await updateBookProgressDirectly(book.id, curPage);
    }

    if (res && res.success) {
      // Clear log states
      setPagesReadInput("");
      setCurrentPageInput("");
      setReadingMinutesInput("");
      setNoteInput("");

      if (res.autoFinished) {
        setCompletedBookInfo(book);
        setShowCompletionSuccess(true);
      } else {
        if (currentlyReading.length <= 1) {
          setIsCompanionOpen(false);
        }
      }
    }
  };

  const handleCompletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedBookInfo) return;

    await logBook(completedBookInfo.id, "Finished", completionRating || undefined, completionReview);

    // Reset states
    setShowCompletionSuccess(false);
    setCompletedBookInfo(null);
    setCompletionRating(0);
    setCompletionReview("");
    setIsCompanionOpen(false);
    
    router.push("/diary");
  };

  const handleStartReading = async (bookId: string) => {
    await logBook(bookId, "Currently Reading");
    setSelectedCompanionBookId(bookId);
    setCompanionSearch("");
  };

  const wantToReadBooks = diaryLogs
    ? (diaryLogs
        .filter((log) => log.userId === currentUser.id && log.status === "Want to Read")
        .map((log) => books.find((b) => b.id === log.bookId))
        .filter(Boolean) as Book[])
    : [];

  const navItems = [
    { label: "Feed", href: "/feed" },
    { label: "Search", href: "/search" },
    { label: "Library", href: "/library" },
    { label: "Discover", href: "/discover" },
    { label: "Lists", href: "/lists" },
    { label: "Diary", href: "/diary" },
    { label: "Stats", href: "/stats" },
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

          {/* Nav Links (desktop) */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main">
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
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end md:flex-initial">
            {/* Mobile menu toggle */}
            <button
              type="button"
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-cream-border bg-cream-card text-charcoal hover:bg-cream-dark/50 transition-colors"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
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
                        {headerSearchResults.length > 0 && (
                          <div className="mb-2">
                            <h4 className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider px-4 py-1">
                              Books
                            </h4>
                            {headerSearchResults.map((book) => (
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
                              <div
                                key={user.id}
                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-cream-dark/50 transition-colors duration-200"
                              >
                                <button
                                  onClick={() => {
                                    router.push(`/profile/${user.username}`);
                                    setSearchQuery("");
                                    setShowSearchResults(false);
                                  }}
                                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                                >
                                  <UserAvatar avatarUrl={user.avatar} name={user.name} size={28} className="flex-shrink-0 shadow-sm" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-charcoal truncate">
                                      {user.name}
                                    </p>
                                    <p className="text-[10px] text-charcoal-muted truncate">
                                      @{user.username}
                                      {typeof user.followersCount === "number"
                                        ? ` · ${user.followersCount} followers`
                                        : ""}
                                    </p>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  disabled={followBusyId === user.id}
                                  onClick={(e) => handleFollowFromSearch(e, user.id)}
                                  className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 flex-shrink-0 transition-all ${
                                    user.isFollowing
                                      ? "bg-cream-dark border border-cream-border text-charcoal"
                                      : "bg-brand text-cream hover:bg-brand-light"
                                  }`}
                                >
                                  {user.isFollowing ? (
                                    <>
                                      <UserCheck className="w-3 h-3" />
                                      <span>Following</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="w-3 h-3" />
                                      <span>Follow</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-charcoal-muted">
                          No results found for &ldquo;{searchQuery}&rdquo;. Try a book title or reader name.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 shrink-0 rounded-lg border border-cream-border flex items-center justify-center bg-cream-dark/50 hover:bg-cream-dark hover:scale-105 transition-all duration-300 focus:outline-none cursor-pointer"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-charcoal-muted" />
              ) : (
                <Moon className="w-4 h-4 text-charcoal-muted" />
              )}
            </button>

            {/* Log Book Action */}
            <button
              onClick={() => setIsLogOpen(true)}
              className="flex items-center gap-1.5 px-3.5 h-9 bg-brand hover:bg-brand-light text-cream font-medium text-xs rounded-lg shadow-sm hover:shadow-md transition-all duration-300 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Log</span>
            </button>

            {/* Account Panel Dropdown */}
            <div className="relative flex items-center" ref={accountDropdownRef}>
              {isProfileLoading || !currentUser.id ? (
                <div
                  className="w-8 h-8 rounded-full border border-cream-border flex items-center justify-center bg-cream-dark/50"
                  aria-label="Loading profile"
                  title="Loading profile"
                >
                  <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
                </div>
              ) : (
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="w-8 h-8 rounded-full border border-cream-border flex items-center justify-center bg-cream-dark/50 hover:bg-cream-dark hover:scale-105 transition-all duration-300 focus:outline-none cursor-pointer"
                title="Account Menu"
                aria-expanded={showAccountDropdown}
                aria-haspopup="true"
              >
                <UserAvatar avatarUrl={currentUser.avatar} name={currentUser.name} size={30} className="border-0 bg-transparent" />
              </button>
              )}

              <AnimatePresence>
                {showAccountDropdown && currentUser.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-10 w-64 bg-cream border border-cream-border rounded-xl shadow-xl overflow-hidden z-50 text-xs text-charcoal font-sans"
                  >
                    {isGuest ? (
                      <>
                        <div className="p-4 bg-cream-card border-b border-cream-border">
                          <p className="font-serif text-base font-bold text-charcoal">Guest</p>
                          <p className="text-[11px] text-charcoal-muted mt-1 leading-relaxed">
                            Log in to sync your library, diary, and reading stats.
                          </p>
                        </div>
                        <div className="p-1.5">
                          <Link
                            href="/auth"
                            onClick={() => setShowAccountDropdown(false)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-brand hover:bg-brand-light text-cream font-bold transition-colors"
                          >
                            <LogIn className="w-4 h-4" />
                            Log in
                          </Link>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Top user section */}
                        <div className="p-4 bg-cream-card border-b border-cream-border flex items-center gap-3">
                          <UserAvatar avatarUrl={currentUser.avatar} name={currentUser.name} size={44} />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-charcoal truncate text-sm" title={currentUser.name}>
                              {currentUser.name}
                            </p>
                            <p className="text-[10px] text-charcoal-muted truncate font-medium">
                              @{currentUser.username}
                            </p>
                            {currentUser.email && (
                              <p className="text-[9px] text-charcoal-light truncate font-mono mt-0.5" title={currentUser.email}>
                                {currentUser.email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Navigation list */}
                        <div className="p-1.5 space-y-0.5">
                          <Link
                            href="/library"
                            onClick={() => setShowAccountDropdown(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-cream-dark/50 transition-colors"
                          >
                            <BookIcon className="w-4 h-4 text-brand-muted" />
                            <span className="font-semibold text-charcoal-light">My Library</span>
                          </Link>
                          <Link
                            href="/diary"
                            onClick={() => setShowAccountDropdown(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-cream-dark/50 transition-colors"
                          >
                            <Calendar className="w-4 h-4 text-brand-muted" />
                            <span className="font-semibold text-charcoal-light">Reading Diary</span>
                          </Link>
                          <Link
                            href="/stats"
                            onClick={() => setShowAccountDropdown(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-cream-dark/50 transition-colors"
                          >
                            <Activity className="w-4 h-4 text-brand-muted" />
                            <span className="font-semibold text-charcoal-light">Reading Stats</span>
                          </Link>
                          <Link
                            href={`/profile/${currentUser.username}`}
                            onClick={() => setShowAccountDropdown(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-cream-dark/50 transition-colors"
                          >
                            <User className="w-4 h-4 text-brand-muted" />
                            <span className="font-semibold text-charcoal-light">View Profile</span>
                          </Link>
                          <Link
                            href="/settings"
                            onClick={() => setShowAccountDropdown(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-cream-dark/50 transition-colors"
                          >
                            <Settings className="w-4 h-4 text-brand-muted" />
                            <span className="font-semibold text-charcoal-light">Account Settings</span>
                          </Link>
                        </div>

                        {/* Footer / Sign Out */}
                        <div className="border-t border-cream-border p-1.5 bg-cream-card/50">
                          <button
                            onClick={async () => {
                              setShowAccountDropdown(false);
                              await signOut();
                              window.location.assign("/");
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span className="font-bold">Sign Out</span>
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {mobileNavOpen && (
          <nav
            id="mobile-nav"
            className="md:hidden border-t border-cream-border bg-cream"
            aria-label="Mobile"
          >
            <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand/10 text-brand"
                          : "text-charcoal-muted hover:bg-cream-dark/60 hover:text-charcoal"
                      }`}
                    >
                      {item.label}
                    </Link>
                );
              })}
            </div>
          </nav>
        )}
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
                        className="w-full h-10 pl-10 pr-10 text-sm bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted transition-colors"
                        autoFocus
                      />
                      {logLoading && (
                        <div className="absolute right-3 top-3.5">
                          <svg className="animate-spin h-3.5 w-3.5 text-brand" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Filtered Log Search List */}
                    <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
                      {logSearchResults.map((book) => (
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
                      {logSearch && !logLoading && logSearchResults.length === 0 && (
                        <p className="text-xs text-charcoal-muted text-center py-6">
                          No matching books found. Try another title or author.
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
  
  {/* Floating Reading Companion Button */}
  <div className="fixed bottom-6 right-6 z-40">
    <button
      onClick={() => setIsCompanionOpen(true)}
      className="relative flex items-center justify-center w-14 h-14 bg-brand text-cream hover:bg-brand-light rounded-full shadow-2xl hover:scale-105 transition-all duration-300 group animate-bounce-subtle"
      aria-label="Track Progress"
    >
      <BookOpen className="w-6 h-6 transition-transform group-hover:rotate-6" />
      {currentlyReading.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-brand-light text-cream text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-cream shadow-md animate-pulse">
          {currentlyReading.length}
        </span>
      )}
    </button>
  </div>
  
  {/* Reading Companion Side Drawer */}
  <AnimatePresence>
    {isCompanionOpen && (
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!showCompletionSuccess) {
              setIsCompanionOpen(false);
            }
          }}
          className="absolute inset-0 bg-charcoal/30 backdrop-blur-xs"
        />

        {/* Drawer Container */}
        <div className="absolute inset-y-0 right-0 max-w-full flex">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-screen max-w-md bg-cream border-l border-cream-border shadow-2xl flex flex-col h-full"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-cream-border flex items-center justify-between bg-cream-card">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand" />
                <span className="font-serif text-lg font-bold text-charcoal">
                  Reading Companion
                </span>
              </div>
              <button
                onClick={() => setIsCompanionOpen(false)}
                className="p-1.5 hover:bg-cream-dark/50 rounded-lg text-charcoal-muted hover:text-charcoal transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {showCompletionSuccess ? (
                /* Completion review submission form */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center shadow-inner">
                      <Award className="w-8 h-8" />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-charcoal">
                      You Finished a Book!
                    </h3>
                    <p className="text-xs text-charcoal-muted max-w-[280px]">
                      Excellent reading! Take a moment to rate and reflect on <strong>{completedBookInfo?.title}</strong> to add it to your reading diary.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-cream-card border border-cream-border rounded-xl text-left">
                    <img
                      src={completedBookInfo?.coverImage}
                      alt={completedBookInfo?.title}
                      className="w-12 h-18 object-cover rounded shadow"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-charcoal truncate">
                        {completedBookInfo?.title}
                      </p>
                      <p className="text-xs text-charcoal-muted truncate font-serif italic">
                        {completedBookInfo?.author}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCompletionSubmit} className="space-y-5 text-left">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-charcoal uppercase tracking-wider block">
                        Rating
                      </label>
                      <StarRating value={completionRating} onChange={setCompletionRating} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-charcoal uppercase tracking-wider block">
                        Review (Optional)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Write a reflection or review..."
                        value={completionReview}
                        onChange={(e) => setCompletionReview(e.target.value)}
                        className="w-full p-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted placeholder-charcoal-muted"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-brand hover:bg-brand-light text-cream font-semibold text-xs rounded-lg shadow transition-all duration-300"
                    >
                      Publish Review & Complete
                    </button>
                  </form>
                </motion.div>
              ) : currentlyReading.length > 0 ? (
                /* Progress Logging Form */
                <div className="space-y-6">
                  {/* Book Selector if multiple books */}
                  {currentlyReading.length > 1 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider block">
                        Switch Active Book
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {currentlyReading.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => setSelectedCompanionBookId(b.id)}
                            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                              (selectedCompanionBookId === b.id || (!selectedCompanionBookId && currentlyReading[0].id === b.id))
                                ? "bg-brand/10 border-brand text-brand font-semibold"
                                : "bg-cream-card border-cream-border text-charcoal-muted hover:border-charcoal hover:text-charcoal"
                            }`}
                          >
                            {b.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Book Details & Progress */}
                  {(() => {
                    const activeBook = currentlyReading.find((b) => b.id === selectedCompanionBookId) || currentlyReading[0];
                    if (!activeBook) return null;

                    const progressPercent = activeBook.pages > 0 ? Math.round((activeBook.currentPage / activeBook.pages) * 100) : 0;
                    const pagesRemaining = Math.max(0, activeBook.pages - activeBook.currentPage);

                    // Find historical sessions for estimated completion rate
                    const bookSessions = readingSessions.filter((s) => s.book_id === activeBook.id);
                    let estimatedDays = null;
                    if (bookSessions.length > 0 && pagesRemaining > 0) {
                      const avgPagesPerSession = bookSessions.reduce((acc, s) => acc + s.pages_read, 0) / bookSessions.length;
                      estimatedDays = Math.ceil(pagesRemaining / (avgPagesPerSession || 1));
                    }

                    return (
                      <div className="space-y-6">
                        {/* Card Details */}
                        <div className="flex items-center gap-4 p-4 bg-cream-card border border-cream-border rounded-xl">
                          <img
                            src={activeBook.coverImage}
                            alt={activeBook.title}
                            className="w-16 h-24 object-cover rounded shadow-md border border-cream-border animate-fade-in"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-charcoal truncate">
                              {activeBook.title}
                            </h4>
                            <p className="text-xs text-charcoal-muted truncate mb-2 font-serif italic">
                              by {activeBook.author}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-brand font-medium">
                              <Bookmark className="w-3.5 h-3.5" />
                              <span>{activeBook.currentPage} / {activeBook.pages} pages</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5 bg-cream-card border border-cream-border rounded-xl p-4 shadow-xs">
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
                          <div className="flex justify-between text-[10px] text-charcoal-muted pt-1">
                            <span>{pagesRemaining} pages left</span>
                            {estimatedDays !== null ? (
                              <span>~{estimatedDays} days to finish</span>
                            ) : (
                              <span>Keep reading to get estimates</span>
                            )}
                          </div>
                        </div>

                        {/* Log Progress Form */}
                        <form
                          onSubmit={(e) => handleCompanionSubmit(e, activeBook)}
                          className="space-y-4"
                        >
                          <div className="bg-cream-card border border-cream-border rounded-xl p-4 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between border-b border-cream-border pb-3">
                              <span className="text-xs font-bold text-charcoal">Log Progress</span>
                              <div className="flex rounded-md bg-cream-dark p-0.5">
                                {(["increment", "absolute"] as const).map((method) => (
                                  <button
                                    type="button"
                                    key={method}
                                    onClick={() => setLogMethod(method)}
                                    className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
                                      logMethod === method
                                        ? "bg-cream text-brand shadow-sm"
                                        : "text-charcoal-muted hover:text-charcoal"
                                    }`}
                                  >
                                    {method === "increment" ? "+ Pages" : "Page #"}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {logMethod === "increment" ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] font-bold text-charcoal-muted uppercase block mb-1">
                                    Pages Read
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max={pagesRemaining}
                                    placeholder="e.g. 25"
                                    value={pagesReadInput}
                                    onChange={(e) => setPagesReadInput(e.target.value)}
                                    className="w-full h-10 px-3 text-sm bg-cream border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                                    required
                                  />
                                </div>
                                {/* Presets */}
                                <div className="flex gap-2">
                                  {[10, 25, 50, 100].map((preset) => {
                                    const disabled = preset > pagesRemaining;
                                    return (
                                      <button
                                        type="button"
                                        key={preset}
                                        disabled={disabled}
                                        onClick={() => setPagesReadInput(preset.toString())}
                                        className={`flex-1 text-center py-1.5 text-xs font-semibold rounded border transition-all ${
                                          disabled
                                            ? "opacity-40 cursor-not-allowed border-cream-border text-charcoal-muted"
                                            : "bg-cream-card border-cream-border text-charcoal hover:border-brand hover:text-brand"
                                        }`}
                                      >
                                        +{preset}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <label className="text-[10px] font-bold text-charcoal-muted uppercase block mb-1">
                                  Current Page
                                </label>
                                <input
                                  type="number"
                                  min={activeBook.currentPage + 1}
                                  max={activeBook.pages}
                                  placeholder={`Between ${activeBook.currentPage + 1} and ${activeBook.pages}`}
                                  value={currentPageInput}
                                  onChange={(e) => setCurrentPageInput(e.target.value)}
                                  className="w-full h-10 px-3 text-sm bg-cream border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                                  required
                                />
                              </div>
                            )}

                            {/* Reading Time */}
                            <div>
                              <label className="text-[10px] font-bold text-charcoal-muted uppercase block mb-1">
                                Reading Time (Minutes)
                              </label>
                              <div className="relative">
                                <Clock className="absolute left-3 top-3 h-4 w-4 text-charcoal-muted" />
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Optional, e.g. 45"
                                  value={readingMinutesInput}
                                  onChange={(e) => setReadingMinutesInput(e.target.value)}
                                  className="w-full h-10 pl-9 pr-3 text-sm bg-cream border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                                />
                              </div>
                            </div>

                            {/* Optional Note */}
                            <div>
                              <label className="text-[10px] font-bold text-charcoal-muted uppercase block mb-1">
                                Session Note
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Optional note e.g. Amazing plot twist!"
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                className="w-full p-3 text-xs bg-cream border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted placeholder-charcoal-muted"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3 bg-brand hover:bg-brand-light text-cream font-semibold text-xs rounded-lg shadow-md transition-all duration-300"
                          >
                            Save Entry
                          </button>
                        </form>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Empty state / start new reading list */
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <BookIcon className="w-12 h-12 text-charcoal-muted mx-auto mb-3 opacity-60" />
                    <h4 className="font-serif text-base font-bold text-charcoal">No Active Reads</h4>
                    <p className="text-xs text-charcoal-muted mt-1 max-w-[250px] mx-auto">
                      Ready for a new adventure? Search for a book or select one from your Want to Read shelf to start tracking progress.
                    </p>
                  </div>

                  {/* Search box to start new book */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-charcoal uppercase tracking-wider block">
                      Start Reading a New Book
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal-muted" />
                      <input
                        type="text"
                        placeholder="Search title, author..."
                        value={companionSearch}
                        onChange={(e) => setCompanionSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-3 text-sm bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted placeholder-charcoal-muted"
                      />
                    </div>

                    {companionLoading && (
                      <div className="text-center py-2">
                        <span className="inline-block w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {companionSearchResults.length > 0 && (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto mt-2">
                        {companionSearchResults.map((book) => (
                          <div
                            key={book.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-cream-card border border-cream-border hover:border-brand/40 transition-all"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={book.coverImage}
                                alt={book.title}
                                className="w-8 h-12 object-cover rounded shadow-xs flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-charcoal truncate">{book.title}</p>
                                <p className="text-[10px] text-charcoal-muted truncate font-serif italic">{book.author}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleStartReading(book.id)}
                              className="px-2.5 py-1 text-[10px] font-semibold bg-brand text-cream rounded hover:bg-brand-light transition-all flex-shrink-0"
                            >
                              Start
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Display Want to Read books */}
                  {wantToReadBooks.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                        From Want to Read List
                      </h4>
                      <div className="space-y-2">
                        {wantToReadBooks.slice(0, 4).map((book) => (
                          <div
                            key={book.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-cream-card border border-cream-border"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={book.coverImage}
                                alt={book.title}
                                className="w-8 h-12 object-cover rounded shadow-xs flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-charcoal truncate">{book.title}</p>
                                <p className="text-[10px] text-charcoal-muted truncate font-serif italic">{book.author}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleStartReading(book.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold border border-brand text-brand rounded-lg hover:bg-brand hover:text-cream transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Start</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    )}
  </AnimatePresence>
</>
);
}
