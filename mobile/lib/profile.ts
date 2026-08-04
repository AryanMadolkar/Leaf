export type ProfileData = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  joinedAt: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isMe: boolean;
};

export type ProfileStats = {
  books_completed: number;
  books_reading: number;
  books_want_to_read: number;
  total_pages_read: number;
  average_rating: number;
  reading_streak: number;
  longest_streak: number;
  favorite_genre: string;
};
