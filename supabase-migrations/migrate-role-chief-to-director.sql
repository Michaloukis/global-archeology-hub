-- Migrate old role label to new one so stored data matches the app.
-- Run in Supabase Dashboard → SQL Editor after other migrations.

UPDATE profiles
SET role = 'Director'
WHERE role = 'Chief Archeologist';
