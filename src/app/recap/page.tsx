"use client";

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import { useLeaf } from "@/context/LeafContext";
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Share2, 
  X, 
  Download, 
  Flame, 
  BookOpen, 
  Clock, 
  Award, 
  BookOpenCheck,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RecapPage() {
  const { currentUser, books, diaryLogs } = useLeaf();
  const router = useRouter();
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const slideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load stats data
  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const res = await fetch(`/api/stats?userId=${currentUser.id}`);
        if (res.ok) {
          const payload = await res.json();
          if (payload.success) {
            setStatsData(payload);
          }
        }
      } catch (err) {
        console.error("Failed to fetch stats for recap:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [currentUser.id]);

  const slideDuration = 6000; // 6 seconds per slide

  // Top 9 books collage calculation
  const finishedBooks = diaryLogs
    ? (diaryLogs
        .filter((log) => log.userId === currentUser.id && log.status === "Finished")
        .map((log) => {
          const book = books.find((b) => b.id === log.bookId);
          return book ? { ...book, rating: log.rating || 0 } : null;
        })
        .filter(Boolean) as any[])
    : [];

  const topBooksSorted = [...finishedBooks].sort((a, b) => b.rating - a.rating);
  let top9Collage = [...topBooksSorted];
  if (top9Collage.length < 9 && books.length > 0) {
    const filler = books.filter((b) => !top9Collage.some((t) => t.id === b.id));
    top9Collage = [...top9Collage, ...filler].slice(0, 9);
  }

  // Auto-play slides logic
  useEffect(() => {
    if (slideTimeoutRef.current) {
      clearTimeout(slideTimeoutRef.current);
    }

    if (isPlaying && statsData) {
      slideTimeoutRef.current = setTimeout(() => {
        if (currentSlide < 5) {
          setCurrentSlide((prev) => prev + 1);
        } else {
          setIsPlaying(false); // Pause on final slide
        }
      }, slideDuration);
    }

    return () => {
      if (slideTimeoutRef.current) {
        clearTimeout(slideTimeoutRef.current);
      }
    };
  }, [currentSlide, isPlaying, statsData]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <svg className="animate-spin h-8 w-8 text-brand mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xs text-charcoal-muted font-sans font-semibold">Stitching your reading journey stories...</p>
        </div>
      </div>
    );
  }

  if (!statsData || !statsData.stats) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
          <Sparkles className="w-12 h-12 text-brand mb-4 animate-pulse" />
          <h2 className="font-serif text-xl font-bold text-charcoal">Recap Pending</h2>
          <p className="text-xs text-charcoal-muted mt-2">
            Add reading logs or check off completed titles to unveil your personalized Wrapped stories recap cards.
          </p>
          <button
            onClick={() => router.push("/search")}
            className="mt-6 px-4 py-2 bg-brand hover:bg-brand-light text-cream font-medium text-xs rounded-lg shadow"
          >
            Start Seeding Log entries
          </button>
        </div>
      </div>
    );
  }

  const { stats, pace } = statsData;

  const handleNext = () => {
    if (currentSlide < 5) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleMockDownload = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  // Slide content configs
  const slides = [
    // Slide 0: Cover
    {
      bg: "bg-gradient-to-br from-brand to-brand-dark text-cream",
      content: (
        <div className="space-y-6 text-center max-w-md px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cream-card/10 border border-white/20 rounded-full text-xs font-semibold uppercase tracking-widest text-cream-dark">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Leaf Recap</span>
          </div>
          
          <div className="space-y-2">
            <h2 className="font-serif text-5xl md:text-6xl font-bold leading-tight tracking-tight">
              Your Year <br /> in Books
            </h2>
            <p className="font-serif italic text-lg text-cream-dark opacity-90">
              Rowan Archer’s Literary Footprint
            </p>
          </div>

          <div className="w-12 h-1 bg-brand-light/40 mx-auto rounded-full" />
          
          <p className="text-xs text-cream-dark/80 max-w-xs mx-auto leading-relaxed">
            Every log, page, streak, and review compiled into your unique personal review.
          </p>
        </div>
      ),
    },
    // Slide 1: Primary Metrics
    {
      bg: "bg-cream-card text-charcoal border border-cream-border",
      content: (
        <div className="space-y-8 text-center max-w-md px-6">
          <BookOpen className="w-10 h-10 text-brand mx-auto" />
          
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">The Chapter Count</h3>
            <p className="font-serif text-5xl font-bold leading-none text-charcoal">
              {stats.total_books_completed} books
            </p>
            <p className="text-xs text-charcoal-muted font-medium">shelved as Completed on Leaf</p>
          </div>

          <div className="border-t border-cream-border/60 pt-6 space-y-4">
            <p className="text-xs text-charcoal-light leading-relaxed">
              Together, they spanned a massive <strong className="text-brand text-sm">{stats.total_pages_read} pages</strong>!
            </p>
            <div className="bg-cream border border-cream-border p-4 rounded-xl flex items-center justify-around">
              <div className="text-center">
                <span className="text-[10px] font-bold text-charcoal-muted uppercase block">Time Invested</span>
                <span className="font-serif text-lg font-bold text-charcoal mt-1 block">{stats.total_reading_hours} hrs</span>
              </div>
              <div className="w-px h-8 bg-cream-border" />
              <div className="text-center">
                <span className="text-[10px] font-bold text-charcoal-muted uppercase block">Daily Average</span>
                <span className="font-serif text-lg font-bold text-charcoal mt-1 block">{stats.average_pages_per_day} pgs</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Slide 2: Streak Intensity
    {
      bg: "bg-gradient-to-br from-charcoal to-brand text-cream",
      content: (
        <div className="space-y-8 text-center max-w-md px-6">
          <Flame className="w-10 h-10 text-brand-light mx-auto animate-pulse" />

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-cream-dark opacity-75 uppercase tracking-widest">Habit & Fire</h3>
            <p className="font-serif text-4xl md:text-5xl font-bold leading-tight">
              A record streak of <span className="text-brand-light">{stats.longest_streak} days</span>
            </p>
            <p className="text-xs text-cream-dark opacity-80 leading-relaxed max-w-xs mx-auto">
              You kept your logs blazing week over week. Currently maintaining a stellar <strong className="text-white">{stats.current_streak}-day</strong> reading habit!
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-[11px] text-cream-dark opacity-90 italic font-serif leading-relaxed">
              &ldquo;Stacking bricks, page by page. A habit creates momentum.&rdquo;
            </p>
          </div>
        </div>
      ),
    },
    // Slide 3: Genres & Taste
    {
      bg: "bg-cream-card text-charcoal border border-cream-border",
      content: (
        <div className="space-y-8 text-center max-w-md px-6">
          <Award className="w-10 h-10 text-brand mx-auto" />

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">Taste Footprint</h3>
            <p className="font-serif text-4xl font-bold text-charcoal">
              {stats.favorite_genre}
            </p>
            <p className="text-xs text-brand font-semibold uppercase tracking-wider">Your absolute favorite category</p>
          </div>

          <div className="border-t border-cream-border/60 pt-6 space-y-4 text-xs text-charcoal-light">
            <p className="leading-relaxed">
              Your average completed book length is <strong className="text-charcoal">{stats.average_book_length} pages</strong>, showcasing a dedication to detailed writing.
            </p>
            <div className="p-3.5 bg-brand/5 border border-brand/10 rounded-xl font-medium">
              You read most frequently on weekends and late evenings under the quiet glow of night.
            </div>
          </div>
        </div>
      ),
    },
    // Slide 4: Extremes
    {
      bg: "bg-gradient-to-br from-brand-dark to-charcoal text-cream",
      content: (
        <div className="space-y-6 text-left max-w-sm px-6">
          <h3 className="text-xs font-bold text-cream-dark opacity-75 uppercase tracking-widest text-center mb-4">Volume Highlights</h3>

          {pace.longestBook && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
              {pace.longestBook.coverImage && (
                <img src={pace.longestBook.coverImage} className="w-12 h-18 object-cover rounded shadow" />
              )}
              <div className="min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-light block">The Longest Epic</span>
                <p className="font-bold text-sm truncate mt-0.5">{pace.longestBook.title}</p>
                <p className="text-xs text-cream-dark opacity-80 mt-1">{pace.longestBook.pages} pages logged</p>
              </div>
            </div>
          )}

          {pace.fastestBook && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
              {pace.fastestBook.coverImage && (
                <img src={pace.fastestBook.coverImage} className="w-12 h-18 object-cover rounded shadow" />
              )}
              <div className="min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-light block">The Speed Read</span>
                <p className="font-bold text-sm truncate mt-0.5">{pace.fastestBook.title}</p>
                <p className="text-xs text-cream-dark opacity-80 mt-1">Finished in {pace.fastestBook.days} {pace.fastestBook.days === 1 ? "day" : "days"}!</p>
              </div>
            </div>
          )}
        </div>
      ),
    },
    // Slide 5: Collage
    {
      bg: "bg-cream text-charcoal border border-cream-border",
      content: (
        <div className="space-y-6 text-center max-w-sm px-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">Your Top Collage</h3>
            <p className="font-serif text-2xl font-bold text-charcoal">The Visual Grid</p>
          </div>

          {/* 3x3 Grid Collage */}
          <div className="grid grid-cols-3 gap-2 p-2 bg-cream-card border border-cream-border rounded-xl shadow-xs">
            {top9Collage.map((book: any, idx: number) => (
              <div key={idx} className="relative aspect-[2/3] rounded overflow-hidden shadow-xs hover:scale-105 transition-all duration-300 bg-cream-dark">
                {book.coverImage ? (
                  <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-1 bg-brand/10 text-[8px] text-brand font-bold text-center">
                    {book.title}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-4 h-9 bg-brand hover:bg-brand-light text-cream font-semibold text-xs rounded-lg shadow-md transition-all duration-200"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Card</span>
            </button>
            
            <Link
              href="/stats"
              className="flex items-center gap-1 px-4 h-9 border border-cream-border hover:bg-cream-dark/30 text-charcoal font-semibold text-xs rounded-lg transition-all duration-200"
            >
              <span>Back to Stats</span>
            </Link>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col justify-center items-center py-8 px-6 relative max-w-6xl w-full mx-auto">
        
        {/* Story Viewer Panel */}
        <div className="relative w-full max-w-md aspect-[9/16] max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl bg-charcoal flex flex-col justify-between p-6 z-10">
          
          {/* Top progress indicators */}
          <div className="absolute top-4 left-6 right-6 flex gap-1 z-30">
            {slides.map((_, idx) => {
              let width = "0%";
              if (idx < currentSlide) width = "100%";
              else if (idx === currentSlide) {
                width = isPlaying ? "100%" : "50%"; // simplified representation
              }

              return (
                <div key={idx} className="h-1 bg-white/20 rounded-full flex-1 overflow-hidden">
                  <div
                    className="h-full bg-cream transition-all duration-200"
                    style={{ 
                      width,
                      transitionDuration: idx === currentSlide && isPlaying ? `${slideDuration}ms` : "150ms",
                      transitionTimingFunction: "linear"
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Slides navigation hot-regions */}
          <div className="absolute inset-0 flex z-20">
            {/* Left region */}
            <div 
              className="w-1/3 h-full cursor-w-resize"
              onClick={handlePrev}
            />
            {/* Middle region to pause */}
            <div 
              className="w-1/3 h-full cursor-pointer"
              onClick={() => setIsPlaying(!isPlaying)}
            />
            {/* Right region */}
            <div 
              className="w-1/3 h-full cursor-e-resize"
              onClick={handleNext}
            />
          </div>

          {/* Top Controls Bar */}
          <div className="flex justify-between items-center z-30 opacity-70 hover:opacity-100 transition-opacity">
            <span className="text-[9px] font-sans font-bold text-cream uppercase tracking-widest">
              Leaf Wrapped
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1 hover:bg-white/10 rounded-full text-cream"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <Link
                href="/stats"
                className="p-1 hover:bg-white/10 rounded-full text-cream"
              >
                <X className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Main Slide Content Area */}
          <div className="flex-1 flex items-center justify-center z-10 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className={`absolute inset-0 flex flex-col justify-center items-center rounded-3xl ${slides[currentSlide].bg}`}
              >
                {slides[currentSlide].content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Controls Indicator */}
          <div className="flex justify-between items-center z-30 px-2">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="p-1.5 bg-black/20 text-cream rounded-full hover:bg-black/40 disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-cream font-bold font-sans opacity-70">
              {currentSlide + 1} / {slides.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentSlide === slides.length - 1}
              className="p-1.5 bg-black/20 text-cream rounded-full hover:bg-black/40 disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Share Recap Overlay Modal */}
        <AnimatePresence>
          {showShareModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShareModal(false)}
                className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
              />

              {/* Share Card Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-sm bg-cream border border-cream-border rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col"
              >
                <div className="px-6 py-4 border-b border-cream-border flex justify-between items-center bg-cream-card">
                  <span className="font-serif text-sm font-bold text-charcoal">Download Share Card</span>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="p-1 hover:bg-cream-dark/50 rounded-lg text-charcoal-muted hover:text-charcoal transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Printable High Resolution Card Panel */}
                <div className="p-6 bg-cream-card flex-1 flex flex-col justify-between gap-6">
                  {/* Share Card Body */}
                  <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl p-5 text-cream relative overflow-hidden flex flex-col justify-between shadow-lg aspect-[4/5]">
                    
                    {/* Brand header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-cream-dark" />
                        <span className="font-serif text-base font-bold leading-none tracking-tight">Leaf</span>
                      </div>
                      <span className="text-[8px] font-sans font-bold uppercase tracking-wider text-cream-dark bg-cream-card/10 border border-white/20 px-2 py-0.5 rounded-full">
                        2026 Recap
                      </span>
                    </div>

                    {/* Collage & stats combo */}
                    <div className="grid grid-cols-2 gap-4 items-center mt-3">
                      {/* Left: Collage */}
                      <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
                        {top9Collage.slice(0, 4).map((book: any, idx: number) => (
                          <div key={idx} className="aspect-[2/3] rounded overflow-hidden bg-cream-dark">
                            {book.coverImage && (
                              <img src={book.coverImage} className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Right: stats */}
                      <div className="space-y-3">
                        <div>
                          <span className="text-[8px] font-bold text-cream-dark uppercase block tracking-wider">Completed</span>
                          <span className="font-serif text-lg font-bold leading-none block mt-0.5">{stats.total_books_completed} books</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-cream-dark uppercase block tracking-wider">Pages Read</span>
                          <span className="font-serif text-lg font-bold leading-none block mt-0.5">{stats.total_pages_read} pgs</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-cream-dark uppercase block tracking-wider">Top Genre</span>
                          <span className="font-semibold text-xs leading-tight block mt-0.5 truncate">{stats.favorite_genre}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Avatar */}
                    <div className="flex items-center gap-3 border-t border-white/15 pt-3 mt-4">
                      <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate leading-none">{currentUser.name}</p>
                        <p className="text-[9px] text-cream-dark truncate mt-0.5">@{currentUser.username}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleMockDownload}
                      className="w-full h-11 bg-brand hover:bg-brand-light text-cream font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {downloadSuccess ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3px]" />
                          <span>Saved to Library!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Save Image</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-charcoal-muted text-center leading-relaxed">
                      Download this visual recap to share on Instagram, Twitter or TikTok. Mention #LeafReadingClub!
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
