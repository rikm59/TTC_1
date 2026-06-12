-- Ensure onboarding_complete column exists with a NOT NULL default.
-- Safe to run multiple times (ALTER TABLE ... ADD COLUMN IF NOT EXISTS).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;
