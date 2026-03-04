-- Allow authenticated users to read chatroom id and site_id so "Start a chat"
-- can join an existing room when the site already has one (unique violation).
-- Run in Supabase SQL Editor after add-social-chatrooms.sql.

DROP POLICY IF EXISTS "chatrooms_select_authenticated" ON chatrooms;
CREATE POLICY "chatrooms_select_authenticated" ON chatrooms FOR SELECT
  USING (auth.uid() IS NOT NULL);
