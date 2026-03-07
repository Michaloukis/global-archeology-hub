-- RPC: fetch chatrooms for current user with display names.
-- For DMs, display_name = other person's username. For site/group, display_name = room name.
-- Run in Supabase SQL Editor. Run AFTER add-socialhub-dm-group.sql.

CREATE OR REPLACE FUNCTION public.get_my_chatrooms()
RETURNS TABLE (
  id uuid,
  name text,
  site_id bigint,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.site_id,
    CASE
      WHEN c.room_type = 'dm' THEN (
        SELECT COALESCE(p.username, p.full_name, c.name)
        FROM chatroom_members m
        JOIN profiles p ON p.id = m.user_id
        WHERE m.chatroom_id = c.id AND m.user_id != auth.uid()
        LIMIT 1
      )
      ELSE c.name
    END
  FROM chatrooms c
  WHERE EXISTS (
    SELECT 1 FROM chatroom_members m
    WHERE m.chatroom_id = c.id AND m.user_id = auth.uid()
  )
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_chatrooms() TO authenticated;
