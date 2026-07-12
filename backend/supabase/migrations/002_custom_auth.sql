-- Custom auth: detach profiles from Supabase Auth and add credentials

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Allow profiles to exist without auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Credentials for email/password auth owned by the app
CREATE TABLE IF NOT EXISTS public.user_credentials (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_credentials_email
  ON public.user_credentials (lower(email));

-- Allow service-role / server inserts for custom signup
DROP POLICY IF EXISTS "Allow server insert profiles" ON public.profiles;
CREATE POLICY "Allow server insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server insert user_stats" ON public.user_stats;
CREATE POLICY "Allow server insert user_stats" ON public.user_stats
  FOR INSERT WITH CHECK (true);
