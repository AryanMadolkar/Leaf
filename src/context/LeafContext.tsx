"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Book,
  User,
  Review,
  ReadingLog,
  CuratedList,
  Comment,
  INITIAL_BOOKS,
  INITIAL_USERS,
  INITIAL_REVIEWS,
  INITIAL_DIARY_LOGS,
  INITIAL_LISTS,
  INITIAL_COMMENTS,
} from "../data/mockData";

interface LeafContextType {
  books: Book[];
  users: User[];
  reviews: Review[];
  diaryLogs: ReadingLog[];
  lists: CuratedList[];
  comments: Comment[];
  currentUser: User;
  isAuthenticated: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
  addReview: (bookId: string, rating: number, content: string) => void;
  toggleLikeReview: (reviewId: string) => void;
  toggleLikeList: (listId: string) => void;
  addComment: (reviewId: string, content: string) => void;
  logBook: (
    bookId: string,
    status: "Want to Read" | "Currently Reading" | "Finished",
    rating?: number,
    reviewContent?: string
  ) => void;
  createList: (title: string, description: string, coverImage: string, bookIds: string[]) => void;
  toggleFollowUser: (userId: string) => void;
  updateProfile: (name: string, bio: string, avatar: string, favoriteBookIds: string[]) => void;
  addCachedBookToContext: (book: Book) => void;
  readingSessions: any[];
  userStats: any | null;
  logReadingSession: (bookId: string, pagesRead: number, note?: string, readingMinutes?: number) => Promise<any>;
  updateBookProgressDirectly: (bookId: string, currentPage: number) => Promise<any>;
}

const LeafContext = createContext<LeafContextType | undefined>(undefined);

export const LeafProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [diaryLogs, setDiaryLogs] = useState<ReadingLog[]>(INITIAL_DIARY_LOGS);
  const [lists, setLists] = useState<CuratedList[]>(INITIAL_LISTS);
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[4]); // Rowan Archer
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [readingSessions, setReadingSessions] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any | null>(null);

  // Load from database on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const res = await fetch("/api/init");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setBooks(data.books);
            setDiaryLogs(data.diaryLogs);
            setReviews(data.reviews);
            setReadingSessions(data.sessions || []);
            setUserStats(data.stats || null);
            save("leaf_books", data.books);
            save("leaf_logs", data.diaryLogs);
            save("leaf_reviews", data.reviews);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load initial data from DB:", err);
      }

      // Fallback to local storage
      if (typeof window !== "undefined") {
        const storedBooks = localStorage.getItem("leaf_books");
        const storedReviews = localStorage.getItem("leaf_reviews");
        const storedLogs = localStorage.getItem("leaf_logs");
        if (storedBooks) setBooks(JSON.parse(storedBooks));
        if (storedReviews) setReviews(JSON.parse(storedReviews));
        if (storedLogs) setDiaryLogs(JSON.parse(storedLogs));
      }
    }

    fetchInitialData();

    if (typeof window !== "undefined") {
      const storedUsers = localStorage.getItem("leaf_users");
      const storedLists = localStorage.getItem("leaf_lists");
      const storedComments = localStorage.getItem("leaf_comments");
      const storedCurrentUser = localStorage.getItem("leaf_current_user");
      const storedAuth = localStorage.getItem("leaf_auth");

      if (storedUsers) setUsers(JSON.parse(storedUsers));
      if (storedLists) setLists(JSON.parse(storedLists));
      if (storedComments) setComments(JSON.parse(storedComments));
      if (storedCurrentUser) setCurrentUser(JSON.parse(storedCurrentUser));
      if (storedAuth) setIsAuthenticated(JSON.parse(storedAuth));
    }
  }, []);

  // Save state helper
  const save = (key: string, data: any) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  const signIn = (email: string) => {
    setIsAuthenticated(true);
    save("leaf_auth", true);
  };

  const signOut = () => {
    setIsAuthenticated(false);
    save("leaf_auth", false);
  };

  const addReview = (bookId: string, rating: number, content: string) => {
    logBook(bookId, "Finished", rating, content);
  };

  const toggleLikeReview = async (reviewId: string) => {
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;

    const action = review.isLiked ? "unlike" : "like";

    // Optimistic UI update
    const updatedReviews = reviews.map((r) => {
      if (r.id === reviewId) {
        const isLiked = !r.isLiked;
        return {
          ...r,
          isLiked,
          likesCount: isLiked ? r.likesCount + 1 : Math.max(0, r.likesCount - 1),
        };
      }
      return r;
    });
    setReviews(updatedReviews);
    save("leaf_reviews", updatedReviews);

    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, action }),
      });
    } catch (err) {
      console.error("Failed to sync review like to database:", err);
    }
  };

  const toggleLikeList = (listId: string) => {
    const updatedLists = lists.map((l) => {
      if (l.id === listId) {
        const isLiked = !l.isLiked;
        return {
          ...l,
          isLiked,
          likesCount: isLiked ? l.likesCount + 1 : l.likesCount - 1,
        };
      }
      return l;
    });
    setLists(updatedLists);
    save("leaf_lists", updatedLists);
  };

  const addComment = (reviewId: string, content: string) => {
    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      reviewId,
      userId: currentUser.id,
      content,
      dateString: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    };

    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    save("leaf_comments", updatedComments);

    // Update comment count on review or list
    const updatedReviews = reviews.map((r) => {
      if (r.id === reviewId) {
        return { ...r, commentsCount: r.commentsCount + 1 };
      }
      return r;
    });
    setReviews(updatedReviews);
    save("leaf_reviews", updatedReviews);

    const updatedLists = lists.map((l) => {
      if (l.id === reviewId) {
        return { ...l, commentsCount: l.commentsCount + 1 };
      }
      return l;
    });
    setLists(updatedLists);
    save("leaf_lists", updatedLists);
  };

  const logBook = async (
    bookId: string,
    status: "Want to Read" | "Currently Reading" | "Finished",
    rating?: number,
    reviewContent?: string
  ) => {
    try {
      const res = await fetch("/api/user-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          bookId,
          status,
          rating,
          review: reviewContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDiaryLogs(data.diaryLogs);
          setReviews(data.reviews);
          setReadingSessions(data.sessions || []);
          setUserStats(data.stats || null);
          save("leaf_logs", data.diaryLogs);
          save("leaf_reviews", data.reviews);

          // Refresh books in case a new book was added
          const initRes = await fetch("/api/init");
          if (initRes.ok) {
            const initData = await initRes.json();
            if (initData.success) {
              setBooks(initData.books);
              save("leaf_books", initData.books);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync log entry to database:", err);
    }
  };

  const logReadingSession = async (
    bookId: string,
    pagesRead: number,
    note?: string,
    readingMinutes?: number
  ) => {
    const log = diaryLogs.find((l) => l.bookId === bookId && l.userId === currentUser.id);
    const startPage = log && log.currentPage ? log.currentPage : 0;
    const endPage = startPage + pagesRead;

    try {
      const res = await fetch("/api/reading-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          bookId,
          pagesRead,
          startPage,
          endPage,
          note,
          readingMinutes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDiaryLogs(data.diaryLogs);
          setReviews(data.reviews);
          setReadingSessions(data.sessions || []);
          setUserStats(data.stats || null);
          save("leaf_logs", data.diaryLogs);
          save("leaf_reviews", data.reviews);

          // Refresh books in case a new book was added
          const initRes = await fetch("/api/init");
          if (initRes.ok) {
            const initData = await initRes.json();
            if (initData.success) {
              setBooks(initData.books);
              save("leaf_books", initData.books);
            }
          }
          return data;
        }
      }
    } catch (err) {
      console.error("Failed to log reading session:", err);
    }
    return null;
  };

  const updateBookProgressDirectly = async (bookId: string, currentPage: number) => {
    const log = diaryLogs.find((l) => l.bookId === bookId && l.userId === currentUser.id);
    const startPage = log && log.currentPage ? log.currentPage : 0;
    const pagesRead = Math.max(0, currentPage - startPage);
    return await logReadingSession(bookId, pagesRead, undefined, undefined);
  };

  const createList = (title: string, description: string, coverImage: string, bookIds: string[]) => {
    const newList: CuratedList = {
      id: `list-${Date.now()}`,
      userId: currentUser.id,
      title,
      description,
      coverImage: coverImage || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
      bookIds,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
    };

    const updatedLists = [newList, ...lists];
    setLists(updatedLists);
    save("leaf_lists", updatedLists);
  };

  const toggleFollowUser = (userId: string) => {
    // Toggle follow state in users list
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        const isFollowing = !u.isFollowing;
        return {
          ...u,
          isFollowing,
          followersCount: isFollowing ? u.followersCount + 1 : u.followersCount - 1,
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    save("leaf_users", updatedUsers);

    // Update currentUser following count
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser) {
      const currentlyFollowing = !targetUser.isFollowing; // state is inverted in updatedUsers but we calculate based on original list
      const updatedCurrentUser = {
        ...currentUser,
        followingCount: currentlyFollowing
          ? currentUser.followingCount + 1
          : currentUser.followingCount - 1,
      };
      setCurrentUser(updatedCurrentUser);
      save("leaf_current_user", updatedCurrentUser);

      // also sync current user in user list
      const syncedUsers = updatedUsers.map((u) => {
        if (u.id === currentUser.id) {
          return updatedCurrentUser;
        }
        return u;
      });
      setUsers(syncedUsers);
      save("leaf_users", syncedUsers);
    }
  };

  const updateProfile = (name: string, bio: string, avatar: string, favoriteBookIds: string[]) => {
    const updatedCurrentUser = {
      ...currentUser,
      name,
      bio,
      avatar,
      favoriteBookIds,
    };
    setCurrentUser(updatedCurrentUser);
    save("leaf_current_user", updatedCurrentUser);

    const updatedUsers = users.map((u) => {
      if (u.id === currentUser.id) {
        return updatedCurrentUser;
      }
      return u;
    });
    setUsers(updatedUsers);
    save("leaf_users", updatedUsers);
  };

  const addCachedBookToContext = (book: Book) => {
    setBooks((prev) => {
      if (prev.some((b) => b.id === book.id)) return prev;
      const next = [...prev, book];
      save("leaf_books", next);
      return next;
    });
  };

  return (
    <LeafContext.Provider
      value={{
        books,
        users,
        reviews,
        diaryLogs,
        lists,
        comments,
        currentUser,
        isAuthenticated,
        signIn,
        signOut,
        addReview,
        toggleLikeReview,
        toggleLikeList,
        addComment,
        logBook,
        createList,
        toggleFollowUser,
        updateProfile,
        addCachedBookToContext,
        readingSessions,
        userStats,
        logReadingSession,
        updateBookProgressDirectly,
      }}
    >
      {children}
    </LeafContext.Provider>
  );
};

export const useLeaf = () => {
  const context = useContext(LeafContext);
  if (context === undefined) {
    throw new Error("useLeaf must be used within a LeafProvider");
  }
  return context;
};
