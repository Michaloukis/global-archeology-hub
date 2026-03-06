-- Add email to profiles for search (e.g. Direct message "search people").
-- Run in Supabase SQL Editor. Optionally backfill from auth.users:
--   UPDATE profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
