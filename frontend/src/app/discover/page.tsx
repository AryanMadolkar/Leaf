"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";
import CoverImage from "@/components/CoverImage";
import { useLeaf } from "@/context/LeafContext";
import { Book } from "@/data/mockData";
import type { CatalogShelf } from "@/utils/bookCatalog";
import { isFakeBookId } from "@/utils/bookCatalog";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";
import {
  buildGenreDistribution,
  canonicalGenresForBook,
  favoriteGenreFromTags,
} from "@/utils/genreUtils";
import {
  Sparkles, BookOpen, Star, Award, Compass,
  ChevronRight, Loader2, Library, Plus, MessageSquare, History, RefreshCw, Dice5
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ShelfConfig = { key: CatalogShelf; title: string; description: string; icon: React.ElementType };

const CURATED_SHELVES: ShelfConfig[] = [
  { key: "all-time-greats", title: "All-Time Greats", description: "The highest rated and most influential works ever written", icon: Star },
  { key: "trending", title: "Trending This Week", description: "Fresh community picks — refreshed every week", icon: Compass },
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
  const weekParam = shelf === "trending" ? `&week=${encodeURIComponent(new Date().toISOString().slice(0, 10))}` : "";
  const res = await fetch(`/api/books/catalog?shelf=${shelf}&limit=${limit}${weekParam}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.success ? data.books : [];
}

export default function DiscoverPage() {
  const router = useRouter();
  const { books, diaryLogs, logBook, currentUser } = useLeaf();

  // Hero featured book (server-cached, rotates daily)
  const [heroBook, setHeroBook] = useState<Book | null>(null);
  const [heroDate, setHeroDate] = useState<string | null>(null);
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

  // Fetch daily featured volume from cached API
  useEffect(() => {
    async function loadFeatured() {
      setHeroLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(`/api/books/featured?date=${today}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.book) {
            setHeroBook(data.book);
            setHeroDate(data.date || today);
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

  // Personalized shelves — score catalog books against the user's real literary genres
  const loggedBookIds = useMemo(
    () => new Set(diaryLogs.filter((l) => l.userId === currentUser?.id).map((l) => l.bookId)),
    [diaryLogs, currentUser?.id]
  );

  const userBookGenreLists = useMemo(() => {
    return diaryLogs
      .filter((l) => l.userId === currentUser?.id)
      .map((log) => books.find((b) => b.id === log.bookId)?.genres)
      .filter(Boolean) as string[][];
  }, [diaryLogs, books, currentUser?.id]);

  const tasteProfile = useMemo(() => {
    const dist = buildGenreDistribution(userBookGenreLists, 5);
    const topGenres = dist.map((g) => g.name);
    const favoriteGenre = dist[0]?.name || favoriteGenreFromTags(userBookGenreLists) || "Fiction";
    const genreWeights = new Map(dist.map((g) => [g.name, g.count]));
    return { topGenres, favoriteGenre, genreWeights, dist };
  }, [userBookGenreLists]);

  const lastLoggedBook = useMemo(() => {
    const mine = diaryLogs
      .filter((l) => l.userId === currentUser?.id && l.bookId)
      .sort((a, b) => (b.dateLogged || "").localeCompare(a.dateLogged || ""));
    if (mine.length === 0) return null;
    return books.find((b) => b.id === mine[0].bookId) || null;
  }, [diaryLogs, books, currentUser?.id]);

  const becauseYouLiked = useMemo(() => {
    if (!lastLoggedBook) return [];
    const seedGenres = new Set(canonicalGenresForBook(lastLoggedBook.genres));
    if (seedGenres.size === 0) return [];

    return books
      .filter((b) => !loggedBookIds.has(b.id) && b.id !== lastLoggedBook.id && !isFakeBookId(b.id) && COVER_ID_BY_ISBN[b.id])
      .map((b) => {
        const genres = canonicalGenresForBook(b.genres);
        const overlap = genres.filter((g) => seedGenres.has(g)).length;
        return { book: b, overlap, rating: b.averageRating };
      })
      .filter((x) => x.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || b.rating - a.rating)
      .slice(0, 12)
      .map((x) => x.book);
  }, [lastLoggedBook, books, loggedBookIds]);

  const basedOnGenres = useMemo(() => {
    const { topGenres, genreWeights } = tasteProfile;
    if (topGenres.length === 0) return [];

    const topSet = new Set(topGenres);

    return books
      .filter((b) => !loggedBookIds.has(b.id) && !isFakeBookId(b.id) && COVER_ID_BY_ISBN[b.id])
      .map((b) => {
        const genres = canonicalGenresForBook(b.genres);
        // Require a real literary-genre overlap with the user's top tastes
        const matched = genres.filter((g) => topSet.has(g));
        if (matched.length === 0) return null;

        // Weight by how often the user reads that genre + book rating
        const weight = matched.reduce((sum, g) => sum + (genreWeights.get(g) || 1), 0);
        const primaryBoost = matched.includes(topGenres[0]) ? 3 : 0;
        return {
          book: b,
          score: weight * 2 + primaryBoost + b.averageRating,
        };
      })
      .filter((x): x is { book: Book; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.book);
  }, [books, loggedBookIds, tasteProfile]);

  const tasteLabel = useMemo(() => {
    const tops = tasteProfile.topGenres.slice(0, 2);
    if (tops.length === 0) return "your reading profile";
    if (tops.length === 1) return tops[0];
    return `${tops[0]} & ${tops[1]}`;
  }, [tasteProfile.topGenres]);

  /** Taste-biased pool for the Random for You card */
  const randomPool = useMemo(() => {
    const scored = books
      .filter((b) => !loggedBookIds.has(b.id) && !isFakeBookId(b.id) && COVER_ID_BY_ISBN[b.id])
      .map((b) => {
        const genres = canonicalGenresForBook(b.genres);
        const { topGenres, genreWeights } = tasteProfile;
        if (topGenres.length === 0) {
          return { book: b, score: b.averageRating };
        }
        const matched = genres.filter((g) => topGenres.includes(g));
        if (matched.length === 0) {
          return { book: b, score: b.averageRating * 0.25 };
        }
        const weight = matched.reduce((sum, g) => sum + (genreWeights.get(g) || 1), 0);
        const primaryBoost = matched.includes(topGenres[0]) ? 4 : 0;
        return { book: b, score: weight * 2 + primaryBoost + b.averageRating };
      })
      .sort((a, b) => b.score - a.score);

    const topN = Math.min(60, Math.max(20, scored.length));
    return scored.slice(0, topN).map((x) => x.book);
  }, [books, loggedBookIds, tasteProfile]);

  const [randomBook, setRandomBook] = useState<Book | null>(null);
  const [randomSeen, setRandomSeen] = useState<string[]>([]);

  useEffect(() => {
    if (randomPool.length === 0) {
      setRandomBook(null);
      return;
    }
    if (randomBook && randomPool.some((b) => b.id === randomBook.id)) return;
    const pick = randomPool[Math.floor(Math.random() * randomPool.length)];
    setRandomBook(pick);
  }, [randomPool, randomBook]);

  const refreshRandomBook = () => {
    if (randomPool.length === 0) return;
    const avoid = new Set([...(randomBook ? [randomBook.id] : []), ...randomSeen.slice(-12)]);
    let candidates = randomPool.filter((b) => !avoid.has(b.id));
    if (candidates.length === 0) {
      candidates = randomPool.filter((b) => b.id !== randomBook?.id);
    }
    if (candidates.length === 0) candidates = randomPool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setRandomBook(pick);
    setRandomSeen((prev) => [...prev, pick.id].slice(-24));
  };

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
        
        <>
            {/* Random for You */}
            {randomBook && (
              <section className="bg-cream-card border border-cream-border rounded-2xl p-5 md:p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Dice5 className="w-4 h-4 text-brand flex-shrink-0" />
                      <h2 className="font-serif text-lg font-bold text-charcoal">Random for You</h2>
                    </div>
                    <p className="text-[11px] text-charcoal-muted">
                      {tasteProfile.topGenres.length > 0
                        ? `A surprise pick tuned to ${tasteLabel}`
                        : "A surprise pick from the catalog — log a few books to personalize"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshRandomBook}
                    className="h-9 px-3 flex items-center gap-1.5 text-[11px] font-bold rounded-lg border border-cream-border bg-cream hover:border-brand hover:text-brand text-charcoal transition-colors flex-shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative w-28 h-40 rounded-lg overflow-hidden book-shadow bg-cream-dark flex-shrink-0">
                    <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-gradient-to-r from-charcoal/20 to-transparent z-10" />
                    <CoverImage
                      src={randomBook.coverImage}
                      title={randomBook.title}
                      author={randomBook.author}
                      isbn={randomBook.id}
                      bookId={randomBook.id}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover select-none"
                    />
                  </div>
                  <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
                    <div className="space-y-1">
                      <h3 className="font-serif text-xl font-bold text-charcoal leading-tight truncate">
                        {randomBook.title}
                      </h3>
                      <p className="text-xs text-charcoal-muted font-semibold">
                        by {randomBook.author} · {randomBook.year}
                      </p>
                    </div>
                    <p className="text-xs text-charcoal-light leading-relaxed line-clamp-2 max-w-xl">
                      {randomBook.description}
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => router.push(`/book/${randomBook.id}`)}
                        className="px-4 py-2 bg-charcoal text-cream rounded-lg text-xs font-bold hover:bg-charcoal/90 transition-colors flex items-center gap-1.5"
                      >
                        View Book <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogModalBook(randomBook)}
                        className="px-4 py-2 bg-cream border border-cream-border text-charcoal rounded-lg text-xs font-bold hover:bg-cream-dark transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add to Library
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

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
                    bookId={heroBook.id}
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover select-none"
                    priority
                  />
                </div>

                {/* Metadata details */}
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="space-y-2">
                    <span className="px-2.5 py-1 bg-brand/10 border border-brand/20 text-brand rounded-full text-[9px] font-bold tracking-wider uppercase">
                      Featured Volume of the Day
                      {heroDate
                        ? ` · ${new Date(heroDate + "T12:00:00Z").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}`
                        : ""}
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
            {diaryLogs.some((l) => l.userId === currentUser?.id) && basedOnGenres.length > 0 && (
              <div className="space-y-12 py-4 border-t border-b border-cream-border/40">
                {lastLoggedBook && becauseYouLiked.length > 0 && (
                  <Shelf 
                    title={`Because you liked ${lastLoggedBook.title}`} 
                    description={`More ${canonicalGenresForBook(lastLoggedBook.genres).slice(0, 2).join(" · ") || "reads"} like your latest log`}
                    booksList={becauseYouLiked} 
                    icon={History} 
                  />
                )}
                <Shelf 
                  title="Curated For Your Taste" 
                  description={`Popular books matching your reading profile (${tasteLabel})`} 
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
