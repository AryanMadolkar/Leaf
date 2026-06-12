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

export const INITIAL_BOOKS: Book[] = [
  {
    id: "9780140167771", // The Secret History ISBN
    title: "The Secret History",
    author: "Donna Tartt",
    year: 1992,
    description: "Under the influence of their charismatic classics professor, a group of clever, eccentric misfits at an elite New England college discover a way of thinking and living that is a world away from the humdrum existence of their contemporaries. But when they go beyond the boundaries of normal morality, their lives are changed profoundly and forever.",
    coverImage: "https://covers.openlibrary.org/b/isbn/9780140167771-L.jpg",
    averageRating: 4.6,
    genres: ["Dark Academia", "Fiction", "Mystery", "Psychological"],
    pages: 559,
  },
  {
    id: "9780593135204", // Project Hail Mary ISBN
    title: "Project Hail Mary",
    author: "Andy Weir",
    year: 2021,
    description: "Ryland Grace is the sole survivor on a desperate, last-chance mission to save humanity from an extinction-level event. Only right now, he doesn't know that. He can't even remember his own name, let alone the nature of his assignment or how to complete it. All he knows is that he's been asleep for a very, very long time. And he's just been awakened to find himself millions of miles from home, with nothing but two corpses for company.",
    coverImage: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
    averageRating: 4.7,
    genres: ["Sci-Fi", "Fiction", "Space", "Adventure"],
    pages: 476,
  },
  {
    id: "9781984822178", // Normal People ISBN
    title: "Normal People",
    author: "Sally Rooney",
    year: 2018,
    description: "Connell and Marianne grow up in the same small town in the west of Ireland, but the similarities end there. In school, Connell is popular and well-liked, while Marianne is a loner. But when the two strike up a conversation—awkward but electrifying—something life-changing begins. Normal People is the story of mutual fascination, friendship and love.",
    coverImage: "https://covers.openlibrary.org/b/isbn/9781984822178-L.jpg",
    averageRating: 3.9,
    genres: ["Contemporary Fiction", "Romance", "Drama", "Irish Lit"],
    pages: 273,
  },
  {
    id: "9780441172719", // Dune ISBN
    title: "Dune",
    author: "Frank Herbert",
    year: 1965,
    description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the 'spice' melange, a drug capable of extending life and enhancing consciousness. Coveted across the known universe, melange is a prize worth killing for...",
    coverImage: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg",
    averageRating: 4.5,
    genres: ["Sci-Fi", "Classics", "Fantasy", "Epic"],
    pages: 604,
  },
  {
    id: "9780593318171", // Klara and the Sun ISBN
    title: "Klara and the Sun",
    author: "Kazuo Ishiguro",
    year: 2021,
    description: "Klara and the Sun offers a look at our changing world through the eyes of an unforgettable narrator, and explores the fundamental question: what does it mean to love? Klara is an Artificial Friend with outstanding observational qualities, who, from her place in the store, watches carefully the behavior of those who come in to browse, and of those who pass on the street outside.",
    coverImage: "https://covers.openlibrary.org/b/isbn/9780593318171-L.jpg",
    averageRating: 4.1,
    genres: ["Sci-Fi", "Fiction", "Speculative", "Philosophical"],
    pages: 307,
  },
  {
    id: "9780743273565", // The Great Gatsby ISBN
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    year: 1925,
    description: "The Great Gatsby, F. Scott Fitzgerald's third book, stands as the supreme achievement of his career. This exemplary novel of the Jazz Age has been acclaimed by generations of readers. The story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan is an exquisitely crafted tale of America in the 1920s.",
    coverImage: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
    averageRating: 4.3,
    genres: ["Classics", "Fiction", "Historical", "Literature"],
    pages: 180,
  },
];

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
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
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
    id: "list-1",
    userId: "user-emma",
    title: "Dark Academia Essentials",
    description: "Rainy college towns, dusty libraries, ancient greek tragedies, and secrets that should have stayed buried. Books that feel like wool coats and old paper.",
    coverImage: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9780140167771", "9780743273565"],
    likesCount: 142,
    commentsCount: 23,
  },
  {
    id: "list-2",
    userId: "user-alex",
    title: "Sci-Fi Essentials",
    description: "Hard science, galactic scale, and first-contact puzzles that tickle the logical brain. Books that look up at the stars and ask what if.",
    coverImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9780593135204", "9780441172719", "9780593318171"],
    likesCount: 98,
    commentsCount: 12,
  },
  {
    id: "list-3",
    userId: "currentUser",
    title: "Books That Changed My Life",
    description: "A small selection of stories that altered my perspective, rearranged my bookshelf, and left an permanent imprint on how I view the world.",
    coverImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80",
    bookIds: ["9780140167771", "9780593318171", "9780743273565"],
    likesCount: 45,
    commentsCount: 6,
  },
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
