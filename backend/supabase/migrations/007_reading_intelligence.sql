-- Reading intelligence: DNF reasons, chapter progress, DNA cache, AI companion, rec events

ALTER TABLE public.user_books
  ADD COLUMN IF NOT EXISTS current_chapter TEXT;

CREATE TABLE IF NOT EXISTS public.dnf_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  stopped_at_page INTEGER,
  stopped_at_chapter TEXT,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dnf_records_user_id_idx ON public.dnf_records(user_id);
CREATE INDEX IF NOT EXISTS dnf_records_user_book_idx ON public.dnf_records(user_id, book_id);

CREATE TABLE IF NOT EXISTS public.reading_dna (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  genres JSONB NOT NULL DEFAULT '[]'::jsonb,
  themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  pacing_preference NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  character_preference NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  worldbuilding_preference NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  emotional_preference NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  profile_summary TEXT,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  reading_position JSONB NOT NULL DEFAULT '{}'::jsonb,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_conversations_user_book_idx
  ON public.ai_conversations(user_id, book_id);

CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  moods TEXT[] NOT NULL DEFAULT '{}',
  book_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recommendation_events_user_id_idx
  ON public.recommendation_events(user_id);
