-- Visibility: private (Exclusive Map only) | team (Students & personnel) | public (everyone)
-- Sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';
UPDATE sites SET visibility = CASE WHEN is_public = false THEN 'private' ELSE 'public' END WHERE visibility IS NULL;
UPDATE sites SET visibility = 'public' WHERE visibility IS NULL;

-- Journal entries (artifacts)
ALTER TABLE site_journals ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';
UPDATE site_journals SET visibility = CASE WHEN is_public = false THEN 'private' ELSE 'public' END WHERE visibility IS NULL;
UPDATE site_journals SET visibility = 'public' WHERE visibility IS NULL;
