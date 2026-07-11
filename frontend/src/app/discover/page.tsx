"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";
import CoverImage from "@/components/CoverImage";
import { useLeaf } from "@/context/LeafContext";
import { Book } from "@/data/mockData";
import type { CatalogShelf } from "@/utils/bookCatalog";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";
import { 
  Search, Sparkles, BookOpen, Star, Award, Compass, 
  ChevronRight, Loader2, Library, Plus, MessageSquare, History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ShelfConfig = { key: CatalogShelf; title: string; description: string; icon: React.ElementType };

const CURATED_SHELVES: ShelfConfig[] = [
  { key: "all-time-greats", title: "All-Time Greats", description: "The highest rated and most influential works ever written", icon: Star },
  { key: "trending", title: "Trending This Week", description: "Volumes currently popular among the community", icon: Compass },
  { key: "most-added", title: "Most Added This Month", description: "Titles currently filling up reader libraries", icon: Library },
  { key: "booktok", title: "BookTok Favorites", description: "Modern romance and viral favorites", icon: MessageSquare },
  { key: "award-winners", title: "Award Winners", description: "Pulitzer, Booker, Hugo, and Nebula prize laureates", icon: Award },
  { key: "modern-classics", title: "Modern Classics", description: "Post-20th century masterpieces everyone should read", icon: BookOpen },
  { key: "scifi", title: "Sci-Fi Essentials", description: "Curated science fiction masterpieces", icon: Sparkles },
  { key: "fantasy", title: "Fantasy Essentials", description: "Epic high-fantasy novels and series", icon: Award },
  { key: "literary", title: "Literary Fiction", description: "Beautifully written classic and modern works", icon: BookOpen },
  { key: "mystery", title: "Mystery & Thriller", description: "Acclaimed suspense, crime, and detective fiction", icon: Compass },
  { key: "romance", title: "Romance Pillars", description: "Acclaimed love stories, historical and contemporary", icon: Sparkles },
  { key: "historical", title: "Historical Fiction", description: "Immersive journeys through the corridors of time", icon: BookOpen },
  { key: "biography", title: "Biography & Memoir", description: "Memorable human stories and definitive chronicles", icon: Award },
  { key: "nonfiction", title: "Non-Fiction Bestsellers", description: "Ideas, habits, history, and science shaping our minds", icon: Compass },
];

async function fetchShelf(shelf: CatalogShelf, limit = 12): Promise<Book[]> {
  const res = await fetch(`/api/books/catalog?shelf=${shelf}&limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.success ? data.books : [];
}

export default function DiscoverPage() {
  const router = useRouter();
  const { books, diaryLogs, logBook, session } = useLeaf();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState("");

  // Hero featured book (server-cached, rotates daily)
  const [heroBook, setHeroBook] = useState<Book | null>(null);
  const [heroLoading, setHeroLoading] = useState(true);

  // Cached catalog shelves
  const [shelfData, setShelfData] = useState<Record<string, Book[]>>({});
  const [leaderboard, setLeaderboard] = useState<Book[]>([]);
  const [shelvesLoading, setShelvesLoading] = useState(true);

  // Quick Action Shelf Drawer/Log Modal state
  const [logModalBook, setLogModalBook] = useState<Book | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"Want to Read" | "Currently Reading" | "Finished">("Want to Read");
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [logReview, setLogReview] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounce(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Execute Search
  useEffect(() => {
    async function performSearch() {
      if (!searchDebounce || searchDebounce.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(searchDebounce)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSearchResults(data.books || []);
          }
        }
      } catch (err) {
        console.error("Discover search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }
    performSearch();
  }, [searchDebounce]);

  // Fetch daily featured volume from cached API
  useEffect(() => {
    async function loadFeatured() {
      setHeroLoading(true);
      try {
        const res = await fetch("/api/books/featured");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.book) {
            setHeroBook(data.book);
          }
        }
      } catch (err) {
        console.error("Failed to load featured book:", err);
      } finally {
        setHeroLoading(false);
      }
    }
    loadFeatured();
  }, []);

  // Load catalog shelves from cached API
  useEffect(() => {
    async function loadShelves() {
      setShelvesLoading(true);
      try {
        const results = await Promise.all(
          CURATED_SHELVES.map(async (s) => ({ key: s.key, books: await fetchShelf(s.key, 12) }))
        );
        const map: Record<string, Book[]> = {};
        results.forEach((r) => { map[r.key] = r.books; });
        setShelfData(map);

        const lb = await fetchShelf("leaderboard", 25);
        setLeaderboard(lb);
      } catch (err) {
        console.error("Failed to load catalog shelves:", err);
      } finally {
        setShelvesLoading(false);
      }
    }
    loadShelves();
  }, []);

  // Personalized shelves logic
  const lastLoggedBook = diaryLogs.length > 0 ? books.find((b) => b.id === diaryLogs[diaryLogs.length - 1].bookId) : null;
  const favoriteGenre = lastLoggedBook?.genres?.[0] || "Fiction";
  const userGenres = Array.from(new Set(diaryLogs.flatMap((log) => {
    const b = books.find((x) => x.id === log.bookId);
    return b ? b.genres : [];
  })));

  const becauseYouLiked = lastLoggedBook
    ? books.filter((b) => b.id !== lastLoggedBook.id && b.genres.some((g) => lastLoggedBook.genres.includes(g))).slice(0, 12)
    : [];

  const basedOnGenres = userGenres.length > 0
    ? books.filter((b) => b.genres.some((g) => userGenres.includes(g))).slice(0, 12)
    : books.filter((b) => b.genres.includes(favoriteGenre)).slice(0, 12);

  // Quick log execution
  const handleQuickLog = async () => {
    if (!logModalBook) return;
    setIsLogging(true);
    try {
      await logBook(logModalBook.id, selectedStatus, selectedRating || undefined, logReview || undefined);
      setLogModalBook(null);
      setSelectedRating(0);
      setLogReview("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLogging(false);
    }
  };

  // Curated shelf custom horizontal scroller helper
  const Shelf = ({ title, description, booksList, icon: Icon }: { title: string; description: string; booksList: Book[]; icon: any }) => {
    if (booksList.length === 0) return null;
    return (
      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-cream-border/60 pb-2">
          <div className="space-y-1">
            <h3 className="font-serif text-xl font-bold text-charcoal flex items-center gap-2">
              <Icon className="w-5 h-5 text-brand" />
              {title}
            </h3>
            <p className="text-[10px] text-charcoal-muted font-sans font-medium uppercase tracking-wider">{description}</p>
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-brand-muted/20 hover:scrollbar-thumb-brand-muted/40">
          {booksList.map((book) => (
            <div key={book.id} className="snap-start flex-shrink-0 w-28 sm:w-32 flex flex-col space-y-2 group">
              <BookCard book={book} size="sm" />
              <div className="text-center px-1">
                <p className="text-[11px] font-bold text-charcoal line-clamp-1 group-hover:text-brand transition-colors cursor-pointer" onClick={() => router.push(`/book/${book.id}`)}>
                  {book.title}
                </p>
                <p className="text-[9px] text-charcoal-muted truncate">
                  {book.author}
                </p>
                <div className="flex items-center justify-center gap-0.5 mt-0.5 text-yellow-500">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <span className="text-[9px] font-bold text-charcoal-light">
                    {book.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col font-sans select-none">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-14">
        
        {/* Global Premium Search Bar */}
        <section className="max-w-2xl mx-auto space-y-2 text-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-brand/5 rounded-2xl blur-xl group-hover:bg-brand/10 transition-all duration-300 pointer-events-none" />
            <div className="relative flex items-center bg-cream-card border border-cream-border rounded-xl shadow-sm overflow-hidden focus-within:border-brand transition-all duration-300">
              <Search className="w-5 h-5 text-charcoal-muted ml-4 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by title, author, or ISBN in local catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-3.5 pl-3 pr-12 text-xs bg-transparent text-charcoal placeholder-charcoal-muted focus:outline-none"
              />
              {searchLoading && (
                <Loader2 className="absolute right-4 w-4 h-4 text-brand animate-spin" />
              )}
            </div>
          </div>
        </section>

        {/* Search Results Active Overlay */}
        <AnimatePresence>
          {searchQuery.trim().length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-cream-card border border-cream-border rounded-2xl p-6 space-y-6 shadow-md"
            >
              <div className="flex items-center justify-between border-b border-cream-border pb-3">
                <h2 className="font-serif text-lg font-bold text-charcoal">
                  Search Results for &ldquo;{searchQuery}&rdquo; ({searchResults.length})
                </h2>
                <button 
                  onClick={() => setSearchQuery("")}
                  className="text-[10px] font-bold text-brand hover:underline"
                >
                  Clear Search
                </button>
              </div>

              {searchLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="w-8 h-8 text-brand animate-spin" />
                  <p className="text-xs text-charcoal-muted">Searching volumes...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center">
                  {searchResults.map((book) => (
                    <div key={book.id} className="space-y-2 text-center w-28 sm:w-32 group">
                      <BookCard book={book} size="sm" />
                      <div>
                        <p className="text-[11px] font-bold text-charcoal line-clamp-1 group-hover:text-brand cursor-pointer" onClick={() => router.push(`/book/${book.id}`)}>
                          {book.title}
                        </p>
                        <p className="text-[9px] text-charcoal-muted truncate">{book.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xs text-charcoal-muted">No books found in the local catalog matching that search query.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Default Curated Editorial View (only shown when search query is empty) */}
        {searchQuery.trim().length < 2 && (
          <>
            {/* Featured Daily Hero Banner */}
            {heroLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
              </div>
            ) : heroBook && (
              <section className="relative overflow-hidden bg-cream-card border border-cream-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-3xl -z-10" />

                {/* Cover container */}
                <div className="relative w-40 h-56 rounded-lg overflow-hidden book-shadow bg-cream-dark flex-shrink-0">
                  <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-gradient-to-r from-charcoal/20 to-transparent z-10" />
                  <CoverImage
                    src={heroBook.coverImage}
                    title={heroBook.title}
                    author={heroBook.author}
                    isbn={heroBook.id}
                    coverId={COVER_ID_BY_ISBN[heroBook.id]}
                    bookId={heroBook.id}
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover select-none"
                  />
                </div>

                {/* Metadata details */}
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="space-y-2">
                    <span className="px-2.5 py-1 bg-brand/10 border border-brand/20 text-brand rounded-full text-[9px] font-bold tracking-wider uppercase">
                      Featured Volume of the Day
                    </span>
                    <h2 className="font-serif text-3xl font-bold text-charcoal leading-tight">
                      {heroBook.title}
                    </h2>
                    <p className="text-xs text-charcoal-muted font-semibold">
                      by {heroBook.author} &bull; {heroBook.year}
                    </p>
                  </div>

                  <p className="text-xs text-charcoal-light leading-relaxed max-w-xl line-clamp-4">
                    {heroBook.description}
                  </p>

                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{heroBook.averageRating.toFixed(1)}</span>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-cream-border" />
                    <span className="text-[10px] bg-cream border border-cream-border px-2.5 py-0.5 rounded-md font-semibold text-charcoal-muted">
                      {heroBook.genres[0]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                    <button
                      onClick={() => router.push(`/book/${heroBook.id}`)}
                      className="px-5 py-2 bg-charcoal text-cream rounded-lg text-xs font-bold hover:bg-charcoal/90 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      View Book <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setLogModalBook(heroBook)}
                      className="px-5 py-2 bg-cream-card border border-cream-border text-charcoal rounded-lg text-xs font-bold hover:bg-cream-dark transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to Library
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Personalized Recommendations Section */}
            {diaryLogs.length > 0 && (
              <div className="space-y-12 py-4 border-t border-b border-cream-border/40">
                {lastLoggedBook && (
                  <Shelf 
                    title={`Because you liked ${lastLoggedBook.title}`} 
                    description="Personalized based on subjects of your latest activity" 
                    booksList={becauseYouLiked} 
                    icon={History} 
                  />
                )}
                <Shelf 
                  title="Curated For Your Taste" 
                  description={`Popular books matching your reading profile (${favoriteGenre})`} 
                  booksList={basedOnGenres} 
                  icon={Sparkles} 
                />
              </div>
            )}

            {/* Curated Editorial Shelves (cached API) */}
            {shelvesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-brand animate-spin" />
              </div>
            ) : (
              <div className="space-y-12">
                {CURATED_SHELVES.slice(0, 6).map((s) => (
                  <Shelf key={s.key} title={s.title} description={s.description} booksList={shelfData[s.key] || []} icon={s.icon} />
                ))}
              </div>
            )}

            {/* Two-Column: Sci-Fi & Fantasy essentials */}
            {!shelvesLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-cream-border/60 pt-10">
                <Shelf title="Sci-Fi Essentials" description="Curated science fiction masterpieces" booksList={shelfData["scifi"] || []} icon={Sparkles} />
                <Shelf title="Fantasy Essentials" description="Epic high-fantasy novels and series" booksList={shelfData["fantasy"] || []} icon={Award} />
              </div>
            )}

            {/* Two-Column: Literary Fiction & Mystery */}
            {!shelvesLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-cream-border/60 pt-10">
                <Shelf title="Literary Fiction" description="Beautifully written classic and modern works" booksList={shelfData["literary"] || []} icon={BookOpen} />
                <Shelf title="Mystery & Thriller" description="Acclaimed suspense, crime, and detective fiction" booksList={shelfData["mystery"] || []} icon={Compass} />
              </div>
            )}

            {/* Two-Column: Romance & Historical Fiction */}
            {!shelvesLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-cream-border/60 pt-10">
                <Shelf title="Romance Pillars" description="Acclaimed love stories, historical and contemporary" booksList={shelfData["romance"] || []} icon={Sparkles} />
                <Shelf title="Historical Fiction" description="Immersive journeys through the corridors of time" booksList={shelfData["historical"] || []} icon={BookOpen} />
              </div>
            )}

            {/* Two-Column: Biography/Memoir & Non-Fiction */}
            {!shelvesLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-cream-border/60 pt-10">
                <Shelf title="Biography & Memoir" description="Memorable human stories and definitive chronicles" booksList={shelfData["biography"] || []} icon={Award} />
                <Shelf title="Non-Fiction Bestsellers" description="Ideas, habits, history, and science shaping our minds" booksList={shelfData["nonfiction"] || []} icon={Compass} />
              </div>
            )}

            {/* Community Rankings Leaderboard */}
            <section className="bg-cream-card border border-cream-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm border-t border-cream-border/60 pt-10">
              <div className="border-b border-cream-border pb-3 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl font-bold text-charcoal flex items-center gap-2">
                    <Award className="w-6 h-6 text-brand" />
                    Top 25 Books on Leaf
                  </h3>
                  <p className="text-[10px] text-charcoal-muted uppercase tracking-wider font-semibold">Community Rating Leaderboard</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Left Column (Ranks 1-13) */}
                <div className="space-y-4">
                  {leaderboard.slice(0, 13).map((book, idx) => (
                    <div 
                      key={book.id} 
                      onClick={() => router.push(`/book/${book.id}`)}
                      className="flex items-center gap-4 p-2 hover:bg-cream border border-transparent hover:border-cream-border rounded-xl cursor-pointer transition-all duration-300"
                    >
                      <span className="font-serif text-lg font-bold text-brand-muted/70 w-6 text-center">
                        {idx + 1}
                      </span>
                      <CoverImage
                        src={book.coverImage}
                        title={book.title}
                        author={book.author}
                        isbn={book.id}
                        coverId={COVER_ID_BY_ISBN[book.id]}
                        bookId={book.id}
                        className="w-10 h-14 rounded-md book-shadow flex-shrink-0"
                        imgClassName="w-full h-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-charcoal truncate">{book.title}</p>
                        <p className="text-[10px] text-charcoal-muted truncate">{book.author}</p>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500 font-bold text-[10px]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{book.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Column (Ranks 14-25) */}
                <div className="space-y-4">
                  {leaderboard.slice(13, 25).map((book, idx) => (
                    <div 
                      key={book.id} 
                      onClick={() => router.push(`/book/${book.id}`)}
                      className="flex items-center gap-4 p-2 hover:bg-cream border border-transparent hover:border-cream-border rounded-xl cursor-pointer transition-all duration-300"
                    >
                      <span className="font-serif text-lg font-bold text-brand-muted/70 w-6 text-center">
                        {idx + 14}
                      </span>
                      <CoverImage
                        src={book.coverImage}
                        title={book.title}
                        author={book.author}
                        isbn={book.id}
                        coverId={COVER_ID_BY_ISBN[book.id]}
                        bookId={book.id}
                        className="w-10 h-14 rounded-md book-shadow flex-shrink-0"
                        imgClassName="w-full h-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-charcoal truncate">{book.title}</p>
                        <p className="text-[10px] text-charcoal-muted truncate">{book.author}</p>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500 font-bold text-[10px]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{book.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

      </main>

      {/* Quick Add Log Drawer / Modal */}
      <AnimatePresence>
        {logModalBook && (
          <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-cream border border-cream-border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-xl relative text-left"
            >
              <div className="space-y-2">
                <h3 className="font-serif text-xl font-bold text-charcoal">
                  Add to Library
                </h3>
                <p className="text-xs text-charcoal-muted">
                  Log &ldquo;{logModalBook.title}&rdquo; to your reading list.
                </p>
              </div>

              {/* Status Radio Buttons */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-charcoal-muted">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Want to Read", "Currently Reading", "Finished"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setSelectedStatus(status);
                        if (status !== "Finished") setSelectedRating(0);
                      }}
                      className={`py-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                        selectedStatus === status
                          ? "bg-brand border-brand text-cream shadow-sm"
                          : "bg-cream-card border-cream-border text-charcoal hover:border-charcoal"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review/Rating Section (Shown only if status is Finished) */}
              {selectedStatus === "Finished" && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Rating selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-charcoal-muted">
                      Your Rating
                    </label>
                    <div className="flex gap-1.5 text-yellow-500">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isSelected = selectedRating >= star;
                        return (
                          <button
                            key={star}
                            onClick={() => setSelectedRating(star)}
                            className="focus:outline-none transition-transform hover:scale-110"
                          >
                            <Star className={`w-6 h-6 ${isSelected ? "fill-current" : "text-cream-border"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review input */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-charcoal-muted">
                      Write a Review (Optional)
                    </label>
                    <textarea
                      placeholder="Share your thoughts on this volume..."
                      value={logReview}
                      onChange={(e) => setLogReview(e.target.value)}
                      rows={3}
                      className="w-full p-3 text-xs bg-cream-card border border-cream-border rounded-xl text-charcoal focus:outline-none focus:border-brand-muted"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setLogModalBook(null)}
                  className="px-4 py-2 border border-cream-border text-charcoal-muted hover:text-charcoal rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickLog}
                  disabled={isLogging}
                  className="px-5 py-2 bg-brand text-cream font-bold rounded-lg text-xs hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {isLogging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save to Library
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
