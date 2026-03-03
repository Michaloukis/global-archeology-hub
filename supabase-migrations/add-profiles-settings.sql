-- Profile settings tab: privacy and preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'team';
-- 'public' = visible to everyone, 'team' = visible to logged-in hub users, 'private' = only me
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_email boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;
