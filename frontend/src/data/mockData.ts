export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  description: string;
  coverImage: string;
  averageRating: number;
  genres: string[];
  pages: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  favoriteBookIds: string[];
  email?: string;
  created_at?: string;
}

export interface Review {
  id: string;
  userId: string;
  bookId: string;
  rating: number; // Support half stars (e.g. 4.5)
  content: string;
  dateString: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  reviewerName?: string;
  reviewerAvatar?: string;
  reviewerUsername?: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookCover?: string;
}

export interface ReadingLog {
  id: string;
  userId: string;
  bookId: string;
  status: "Want to Read" | "Currently Reading" | "Finished";
  dateLogged: string; // e.g. "2026-06-12"
  rating?: number;
  currentPage?: number;
}

export interface CuratedList {
  id: string;
  userId: string;
  title: string;
  description: string;
  coverImage: string;
  bookIds: string[];
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
}

export interface Comment {
  id: string;
  reviewId: string; // Can be reviewId or listId
  userId: string;
  content: string;
  dateString: string;
}

import { GENERATED_BOOKS } from "./mockBooksGenerated";
export const INITIAL_BOOKS: Book[] = GENERATED_BOOKS;


export const INITIAL_USERS: User[] = [
  {
    id: "user-emma",
    username: "emma_reads",
    name: "Emma Sterling",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    bio: "Curator of dark academic moods. I read to get lost in old hallways. Donna Tartt enthusiast.",
    followersCount: 1242,
    followingCount: 382,
    favoriteBookIds: ["9780140167771", "9780743273565", "9781984822178"],
  },
  {
    id: "user-alex",
    username: "alex_books",
    name: "Alex Petrov",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bio: "Aerospace engineer reading sci-fi and hard fiction. Always looking for the next intelligent galaxy.",
    followersCount: 890,
    followingCount: 412,
    favoriteBookIds: ["9780593135204", "9780441172719"],
  },
  {
    id: "user-sophia",
    username: "sophia_lit",
    name: "Sophia Chen",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    bio: "Writer and coffee addict. Exploring the intersections of technology, consciousness, and heart.",
    followersCount: 1540,
    followingCount: 620,
    favoriteBookIds: ["9780593318171", "9781984822178", "9780140167771"],
  },
  {
    id: "user-julian",
    username: "julian_reviews",
    name: "Julian Vance",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    bio: "Literary critic. Seeking structural beauty and unforgettable prose. Let's debate plot versus character.",
    followersCount: 2310,
    followingCount: 150,
    favoriteBookIds: ["9780743273565", "9780441172719", "9780140167771"],
  },
  {
    id: "currentUser",
    username: "literary_wanderer",
    name: "Rowan Archer",
    avatar: "",
    bio: "Building a personal archive of thoughts, margins, and paperbacks. Leafing through life.",
    followersCount: 320,
    followingCount: 145,
    favoriteBookIds: ["9780140167771", "9780593135204", "9780593318171", "9780441172719"],
  },
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev-1",
    userId: "user-emma",
    bookId: "9780140167771",
    rating: 5,
    content: "Donna Tartt's prose is a slow-acting poison that remains in your system long after you close the book. The atmosphere she constructs is thick, elitist, beautiful, and absolutely terrifying. Henry, Julian, Francis, and the twins are so deeply flawed yet hypnotizing. I read this every autumn and it feels more devastating every single time.",
    dateString: "Jun 10, 2026",
    likesCount: 245,
    commentsCount: 32,
    isLiked: true,
  },
  {
    id: "rev-2",
    userId: "user-alex",
    bookId: "9780593135204",
    rating: 5,
    content: "A masterclass in problem-solving sci-fi. Ryland Grace and Rocky have the best platonic partnership in modern literature. The science is detailed but never feels like a textbook, and the pacing is relentless. Andy Weir makes physics feel like a high-stakes action sequence. Loved every page.",
    dateString: "Jun 08, 2026",
    likesCount: 182,
    commentsCount: 14,
    isLiked: false,
  },
  {
    id: "rev-3",
    userId: "user-sophia",
    bookId: "9781984822178",
    rating: 4.5,
    content: "Rooney does something magic here. She captures the silent space between two people who know each other too well. Connell and Marianne's inability to communicate is both maddening and profoundly real. It's not a romance in the traditional sense; it's a documentation of how one person can completely shift the course of your life. Beautifully tender.",
    dateString: "Jun 11, 2026",
    likesCount: 120,
    commentsCount: 8,
    isLiked: false,
  },
  {
    id: "rev-4",
    userId: "user-julian",
    bookId: "9780743273565",
    rating: 4.5,
    content: "Nearly a hundred years later, Fitzgerald's descriptions of wealth, green lights, and dust still ring perfectly true. It is a slim book, but there is not a single wasted word or misplaced comma. The prose acts like poetry. Gatsby is the ultimate symbol of American longing, and Nick is the perfect, detached guide.",
    dateString: "May 28, 2026",
    likesCount: 94,
    commentsCount: 11,
    isLiked: false,
  },
  {
    id: "rev-5",
    userId: "user-sophia",
    bookId: "9780593318171",
    rating: 4,
    content: "Ishiguro writes with such heartbreaking restraint. Klara's voice is naive, deeply observant, and incredibly pure. It's a sci-fi novel that completely ignores the technology to focus entirely on the human capacity for love and replacement. The ending is quiet, painful, and absolutely beautiful.",
    dateString: "May 15, 2026",
    likesCount: 78,
    commentsCount: 5,
    isLiked: false,
  },
];

export const INITIAL_DIARY_LOGS: ReadingLog[] = [
  {
    id: "log-1",
    userId: "currentUser",
    bookId: "9780140167771",
    status: "Finished",
    dateLogged: "2026-06-11",
    rating: 5,
  },
  {
    id: "log-2",
    userId: "currentUser",
    bookId: "9780593135204",
    status: "Finished",
    dateLogged: "2026-05-28",
    rating: 4.5,
  },
  {
    id: "log-3",
    userId: "currentUser",
    bookId: "9780593318171",
    status: "Finished",
    dateLogged: "2026-05-10",
    rating: 4,
  },
  {
    id: "log-4",
    userId: "currentUser",
    bookId: "9780441172719",
    status: "Currently Reading",
    dateLogged: "2026-06-01",
  },
  {
    id: "log-5",
    userId: "user-emma",
    bookId: "9780140167771",
    status: "Finished",
    dateLogged: "2026-06-10",
    rating: 5,
  },
  {
    id: "log-6",
    userId: "user-alex",
    bookId: "9780593135204",
    status: "Finished",
    dateLogged: "2026-06-08",
    rating: 5,
  },
  {
    id: "log-7",
    userId: "user-sophia",
    bookId: "9781984822178",
    status: "Finished",
    dateLogged: "2026-06-11",
    rating: 4.5,
  },
];

export const INITIAL_LISTS: CuratedList[] = [
  {
    id: "list-fantasy",
    userId: "user-julian",
    title: "Epic Fantasy Masterpieces",
    description: "Journey across breathtaking landscapes, intricate magic systems, and ancient conflicts. Curated for the ultimate fantasy reader.",
    coverImage: "https://images.unsplash.com/photo-1514894780887-121968d00567?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9780007117116", "9780261103573", "9780553103540", "9780765311788", "9780756404079", "9780765326355"],
    likesCount: 312,
    commentsCount: 48,
  },
  {
    id: "list-scifi",
    userId: "user-alex",
    title: "Sci-Fi & Cyberpunk Visions",
    description: "From neon-drenched streets to the far reaches of the cosmos. These essential sci-fi works question our technology, humanity, and future.",
    coverImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9780441172719", "9780441569595", "9780553293357", "9780593135204"],
    likesCount: 245,
    commentsCount: 31,
  },
  {
    id: "list-dark-academia",
    userId: "user-emma",
    title: "Dark Academia Essentials",
    description: "Whispered secrets in leather-bound libraries, ancient languages, and the thrill of forbidden knowledge. These stories carry a haunting, aesthetic weight.",
    coverImage: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9780679783689", "9780743273565", "9780141439570"],
    likesCount: 198,
    commentsCount: 15,
  },
  {
    id: "list-booktok",
    userId: "user-sophia",
    title: "Viral BookTok Sensations",
    description: "The books that captured millions of hearts, spawned viral trends, and took over the reading community by storm. Emotional, romance-driven, and highly addictive.",
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9781501110368", "9781984806758", "9781984806734", "9780593336823"],
    likesCount: 420,
    commentsCount: 64,
  },
  {
    id: "list-mystery",
    userId: "user-julian",
    title: "Gothic & Thrilling Mystery",
    description: "Uncover buried secrets, unreliable narrators, and dark, atmospheric environments that keep you guessing until the final sentence.",
    coverImage: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9780307588371", "9781250301697", "9780062073488", "9780385504201", "9780307269751"],
    likesCount: 285,
    commentsCount: 29,
  },
  {
    id: "list-nonfiction",
    userId: "user-sophia",
    title: "Mind-Expanding Non-Fiction",
    description: "Deep-dives into history, human habits, cognitive biases, and ideas that will completely change how you view yourself and the world around you.",
    coverImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9780062316097", "9780735211292", "9780374275631", "9780307352149"],
    likesCount: 154,
    commentsCount: 19,
  },
  {
    id: "list-memoirs",
    userId: "user-emma",
    title: "Unforgettable Memoirs",
    description: "Real human lives written with raw honesty, covering struggles, triumphs, and the complicated path to personal and artistic freedom.",
    coverImage: "https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9780399590504", "9781982185824", "9781524763138", "9781451648539"],
    likesCount: 182,
    commentsCount: 11,
  },
  {
    id: "list-historical",
    userId: "user-alex",
    title: "Immersive Historical Sagas",
    description: "Multi-generational stories and epic historical accounts that recreate past eras, conflicts, and the persistent strength of families.",
    coverImage: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9780375831003", "9781476746586", "9781501161933", "9785531032398"],
    likesCount: 214,
    commentsCount: 22,
  }
];

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: "comm-1",
    reviewId: "rev-1",
    userId: "user-sophia",
    content: "This review makes me want to start my annual reread early! You capture Donna Tartt's brilliance perfectly.",
    dateString: "Jun 11, 2026",
  },
  {
    id: "comm-2",
    reviewId: "rev-1",
    userId: "user-julian",
    content: "A fair analysis. Though, do you think Tartt spends too long on the aesthetic descriptions in the middle chapters?",
    dateString: "Jun 11, 2026",
  },
  {
    id: "comm-3",
    reviewId: "rev-2",
    userId: "user-sophia",
    content: "Rocky is truly the best! A baam baam review!",
    dateString: "Jun 09, 2026",
  },
];
