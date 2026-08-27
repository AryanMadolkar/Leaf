"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authFetch, clearAccessToken, getAccessToken, setAccessToken } from "@/utils/auth/client";
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
import { withResolvedCover } from "@/utils/bookCatalog";

interface LeafContextType {
  books: Book[];
  users: User[];
  reviews: Review[];
  diaryLogs: ReadingLog[];
  lists: CuratedList[];
  comments: Comment[];
  currentUser: User;
  isAuthenticated: boolean;
  /** True until we know who the signed-in user is (avoid flashing a mock profile). */
  isProfileLoading: boolean;
  signIn: (email: string) => void;
  signOut: () => Promise<void>;
  addReview: (bookId: string, rating: number, content: string) => void;
  toggleLikeReview: (reviewId: string) => void;
  toggleLikeList: (listId: string) => void;
  addComment: (reviewId: string, content: string) => void;
  logBook: (
    bookId: string,
    status: "Want to Read" | "Currently Reading" | "Finished" | "Did Not Finish",
    rating?: number,
    reviewContent?: string,
    dnf?: {
      dnfReasons?: string[];
      dnfNote?: string;
      stoppedAtPage?: number | null;
      stoppedAtChapter?: string | null;
    }
  ) => Promise<void> | void;
  createList: (title: string, description: string, coverImage: string, bookIds: string[]) => void;
  toggleFollowUser: (userId: string) => void;
  updateProfile: (name: string, bio: string, avatar: string, favoriteBookIds: string[], genres?: string[]) => void;
  addCachedBookToContext: (book: Book) => void;
  readingSessions: any[];
  userStats: any | null;
  updateBookProgressDirectly: (
    bookId: string,
    currentPage: number,
    note?: string,
    readingMinutes?: number,
    chapter?: string
  ) => Promise<any>;
  logReadingSession: (
    bookId: string,
    pagesRead: number,
    note?: string,
    readingMinutes?: number,
    chapter?: string
  ) => Promise<any>;
  /** Bulk-import matched library books (e.g. Goodreads CSV). */
  importLibraryBooks: (
    books: Array<{
      bookId: string;
      status: "Want to Read" | "Currently Reading" | "Finished";
      rating?: number;
      review?: string;
      title?: string;
      author?: string;
      coverImage?: string;
      pages?: number;
      year?: number;
      genres?: string[];
      description?: string;
    }>
  ) => Promise<{ imported: number; updated: number; errors: Array<{ bookId: string; error: string }> }>;
  
  // Live Supabase Authenticated States
  session: any | null;
  profile: any | null;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signUpWithPassword: (email: string, password: string, username: string, name: string) => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
}

const EMPTY_USER: User = {
  id: "",
  username: "",
  name: "",
  avatar: "",
  bio: "",
  followersCount: 0,
  followingCount: 0,
  favoriteBookIds: [],
  email: "",
};

const isDeprecatedAvatar = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes("photo-1534528741775-53994a69daeb");
};

function mapApiUserToCurrentUser(raw: any, emailFallback = ""): User {
  const cleanedAvatar = isDeprecatedAvatar(raw.avatar_url || raw.avatar)
    ? ""
    : (raw.avatar_url || raw.avatar || "");
  return {
    id: raw.id,
    username: raw.username || "",
    name: raw.display_name || raw.name || "Reader",
    avatar: cleanedAvatar,
    bio: raw.bio || "",
    followersCount: raw.followersCount || 0,
    followingCount: raw.followingCount || 0,
    favoriteBookIds: raw.favoriteBookIds || [],
    email: raw.email || emailFallback,
    created_at: raw.created_at || raw.joined_at || "",
  };
}

const LeafContext = createContext<LeafContextType | undefined>(undefined);

export const LeafProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>(() => INITIAL_BOOKS.map(withResolvedCover));
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [diaryLogs, setDiaryLogs] = useState<ReadingLog[]>([]);
  const [lists, setLists] = useState<CuratedList[]>(INITIAL_LISTS);
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [currentUser, setCurrentUser] = useState<User>(EMPTY_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [readingSessions, setReadingSessions] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any | null>(null);
  /** Skip duplicate /api/init when mount already hydrated the session. */
  const skipNextInitRef = React.useRef(false);

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
      const listsSeedVersion = localStorage.getItem("leaf_lists_seed_version");
      const LISTS_SEED_VERSION = "2";
      const storedProfile = localStorage.getItem("leaf_local_profile");

      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        if (parsedProfile?.id === "guest-user-id" || parsedProfile?.id === "currentUser") {
          localStorage.removeItem("leaf_local_profile");
          setCurrentUser(EMPTY_USER);
          setProfile(null);
        } else {
          if (isDeprecatedAvatar(parsedProfile.avatar)) {
            parsedProfile.avatar = "";
            localStorage.setItem("leaf_local_profile", JSON.stringify(parsedProfile));
          }
          setCurrentUser(parsedProfile);
          setProfile(parsedProfile);
        }
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

      // Refresh built-in curated lists when seed data expands; keep user-created lists.
      if (storedLists) {
        const parsed: CuratedList[] = JSON.parse(storedLists);
        if (listsSeedVersion !== LISTS_SEED_VERSION) {
          const curatedIds = new Set(INITIAL_LISTS.map((l) => l.id));
          const userLists = parsed.filter((l) => !curatedIds.has(l.id));
          const merged = [...INITIAL_LISTS, ...userLists];
          setLists(merged);
          localStorage.setItem("leaf_local_lists", JSON.stringify(merged));
          localStorage.setItem("leaf_lists_seed_version", LISTS_SEED_VERSION);
        } else {
          setLists(parsed);
        }
      } else {
        setLists(INITIAL_LISTS);
        localStorage.setItem("leaf_lists_seed_version", LISTS_SEED_VERSION);
      }
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

  // Local reading session tracker helper
  const logReadingSessionLocally = async (
    bookId: string,
    pagesRead: number,
    note?: string,
    readingMinutes?: number,
    targetEndPage?: number
  ) => {
    const book = books.find((b) => b.id === bookId);
    const log = diaryLogs.find((l) => l.bookId === bookId && l.userId === currentUser.id);
    const startPage = log && log.currentPage ? log.currentPage : 0;
    const endPage = targetEndPage ?? startPage + pagesRead;
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

  // Setup Auth — JWT in localStorage, sent as Authorization: Bearer
  useEffect(() => {
    // Clear legacy guest-mode leftovers
    localStorage.removeItem("leaf_guest_session");
    document.cookie = "leaf_guest_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "leaf_guest_onboarded=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    const token = getAccessToken();
    if (!token) {
      setSession(null);
      setIsAuthenticated(false);
      setIsProfileLoading(false);
      setCurrentUser(EMPTY_USER);
      return;
    }

    // Instant hydrate from cache so the header never flashes a mock user
    try {
      const cached = localStorage.getItem("leaf_local_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id && parsed.id !== "guest-user-id" && parsed.id !== "currentUser") {
          if (isDeprecatedAvatar(parsed.avatar)) parsed.avatar = "";
          setCurrentUser(parsed);
          setProfile(parsed);
          // Token + cached profile means we're signed in — don't wait on /api/auth/me
          setIsAuthenticated(true);
          setIsProfileLoading(false);
        } else if (parsed?.id === "guest-user-id" || parsed?.id === "currentUser") {
          localStorage.removeItem("leaf_local_profile");
        }
      }
    } catch {
      // ignore bad cache
    }

    let cancelled = false;
    (async () => {
      try {
        // Fetch identity + library in parallel for faster first paint
        const [meRes, initRes] = await Promise.all([
          authFetch("/api/auth/me"),
          authFetch("/api/init"),
        ]);

        if (!meRes.ok) {
          clearAccessToken();
          if (!cancelled) {
            setSession(null);
            setIsAuthenticated(false);
            setIsProfileLoading(false);
            setCurrentUser(EMPTY_USER);
            setProfile(null);
          }
          return;
        }

        const meData = await meRes.json();
        if (cancelled || !meData.success || !meData.user) return;

        const mappedFromMe = mapApiUserToCurrentUser(meData.user, meData.user.email);
        skipNextInitRef.current = true;
        setSession({
          user: {
            id: meData.user.id,
            email: meData.user.email,
          },
        });
        setIsAuthenticated(true);
        setCurrentUser((prev) => (prev.id === mappedFromMe.id && prev.avatar ? prev : mappedFromMe));
        setProfile((prev: any) => prev || meData.user);
        setIsProfileLoading(false);

        if (initRes.ok) {
          const data = await initRes.json();
          if (!cancelled && data.success) {
            if (data.books?.length) {
              setBooks((prev) => {
                const merged = new Map(prev.map((b) => [b.id, b]));
                data.books.forEach((b: Book) => merged.set(b.id, b));
                return Array.from(merged.values());
              });
            }
            setDiaryLogs(data.diaryLogs || []);
            setReviews(data.reviews || []);
            setReadingSessions(data.sessions || []);
            setUserStats(data.stats || null);

            if (data.profile) {
              const mappedUser = mapApiUserToCurrentUser(
                {
                  ...data.profile,
                  email: data.profile.email || meData.user.email,
                },
                meData.user.email,
              );
              setProfile({ ...data.profile, avatar_url: mappedUser.avatar });
              setCurrentUser(mappedUser);
              localStorage.setItem("leaf_local_profile", JSON.stringify(mappedUser));
            }
          }
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          setIsAuthenticated(false);
          setIsProfileLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Client-side route gate (JWT is not sent on document navigations)
  useEffect(() => {
    const protectedPrefixes = ["/feed", "/profile", "/library", "/stats", "/lists", "/settings", "/onboarding"];
    const isProtected = protectedPrefixes.some(
      (route) => pathname === route || pathname?.startsWith(route + "/"),
    );
    if (!isProtected) return;

    const token = getAccessToken();
    if (!token && !isAuthenticated) {
      router.replace("/auth");
    }
  }, [pathname, isAuthenticated, router]);

  // Load user data when session is set after login/signup (mount path already hydrates in parallel)
  useEffect(() => {
    if (!session?.user) return;

    if (skipNextInitRef.current) {
      skipNextInitRef.current = false;
      return;
    }

    let cancelled = false;
    async function fetchUserData() {
      try {
        const res = await authFetch("/api/init");
        if (!res.ok) {
          console.warn("API init failed, falling back to localStorage data.");
          if (!cancelled) {
            loadLocalStorageData();
            setIsProfileLoading(false);
          }
          return;
        }
        const data = await res.json();
        if (cancelled || !data.success) return;

        if (data.books?.length) {
          setBooks((prev) => {
            const merged = new Map(prev.map((b) => [b.id, b]));
            data.books.forEach((b: Book) => merged.set(b.id, b));
            return Array.from(merged.values());
          });
        }
        setDiaryLogs(data.diaryLogs || []);
        setReviews(data.reviews || []);
        setReadingSessions(data.sessions || []);
        setUserStats(data.stats || null);

        if (data.profile) {
          const mappedUser = mapApiUserToCurrentUser(
            {
              ...data.profile,
              email: data.profile.email || session.user.email || "",
            },
            session.user.email || "",
          );
          setProfile({ ...data.profile, avatar_url: mappedUser.avatar });
          setCurrentUser(mappedUser);
          localStorage.setItem("leaf_local_profile", JSON.stringify(mappedUser));
        }
        setIsProfileLoading(false);
      } catch (err) {
        console.error("Failed to load authenticated user profile details:", err);
        if (!cancelled) {
          loadLocalStorageData();
          setIsProfileLoading(false);
        }
      }
    }

    fetchUserData();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const signIn = (email: string) => {
    // Legacy fallback, do nothing or mock signin
    setIsAuthenticated(true);
  };

  const signOut = async () => {
    clearAccessToken();
    localStorage.removeItem("leaf_guest_session");
    localStorage.removeItem("leaf_local_profile");
    document.cookie = "leaf_guest_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "leaf_guest_onboarded=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear local state regardless
    }
    setIsAuthenticated(false);
    setIsProfileLoading(false);
    setSession(null);
    setProfile(null);
    setCurrentUser(EMPTY_USER);
    setUserStats(null);
  };

  // Auth Action Methods — JWT Bearer auth
  const parseJsonSafe = async (res: Response) => {
    const text = await res.text();
    if (!text) {
      return {
        success: false,
        error: `Server returned an empty response (${res.status}). Check Vercel env: AUTH_SECRET and SUPABASE_SERVICE_ROLE_KEY.`,
      };
    }
    try {
      return JSON.parse(text);
    } catch {
      return {
        success: false,
        error: `Server returned an invalid response (${res.status}). Check Vercel deployment logs.`,
      };
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok || !data.success || !data.token) {
      throw new Error(data.error || "Could not sign in.");
    }
    setAccessToken(data.token);
    const mapped = mapApiUserToCurrentUser(data.user, data.user.email);
    setCurrentUser(mapped);
    setProfile(data.user);
    localStorage.setItem("leaf_local_profile", JSON.stringify(mapped));
    setIsProfileLoading(false);
    setIsAuthenticated(true);
    setSession({ user: { id: data.user.id, email: data.user.email } });
    return data;
  };

  const signUpWithPassword = async (email: string, password: string, username: string, name: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username, name }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok || !data.success || !data.token) {
      throw new Error(data.error || "Could not create account.");
    }
    setAccessToken(data.token);
    const mapped = mapApiUserToCurrentUser(data.user, data.user.email);
    setCurrentUser(mapped);
    setProfile(data.user);
    localStorage.setItem("leaf_local_profile", JSON.stringify(mapped));
    setIsProfileLoading(false);
    setIsAuthenticated(true);
    setSession({ user: { id: data.user.id, email: data.user.email } });
    return { ...data, session: { user: data.user } };
  };

  const resetPassword = async (_email: string) => {
    throw new Error("Password reset is not available yet. Create a new account or sign in.");
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
      await authFetch("/api/reviews", {
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
    status: "Want to Read" | "Currently Reading" | "Finished" | "Did Not Finish",
    rating?: number,
    reviewContent?: string,
    dnf?: {
      dnfReasons?: string[];
      dnfNote?: string;
      stoppedAtPage?: number | null;
      stoppedAtChapter?: string | null;
    }
  ) => {
    // Optimistic update so Diary/Library show the shelf change immediately
    const dateLogged = new Date().toISOString().split("T")[0];
    const book = books.find((b) => b.id === bookId);
    setDiaryLogs((prev) => {
      const existingIndex = prev.findIndex((log) => log.bookId === bookId && log.userId === currentUser.id);
      const nextEntry = {
        id: existingIndex >= 0 ? prev[existingIndex].id : `optimistic-${bookId}`,
        userId: currentUser.id,
        bookId,
        status,
        dateLogged,
        rating: rating !== undefined ? rating : existingIndex >= 0 ? prev[existingIndex].rating : undefined,
        currentPage:
          status === "Finished"
            ? book?.pages || 300
            : status === "Did Not Finish"
              ? dnf?.stoppedAtPage != null
                ? dnf.stoppedAtPage
                : existingIndex >= 0
                  ? prev[existingIndex].currentPage || 0
                  : 0
              : existingIndex >= 0
                ? prev[existingIndex].currentPage || 0
                : 0,
        review: reviewContent || (existingIndex >= 0 ? prev[existingIndex].review : undefined),
        bookTitle: book?.title,
        bookAuthor: book?.author,
        bookCover: book?.coverImage,
      };
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = { ...prev[existingIndex], ...nextEntry };
        return copy;
      }
      return [nextEntry, ...prev];
    });
    if (book) {
      setBooks((prev) => (prev.some((b) => b.id === book.id) ? prev : [...prev, book]));
    }

    try {
      const res = await authFetch("/api/user-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          status,
          rating,
          review: reviewContent,
          ...(status === "Did Not Finish" && dnf
            ? {
                dnfReasons: dnf.dnfReasons,
                dnfNote: dnf.dnfNote,
                stoppedAtPage: dnf.stoppedAtPage,
                stoppedAtChapter: dnf.stoppedAtChapter,
              }
            : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDiaryLogs(data.diaryLogs);
          setReviews(data.reviews);
          setReadingSessions(data.sessions || []);
          setUserStats(data.stats || null);
          
          // Ensure logged books are in the client catalog (fixes diary row vanishing)
          const initRes = await authFetch("/api/init");
          if (initRes.ok) {
            const initData = await initRes.json();
            if (initData.success) {
              if (initData.diaryLogs) setDiaryLogs(initData.diaryLogs);
              if (initData.books?.length) {
                setBooks((prev) => {
                  const merged = new Map(prev.map((b) => [b.id, b]));
                  initData.books.forEach((b: Book) => merged.set(b.id, b));
                  return Array.from(merged.values());
                });
              }
            }
          }
          return;
        }
        throw new Error(data.error || "Could not save book to your shelf.");
      }
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Could not save book (${res.status}).`);
    } catch (err) {
      console.error("Failed to log book shelf update:", err);
      // Authenticated users must not silently fall back to localStorage — refresh would wipe it.
      // Keep the optimistic row visible but rethrow so callers can surface the failure.
      throw err instanceof Error ? err : new Error("Failed to save book to your shelf.");
    }
  };

  // Log progress reading sessions (with local storage fallback)
  const logReadingSession = async (
    bookId: string,
    pagesRead: number,
    note?: string,
    readingMinutes?: number,
    chapter?: string
  ) => {
    const log = diaryLogs.find((l) => l.bookId === bookId);
    const book = books.find((b) => b.id === bookId);
    const totalPages = book?.pages || 300;
    const startPage = log && log.currentPage ? log.currentPage : 0;
    const endPage = Math.min(startPage + pagesRead, totalPages);
    const actualPagesRead = Math.max(0, endPage - startPage);

    try {
      const res = await authFetch("/api/reading-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          pagesRead: actualPagesRead,
          startPage,
          endPage,
          note,
          readingMinutes,
          chapter: chapter || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDiaryLogs(data.diaryLogs);
          setReviews(data.reviews);
          setReadingSessions(data.sessions || []);
          setUserStats(data.stats || null);

          const initRes = await authFetch("/api/init");
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

  const updateBookProgressDirectly = async (
    bookId: string,
    targetPage: number,
    note?: string,
    readingMinutes?: number,
    chapter?: string
  ) => {
    const log = diaryLogs.find((l) => l.bookId === bookId);
    const book = books.find((b) => b.id === bookId);
    const totalPages = book?.pages || 300;
    const startPage = log?.currentPage ?? 0;
    const endPage = Math.min(Math.max(1, targetPage), totalPages);
    const pagesRead = Math.max(0, endPage - startPage);

    try {
      const res = await authFetch("/api/reading-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          pagesRead,
          startPage,
          endPage,
          note,
          readingMinutes,
          chapter: chapter || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDiaryLogs(data.diaryLogs);
          setReviews(data.reviews);
          setReadingSessions(data.sessions || []);
          setUserStats(data.stats || null);

          const initRes = await authFetch("/api/init");
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
      console.warn("Server setBookProgress failed, falling back to local storage.");
      return await logReadingSessionLocally(bookId, pagesRead, note, readingMinutes, endPage);
    } catch (err) {
      console.error("Failed to set reading progress, falling back to local storage:", err);
      return await logReadingSessionLocally(bookId, pagesRead, note, readingMinutes, endPage);
    }
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
      const res = await authFetch("/api/follows", {
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
    try {
      const { data, error } = await (async () => {
        const res = await authFetch("/api/profile", {
          method: "PATCH",
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

  const importLibraryBooks = async (
    booksToImport: Array<{
      bookId: string;
      status: "Want to Read" | "Currently Reading" | "Finished";
      rating?: number;
      review?: string;
      title?: string;
      author?: string;
      coverImage?: string;
      pages?: number;
      year?: number;
      genres?: string[];
      description?: string;
    }>
  ) => {
    const res = await authFetch("/api/user-books/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ books: booksToImport }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Import failed");
    }
    if (data.diaryLogs) {
      setDiaryLogs(data.diaryLogs);
      localStorage.setItem("leaf_local_diary_logs", JSON.stringify(data.diaryLogs));
    }
    // Merge imported book metadata into local catalog
    setBooks((prev) => {
      const merged = new Map(prev.map((b) => [b.id, b]));
      for (const item of booksToImport) {
        if (!item.bookId || merged.has(item.bookId)) continue;
        if (!item.title) continue;
        merged.set(item.bookId, {
          id: item.bookId,
          title: item.title,
          author: item.author || "Unknown Author",
          year: item.year || 2000,
          description: item.description || "",
          coverImage: item.coverImage || "",
          averageRating: 4.0,
          genres: item.genres || ["Fiction"],
          pages: item.pages || 300,
        });
      }
      return Array.from(merged.values());
    });

    const initRes = await authFetch("/api/init");
    if (initRes.ok) {
      const initData = await initRes.json();
      if (initData.success) {
        if (initData.diaryLogs) setDiaryLogs(initData.diaryLogs);
        if (initData.stats) setUserStats(initData.stats);
        if (initData.books?.length) {
          setBooks((prev) => {
            const merged = new Map(prev.map((b) => [b.id, b]));
            initData.books.forEach((b: Book) => merged.set(b.id, b));
            return Array.from(merged.values());
          });
        }
      }
    }

    return {
      imported: data.imported || 0,
      updated: data.updated || 0,
      errors: data.errors || [],
    };
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
        isProfileLoading,
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
        importLibraryBooks,
        
        // Auth
        session,
        profile,
        signInWithPassword,
        signUpWithPassword,
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
