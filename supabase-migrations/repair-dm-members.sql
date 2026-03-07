-- Repair DM rooms: ensure both users from dm_key are in chatroom_members.
-- Run in Supabase SQL Editor if a user cannot see a DM the other participant can see.
-- This fixes DMs where one participant was never added (e.g. due to earlier bugs).

INSERT INTO chatroom_members (chatroom_id, user_id)
SELECT c.id, u.id
FROM chatrooms c
CROSS JOIN LATERAL (
  SELECT (string_to_array(c.dm_key, ':'))[1]::uuid AS id
  UNION ALL
  SELECT (string_to_array(c.dm_key, ':'))[2]::uuid AS id
) u
WHERE c.room_type = 'dm'
  AND c.dm_key IS NOT NULL
  AND c.dm_key LIKE '%:%'
  AND u.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chatroom_members m
    WHERE m.chatroom_id = c.id AND m.user_id = u.id
  )
ON CONFLICT (chatroom_id, user_id) DO NOTHING;
