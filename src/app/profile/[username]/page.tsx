"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";
import ReviewCard, { StarDisplay } from "@/components/ReviewCard";
import { useLeaf } from "@/context/LeafContext";
import { Calendar, Layers, Heart, BookOpen, UserCheck, UserPlus, Grid } from "lucide-react";
import Link from "next/link";

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = React.use(params);
  const {
    users,
    books,
    reviews,
    diaryLogs,
    lists,
    currentUser,
    toggleFollowUser,
  } = useLeaf();

  const [activeTab, setActiveTab] = useState<"activity" | "diary" | "lists" | "likes">("activity");

  // Find user by username
  const user = users.find(
    (u) => u.username.toLowerCase() === decodeURIComponent(username).toLowerCase()
  );

  if (!user) {
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

  const isMe = user.id === currentUser.id;

  // Reviews written by this user
  const userReviews = reviews.filter((r) => r.userId === user.id);

  // Books finished by this user (logs with Finished status)
  const finishedLogs = diaryLogs
    .filter((l) => l.userId === user.id && l.status === "Finished")
    .sort((a, b) => new Date(b.dateLogged).getTime() - new Date(a.dateLogged).getTime());

  // Reading stats derived
  const totalBooksRead = finishedLogs.length;
  const totalPagesRead = finishedLogs.reduce((acc, curr) => {
    const book = books.find((b) => b.id === curr.bookId);
    return acc + (book ? book.pages : 0);
  }, 0);

  // User curated lists
  const userLists = lists.filter((l) => l.userId === user.id);

  // User liked reviews
  const likedReviews = reviews.filter((r) => r.isLiked);

  // Favorites shelf books
  const favoriteBooks = books.filter((b) => user.favoriteBookIds.includes(b.id));

  const handleFollowClick = () => {
    toggleFollowUser(user.id);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        
        {/* User Card Layout (Upper Section) */}
        <section className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start pb-8 border-b border-cream-border/80 mb-10">
          {/* Avatar */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-cream-border overflow-hidden shadow-md">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="space-y-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
                <h1 className="font-serif text-3xl font-bold text-charcoal">
                  {user.name}
                </h1>
                
                {/* Follow Button */}
                {!isMe && (
                  <button
                    onClick={handleFollowClick}
                    className={`h-7 px-3.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      user.isFollowing
                        ? "bg-cream-dark border border-cream-border text-charcoal hover:bg-cream-dark/80"
                        : "bg-brand text-cream hover:bg-brand-light"
                    }`}
                  >
                    {user.isFollowing ? (
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
              <p className="text-xs text-charcoal-muted font-medium">@{user.username}</p>
            </div>

            {/* Bio */}
            <p className="text-xs text-charcoal-light max-w-xl leading-relaxed">
              {user.bio}
            </p>

            {/* Following stats */}
            <div className="flex justify-center md:justify-start gap-8 text-xs font-semibold text-charcoal">
              <div className="flex gap-1.5">
                <span className="font-serif text-sm font-bold">{user.followersCount}</span>
                <span className="text-charcoal-muted">followers</span>
              </div>
              <div className="flex gap-1.5">
                <span className="font-serif text-sm font-bold">{user.followingCount}</span>
                <span className="text-charcoal-muted">following</span>
              </div>
            </div>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 bg-cream-card border border-cream-border rounded-xl p-4 w-full max-w-[280px] scale-95 md:scale-100">
            <div className="text-center py-1.5">
              <p className="text-[9px] font-bold text-charcoal-muted uppercase">Logged Books</p>
              <p className="font-serif text-2xl font-bold text-charcoal mt-0.5">{totalBooksRead}</p>
            </div>
            <div className="text-center py-1.5 border-l border-cream-border/60">
              <p className="text-[9px] font-bold text-charcoal-muted uppercase">Pages Count</p>
              <p className="font-serif text-2xl font-bold text-charcoal mt-0.5">{totalPagesRead}</p>
            </div>
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
                        const book = books.find((b) => b.id === log.bookId);
                        if (!book) return null;
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
                    Your reading diary is currently empty.
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
                        
                        <div className="flex gap-1">
                          {list.bookIds.map((bid) => {
                            const b = books.find((x) => x.id === bid);
                            if (!b) return null;
                            return (
                              <Link key={bid} href={`/book/${bid}`} title={b.title}>
                                <img
                                  src={b.coverImage}
                                  alt={b.title}
                                  className="w-7 h-10 object-cover rounded shadow-sm hover:-translate-y-1 transition-transform border border-cream-border"
                                />
                              </Link>
                            );
                          })}
                        </div>
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
    </div>
  );
}
