-- REVERT: Restore original chatroom_members policy.
-- The expanded policy caused RLS recursion and blocked all chatroom reads.
-- Run this in Supabase SQL Editor to fix "No rooms yet" issue.

DROP POLICY IF EXISTS "chatroom_members_select" ON chatroom_members;
CREATE POLICY "chatroom_members_select" ON chatroom_members FOR SELECT
  USING (user_id = auth.uid());
