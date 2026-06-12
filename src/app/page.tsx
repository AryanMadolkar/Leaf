"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Layers,
  Users,
  Check,
  Star,
  Book,
  Calendar,
  X
} from "lucide-react";
import { StarDisplay } from "@/components/ReviewCard";

export default function LandingPage() {
  const router = useRouter();
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");
  const [submittedWaitlist, setSubmittedWaitlist] = useState(false);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistName) return;
    setSubmittedWaitlist(true);
    setTimeout(() => {
      // Keep open for preview then reset
    }, 3000);
  };

  const floatingCovers = [
    { src: "/covers/secret_history.png", rotate: "-6deg", y: 20, delay: 0 },
    { src: "/covers/hail_mary.png", rotate: "4deg", y: -10, delay: 0.2 },
    { src: "/covers/normal_people.png", rotate: "-3deg", y: 40, delay: 0.4 },
    { src: "/covers/dune.png", rotate: "8deg", y: -30, delay: 0.1 },
    { src: "/covers/klara.png", rotate: "-5deg", y: 15, delay: 0.3 },
    { src: "/covers/gatsby.png", rotate: "6deg", y: 0, delay: 0.5 },
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
      desc: "Write clean, typography-focused notes. Like and comment on other readers' thoughts to sparks dialogue.",
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
            href="/feed"
            className="text-xs font-semibold text-charcoal-muted hover:text-charcoal transition-colors"
          >
            Explore Community
          </Link>
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

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setIsWaitlistOpen(true)}
                className="w-full sm:w-auto px-6 h-12 bg-brand hover:bg-brand-light text-cream font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                Join the Waitlist
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/feed"
                className="w-full sm:w-auto px-6 h-12 bg-cream-card border border-cream-border hover:bg-cream-dark/40 text-charcoal font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                Explore the Community
              </Link>
            </div>
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
              {/* Activity item 1 */}
              <div className="flex items-start gap-4 p-4 bg-cream-card border border-cream-border rounded-xl">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                  className="w-8 h-8 rounded-full object-cover border border-cream-border flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-charcoal-light font-sans">
                    <span className="font-bold text-charcoal">Emma Sterling</span> rated <span className="font-bold">The Secret History</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <StarDisplay rating={5} size={11} />
                    <span className="text-[10px] text-charcoal-muted">2 mins ago</span>
                  </div>
                  <p className="text-xs text-charcoal-muted/90 italic line-clamp-2">
                    &ldquo;Donna Tartt&apos;s atmosphere is thick, elitist, and absolutely terrifying. I reread this every autumn...&rdquo;
                  </p>
                </div>
                <img
                  src="/covers/secret_history.png"
                  className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0"
                />
              </div>

              {/* Activity item 2 */}
              <div className="flex items-start gap-4 p-4 bg-cream-card border border-cream-border rounded-xl">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                  className="w-8 h-8 rounded-full object-cover border border-cream-border flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-charcoal-light font-sans">
                    <span className="font-bold text-charcoal">Alex Petrov</span> added <span className="font-bold">Project Hail Mary</span> to list
                  </p>
                  <p className="text-xs text-brand font-semibold">
                    &ldquo;Sci-Fi Essentials&rdquo;
                  </p>
                  <span className="text-[10px] text-charcoal-muted">15 mins ago</span>
                </div>
                <img
                  src="/covers/hail_mary.png"
                  className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0"
                />
              </div>

              {/* Activity item 3 */}
              <div className="flex items-start gap-4 p-4 bg-cream-card border border-cream-border rounded-xl">
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80"
                  className="w-8 h-8 rounded-full object-cover border border-cream-border flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-charcoal-light font-sans">
                    <span className="font-bold text-charcoal">Sophia Chen</span> finished <span className="font-bold">Normal People</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <StarDisplay rating={4.5} size={11} />
                    <span className="text-[10px] text-charcoal-muted">1 hour ago</span>
                  </div>
                </div>
                <img
                  src="/covers/normal_people.png"
                  className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0"
                />
              </div>
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

            {/* Rating distribution bar mockup */}
            <div className="space-y-2 border-t border-cream-border/60 pt-6">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-charcoal-muted">Average Rating Given</span>
                <span className="font-bold text-charcoal flex items-center gap-1">
                  4.2 <Star className="w-3.5 h-3.5 fill-brand stroke-brand" />
                </span>
              </div>
              <div className="h-2 w-full bg-cream-dark rounded-full overflow-hidden flex">
                <div className="h-full bg-brand" style={{ width: "65%" }} />
                <div className="h-full bg-brand-light" style={{ width: "25%" }} />
                <div className="h-full bg-brand-muted" style={{ width: "10%" }} />
              </div>
            </div>
          </div>

        </section>

        {/* Final CTA */}
        <section className="bg-brand text-cream py-16 px-6 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="font-serif text-3xl md:text-5xl font-bold">
              Ready to claim your digital bookshelf?
            </h2>
            <p className="text-xs md:text-sm text-cream/80 max-w-md mx-auto leading-relaxed">
              Join Leaf today and start building a beautiful chronological diary of the ideas that shape you.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsWaitlistOpen(true)}
                className="px-8 h-12 bg-cream hover:bg-cream-dark text-charcoal font-semibold text-sm rounded-lg shadow transition-colors inline-flex items-center gap-2"
              >
                Join the Waitlist
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-cream-border py-8 px-6 bg-cream">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-charcoal-muted">
          <p>© 2026 Leaf. Designed with care for readers everywhere.</p>
          <div className="flex gap-6">
            <Link href="/feed" className="hover:underline">Explore</Link>
            <button onClick={() => setIsWaitlistOpen(true)} className="hover:underline text-left">Join Waitlist</button>
            <Link href="/auth" className="hover:underline">Login</Link>
          </div>
        </div>
      </footer>

      {/* Waitlist Dialog Overlay */}
      <AnimatePresence>
        {isWaitlistOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsWaitlistOpen(false);
                setSubmittedWaitlist(false);
              }}
              className="absolute inset-0 bg-charcoal/45 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-cream border border-cream-border p-6 rounded-2xl shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-xl font-bold text-charcoal">
                  Join the Leaf Waitlist
                </span>
                <button
                  onClick={() => {
                    setIsWaitlistOpen(false);
                    setSubmittedWaitlist(false);
                  }}
                  className="p-1 hover:bg-cream-dark/50 rounded-lg text-charcoal-muted hover:text-charcoal transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!submittedWaitlist ? (
                <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                  <p className="text-xs text-charcoal-muted leading-normal">
                    We are launching invite-only beta clusters to ensure high-quality reviews and human curation. Claim your spot.
                  </p>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Donna Tartt"
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-charcoal">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="you@literary.com"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-cream-card border border-cream-border rounded-lg text-charcoal focus:outline-none focus:border-brand-muted"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-10 bg-brand hover:bg-brand-light text-cream font-semibold text-xs rounded-lg shadow-sm transition-colors"
                  >
                    Submit Request
                  </button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-4"
                >
                  <div className="mx-auto w-12 h-12 bg-brand/10 border border-brand/20 rounded-full flex items-center justify-center text-brand">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif text-lg font-bold text-charcoal">You&apos;re on the list, {waitlistName}!</p>
                    <p className="text-xs text-charcoal-muted leading-relaxed">
                      We sent a confirmation to <span className="font-semibold text-charcoal">{waitlistEmail}</span>. Keep an eye on your inbox.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsWaitlistOpen(false);
                      setSubmittedWaitlist(false);
                      setWaitlistName("");
                      setWaitlistEmail("");
                    }}
                    className="px-4 py-1.5 border border-cream-border bg-cream hover:bg-cream-dark text-xs font-semibold rounded-lg text-charcoal-muted hover:text-charcoal transition-colors"
                  >
                    Close
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
