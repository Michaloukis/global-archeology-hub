-- Create DM and group chatrooms via RPC so the client never touches chatrooms columns (avoids schema cache errors).
-- Run AFTER add-social-chatrooms.sql. For DM/group support run add-socialhub-dm-group.sql first.

-- 1) Ensure created_by exists and is nullable (no FK to avoid migration failures)
ALTER TABLE chatrooms ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2) RPC: create or get a DM room between current user and other_user_id. Returns { chatroom_id }.
CREATE OR REPLACE FUNCTION public.create_dm_room(other_user_id uuid, room_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  cid uuid;
  dm_key text;
  rname text;
BEGIN
  IF me IS NULL OR other_user_id IS NULL OR me = other_user_id THEN
    RETURN jsonb_build_object('error', 'invalid');
  END IF;
  dm_key := array_to_string(ARRAY(SELECT unnest(ARRAY[me::text, other_user_id::text] ORDER BY 1)), ':');
  rname := COALESCE(room_name, 'DM');

  SELECT id INTO cid FROM chatrooms WHERE chatrooms.dm_key = create_dm_room.dm_key LIMIT 1;
  IF cid IS NOT NULL THEN
    INSERT INTO chatroom_members (chatroom_id, user_id) VALUES (cid, me) ON CONFLICT (chatroom_id, user_id) DO NOTHING;
    INSERT INTO chatroom_members (chatroom_id, user_id) VALUES (cid, other_user_id) ON CONFLICT (chatroom_id, user_id) DO NOTHING;
    RETURN jsonb_build_object('chatroom_id', cid);
  END IF;

  INSERT INTO chatrooms (room_type, dm_key, name, created_by)
  VALUES ('dm', dm_key, rname, me)
  RETURNING id INTO cid;

  INSERT INTO chatroom_members (chatroom_id, user_id) VALUES (cid, me), (cid, other_user_id);
  RETURN jsonb_build_object('chatroom_id', cid);
EXCEPTION
  WHEN SQLSTATE '42703' THEN
    RETURN jsonb_build_object('error', 'run add-socialhub-dm-group.sql first');
END;
$$;

-- 3) RPC: create a group room. Returns { chatroom_id }.
CREATE OR REPLACE FUNCTION public.create_group_room(room_name text, member_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  cid uuid;
  uid uuid;
BEGIN
  IF me IS NULL OR room_name IS NULL OR array_length(member_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid');
  END IF;

  INSERT INTO chatrooms (room_type, name, created_by)
  VALUES ('group', room_name, me)
  RETURNING id INTO cid;

  INSERT INTO chatroom_members (chatroom_id, user_id) VALUES (cid, me);
  FOREACH uid IN ARRAY member_ids
  LOOP
    IF uid IS NOT NULL AND uid != me THEN
      INSERT INTO chatroom_members (chatroom_id, user_id) VALUES (cid, uid) ON CONFLICT (chatroom_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('chatroom_id', cid);
EXCEPTION
  WHEN SQLSTATE '42703' THEN
    RETURN jsonb_build_object('error', 'run add-socialhub-dm-group.sql first');
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_dm_room(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_room(text, uuid[]) TO authenticated;
