"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  TrendingUp,
  Sparkles,
  Layers,
  Users,
  Star,
  Book,
  Calendar,
} from "lucide-react";
import { StarDisplay } from "@/components/ReviewCard";
import { formatRelativeTime } from "@/utils/time";

type StreamReview = {
  id: string;
  rating: number;
  content: string;
  createdAt?: string;
  reviewerName: string;
  reviewerAvatar: string;
  bookTitle: string;
  bookCover: string;
};

export default function LandingPage() {
  const [streamReviews, setStreamReviews] = useState<StreamReview[]>([]);
  const [streamLoading, setStreamLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadStream() {
      try {
        const res = await fetch("/api/reviews?limit=3");
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.reviews)) {
          setStreamReviews(data.reviews);
        }
      } catch (err) {
        console.error("Failed to load community stream:", err);
      } finally {
        if (!cancelled) setStreamLoading(false);
      }
    }
    loadStream();
    return () => {
      cancelled = true;
    };
  }, []);


  const floatingCovers = [
    { src: "https://covers.openlibrary.org/b/isbn/9780140167771-L.jpg", rotate: "-6deg", y: 20, delay: 0 },
    { src: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg", rotate: "4deg", y: -10, delay: 0.2 },
    { src: "https://covers.openlibrary.org/b/isbn/9781984822178-L.jpg", rotate: "-3deg", y: 40, delay: 0.4 },
    { src: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg", rotate: "8deg", y: -30, delay: 0.1 },
    { src: "https://covers.openlibrary.org/b/isbn/9780593318171-L.jpg", rotate: "-5deg", y: 15, delay: 0.3 },
    { src: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg", rotate: "6deg", y: 0, delay: 0.5 },
  ];

  const features = [
    {
      icon: <BookOpen className="w-5 h-5 text-brand" />,
      title: "Track Every Book",
      desc: "Log your reads, track want-to-reads, and review finished books with precise 5-star ratings (including half-stars).",
    },
    {
      icon: <Sparkles className="w-5 h-5 text-brand" />,
      title: "Share Beautiful Reviews",
      desc: "Write clean, typography-focused notes. Like and comment on other readers' thoughts to spark dialogue.",
    },
    {
      icon: <Layers className="w-5 h-5 text-brand" />,
      title: "Curate Reading Lists",
      desc: "Group your favorite books into visual masonry-grid lists: 'Dark Academia Essentials', 'Sci-Fi Pillars' or personal logs.",
    },
    {
      icon: <Users className="w-5 h-5 text-brand" />,
      title: "Discover Your Taste",
      desc: "Leaf builds a visual bookshelf reflecting your identity, connecting you with readers sharing similar libraries.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-cream overflow-x-hidden flex flex-col justify-between">
      
      {/* Header (Minimal Landing Version) */}
      <header className="w-full py-6 px-6 max-w-6xl mx-auto flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <BookOpen className="w-5 h-5 text-brand group-hover:rotate-6 transition-transform" />
          <span className="font-serif text-2xl font-bold tracking-tight text-charcoal">
            Leaf
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/auth"
            className="px-4 py-2 bg-charcoal hover:bg-charcoal-light text-cream font-medium text-xs rounded-lg shadow transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center relative">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl space-y-6"
          >
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-charcoal leading-[1.08] tracking-tight">
              A home for people who love books.
            </h1>
            <p className="text-base md:text-lg text-charcoal-muted max-w-xl mx-auto leading-relaxed">
              Track what you read. Share what you love. Discover your next literary obsession.
            </p>
          </motion.div>

          {/* Floating Collage */}
          <div className="w-full mt-16 md:mt-24 relative max-w-4xl mx-auto h-[220px] md:h-[300px] flex items-center justify-center gap-4 px-4 overflow-visible">
            {floatingCovers.map((cover, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 80, rotate: "0deg" }}
                animate={{ opacity: 1, y: cover.y, rotate: cover.rotate }}
                transition={{
                  type: "spring",
                  stiffness: 50,
                  damping: 15,
                  delay: cover.delay,
                }}
                whileHover={{ y: cover.y - 15, scale: 1.05, rotate: "0deg", zIndex: 10 }}
                className="w-24 h-36 md:w-36 md:h-52 rounded-lg overflow-hidden book-shadow flex-shrink-0 cursor-pointer bg-cream-dark select-none"
              >
                <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-gradient-to-r from-charcoal/20 to-transparent z-10" />
                <img
                  src={cover.src}
                  alt="Book Cover"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </motion.div>
            ))}
          </div>

        </section>

        {/* Features Grid */}
        <section className="bg-cream-card border-y border-cream-border py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-charcoal">
                Designed for the Literary Identity
              </h2>
              <p className="text-xs md:text-sm text-charcoal-muted">
                Leaf moves away from database tables to create a visual home for your shelf.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feat, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="p-6 bg-cream border border-cream-border rounded-xl space-y-4 hover:shadow-md transition-all duration-300"
                >
                  <div className="p-3 bg-cream-dark rounded-lg w-fit">
                    {feat.icon}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-charcoal">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    {feat.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Community & Stats Section (Split Grid) */}
        <section className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Live Activity Feed Mockup */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="font-serif text-3xl font-bold text-charcoal">
                The Community Stream
              </h2>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Connect with readers discussing characters, plot points, and lists. See what the circle is reading right now.
              </p>
            </div>

            {/* Live Stream Container */}
            <div className="space-y-4">
              {streamLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 bg-cream-card border border-cream-border rounded-xl animate-pulse"
                  >
                    <div className="w-8 h-8 rounded-full bg-cream-dark flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-cream-dark rounded w-3/4" />
                      <div className="h-3 bg-cream-dark rounded w-1/2" />
                    </div>
                    <div className="w-10 h-14 bg-cream-dark rounded flex-shrink-0" />
                  </div>
                ))
              ) : streamReviews.length > 0 ? (
                streamReviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex items-start gap-4 p-4 bg-cream-card border border-cream-border rounded-xl"
                  >
                    <img
                      src={
                        review.reviewerAvatar ||
                        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                      }
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-cream-border flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs text-charcoal-light font-sans">
                        <span className="font-bold text-charcoal">{review.reviewerName}</span>{" "}
                        rated <span className="font-bold">{review.bookTitle || "a book"}</span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        {review.rating > 0 && <StarDisplay rating={review.rating} size={11} />}
                        <span className="text-[10px] text-charcoal-muted">
                          {formatRelativeTime(review.createdAt)}
                        </span>
                      </div>
                      {review.content ? (
                        <p className="text-xs text-charcoal-muted/90 italic line-clamp-2">
                          &ldquo;{review.content}&rdquo;
                        </p>
                      ) : null}
                    </div>
                    {review.bookCover ? (
                      <img
                        src={review.bookCover}
                        alt=""
                        className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0"
                      />
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="p-4 bg-cream-card border border-cream-border rounded-xl">
                  <p className="text-xs text-charcoal-muted">
                    No community reviews yet. Be the first to rate a book on Leaf.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Reading Stats Dashboard Preview */}
          <div className="p-6 md:p-8 bg-cream-card border border-cream-border rounded-2xl shadow-lg space-y-8">
            <div>
              <span className="text-[10px] font-semibold tracking-wider text-brand uppercase bg-cream px-2.5 py-1 rounded-full border border-cream-border">
                Your Year in Review
              </span>
              <h3 className="font-serif text-2xl font-bold text-charcoal mt-3">
                Reading Dashboard
              </h3>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-charcoal-muted uppercase">Books Read</span>
                <p className="font-serif text-3xl font-bold text-charcoal">24</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-charcoal-muted uppercase">Total Pages</span>
                <p className="font-serif text-3xl font-bold text-charcoal">7,420</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-charcoal-muted uppercase">Favorite Genre</span>
                <p className="font-serif text-xl font-bold text-charcoal truncate">Dark Academia</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-charcoal-muted uppercase">Reading Streak</span>
                <p className="font-serif text-3xl font-bold text-brand">12 Days</p>
              </div>
            </div>

            {/* Rating distribution bar */}
            <div className="space-y-3 border-t border-cream-border/60 pt-6">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-charcoal-muted">Average Rating Given</span>
                <span className="font-bold text-charcoal flex items-center gap-1">
                  4.2 <Star className="w-3.5 h-3.5 fill-brand stroke-brand" />
                </span>
              </div>
              <div className="h-2.5 w-full bg-cream-dark rounded-full overflow-hidden flex gap-0.5">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: "65%" }}
                  title="5 stars"
                />
                <div
                  className="h-full rounded-full bg-[#C4A574]"
                  style={{ width: "25%" }}
                  title="3–4 stars"
                />
                <div
                  className="h-full rounded-full bg-cream-border"
                  style={{ width: "10%" }}
                  title="1–2 stars"
                />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-charcoal-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand" />
                  5★
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C4A574]" />
                  3–4★
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cream-border border border-charcoal-muted/20" />
                  1–2★
                </span>
              </div>
            </div>
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-cream-border py-8 px-6 bg-cream">
        <div className="max-w-6xl mx-auto text-xs text-charcoal-muted">
          <p>© 2026 Leaf. Designed with care for readers everywhere.</p>
        </div>
      </footer>

    </div>
  );
}
