export type StatsPoint = {
  label: string;
  pages: number;
  date?: string;
  period?: string;
};

export type BooksFinishedMonth = {
  month: string;
  currentYear: number;
  previousYear: number;
};

export type GenreSlice = {
  name: string;
  count: number;
  percentage: number;
};

export type PaceStats = {
  avgPagesPerDay: number;
  avgBooksPerMonth: number;
  avgDaysToFinish: number;
  fastestBook: { title?: string; days?: number; coverImage?: string } | null;
  longestBook: { title?: string; pages?: number; coverImage?: string } | null;
};

export type TimelineItem = {
  id: string;
  type: string;
  message: string;
  date: string;
  title?: string;
};

export type FullStatsPayload = {
  stats: {
    books_completed?: number;
    total_books_completed?: number;
    total_pages_read: number;
    current_streak?: number;
    reading_streak?: number;
    longest_streak: number;
    total_reading_hours?: number;
    favorite_genre?: string;
    average_pages_per_day?: number;
    average_book_length?: number;
  } | null;
  charts: {
    last7Days: StatsPoint[];
    last30Days: StatsPoint[];
    last12Months: StatsPoint[];
    booksFinishedComparison: BooksFinishedMonth[];
  };
  genreDistribution: GenreSlice[];
  pace: PaceStats;
  insights: string[];
  timeline: TimelineItem[];
};
