-- Fix: "ORDER BY specified, but unnest is not an aggregate function"
-- Run this ENTIRE block in Supabase Dashboard → SQL Editor, then click Run.
-- After running, close the Start a Chat modal, reopen it, and try Direct message again.

CREATE OR REPLACE FUNCTION public.create_dm_room(other_user_id uuid, room_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  cid uuid;
  v_dm_key text;
  rname text;
BEGIN
  IF me IS NULL OR other_user_id IS NULL OR me = other_user_id THEN
    RETURN jsonb_build_object('error', 'invalid');
  END IF;
  v_dm_key := LEAST(me::text, other_user_id::text) || ':' || GREATEST(me::text, other_user_id::text);
  rname := COALESCE(room_name, 'DM');

  SELECT id INTO cid FROM chatrooms WHERE chatrooms.dm_key = v_dm_key LIMIT 1;
  IF cid IS NOT NULL THEN
    INSERT INTO chatroom_members (chatroom_id, user_id) VALUES (cid, me) ON CONFLICT (chatroom_id, user_id) DO NOTHING;
    INSERT INTO chatroom_members (chatroom_id, user_id) VALUES (cid, other_user_id) ON CONFLICT (chatroom_id, user_id) DO NOTHING;
    RETURN jsonb_build_object('chatroom_id', cid);
  END IF;

  INSERT INTO chatrooms (room_type, dm_key, name, created_by)
  VALUES ('dm', v_dm_key, rname, me)
  RETURNING id INTO cid;

  INSERT INTO chatroom_members (chatroom_id, user_id) VALUES (cid, me), (cid, other_user_id);
  RETURN jsonb_build_object('chatroom_id', cid);
EXCEPTION
  WHEN SQLSTATE '42703' THEN
    RETURN jsonb_build_object('error', 'run add-socialhub-dm-group.sql first');
END;
$$;

-- Verify: run this to confirm the fix. Should show LEAST/GREATEST, NOT unnest:
-- SELECT prosrc FROM pg_proc WHERE proname = 'create_dm_room';
