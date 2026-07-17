-- Allow Did Not Finish shelf status on user_books
ALTER TABLE public.user_books
  DROP CONSTRAINT IF EXISTS user_books_status_check;

ALTER TABLE public.user_books
  ADD CONSTRAINT user_books_status_check
  CHECK (status IN ('want_to_read', 'reading', 'finished', 'did_not_finish'));
