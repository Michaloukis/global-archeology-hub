-- Social & chatrooms: one room per dig site, posts + chat per room.
-- Run in Supabase SQL Editor.
-- After running: enable Realtime for table `chat_messages` in Dashboard → Database → Replication.

-- 1) Chatrooms (one per site)
CREATE TABLE IF NOT EXISTS chatrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id bigint NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(site_id)
);

-- 2) Chatroom members (field arch + chief when approved). profiles.id = auth user id.
CREATE TABLE IF NOT EXISTS chatroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatroom_id uuid NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(chatroom_id, user_id)
);

-- 3) Social posts (scoped to chatroom)
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatroom_id uuid NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4) Post likes
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 5) Post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 6) Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatroom_id uuid NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chatroom_members_user ON chatroom_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chatroom_members_room ON chatroom_members(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_chatroom ON social_posts(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chatroom ON chat_messages(chatroom_id);

-- RLS
ALTER TABLE chatrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chatrooms: members can read; authenticated can insert (Chief creates on approve)
DROP POLICY IF EXISTS "chatrooms_select_member" ON chatrooms;
CREATE POLICY "chatrooms_select_member" ON chatrooms FOR SELECT
  USING (EXISTS (SELECT 1 FROM chatroom_members m WHERE m.chatroom_id = chatrooms.id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "chatrooms_insert_auth" ON chatrooms;
CREATE POLICY "chatrooms_insert_auth" ON chatrooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Chatroom members: users can read their own membership rows (avoids recursion)
DROP POLICY IF EXISTS "chatroom_members_select" ON chatroom_members;
CREATE POLICY "chatroom_members_select" ON chatroom_members FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "chatroom_members_insert" ON chatroom_members;
CREATE POLICY "chatroom_members_insert" ON chatroom_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Social posts: only chatroom members
DROP POLICY IF EXISTS "social_posts_select" ON social_posts;
CREATE POLICY "social_posts_select" ON social_posts FOR SELECT
  USING (EXISTS (SELECT 1 FROM chatroom_members m WHERE m.chatroom_id = social_posts.chatroom_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "social_posts_insert" ON social_posts;
CREATE POLICY "social_posts_insert" ON social_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM chatroom_members m WHERE m.chatroom_id = social_posts.chatroom_id AND m.user_id = auth.uid()));

-- Post likes: members can read; authenticated can insert/delete own
DROP POLICY IF EXISTS "post_likes_select" ON post_likes;
CREATE POLICY "post_likes_select" ON post_likes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM social_posts p
    JOIN chatroom_members m ON m.chatroom_id = p.chatroom_id AND m.user_id = auth.uid()
    WHERE p.id = post_likes.post_id
  ));

DROP POLICY IF EXISTS "post_likes_insert" ON post_likes;
CREATE POLICY "post_likes_insert" ON post_likes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "post_likes_delete" ON post_likes;
CREATE POLICY "post_likes_delete" ON post_likes FOR DELETE USING (user_id = auth.uid());

-- Post comments: members can read/insert
DROP POLICY IF EXISTS "post_comments_select" ON post_comments;
CREATE POLICY "post_comments_select" ON post_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM social_posts p
    JOIN chatroom_members m ON m.chatroom_id = p.chatroom_id AND m.user_id = auth.uid()
    WHERE p.id = post_comments.post_id
  ));

DROP POLICY IF EXISTS "post_comments_insert" ON post_comments;
CREATE POLICY "post_comments_insert" ON post_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM social_posts p
    JOIN chatroom_members m ON m.chatroom_id = p.chatroom_id AND m.user_id = auth.uid()
    WHERE p.id = post_comments.post_id
  ));

-- Chat messages: members can read/insert
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM chatroom_members m WHERE m.chatroom_id = chat_messages.chatroom_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM chatroom_members m WHERE m.chatroom_id = chat_messages.chatroom_id AND m.user_id = auth.uid()));

-- Optional: allow post/comments update/delete for author (edit/delete own)
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_posts_update" ON social_posts;
CREATE POLICY "social_posts_update" ON social_posts FOR UPDATE USING (author_id = auth.uid());
DROP POLICY IF EXISTS "social_posts_delete" ON social_posts;
CREATE POLICY "social_posts_delete" ON social_posts FOR DELETE USING (author_id = auth.uid());
