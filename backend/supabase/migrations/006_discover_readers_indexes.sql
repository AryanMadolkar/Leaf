-- Indexes to support the Discover Readers feature (active / similar-taste / new reader lookups)
CREATE INDEX IF NOT EXISTS idx_user_stats_streak ON public.user_stats(reading_streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_favorite_genre ON public.user_stats(favorite_genre);
CREATE INDEX IF NOT EXISTS idx_profiles_joined_at ON public.profiles(joined_at DESC);
