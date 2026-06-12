"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
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
  updateProfile: (name: string, bio: string, avatar: string, favoriteBookIds: string[], genres?: string[]) => void;
  addCachedBookToContext: (book: Book) => void;
  readingSessions: any[];
  userStats: any | null;
  logReadingSession: (bookId: string, pagesRead: number, note?: string, readingMinutes?: number) => Promise<any>;
  updateBookProgressDirectly: (bookId: string, currentPage: number) => Promise<any>;
  
  // Live Supabase Authenticated States
  session: any | null;
  profile: any | null;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signUpWithPassword: (email: string, password: string, username: string, name: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
}

const LeafContext = createContext<LeafContextType | undefined>(undefined);

export const LeafProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = createClient();
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [diaryLogs, setDiaryLogs] = useState<ReadingLog[]>([]);
  const [lists, setLists] = useState<CuratedList[]>(INITIAL_LISTS);
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[4]); // Rowan Fallback
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [readingSessions, setReadingSessions] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any | null>(null);

  // Supabase auth sessions
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  // Setup Auth Subscription
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      if (_event === "SIGNED_OUT") {
        setProfile(null);
        setUserStats(null);
        setDiaryLogs([]);
        setReadingSessions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Load user data dynamically from active session
  useEffect(() => {
    if (!session?.user) return;

    async function fetchUserData() {
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
            
            // Map profile details to the Client currentUser interface for layout compatibility
            if (data.profile) {
              setProfile(data.profile);
              setCurrentUser({
                id: data.profile.id,
                username: data.profile.username,
                name: data.profile.display_name || "Reader",
                avatar: data.profile.avatar_url || INITIAL_USERS[4].avatar,
                bio: data.profile.bio || "",
                followersCount: data.profile.followersCount || 0,
                followingCount: data.profile.followingCount || 0,
                favoriteBookIds: data.profile.favoriteBookIds || [],
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load authenticated user profile details:", err);
      }
    }

    fetchUserData();
  }, [session]);

  const signIn = (email: string) => {
    // Legacy fallback, do nothing or mock signin
    setIsAuthenticated(true);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setSession(null);
    setProfile(null);
  };

  // Auth Action Methods
  const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUpWithPassword = async (email: string, password: string, username: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        data: {
          username,
          display_name: name,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    if (error) throw error;
    return data;
  };

  // Review Operations
  const addReview = (bookId: string, rating: number, content: string) => {
    logBook(bookId, "Finished", rating, content);
  };

  const toggleLikeReview = async (reviewId: string) => {
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;

    const action = review.isLiked ? "unlike" : "like";

    // Optimistic UI updates
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

    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, action }),
      });
    } catch (err) {
      console.error("Failed to sync review like:", err);
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

    const updatedReviews = reviews.map((r) => {
      if (r.id === reviewId) {
        return { ...r, commentsCount: r.commentsCount + 1 };
      }
      return r;
    });
    setReviews(updatedReviews);
  };

  // Sync Log Book to DB
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
          
          // Trigger hot reload of profile catalog
          const initRes = await fetch("/api/init");
          if (initRes.ok) {
            const initData = await initRes.json();
            if (initData.success) {
              setBooks(initData.books);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to log book shelf update:", err);
    }
  };

  // Log progress reading sessions
  const logReadingSession = async (
    bookId: string,
    pagesRead: number,
    note?: string,
    readingMinutes?: number
  ) => {
    const log = diaryLogs.find((l) => l.bookId === bookId);
    const startPage = log && log.currentPage ? log.currentPage : 0;
    const endPage = startPage + pagesRead;

    try {
      const res = await fetch("/api/reading-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

          const initRes = await fetch("/api/init");
          if (initRes.ok) {
            const initData = await initRes.json();
            if (initData.success) {
              setBooks(initData.books);
            }
          }
          return data;
        }
      }
    } catch (err) {
      console.error("Failed to save reading session progress:", err);
    }
    return null;
  };

  const updateBookProgressDirectly = async (bookId: string, currentPage: number) => {
    const log = diaryLogs.find((l) => l.bookId === bookId);
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
    setLists([newList, ...lists]);
  };

  const toggleFollowUser = async (userId: string) => {
    // Optimistic local update
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

    try {
      await fetch(`/api/user-books?followId=${userId}`, {
        method: "PUT",
      });
    } catch (err) {
      console.error("Failed to save follow relationship:", err);
    }
  };

  const updateProfile = async (name: string, bio: string, avatar: string, favoriteBookIds: string[], genres?: string[]) => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: name,
          bio,
          avatar_url: avatar,
          favorite_genres: genres || [],
        })
        .eq("id", session.user.id)
        .select()
        .single();

      if (!error && data) {
        setProfile(data);
        setCurrentUser((prev) => ({
          ...prev,
          name: data.display_name || prev.name,
          bio: data.bio || prev.bio,
          avatar: data.avatar_url || prev.avatar,
        }));
      }
    } catch (err) {
      console.error("Failed to sync profile update to Supabase:", err);
    }
  };

  const addCachedBookToContext = (book: Book) => {
    setBooks((prev) => {
      if (prev.some((b) => b.id === book.id)) return prev;
      return [...prev, book];
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
        
        // Supabase Auth
        session,
        profile,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        resetPassword,
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
