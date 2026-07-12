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
  signOut: () => Promise<void>;
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
  resetPassword: (email: string) => Promise<any>;
  signInAsGuest: () => void;
}

const isDeprecatedAvatar = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes("photo-1534528741775-53994a69daeb");
};

const LeafContext = createContext<LeafContextType | undefined>(undefined);

export const LeafProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [reviews, setReviews] = useState<Review[]>([]);
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

  // Client local storage data loading fallback helper
  const loadLocalStorageData = () => {
    try {
      const storedLogs = localStorage.getItem("leaf_local_diary_logs");
      const storedReviews = localStorage.getItem("leaf_local_reviews");
      const storedSessions = localStorage.getItem("leaf_local_sessions");
      const storedStats = localStorage.getItem("leaf_local_stats");
      const storedLists = localStorage.getItem("leaf_local_lists");
      const storedProfile = localStorage.getItem("leaf_local_profile");

      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        if (isDeprecatedAvatar(parsedProfile.avatar)) {
          parsedProfile.avatar = "";
          localStorage.setItem("leaf_local_profile", JSON.stringify(parsedProfile));
        }
        setCurrentUser(parsedProfile);
        setProfile(parsedProfile);
      } else {
        const defaultGuest = {
          id: "guest-user-id",
          username: "literary_wanderer",
          name: "Guest Reader",
          avatar: "",
          bio: "An avid reader exploring Leaf in guest mode.",
          followersCount: 0,
          followingCount: 0,
          favoriteBookIds: [],
        };
        setCurrentUser(defaultGuest);
        setProfile(defaultGuest);
      }

      if (storedLogs) setDiaryLogs(JSON.parse(storedLogs));
      else setDiaryLogs([]);

      if (storedReviews) setReviews(JSON.parse(storedReviews));
      else setReviews([]);

      if (storedSessions) setReadingSessions(JSON.parse(storedSessions));
      else setReadingSessions([]);

      if (storedStats) {
        setUserStats(JSON.parse(storedStats));
      } else {
        const initialStats = calculateStatsFromLocalData(
          storedLogs ? JSON.parse(storedLogs) : [],
          storedSessions ? JSON.parse(storedSessions) : []
        );
        setUserStats(initialStats);
      }

      if (storedLists) setLists(JSON.parse(storedLists));
      else setLists(INITIAL_LISTS);
    } catch (e) {
      console.error("Failed to load local storage data fallback:", e);
    }
  };

  // Recalculates stats dynamically based on diary logs & sessions
  const calculateStatsFromLocalData = (logs: ReadingLog[], sessions: any[]) => {
    const userLogs = logs.filter((l) => l.userId === currentUser.id);
    const finishedLogs = userLogs.filter((l) => l.status === "Finished");
    const readingLogs = userLogs.filter((l) => l.status === "Currently Reading");
    const wantToReadLogs = userLogs.filter((l) => l.status === "Want to Read");

    const booksCompleted = finishedLogs.length;
    const booksReading = readingLogs.length;
    const booksWantToRead = wantToReadLogs.length;

    let totalPagesRead = 0;
    finishedLogs.forEach((l) => {
      const book = books.find((b) => b.id === l.bookId);
      totalPagesRead += book?.pages || 320;
    });
    readingLogs.forEach((l) => {
      totalPagesRead += l.currentPage || 0;
    });

    const ratedFinished = finishedLogs.filter((l) => l.rating !== undefined && l.rating > 0);
    const averageRating = ratedFinished.length > 0
      ? parseFloat((ratedFinished.reduce((sum, l) => sum + (l.rating || 0), 0) / ratedFinished.length).toFixed(2))
      : 0.0;

    const uniqueSessionDays = new Set(sessions.map((s) => {
      const d = new Date(s.logged_at || s.created_at);
      return d.toDateString();
    }));
    
    const sessionDates = Array.from(uniqueSessionDays).map(d => new Date(d)).sort((a,b) => b.getTime() - a.getTime());
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (sessionDates.length > 0) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const firstSessionDate = sessionDates[0];
      firstSessionDate.setHours(0,0,0,0);
      
      if (firstSessionDate.getTime() === today.getTime() || firstSessionDate.getTime() === yesterday.getTime()) {
        currentStreak = 1;
        let lastDate = firstSessionDate;
        for (let i = 1; i < sessionDates.length; i++) {
          const nextDate = sessionDates[i];
          nextDate.setHours(0,0,0,0);
          const diffTime = lastDate.getTime() - nextDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
            lastDate = nextDate;
          } else if (diffDays > 1) {
            break;
          }
        }
      }
      
      if (sessionDates.length > 0) {
        longestStreak = 1;
        tempStreak = 1;
        let lastDate = sessionDates[0];
        lastDate.setHours(0,0,0,0);
        for (let i = 1; i < sessionDates.length; i++) {
          const nextDate = sessionDates[i];
          nextDate.setHours(0,0,0,0);
          const diffTime = lastDate.getTime() - nextDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            tempStreak++;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
          } else if (diffDays > 1) {
            tempStreak = 1;
          }
          lastDate = nextDate;
        }
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      }
    }

    return {
      user_id: currentUser.id,
      books_completed: booksCompleted,
      books_reading: booksReading,
      books_want_to_read: booksWantToRead,
      total_pages_read: totalPagesRead,
      average_rating: averageRating,
      reading_streak: currentStreak || (finishedLogs.length > 0 ? 3 : 0),
      longest_streak: longestStreak || (finishedLogs.length > 0 ? 5 : 0),
      average_pages_per_day: 15.4,
      average_book_length: 312,
      favorite_genre: "Fiction",

      // Compatibility mappings
      total_books_completed: booksCompleted,
      current_streak: currentStreak || (finishedLogs.length > 0 ? 3 : 0),
      total_reading_hours: parseFloat((totalPagesRead / 45).toFixed(1)),
    };
  };

  // Local sync/save helper when server APIs are unavailable
  const saveBookLocally = async (
    bookId: string,
    status: "Want to Read" | "Currently Reading" | "Finished",
    rating?: number,
    reviewContent?: string
  ) => {
    let book = books.find((b) => b.id === bookId);
    if (!book) {
      try {
        const { fetchBookByIsbnOrId } = await import("../utils/openLibrary");
        const fetched = await fetchBookByIsbnOrId(bookId);
        if (fetched) {
          book = fetched;
          setBooks((prev) => [...prev, fetched]);
        }
      } catch (e) {
        console.error("Failed to fetch book details client-side:", e);
      }
      
      if (!book) {
        book = {
          id: bookId,
          title: "Unknown Book",
          author: "Unknown Author",
          year: 2024,
          description: "No description available.",
          coverImage: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
          averageRating: 0.0,
          genres: ["Fiction"],
          pages: 300,
        };
        setBooks((prev) => [...prev, book!]);
      }
    }

    const dateLogged = new Date().toISOString().split("T")[0];
    const newLog: ReadingLog = {
      id: `local-log-${Date.now()}`,
      userId: currentUser.id,
      bookId,
      status,
      dateLogged,
      rating,
      currentPage: status === "Finished" ? (book?.pages || 300) : 0,
    };

    let updatedLogs = [...diaryLogs];
    const existingIndex = updatedLogs.findIndex((log) => log.bookId === bookId && log.userId === currentUser.id);
    if (existingIndex >= 0) {
      const existing = updatedLogs[existingIndex];
      updatedLogs[existingIndex] = {
        ...existing,
        status,
        rating: rating !== undefined ? rating : existing.rating,
        currentPage: status === "Finished" ? (book?.pages || 300) : existing.currentPage,
      };
    } else {
      updatedLogs.push(newLog);
    }
    setDiaryLogs(updatedLogs);
    localStorage.setItem("leaf_local_diary_logs", JSON.stringify(updatedLogs));

    if (status === "Finished" && (rating !== undefined || reviewContent)) {
      const dateObj = new Date();
      const dateString = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
      const newReview: Review = {
        id: `local-rev-${Date.now()}`,
        userId: currentUser.id,
        bookId,
        rating: rating || 0.0,
        content: reviewContent || "",
        dateString,
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        reviewerName: currentUser.name,
        reviewerAvatar: currentUser.avatar,
        reviewerUsername: currentUser.username,
        bookTitle: book?.title || "Unknown Book",
        bookAuthor: book?.author || "Unknown Author",
        bookCover: book?.coverImage || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
      };

      let updatedReviews = [...reviews];
      const revIndex = updatedReviews.findIndex((r) => r.bookId === bookId && r.userId === currentUser.id);
      if (revIndex >= 0) {
        updatedReviews[revIndex] = {
          ...updatedReviews[revIndex],
          rating: rating || updatedReviews[revIndex].rating,
          content: reviewContent || updatedReviews[revIndex].content,
        };
      } else {
        updatedReviews.unshift(newReview);
      }
      setReviews(updatedReviews);
      localStorage.setItem("leaf_local_reviews", JSON.stringify(updatedReviews));
    }

    const updatedStats = calculateStatsFromLocalData(updatedLogs, readingSessions);
    setUserStats(updatedStats);
    localStorage.setItem("leaf_local_stats", JSON.stringify(updatedStats));
  };

  // Local reading session tracker helper
  const logReadingSessionLocally = async (
    bookId: string,
    pagesRead: number,
    note?: string,
    readingMinutes?: number
  ) => {
    const book = books.find((b) => b.id === bookId);
    const log = diaryLogs.find((l) => l.bookId === bookId && l.userId === currentUser.id);
    const startPage = log && log.currentPage ? log.currentPage : 0;
    const endPage = startPage + pagesRead;
    const pagesTotal = book?.pages || 320;

    const newSession = {
      id: `local-sess-${Date.now()}`,
      userId: currentUser.id,
      bookId,
      pages_read: pagesRead,
      start_page: startPage,
      end_page: endPage,
      note: note || "",
      reading_minutes: readingMinutes || Math.round(pagesRead * 1.2),
      logged_at: new Date().toISOString(),
      title: book?.title || "Unknown Book",
      author: book?.author || "Unknown Author",
      coverImage: book?.coverImage || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
    };

    const updatedSessions = [newSession, ...readingSessions];
    setReadingSessions(updatedSessions);
    localStorage.setItem("leaf_local_sessions", JSON.stringify(updatedSessions));

    const updatedLogs = diaryLogs.map((l) => {
      if (l.bookId === bookId && l.userId === currentUser.id) {
        const autoFinished = endPage >= pagesTotal;
        return {
          ...l,
          currentPage: endPage,
          status: autoFinished ? ("Finished" as const) : l.status,
        };
      }
      return l;
    });
    setDiaryLogs(updatedLogs);
    localStorage.setItem("leaf_local_diary_logs", JSON.stringify(updatedLogs));

    const updatedStats = calculateStatsFromLocalData(updatedLogs, updatedSessions);
    setUserStats(updatedStats);
    localStorage.setItem("leaf_local_stats", JSON.stringify(updatedStats));

    const autoFinished = endPage >= pagesTotal;
    return {
      success: true,
      autoFinished,
      diaryLogs: updatedLogs,
      sessions: updatedSessions,
      stats: updatedStats,
    };
  };

  // Setup Auth — custom session cookie via /api/auth/me
  useEffect(() => {
    const isGuest = localStorage.getItem("leaf_guest_session") === "true";
    if (isGuest) {
      setIsAuthenticated(true);
      setSession({
        user: {
          id: "guest-user-id",
          email: "guest@example.com",
        },
      });
      loadLocalStorageData();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) {
            setSession(null);
            setIsAuthenticated(false);
          }
          return;
        }
        const data = await res.json();
        if (cancelled || !data.success || !data.user) return;
        setSession({
          user: {
            id: data.user.id,
            email: data.user.email,
          },
        });
        setIsAuthenticated(true);
        setProfile((prev: any) => prev || data.user);
      } catch {
        if (!cancelled) {
          setSession(null);
          setIsAuthenticated(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load user data dynamically from active session
  useEffect(() => {
    if (!session?.user) return;

    if (session.user.id === "guest-user-id") {
      loadLocalStorageData();
      return;
    }

    async function fetchUserData() {
      try {
        const res = await fetch("/api/init");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            // Merge user library books into the full catalog instead of replacing it
            if (data.books?.length) {
              setBooks((prev) => {
                const merged = new Map(prev.map((b) => [b.id, b]));
                data.books.forEach((b: Book) => merged.set(b.id, b));
                return Array.from(merged.values());
              });
            }
            setDiaryLogs(data.diaryLogs);
            setReviews(data.reviews);
            setReadingSessions(data.sessions || []);
            setUserStats(data.stats || null);
            
            // Map profile details to the Client currentUser interface for layout compatibility
            if (data.profile) {
              const cleanedAvatar = isDeprecatedAvatar(data.profile.avatar_url) ? "" : (data.profile.avatar_url || "");
              const cleanedProfile = { ...data.profile, avatar_url: cleanedAvatar };
              setProfile(cleanedProfile);
              
              const mappedUser = {
                id: data.profile.id,
                username: data.profile.username,
                name: data.profile.display_name || "Reader",
                avatar: cleanedAvatar,
                bio: data.profile.bio || "",
                followersCount: data.profile.followersCount || 0,
                followingCount: data.profile.followingCount || 0,
                favoriteBookIds: data.profile.favoriteBookIds || [],
                email: data.profile.email || session.user.email || "",
                created_at: data.profile.created_at || data.profile.joined_at || session.user.created_at || "",
              };
              setCurrentUser(mappedUser);
              localStorage.setItem("leaf_local_profile", JSON.stringify(mappedUser));
            }
          }
        } else {
          console.warn("API init failed, falling back to localStorage data.");
          loadLocalStorageData();
        }
      } catch (err) {
        console.error("Failed to load authenticated user profile details:", err);
        loadLocalStorageData();
      }
    }

    fetchUserData();
  }, [session]);

  const signIn = (email: string) => {
    // Legacy fallback, do nothing or mock signin
    setIsAuthenticated(true);
  };

  const signInAsGuest = () => {
    localStorage.setItem("leaf_guest_session", "true");
    document.cookie = "leaf_guest_session=true; path=/; max-age=31536000";
    
    const guestUser = {
      id: "guest-user-id",
      username: "literary_wanderer",
      name: "Guest Reader",
      avatar: "",
      bio: "An avid reader exploring Leaf in guest mode.",
      followersCount: 0,
      followingCount: 0,
      favoriteBookIds: [],
    };
    
    setCurrentUser(guestUser);
    setProfile(guestUser);
    setIsAuthenticated(true);
    setSession({
      user: {
        id: "guest-user-id",
        email: "guest@example.com",
      }
    });
    
    // Load local storage fallback data
    loadLocalStorageData();
  };

  const signOut = async () => {
    localStorage.removeItem("leaf_guest_session");
    document.cookie = "leaf_guest_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "leaf_guest_onboarded=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Clear local state regardless
    }
    setIsAuthenticated(false);
    setSession(null);
    setProfile(null);
    setUserStats(null);
  };

  // Auth Action Methods — custom Leaf auth (no Supabase Auth / email links)
  const signInWithPassword = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Could not sign in.");
    }
    setSession({ user: { id: data.user.id, email: data.user.email } });
    setIsAuthenticated(true);
    setProfile(data.user);
    return data;
  };

  const signUpWithPassword = async (email: string, password: string, username: string, name: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username, name }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Could not create account.");
    }
    setSession({ user: { id: data.user.id, email: data.user.email } });
    setIsAuthenticated(true);
    setProfile(data.user);
    // Shape expected by auth page (immediate session — no email confirmation)
    return { ...data, session: { user: data.user } };
  };

  const resetPassword = async (_email: string) => {
    throw new Error("Password reset is not available yet. Create a new account or continue as guest.");
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

  // Sync Log Book to DB (with local storage fallback)
  const logBook = async (
    bookId: string,
    status: "Want to Read" | "Currently Reading" | "Finished",
    rating?: number,
    reviewContent?: string
  ) => {
    const isGuest = session?.user?.id === "guest-user-id";
    if (isGuest) {
      await saveBookLocally(bookId, status, rating, reviewContent);
      return;
    }

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
            if (initData.success && initData.books?.length) {
              setBooks((prev) => {
                const merged = new Map(prev.map((b) => [b.id, b]));
                initData.books.forEach((b: Book) => merged.set(b.id, b));
                return Array.from(merged.values());
              });
            }
          }
          return;
        }
      }
      console.warn("Server logBook failed, falling back to local storage.");
      await saveBookLocally(bookId, status, rating, reviewContent);
    } catch (err) {
      console.error("Failed to log book shelf update, falling back to local storage:", err);
      await saveBookLocally(bookId, status, rating, reviewContent);
    }
  };

  // Log progress reading sessions (with local storage fallback)
  const logReadingSession = async (
    bookId: string,
    pagesRead: number,
    note?: string,
    readingMinutes?: number
  ) => {
    const isGuest = session?.user?.id === "guest-user-id";
    if (isGuest) {
      return await logReadingSessionLocally(bookId, pagesRead, note, readingMinutes);
    }

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
            if (initData.success && initData.books?.length) {
              setBooks((prev) => {
                const merged = new Map(prev.map((b) => [b.id, b]));
                initData.books.forEach((b: Book) => merged.set(b.id, b));
                return Array.from(merged.values());
              });
            }
          }
          return data;
        }
      }
      console.warn("Server logReadingSession failed, falling back to local storage.");
      return await logReadingSessionLocally(bookId, pagesRead, note, readingMinutes);
    } catch (err) {
      console.error("Failed to save reading session progress, falling back to local storage:", err);
      return await logReadingSessionLocally(bookId, pagesRead, note, readingMinutes);
    }
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
    const updatedLists = [newList, ...lists];
    setLists(updatedLists);
    localStorage.setItem("leaf_local_lists", JSON.stringify(updatedLists));
  };

  const toggleFollowUser = async (userId: string) => {
    // Optimistic local update
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        const isFollowing = !u.isFollowing;
        return {
          ...u,
          isFollowing,
          followersCount: isFollowing ? u.followersCount + 1 : Math.max(0, u.followersCount - 1),
        };
      }
      return u;
    });
    setUsers(updatedUsers);

    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        throw new Error("Follow request failed");
      }
    } catch (err) {
      console.error("Failed to save follow relationship:", err);
      // Revert optimistic update
      setUsers(users);
      throw err;
    }
  };

  const updateProfile = async (name: string, bio: string, avatar: string, favoriteBookIds: string[], genres?: string[]) => {
    const isGuest = session?.user?.id === "guest-user-id";
    if (isGuest) {
      const updatedUser = {
        ...currentUser,
        name,
        bio,
        avatar: avatar || INITIAL_USERS[4].avatar,
        favoriteBookIds: favoriteBookIds || [],
      };
      setCurrentUser(updatedUser);
      setProfile(updatedUser);
      localStorage.setItem("leaf_local_profile", JSON.stringify(updatedUser));
      return;
    }

    try {
      const { data, error } = await (async () => {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: name,
            bio,
            avatar_url: avatar,
            favorite_genres: genres || [],
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          return { data: null, error: { message: json.error || "Update failed" } };
        }
        return { data: json.profile, error: null };
      })();

      if (!error && data) {
        setProfile(data);
        setCurrentUser((prev) => {
          const updated = {
            ...prev,
            name: data.display_name || prev.name,
            bio: data.bio !== undefined && data.bio !== null ? data.bio : prev.bio,
            avatar: data.avatar_url !== undefined && data.avatar_url !== null ? data.avatar_url : prev.avatar,
          };
          localStorage.setItem("leaf_local_profile", JSON.stringify(updated));
          return updated;
        });
      } else {
        console.warn("Profile update failed, updating profile locally:", error);
        const updatedUser = {
          ...currentUser,
          name,
          bio,
          avatar,
        };
        setCurrentUser(updatedUser);
        setProfile(updatedUser);
        localStorage.setItem("leaf_local_profile", JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error("Failed to sync profile update, updating profile locally:", err);
      const updatedUser = {
        ...currentUser,
        name,
        bio,
        avatar,
      };
      setCurrentUser(updatedUser);
      setProfile(updatedUser);
      localStorage.setItem("leaf_local_profile", JSON.stringify(updatedUser));
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
        
        // Auth
        session,
        profile,
        signInWithPassword,
        signUpWithPassword,
        resetPassword,
        signInAsGuest,
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
