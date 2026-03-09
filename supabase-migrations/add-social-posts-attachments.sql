-- Social Hub posts: support multiple file attachments; content is description only.
-- Run after add-social-chatrooms.sql.

-- 1) Attachments on social_posts: array of { url, name, type } (any file type)
ALTER TABLE social_posts
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]';

-- 2) Allow empty description (content remains for description of the files)
-- No change: content stays NOT NULL; app sends '' when no description.

-- 3) Storage bucket for Social Hub post files (any type). Create in Dashboard if this fails.
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-posts', 'social-posts', true)
ON CONFLICT (id) DO NOTHING;

-- 4) Policies: authenticated can upload; public read (bucket is public)
DROP POLICY IF EXISTS "social-posts upload" ON storage.objects;
CREATE POLICY "social-posts upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'social-posts');

DROP POLICY IF EXISTS "social-posts public read" ON storage.objects;
CREATE POLICY "social-posts public read" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'social-posts');
