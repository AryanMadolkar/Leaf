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

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedBooks = localStorage.getItem("leaf_books");
      const storedUsers = localStorage.getItem("leaf_users");
      const storedReviews = localStorage.getItem("leaf_reviews");
      const storedLogs = localStorage.getItem("leaf_logs");
      const storedLists = localStorage.getItem("leaf_lists");
      const storedComments = localStorage.getItem("leaf_comments");
      const storedCurrentUser = localStorage.getItem("leaf_current_user");
      const storedAuth = localStorage.getItem("leaf_auth");

      if (storedBooks) setBooks(JSON.parse(storedBooks));
      if (storedUsers) setUsers(JSON.parse(storedUsers));
      if (storedReviews) setReviews(JSON.parse(storedReviews));
      if (storedLogs) setDiaryLogs(JSON.parse(storedLogs));
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
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      userId: currentUser.id,
      bookId,
      rating,
      content,
      dateString: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
    };

    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);
    save("leaf_reviews", updatedReviews);

    // Also add/update reading log automatically to 'Finished' if rating is provided
    logBook(bookId, "Finished", rating);
  };

  const toggleLikeReview = (reviewId: string) => {
    const updatedReviews = reviews.map((r) => {
      if (r.id === reviewId) {
        const isLiked = !r.isLiked;
        return {
          ...r,
          isLiked,
          likesCount: isLiked ? r.likesCount + 1 : r.likesCount - 1,
        };
      }
      return r;
    });
    setReviews(updatedReviews);
    save("leaf_reviews", updatedReviews);
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

  const logBook = (
    bookId: string,
    status: "Want to Read" | "Currently Reading" | "Finished",
    rating?: number,
    reviewContent?: string
  ) => {
    // If finished and has rating/review content, let's create a review if reviewContent is provided
    let createdReviewId: string | undefined = undefined;
    if (status === "Finished" && rating !== undefined && reviewContent) {
      const revId = `rev-${Date.now()}`;
      const newReview: Review = {
        id: revId,
        userId: currentUser.id,
        bookId,
        rating,
        content: reviewContent,
        dateString: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
        likesCount: 0,
        commentsCount: 0,
      };
      setReviews((prev) => {
        const next = [newReview, ...prev];
        save("leaf_reviews", next);
        return next;
      });
      createdReviewId = revId;
    }

    // Check if entry already exists for user and book
    const existingLogIndex = diaryLogs.findIndex(
      (log) => log.userId === currentUser.id && log.bookId === bookId && log.status === status
    );

    let updatedLogs = [...diaryLogs];
    const today = new Date().toISOString().split("T")[0];

    if (existingLogIndex >= 0) {
      // Update existing
      updatedLogs[existingLogIndex] = {
        ...updatedLogs[existingLogIndex],
        rating: rating !== undefined ? rating : updatedLogs[existingLogIndex].rating,
        dateLogged: today,
      };
    } else {
      // Add new log
      const newLog: ReadingLog = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: currentUser.id,
        bookId,
        status,
        dateLogged: today,
        rating,
      };
      // Keep finished logs chronological, putting newer logs on top or appending
      updatedLogs = [newLog, ...updatedLogs];
    }

    setDiaryLogs(updatedLogs);
    save("leaf_logs", updatedLogs);
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
