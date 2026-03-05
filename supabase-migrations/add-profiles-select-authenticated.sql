-- Allow authenticated users to read all profiles (for chat/post display names, avatars, roles).
-- Run in Supabase SQL Editor if chat message bubbles show "Unknown" for senders.

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);
