export type Reader = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  topGenre: string;
  streak: number;
  isFollowing: boolean;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  year: number;
  description: string;
  coverImage: string;
  averageRating: number;
  genres: string[];
  pages: number;
};

export type ReadingLog = {
  id: string;
  userId: string;
  bookId: string;
  status: "Want to Read" | "Currently Reading" | "Finished" | "Did Not Finish";
  dateLogged: string;
  rating?: number;
  currentPage?: number;
  review?: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookCover?: string;
};

export type UserStats = {
  books_completed: number;
  books_reading: number;
  books_want_to_read: number;
  total_pages_read: number;
  average_rating: number;
  reading_streak: number;
  longest_streak: number;
  favorite_genre: string;
};

export type LibraryShelf = {
  id: string;
  name: string;
  slug: string;
  note: string;
  position: number;
  isFavorites: boolean;
  isSystem: boolean;
  systemKey: string | null;
  bookIds: string[];
};

export type LibraryPayload = {
  books: Book[];
  favoriteIds: string[];
  shelves: LibraryShelf[];
  stats: {
    books: number;
    authors: number;
    pages: number;
    genres: number;
    years: number;
  };
};
