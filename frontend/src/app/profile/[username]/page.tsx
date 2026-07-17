"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";
import ReviewCard, { StarDisplay } from "@/components/ReviewCard";
import { useLeaf } from "@/context/LeafContext";
import { Calendar, Layers, Heart, BookOpen, UserCheck, UserPlus, Grid, Flame, ArrowUpRight, X } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = React.use(params);
  const router = useRouter();
  const {
    currentUser,
    toggleFollowUser,
    lists,
    reviews,
    diaryLogs,
    books,
    userStats: contextStats,
    isAuthenticated,
  } = useLeaf();
  const [activeTab, setActiveTab] = useState<"activity" | "diary" | "lists" | "likes">("activity");
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [userStats, setUserStats] = useState<any | null>(null);
  const [finishedLogs, setFinishedLogs] = useState<any[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [socialModal, setSocialModal] = useState<"followers" | "following" | null>(null);
  const [socialUsers, setSocialUsers] = useState<any[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [favoriteBooks, setFavoriteBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [readingCount, setReadingCount] = useState(0);
  const [wantToReadCount, setWantToReadCount] = useState(0);

  useEffect(() => {
    async function loadProfileData() {
      try {
        setLoading(true);
        // Find profile by username
        const { data: prof, error: profError } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .maybeSingle();

        let targetProf = prof;
        let isMock = false;

        if (profError || !prof) {
          // Check if we can fallback to mock/local data
          const { INITIAL_USERS } = await import("@/data/mockData");
          const matchedMock = INITIAL_USERS.find((u) => u.username === username);
          if (matchedMock) {
            targetProf = {
              id: matchedMock.id,
              username: matchedMock.username,
              display_name: matchedMock.name,
              avatar_url: matchedMock.avatar,
              bio: matchedMock.bio,
              email: `${matchedMock.username}@example.com`,
              created_at: new Date(2026, 0, 1).toISOString(),
            };
            isMock = true;
          } else if (currentUser && username === currentUser.username) {
            targetProf = {
              id: currentUser.id,
              username: currentUser.username,
              display_name: currentUser.name,
              avatar_url: currentUser.avatar,
              bio: currentUser.bio,
              email: currentUser.email || "",
              created_at: currentUser.created_at || new Date().toISOString(),
            };
            isMock = true;
          } else {
            setTargetUser(null);
            setLoading(false);
            return;
          }
        }

        let stats = null;
        let mappedFinished: any[] = [];
        let mappedReviews: any[] = [];
        let mappedFavorites: any[] = [];
        let followersCount = 0;
        let followingCount = 0;
        let isFollowing = false;

        if (!isMock && targetProf) {
          // Fetch from Supabase
          const { data: dbStats } = await supabase
            .from("user_stats")
            .select("*")
            .eq("user_id", targetProf.id)
            .maybeSingle();
          stats = dbStats;

          // Fetch user books
          const { data: userBooks } = await supabase
            .from("user_books")
            .select(`
              id,
              status,
              rating,
              review,
              current_page,
              started_at,
              finished_at,
              created_at,
              book:books(*)
            `)
            .eq("user_id", targetProf.id);

          const dbCompleted = userBooks ? userBooks.filter((ub: any) => ub.status === "finished").length : 0;
          const dbReading = userBooks ? userBooks.filter((ub: any) => ub.status === "reading").length : 0;
          const dbWantToRead = userBooks ? userBooks.filter((ub: any) => ub.status === "want_to_read").length : 0;
          setCompletedCount(dbCompleted);
          setReadingCount(dbReading);
          setWantToReadCount(dbWantToRead);

          // Fetch reviews
          const { data: dbReviews } = await supabase
            .from("reviews")
            .select(`
              id,
              user_id,
              book_id,
              rating,
              review_text,
              likes_count,
              created_at,
              profile:profiles(display_name, avatar_url, username),
              book:books(title, author_name, cover_url)
            `)
            .eq("user_id", targetProf.id)
            .order("created_at", { ascending: false });

          // Fetch social follower/following counts
          const { count: followersCountDb } = await supabase
            .from("follows")
            .select("follower_id", { count: "exact", head: true })
            .eq("following_id", targetProf.id);
          followersCount = followersCountDb || 0;

          const { count: followingCountDb } = await supabase
            .from("follows")
            .select("following_id", { count: "exact", head: true })
            .eq("follower_id", targetProf.id);
          followingCount = followingCountDb || 0;

          // Check if current user is following target user
          if (currentUser?.id) {
            const { data: followRel } = await supabase
              .from("follows")
              .select("*")
              .eq("follower_id", currentUser.id)
              .eq("following_id", targetProf.id)
              .maybeSingle();
            isFollowing = !!followRel;
          }

          // Map finished logs
          mappedFinished = userBooks ? userBooks
            .filter((ub: any) => ub.status === "finished")
            .map((ub: any) => {
              const dateStr = ub.finished_at || ub.created_at || new Date().toISOString();
              const dateLogged = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;

              return {
                id: ub.id,
                userId: targetProf.id,
                bookId: ub.book?.id || "",
                status: "Finished" as const,
                dateLogged,
                rating: ub.rating !== null ? ub.rating : undefined,
                currentPage: ub.current_page || 0,
                bookTitle: ub.book?.title || "Unknown Book",
                bookAuthor: ub.book?.author_name || "Unknown Author",
                bookCover: ub.book?.cover_url || "",
              };
            }) : [];

          // Map reviews
          mappedReviews = dbReviews ? dbReviews.map((r: any) => {
            const dateObj = new Date(r.created_at);
            const dateString = dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            });

            return {
              id: r.id,
              userId: r.user_id,
              bookId: r.book_id,
              rating: r.rating || 0.0,
              content: r.review_text,
              dateString,
              likesCount: r.likes_count || 0,
              commentsCount: 0,
              isLiked: false,
              reviewerName: r.profile?.display_name || targetProf.display_name || "Reader",
              reviewerAvatar: r.profile?.avatar_url || targetProf.avatar_url || "",
              reviewerUsername: r.profile?.username || targetProf.username || "reader",
              bookTitle: r.book?.title || "",
              bookAuthor: r.book?.author_name || "",
              bookCover: r.book?.cover_url || "",
            };
          }) : [];

          // Map favorite books (rating = 5)
          mappedFavorites = userBooks ? userBooks
            .filter((ub: any) => ub.status === "finished" && ub.rating === 5)
            .map((ub: any) => ({
              id: ub.book?.id || "",
              title: ub.book?.title || "",
              author: ub.book?.author_name || "Unknown Author",
              coverImage: ub.book?.cover_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
              pages: ub.book?.page_count || 300,
              averageRating: ub.rating || 5.0,
              genres: ub.book?.subjects ? JSON.parse(ub.book.subjects) : [],
              description: ub.book?.description || "",
            })) : [];
        } else {
          // Local fallback — use context data only (no hardcoded mock reviews)
          const { INITIAL_BOOKS } = await import("@/data/mockData");
          const isMe = currentUser ? targetProf.id === currentUser.id : false;

          let logsToUse = isMe
            ? diaryLogs
            : diaryLogs.filter((l) => l.userId === targetProf.id);
          let reviewsToUse = isMe
            ? reviews
            : reviews.filter((r) => r.userId === targetProf.id);

          // Map finished logs
          mappedFinished = logsToUse
            .filter((log) => log.status === "Finished")
            .map((log) => {
              const book = books.find((b) => b.id === log.bookId) || INITIAL_BOOKS.find((b) => b.id === log.bookId);
              return {
                id: log.id,
                userId: targetProf.id,
                bookId: log.bookId,
                status: "Finished" as const,
                dateLogged: log.dateLogged,
                rating: log.rating,
                currentPage: book?.pages || 300,
                bookTitle: book?.title || "Unknown Book",
                bookAuthor: book?.author || "Unknown Author",
                bookCover: book?.coverImage || "",
              };
            });

          // Map reviews
          mappedReviews = reviewsToUse.map((r) => {
            const book = books.find((b) => b.id === r.bookId) || INITIAL_BOOKS.find((b) => b.id === r.bookId);
            return {
              id: r.id,
              userId: r.userId,
              bookId: r.bookId,
              rating: r.rating || 0.0,
              content: r.content,
              dateString: r.dateString,
              likesCount: r.likesCount || 0,
              commentsCount: 0,
              isLiked: r.isLiked || false,
              reviewerName: targetProf.display_name || "Reader",
              reviewerAvatar: targetProf.avatar_url || "",
              reviewerUsername: targetProf.username || "reader",
              bookTitle: book?.title || r.bookTitle || "",
              bookAuthor: book?.author || r.bookAuthor || "",
              bookCover: book?.coverImage || r.bookCover || "",
            };
          });

          // Pinned Favorites from mock matching
          const { INITIAL_USERS: usersList } = await import("@/data/mockData");
          const matchedMockUser = usersList.find((u) => u.id === targetProf.id);
          const favoriteBookIds = matchedMockUser ? matchedMockUser.favoriteBookIds : [];
          mappedFavorites = books
              .filter((b) => favoriteBookIds.includes(b.id))
              .map((b) => ({
                ...b,
                coverImage: b.coverImage || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
              }));

          // Mock user stats
          stats = {
            reading_streak: 3,
            favorite_genre: "Fiction",
          };
          
          if (isMe && contextStats) {
            stats = contextStats;
          }
          
          const mockCompleted = logsToUse.filter((l) => l.status === "Finished").length;
          const mockReading = logsToUse.filter((l) => l.status === "Currently Reading").length;
          const mockWantToRead = logsToUse.filter((l) => l.status === "Want to Read").length;
          setCompletedCount(mockCompleted);
          setReadingCount(mockReading);
          setWantToReadCount(mockWantToRead);

          followersCount = 0;
          followingCount = 0;
          isFollowing = matchedMockUser?.isFollowing || false;
        }

        const isDepAvatar = targetProf.avatar_url && targetProf.avatar_url.includes("photo-1534528741775-53994a69daeb");
        setTargetUser({
          id: targetProf.id,
          username: targetProf.username,
          name: targetProf.display_name || "Reader",
          avatar: isDepAvatar ? "" : (targetProf.avatar_url || ""),
          bio: targetProf.bio || "",
          followersCount,
          followingCount,
          isFollowing,
          email: targetProf.email || "",
          joinedAt: targetProf.created_at || targetProf.joined_at || new Date().toISOString(),
        });

        setUserStats(stats);
        setFinishedLogs(mappedFinished);
        setUserReviews(mappedReviews);
        setFavoriteBooks(mappedFavorites);
      } catch (err) {
        console.error("Error loading target user profile details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfileData();
  }, [username, currentUser, diaryLogs, reviews, contextStats, books]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <svg className="animate-spin h-8 w-8 text-brand mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xs text-charcoal-muted">Retrieving profile details...</p>
        </div>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <BookOpen className="w-12 h-12 text-charcoal-muted mb-4 opacity-50" />
          <h2 className="font-serif text-xl font-bold text-charcoal">Reader Not Found</h2>
          <p className="text-xs text-charcoal-muted mt-1">
            The profile you requested does not exist in our reader archives.
          </p>
        </div>
      </div>
    );
  }

  const isMe = targetUser.id === currentUser?.id;

  // Deriving reading stats
  const totalBooksRead = finishedLogs.length;
  const totalPagesRead = finishedLogs.reduce((acc, curr) => acc + curr.currentPage, 0);

  // User curated lists
  const userLists = lists.filter((l) => l.userId === targetUser.id);

  // User liked reviews (for public reviews where target user is the reviewer or likes count exists)
  const likedReviews = reviews.filter((r) => r.userId === targetUser.id && r.likesCount > 0);

  const handleFollowClick = async () => {
    setTargetUser((prev: any) => ({
      ...prev,
      isFollowing: !prev.isFollowing,
      followersCount: prev.isFollowing ? prev.followersCount - 1 : prev.followersCount + 1,
    }));
    await toggleFollowUser(targetUser.id);
  };

  const openSocialModal = async (type: "followers" | "following") => {
    setSocialModal(type);
    setSocialLoading(true);
    setSocialUsers([]);
    try {
      const res = await fetch(`/api/follows?userId=${targetUser.id}&type=${type}`);
      const data = await res.json();
      if (data.success) setSocialUsers(data.users || []);
    } catch (err) {
      console.error("Failed to load social list:", err);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleModalFollow = async (userId: string) => {
    if (!currentUser?.id || !isAuthenticated) {
      router.push("/auth");
      return;
    }
    if (userId === currentUser.id) return;
    setFollowBusyId(userId);
    const prev = socialUsers;
    setSocialUsers((list) =>
      list.map((u) => (u.id === userId ? { ...u, isFollowing: !u.isFollowing } : u))
    );
    try {
      await toggleFollowUser(userId);
    } catch {
      setSocialUsers(prev);
    } finally {
      setFollowBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        
        {/* User Card Layout (Upper Section) */}
        <section className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start pb-8 border-b border-cream-border/80 mb-10">
          {/* Avatar */}
          <UserAvatar avatarUrl={targetUser.avatar} name={targetUser.name} size="xl" className="shadow-md border-2 border-cream-border" />

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="space-y-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
                <h1 className="font-serif text-3xl font-bold text-charcoal">
                  {targetUser.name}
                </h1>
                
                {/* Follow Button */}
                {!isMe && (
                  <button
                    onClick={handleFollowClick}
                    className={`h-7 px-3.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      targetUser.isFollowing
                        ? "bg-cream-dark border border-cream-border text-charcoal hover:bg-cream-dark/80"
                        : "bg-brand text-cream hover:bg-brand-light"
                    }`}
                  >
                    {targetUser.isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-charcoal-muted font-medium">@{targetUser.username}</p>
            </div>

            {/* Bio */}
            <p className="text-xs text-charcoal-light max-w-xl leading-relaxed">
              {targetUser.bio}
            </p>

            {/* Email & Joined Date */}
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-1 text-[10px] text-charcoal-muted font-medium">
              {isMe && targetUser.email && (
                <span className="flex items-center gap-1">
                  <span>✉️</span> <span className="underline decoration-cream-border">{targetUser.email}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-brand-muted" />
                <span>Joined {new Date(targetUser.joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              </span>
            </div>

            {/* Following stats */}
            <div className="flex justify-center md:justify-start gap-8 text-xs font-semibold text-charcoal">
              <button
                type="button"
                onClick={() => openSocialModal("followers")}
                className="flex gap-1.5 hover:opacity-80 transition-opacity"
              >
                <span className="font-serif text-sm font-bold">{targetUser.followersCount}</span>
                <span className="text-charcoal-muted">followers</span>
              </button>
              <button
                type="button"
                onClick={() => openSocialModal("following")}
                className="flex gap-1.5 hover:opacity-80 transition-opacity"
              >
                <span className="font-serif text-sm font-bold">{targetUser.followingCount}</span>
                <span className="text-charcoal-muted">following</span>
              </button>
            </div>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="bg-cream-card border border-cream-border rounded-2xl p-5 w-full max-w-[320px] shadow-sm space-y-4 scale-95 md:scale-100">
            <div className="flex justify-between items-center border-b border-cream-border/60 pb-2">
              <span className="text-[10px] font-bold text-charcoal uppercase tracking-wider">Reading Activity</span>
              {isMe && (
                <Link href="/stats" className="text-[9px] font-bold text-brand hover:underline flex items-center gap-0.5">
                  Full Stats <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center py-1">
                <p className="text-[9px] font-bold text-charcoal-muted uppercase leading-tight">Completed</p>
                <p className="font-serif text-xl font-bold text-charcoal mt-1">{completedCount}</p>
              </div>
              <div className="text-center py-1 border-l border-cream-border/60">
                <p className="text-[9px] font-bold text-charcoal-muted uppercase leading-tight">Reading</p>
                <p className="font-serif text-xl font-bold text-charcoal mt-1">{readingCount}</p>
              </div>
              <div className="text-center py-1 border-l border-cream-border/60">
                <p className="text-[9px] font-bold text-charcoal-muted uppercase leading-tight">To Read</p>
                <p className="font-serif text-xl font-bold text-charcoal mt-1">{wantToReadCount}</p>
              </div>
            </div>

            <div className="border-t border-cream-border/60 pt-3 flex justify-between items-center text-xs">
              <span className="text-[9px] font-bold text-charcoal-muted uppercase">Total Pages Read</span>
              <span className="font-serif font-bold text-charcoal">{totalPagesRead} pages</span>
            </div>
              
            {userStats && (
              <div className="grid grid-cols-2 gap-4 border-t border-cream-border/60 pt-3">
                <div className="text-center py-1">
                  <p className="text-[9px] font-bold text-charcoal-muted uppercase">Streak</p>
                  <p className="font-serif text-xl font-bold text-charcoal mt-1 flex items-center justify-center gap-1">
                    {userStats.reading_streak || 0} <Flame className="w-4 h-4 text-brand fill-brand/10 animate-pulse" />
                  </p>
                </div>
                <div className="text-center py-1 border-l border-cream-border/60">
                  <p className="text-[9px] font-bold text-charcoal-muted uppercase">Top Genre</p>
                  <p className="font-sans text-xs font-bold text-charcoal mt-2 truncate px-1" title={userStats.favorite_genre}>
                    {userStats.favorite_genre || "Fiction"}
                  </p>
                </div>
              </div>
            )}

            {/* Reading Goal Progress Bar */}
            {userStats && (
              <div className="space-y-1.5 pt-2 border-t border-cream-border/60">
                <div className="flex justify-between text-[9px] font-bold text-charcoal-muted uppercase">
                  <span>Yearly Goal</span>
                  <span>{completedCount} / 12 books</span>
                </div>
                <div className="w-full bg-cream-dark h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (completedCount / 12) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Favorite Books Shelf Widget */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Grid className="w-4 h-4 text-brand" />
            <h3 className="font-serif text-lg font-bold text-charcoal">
              Curated Favorites
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center bg-cream-card border border-cream-border rounded-2xl p-6 shadow-sm">
            {favoriteBooks.length > 0 ? (
              favoriteBooks.map((book) => (
                <div key={book.id} className="space-y-2 text-center">
                  <BookCard book={book} size="md" />
                  <div className="max-w-[125px] mx-auto min-w-0">
                    <p className="text-xs font-semibold text-charcoal truncate">
                      {book.title}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-charcoal-muted text-xs">
                No favorite books pinned on the shelf yet.
              </div>
            )}
          </div>
        </section>

        {/* Detailed Tabs Navigation */}
        <section className="space-y-6">
          <div className="flex border-b border-cream-border/60 gap-8 text-xs font-semibold text-charcoal-muted pb-0.5">
            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-3 border-b-2 px-1 transition-colors ${
                activeTab === "activity"
                  ? "border-brand text-charcoal font-bold"
                  : "border-transparent hover:text-charcoal"
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab("diary")}
              className={`pb-3 border-b-2 px-1 transition-colors ${
                activeTab === "diary"
                  ? "border-brand text-charcoal font-bold"
                  : "border-transparent hover:text-charcoal"
              }`}
            >
              Diary
            </button>
            <button
              onClick={() => setActiveTab("lists")}
              className={`pb-3 border-b-2 px-1 transition-colors ${
                activeTab === "lists"
                  ? "border-brand text-charcoal font-bold"
                  : "border-transparent hover:text-charcoal"
              }`}
            >
              Lists ({userLists.length})
            </button>
            <button
              onClick={() => setActiveTab("likes")}
              className={`pb-3 border-b-2 px-1 transition-colors ${
                activeTab === "likes"
                  ? "border-brand text-charcoal font-bold"
                  : "border-transparent hover:text-charcoal"
              }`}
            >
              Likes ({likedReviews.length})
            </button>
          </div>

          {/* Switch Tab Content */}
          <div className="min-h-[200px]">
            {activeTab === "activity" && (
              <div className="space-y-6">
                {userReviews.length > 0 ? (
                  userReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))
                ) : (
                  <div className="text-center py-10 bg-cream-card border border-cream-border rounded-xl">
                    <p className="text-xs text-charcoal-muted">No recent activities or reviews logged.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "diary" && (
              <div className="bg-cream-card border border-cream-border rounded-xl overflow-hidden shadow-sm">
                {finishedLogs.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-cream-dark/50 border-b border-cream-border font-bold text-charcoal uppercase tracking-wider text-[9px]">
                        <th className="p-4 pl-6">Completed Date</th>
                        <th className="p-4">Book Cover & Title</th>
                        <th className="p-4">Author</th>
                        <th className="p-4">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-border/60">
                      {finishedLogs.map((log) => {
                        const book = {
                          id: log.bookId,
                          title: log.bookTitle,
                          author: log.bookAuthor,
                          coverImage: log.bookCover,
                        };
                        return (
                          <tr key={log.id} className="hover:bg-cream-dark/20 transition-colors">
                            <td className="p-4 pl-6 text-charcoal-muted font-medium">
                              {new Date(log.dateLogged).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td className="p-4 font-bold text-charcoal">
                              <div className="flex items-center gap-3">
                                <Link href={`/book/${book.id}`}>
                                  <img
                                    src={book.coverImage}
                                    alt={book.title}
                                    className="w-8 h-12 object-cover rounded shadow-sm hover:scale-95 transition-transform"
                                  />
                                </Link>
                                <Link href={`/book/${book.id}`} className="hover:underline">
                                  {book.title}
                                </Link>
                              </div>
                            </td>
                            <td className="p-4 text-charcoal-light">{book.author}</td>
                            <td className="p-4">
                              {log.rating !== undefined ? (
                                <StarDisplay rating={log.rating} size={11} />
                              ) : (
                                <span className="text-[10px] text-charcoal-muted italic">No Rating</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-charcoal-muted text-xs">
                    The reading diary is currently empty.
                  </div>
                )}
              </div>
            )}

            {activeTab === "lists" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userLists.length > 0 ? (
                  userLists.map((list) => (
                    <div
                      key={list.id}
                      className="bg-cream-card border border-cream-border hover:border-brand rounded-xl overflow-hidden shadow-sm flex flex-col justify-between"
                    >
                      <div className="relative h-36 bg-charcoal/10">
                        <img
                          src={list.coverImage}
                          alt={list.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/30 to-transparent flex flex-col justify-end p-4">
                          <span className="text-[8px] uppercase tracking-wider text-cream/70 font-semibold mb-0.5">
                            {list.bookIds.length} Books
                          </span>
                          <h4 className="font-serif text-lg font-bold text-cream">
                            {list.title}
                          </h4>
                        </div>
                      </div>
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <p className="text-xs text-charcoal-muted leading-relaxed line-clamp-2">
                          {list.description}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-10 bg-cream-card border border-cream-border rounded-xl">
                    <p className="text-xs text-charcoal-muted">No collections created yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "likes" && (
              <div className="space-y-6">
                {likedReviews.length > 0 ? (
                  likedReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))
                ) : (
                  <div className="text-center py-10 bg-cream-card border border-cream-border rounded-xl">
                    <p className="text-xs text-charcoal-muted">No liked reviews in this profile yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Followers / Following modal */}
      {socialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            onClick={() => setSocialModal(null)}
          />
          <div className="relative w-full max-w-md bg-cream border border-cream-border rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-border">
              <h3 className="font-serif text-lg font-bold text-charcoal capitalize">
                {socialModal}
              </h3>
              <button
                type="button"
                onClick={() => setSocialModal(null)}
                className="p-1.5 rounded-lg text-charcoal-muted hover:bg-cream-dark hover:text-charcoal transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-3 space-y-1">
              {socialLoading ? (
                <p className="text-xs text-charcoal-muted text-center py-8">Loading…</p>
              ) : socialUsers.length === 0 ? (
                <p className="text-xs text-charcoal-muted text-center py-8">
                  No {socialModal} yet.
                </p>
              ) : (
                socialUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-cream-dark/40 transition-colors"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      onClick={() => {
                        setSocialModal(null);
                        router.push(`/profile/${u.username}`);
                      }}
                    >
                      <UserAvatar avatarUrl={u.avatar} name={u.name} size={36} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-charcoal truncate">{u.name}</p>
                        <p className="text-[10px] text-charcoal-muted truncate">@{u.username}</p>
                      </div>
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        disabled={followBusyId === u.id}
                        onClick={() => handleModalFollow(u.id)}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 flex-shrink-0 ${
                          u.isFollowing
                            ? "bg-cream-dark border border-cream-border text-charcoal"
                            : "bg-brand text-cream hover:bg-brand-light"
                        }`}
                      >
                        {u.isFollowing ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            Follow
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
