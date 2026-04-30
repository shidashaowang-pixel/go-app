-- =============================================
-- 社交功能扩展：私信和社区
-- =============================================

-- 第1部分：私信系统
-- ============ 私信会话表 ============
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);

-- ============ 私信消息表 ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- ============ RLS 策略 - 私信 ============
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- conversations 策略
DROP POLICY IF EXISTS "用户可以查看自己的会话" ON conversations;
CREATE POLICY "用户可以查看自己的会话" ON conversations FOR SELECT TO authenticated 
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

DROP POLICY IF EXISTS "用户可以创建会话" ON conversations;
CREATE POLICY "用户可以创建会话" ON conversations FOR INSERT TO authenticated WITH CHECK (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

DROP POLICY IF EXISTS "用户可以更新会话" ON conversations;
CREATE POLICY "用户可以更新会话" ON conversations FOR UPDATE TO authenticated 
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- messages 策略
DROP POLICY IF EXISTS "用户可以查看会话中的消息" ON messages;
CREATE POLICY "用户可以查看会话中的消息" ON messages FOR SELECT TO authenticated 
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  ));

DROP POLICY IF EXISTS "用户可以发送消息" ON messages;
CREATE POLICY "用户可以发送消息" ON messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND
  conversation_id IN (
    SELECT id FROM conversations WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "用户可以标记消息已读" ON messages;
CREATE POLICY "用户可以标记消息已读" ON messages FOR UPDATE TO authenticated 
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  ));

-- 第2部分：社区动态系统
-- ============ 社区帖子表 ============
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('general', 'strategy', 'share', 'question', 'announcement')),
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- ============ 帖子点赞表 ============
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);

-- ============ 评论表 ============
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- ============ 评论点赞表 ============
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- ============ RLS 策略 - 社区 ============
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- posts 策略
DROP POLICY IF EXISTS "所有人可以查看帖子" ON posts;
CREATE POLICY "所有人可以查看帖子" ON posts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "用户可以创建帖子" ON posts;
CREATE POLICY "用户可以创建帖子" ON posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "用户可以更新自己的帖子" ON posts;
CREATE POLICY "用户可以更新自己的帖子" ON posts FOR UPDATE TO authenticated 
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "用户可以删除自己的帖子" ON posts;
CREATE POLICY "用户可以删除自己的帖子" ON posts FOR DELETE TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS "教师可以置顶帖子" ON posts;
CREATE POLICY "教师可以置顶帖子" ON posts FOR UPDATE TO authenticated 
  USING (
    author_id = auth.uid() OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'teacher')
  );

-- post_likes 策略
DROP POLICY IF EXISTS "所有人可以查看点赞" ON post_likes;
CREATE POLICY "所有人可以查看点赞" ON post_likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "用户可以点赞" ON post_likes;
CREATE POLICY "用户可以点赞" ON post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "用户可以取消点赞" ON post_likes;
CREATE POLICY "用户可以取消点赞" ON post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- comments 策略
DROP POLICY IF EXISTS "所有人可以查看评论" ON comments;
CREATE POLICY "所有人可以查看评论" ON comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "用户可以创建评论" ON comments;
CREATE POLICY "用户可以创建评论" ON comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "用户可以更新自己的评论" ON comments;
CREATE POLICY "用户可以更新自己的评论" ON comments FOR UPDATE TO authenticated 
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "用户可以删除自己的评论" ON comments;
CREATE POLICY "用户可以删除自己的评论" ON comments FOR DELETE TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS "帖子作者可以删除评论" ON comments;
CREATE POLICY "帖子作者可以删除评论" ON comments FOR DELETE TO authenticated 
  USING (
    author_id = auth.uid() OR 
    post_id IN (SELECT id FROM posts WHERE author_id = auth.uid())
  );

-- comment_likes 策略
DROP POLICY IF EXISTS "所有人可以查看评论点赞" ON comment_likes;
CREATE POLICY "所有人可以查看评论点赞" ON comment_likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "用户可以点赞评论" ON comment_likes;
CREATE POLICY "用户可以点赞评论" ON comment_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "用户可以取消评论点赞" ON comment_likes;
CREATE POLICY "用户可以取消评论点赞" ON comment_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 第3部分：创建自动更新函数
-- 更新帖子的评论数
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1, updated_at = now() WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = comments_count - 1, updated_at = now() WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_post_comments ON comments;
CREATE TRIGGER trigger_update_post_comments
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- 更新帖子的点赞数
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_post_likes ON post_likes;
CREATE TRIGGER trigger_update_post_likes
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- 更新评论的点赞数
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_comment_likes ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- 完成！
SELECT '社交功能扩展完成！' AS status;
