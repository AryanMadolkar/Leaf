-- Init Schema for Leaf Platform (Supabase PostgreSQL Free Tier Optimized)

-- Enable UUID extension if not active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create cache table for book metadata (cached from Open Library API queries)
CREATE TABLE IF NOT EXISTS public.books (
  id TEXT PRIMARY KEY,
  open_library_key TEXT,
  isbn_10 TEXT,
  isbn_13 TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  author_name TEXT,
  cover_url TEXT,
  page_count INTEGER DEFAULT 0,
  subjects TEXT,
  first_publish_year INTEGER,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create profiles table (app-owned identity; not bound to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  bio TEXT,
  avatar_url TEXT NOT NULL DEFAULT '',
  location TEXT,
  favorite_genres TEXT[],
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b. Email/password credentials for Leaf's own auth
CREATE TABLE IF NOT EXISTS public.user_credentials (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_credentials_email
  ON public.user_credentials (lower(email));

-- 3. Create user_stats table for reading calculations
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  books_completed INTEGER NOT NULL DEFAULT 0,
  books_reading INTEGER NOT NULL DEFAULT 0,
  books_want_to_read INTEGER NOT NULL DEFAULT 0,
  total_pages_read INTEGER NOT NULL DEFAULT 0,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  reading_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  average_pages_per_day NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  average_book_length INTEGER NOT NULL DEFAULT 300,
  favorite_genre TEXT NOT NULL DEFAULT 'Fiction',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create user_books table (the user libraries)
CREATE TABLE IF NOT EXISTS public.user_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status TEXT CHECK(status IN ('want_to_read', 'reading', 'finished')) NOT NULL,
  rating NUMERIC(2,1) CHECK(rating >= 0 AND rating <= 5),
  review TEXT,
  current_page INTEGER NOT NULL DEFAULT 0,
  started_at DATE,
  finished_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- 5. Create reading_sessions table for granular page tracking
CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  pages_read INTEGER NOT NULL,
  start_page INTEGER NOT NULL,
  end_page INTEGER NOT NULL,
  note TEXT,
  reading_minutes INTEGER,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create follows table for social graph
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- 7. Create reviews table (separate feed view indexing)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  rating NUMERIC(2,1) CHECK(rating >= 0 AND rating <= 5) NOT NULL,
  review_text TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for indexing performance
CREATE INDEX IF NOT EXISTS idx_books_created ON public.books(created_at);
CREATE INDEX IF NOT EXISTS idx_books_ol_key ON public.books(open_library_key);
CREATE INDEX IF NOT EXISTS idx_books_isbn10 ON public.books(isbn_10);
CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON public.books(isbn_13);
CREATE INDEX IF NOT EXISTS idx_user_books_user ON public.user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_book ON public.user_books(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user ON public.reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book ON public.reading_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_book ON public.reviews(book_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 8. Row Level Security Policies
-- Books policies
CREATE POLICY "Allow public read access to books" ON public.books
  FOR SELECT USING (true);
CREATE POLICY "Allow auth insert access to books" ON public.books
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Profiles policies
CREATE POLICY "Allow public read access to profiles" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Allow auth users to update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User stats policies
CREATE POLICY "Allow public read access to user_stats" ON public.user_stats
  FOR SELECT USING (true);
CREATE POLICY "Allow auth users to update own stats" ON public.user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- User books policies
CREATE POLICY "Allow public read access to user_books" ON public.user_books
  FOR SELECT USING (true);
CREATE POLICY "Allow auth users to insert own library book" ON public.user_books
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow auth users to update own library book" ON public.user_books
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow auth users to delete own library book" ON public.user_books
  FOR DELETE USING (auth.uid() = user_id);

-- Reading sessions policies
CREATE POLICY "Allow public read access to reading_sessions" ON public.reading_sessions
  FOR SELECT USING (true);
CREATE POLICY "Allow auth users to log own sessions" ON public.reading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow auth users to delete own sessions" ON public.reading_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Allow public read access to follows" ON public.follows
  FOR SELECT USING (true);
CREATE POLICY "Allow auth users to follow" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Allow auth users to unfollow" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Reviews policies
CREATE POLICY "Allow public read access to reviews" ON public.reviews
  FOR SELECT USING (true);
CREATE POLICY "Allow auth users to post reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow auth users to update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow auth users to delete own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Profile / stats inserts used by custom app auth (service role / server)
CREATE POLICY "Allow server insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow server insert user_stats" ON public.user_stats
  FOR INSERT WITH CHECK (true);
