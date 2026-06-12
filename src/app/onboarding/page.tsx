"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useLeaf } from "@/context/LeafContext";
import { 
  Sparkles, 
  Search, 
  Check, 
  Plus, 
  ArrowRight, 
  ArrowLeft, 
  Users, 
  BookOpen, 
  BookMarked,
  UserPlus,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Book } from "@/data/mockData";

export default function OnboardingPage() {
  const supabase = createClient();
  const { session, profile, logBook, toggleFollowUser } = useLeaf();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followedUsers, setFollowedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Fallback suggest list if search is empty
  const suggestedBooks = [
    { id: "9780140167771", title: "The Secret History", author: "Donna Tartt", coverImage: "https://covers.openlibrary.org/b/isbn/9780140167771-L.jpg" },
    { id: "9780593135204", title: "Project Hail Mary", author: "Andy Weir", coverImage: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg" },
    { id: "9781984822178", title: "Normal People", author: "Sally Rooney", coverImage: "https://covers.openlibrary.org/b/isbn/9781984822178-L.jpg" },
    { id: "9780441172719", title: "Dune", author: "Frank Herbert", coverImage: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg" },
    { id: "9780743273565", title: "The Great Gatsby", author: "F. Scott Fitzgerald", coverImage: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg" },
  ];

  const suggestedReaders = [
    { id: "user-emma", name: "Emma Watson", username: "emma", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80", bio: "Books are a uniquely portable magic." },
    { id: "user-alex", name: "Alex Mercer", username: "alex_reads", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80", bio: "Sci-fi and historical non-fiction enthusiast." },
    { id: "user-sophia", name: "Sophia Martinez", username: "sophia_lit", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80", bio: "Classics and dark academia aficionado." },
    { id: "user-julian", name: "Julian Vance", username: "julian_v", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80", bio: "Always reading, forever learning." },
  ];

  const genres = [
    "Fantasy", "Sci-Fi", "Literary Fiction", "Romance", "Mystery", "History", "Biography", "Thriller", "Poetry"
  ];

  // Search Debounce Effect
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const payload = await res.json();
          if (payload.success) {
            setSearchResults(payload.books || []);
          }
        }
      } catch (err) {
        console.error("Search failed during onboarding:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleGenreToggle = (g: string) => {
    setSelectedGenres(prev => 
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  };

  const handleBookToggle = (book: any) => {
    setFavoriteBooks(prev => {
      if (prev.some(x => x.id === book.id)) {
        return prev.filter(x => x.id !== book.id);
      } else {
        return [...prev, book];
      }
    });
  };

  const handleFollowToggle = (uid: string) => {
    setFollowedUsers(prev => 
      prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]
    );
  };

  const handleCompleteOnboarding = async () => {
    if (!session?.user) return;
    setSaving(true);

    try {
      // 1. Update Profile in Supabase
      const { error } = await supabase
        .from("profiles")
        .update({
          favorite_genres: selectedGenres,
          onboarding_completed: true,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      // 2. Sync follows relationship to database
      for (const followedId of followedUsers) {
        await supabase.from("follows").insert({
          follower_id: session.user.id,
          following_id: followedId,
        });
      }

      // 3. Add Pinned Favorites to Library as Completed (5 stars seed)
      for (const favBook of favoriteBooks) {
        // Ensure book is cached in public.books first
        await fetch("/api/user-books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId: favBook.id,
            status: "finished",
            rating: 5,
            review: "Pinned as a favorite during onboarding.",
            title: favBook.title,
            author: favBook.author,
            coverImage: favBook.coverImage,
          }),
        });
      }

      // Redirect user to personalized dashboard
      router.push("/feed");
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      setSaving(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-between">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6 max-w-xl mx-auto w-full">
        <div className="w-full bg-cream-card border border-cream-border rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 min-h-[550px] flex flex-col justify-between">
          
          {/* Progress Indicators */}
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? "bg-brand" : "bg-cream-dark"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">Step 1 of 3</span>
                  <h2 className="font-serif text-2xl font-bold text-charcoal">Select your favorite genres</h2>
                  <p className="text-xs text-charcoal-muted">Choose at least 2 genres to help us curate lists and recommendations for you.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-6">
                  {genres.map((g) => {
                    const active = selectedGenres.includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => handleGenreToggle(g)}
                        className={`py-3 px-4 text-xs font-semibold rounded-xl border text-center transition-all ${
                          active
                            ? "bg-brand border-brand text-cream shadow-sm"
                            : "bg-cream border-cream-border text-charcoal hover:border-charcoal"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    disabled={selectedGenres.length < 2}
                    onClick={nextStep}
                    className="flex items-center gap-1.5 px-6 h-10 bg-brand hover:bg-brand-light disabled:opacity-50 text-cream font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">Step 2 of 3</span>
                  <h2 className="font-serif text-2xl font-bold text-charcoal">Pin 3–5 favorite books</h2>
                  <p className="text-xs text-charcoal-muted">
                    We will seed your library with these books to initialize your reading statistics page immediately. ({favoriteBooks.length} pinned)
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-charcoal-muted" />
                  <input
                    type="text"
                    placeholder="Search by title, author..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 text-xs bg-cream border border-cream-border rounded-xl text-charcoal focus:outline-none focus:border-brand-muted"
                  />
                  {searchLoading && (
                    <span className="absolute right-3 top-3 h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Grid Lists */}
                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 my-4 scrollbar-none">
                  {searchResults.length > 0 ? (
                    searchResults.map((book) => {
                      const isPinned = favoriteBooks.some(x => x.id === book.id);
                      return (
                        <div
                          key={book.id}
                          className="flex items-center justify-between p-2.5 bg-cream border border-cream-border rounded-xl"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={book.coverImage} className="w-8 h-12 object-cover rounded shadow-xs" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-charcoal truncate">{book.title}</p>
                              <p className="text-[10px] text-charcoal-muted truncate">{book.author}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleBookToggle(book)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isPinned
                                ? "bg-brand border-brand text-cream"
                                : "bg-cream-card border-cream-border text-charcoal-muted hover:text-charcoal"
                            }`}
                          >
                            {isPinned ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    /* Default Suggested Books collage */
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase block tracking-wider mb-2">Suggested classics</p>
                      {suggestedBooks.map((book) => {
                        const isPinned = favoriteBooks.some(x => x.id === book.id);
                        return (
                          <div
                            key={book.id}
                            className="flex items-center justify-between p-2.5 bg-cream border border-cream-border rounded-xl"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={book.coverImage} className="w-8 h-12 object-cover rounded shadow-xs" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-charcoal truncate">{book.title}</p>
                                <p className="text-[10px] text-charcoal-muted truncate">{book.author}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleBookToggle(book)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                isPinned
                                  ? "bg-brand border-brand text-cream"
                                  : "bg-cream-card border-cream-border text-charcoal-muted hover:text-charcoal"
                              }`}
                            >
                              {isPinned ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1.5 text-charcoal-muted hover:text-charcoal font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    disabled={favoriteBooks.length < 3}
                    onClick={nextStep}
                    className="flex items-center gap-1.5 px-6 h-10 bg-brand hover:bg-brand-light disabled:opacity-50 text-cream font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">Step 3 of 3</span>
                  <h2 className="font-serif text-2xl font-bold text-charcoal">Connect with other readers</h2>
                  <p className="text-xs text-charcoal-muted">Follow suggested members of the community to seed your initial activity social feed.</p>
                </div>

                <div className="space-y-3.5 my-6 max-h-[250px] overflow-y-auto pr-1">
                  {suggestedReaders.map((r) => {
                    const isFollowing = followedUsers.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3.5 bg-cream border border-cream-border rounded-2xl"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={r.avatar} alt={r.name} className="w-9 h-9 rounded-full object-cover border border-cream-border" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-charcoal truncate leading-tight">{r.name}</p>
                            <p className="text-[9px] text-charcoal-muted truncate">@{r.username}</p>
                            <p className="text-[10px] text-charcoal-light truncate mt-0.5">{r.bio}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollowToggle(r.id)}
                          className={`h-7 px-3 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all ${
                            isFollowing
                              ? "bg-cream-dark border border-cream-border text-charcoal"
                              : "bg-brand text-cream hover:bg-brand-light"
                          }`}
                        >
                          {isFollowing ? (
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
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1.5 text-charcoal-muted hover:text-charcoal font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleCompleteOnboarding}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-6 h-10 bg-brand hover:bg-brand-light disabled:opacity-50 text-cream font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer"
                  >
                    {saving ? (
                      <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Finish & Enter Feed</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
