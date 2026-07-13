-- Allow continuous collection shelf key
ALTER TABLE public.library_shelves DROP CONSTRAINT IF EXISTS library_shelves_system_key_check;
ALTER TABLE public.library_shelves ADD CONSTRAINT library_shelves_system_key_check
  CHECK (
    system_key IS NULL OR system_key IN ('favorites', 'reading', 'want_to_read', 'finished', 'collection')
  );
