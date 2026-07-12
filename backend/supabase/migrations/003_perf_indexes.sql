-- Performance indexes for hot read paths (init/diary load, feed, follow counts)

-- Community reviews feed: ORDER BY created_at DESC LIMIT 20 with no filter
CREATE INDEX IF NOT EXISTS idx_reviews_created_at
  ON public.reviews (created_at DESC);

-- Reading sessions timeline: WHERE user_id = ? ORDER BY logged_at DESC
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_logged
  ON public.reading_sessions (user_id, logged_at DESC);

-- Follows: follower_id is covered by the (follower_id, following_id) PK,
-- but following_id-only lookups (follower count) need their own index.
CREATE INDEX IF NOT EXISTS idx_follows_following
  ON public.follows (following_id);

-- user_books: status filtered joins for library views (want_to_read/reading/finished)
CREATE INDEX IF NOT EXISTS idx_user_books_user_status
  ON public.user_books (user_id, status);
