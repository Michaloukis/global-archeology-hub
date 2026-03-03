-- Account page: profile picture and display name
-- Run this if your profiles table does not have avatar_url yet.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create avatars storage bucket in Supabase Dashboard (Storage → New bucket):
--   Name: avatars
--   Public: yes (so getPublicUrl works)
-- RLS policy suggestion for avatars bucket (Storage → avatars → Policies):
--   "Users can upload to own folder"  INSERT  (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
--   "Public read"                     SELECT  (bucket_id = 'avatars')
