-- Virtual bookshelf: custom shelves, shelf membership, and library appearance/privacy

CREATE TABLE IF NOT EXISTS public.library_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'walnut',
  privacy TEXT NOT NULL DEFAULT 'public'
    CHECK (privacy IN ('public', 'friends', 'private')),
  view_mode TEXT NOT NULL DEFAULT 'bookshelf'
    CHECK (view_mode IN ('bookshelf', 'covers', 'compact')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.library_shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  is_favorites BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  system_key TEXT CHECK (
    system_key IS NULL OR system_key IN ('favorites', 'reading', 'want_to_read', 'finished', 'collection')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS public.library_shelf_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id UUID NOT NULL REFERENCES public.library_shelves(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shelf_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_library_shelves_user ON public.library_shelves(user_id, position);
CREATE INDEX IF NOT EXISTS idx_library_shelf_books_shelf ON public.library_shelf_books(shelf_id, position);
CREATE INDEX IF NOT EXISTS idx_library_shelf_books_book ON public.library_shelf_books(book_id);

ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_shelf_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read library_settings" ON public.library_settings
  FOR SELECT USING (true);
CREATE POLICY "Public read library_shelves" ON public.library_shelves
  FOR SELECT USING (true);
CREATE POLICY "Public read library_shelf_books" ON public.library_shelf_books
  FOR SELECT USING (true);
