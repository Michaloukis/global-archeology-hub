-- Add Direct Messages + Group chats to Social Hub.
-- Run AFTER `add-social-chatrooms.sql`.

-- 1) Extend chatrooms to support non-site rooms
ALTER TABLE chatrooms
  ADD COLUMN IF NOT EXISTS room_type text NOT NULL DEFAULT 'site',
  ADD COLUMN IF NOT EXISTS dm_key text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

-- site_id should be nullable for dm/group rooms
ALTER TABLE chatrooms
  ALTER COLUMN site_id DROP NOT NULL;

-- Ensure valid room types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chatrooms_room_type_check'
  ) THEN
    ALTER TABLE chatrooms
      ADD CONSTRAINT chatrooms_room_type_check
      CHECK (room_type IN ('site', 'dm', 'group'));
  END IF;
END $$;

-- Enforce site_id/dm_key requirements by type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chatrooms_type_requirements_check'
  ) THEN
    ALTER TABLE chatrooms
      ADD CONSTRAINT chatrooms_type_requirements_check
      CHECK (
        (room_type = 'site' AND site_id IS NOT NULL AND dm_key IS NULL)
        OR
        (room_type = 'dm' AND site_id IS NULL AND dm_key IS NOT NULL)
        OR
        (room_type = 'group' AND site_id IS NULL AND dm_key IS NULL)
      );
  END IF;
END $$;

-- Existing rows become site rooms
UPDATE chatrooms
SET room_type = 'site'
WHERE room_type IS NULL OR room_type = '';

-- 2) Uniqueness:
-- - Only one site room per site
-- - Only one DM per user pair (dm_key)
ALTER TABLE chatrooms
  DROP CONSTRAINT IF EXISTS chatrooms_site_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS chatrooms_unique_site_room
  ON chatrooms(site_id)
  WHERE room_type = 'site';

CREATE UNIQUE INDEX IF NOT EXISTS chatrooms_unique_dm_key
  ON chatrooms(dm_key)
  WHERE room_type = 'dm';

