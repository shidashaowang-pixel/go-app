-- =============================================
-- 棋社系统
-- =============================================

-- 第1部分：棋社表
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  banner_url text,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  min_join_level int DEFAULT 1,           -- 加入最低等级要求
  is_public boolean DEFAULT true,          -- 是否公开
  max_members int DEFAULT 100,            -- 最大成员数
  total_games int DEFAULT 0,              -- 社内总对弈局数
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 第2部分：棋社成员表
CREATE TYPE club_member_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE IF NOT EXISTS club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role club_member_role DEFAULT 'member',
  nickname text,                          -- 在社内的昵称
  join_games int DEFAULT 0,               -- 在社内参与的对弈局数
  join_bonus_received boolean DEFAULT false,  -- 是否已领取加入奖励
  joined_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- 第3部分：棋社公告
CREATE TABLE IF NOT EXISTS club_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 第4部分：棋社动态（帖子）
CREATE TABLE IF NOT EXISTS club_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  likes_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 第5部分：棋社帖子点赞
CREATE TABLE IF NOT EXISTS club_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 第6部分：棋社帖子评论
CREATE TABLE IF NOT EXISTS club_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES club_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 第7部分：棋社内对弈记录
CREATE TABLE IF NOT EXISTS club_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  black_player_id uuid NOT NULL REFERENCES profiles(id),
  white_player_id uuid NOT NULL REFERENCES profiles(id),
  result text,                            -- 'black_win', 'white_win', 'draw'
  handicap int DEFAULT 0,                  -- 让子数
  played_at timestamptz DEFAULT now()
);

-- 第8部分：棋社排行榜
CREATE TABLE IF NOT EXISTS club_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ranking int DEFAULT 0,
  rating int DEFAULT 1500,
  wins int DEFAULT 0,
  losses int DEFAULT 0,
  win_rate numeric(5,2) DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- 第9部分：加入申请（需要审批的）
CREATE TABLE IF NOT EXISTS club_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_by uuid REFERENCES profiles(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- 第10部分：棋社设置
CREATE TABLE IF NOT EXISTS club_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL UNIQUE REFERENCES clubs(id) ON DELETE CASCADE,
  require_approval boolean DEFAULT false,  -- 是否需要审批加入
  allow_member_invite boolean DEFAULT true, -- 允许成员邀请
  join_bonus_coins int DEFAULT 50,         -- 加入奖励金币数
  level_requirement int DEFAULT 1,        -- 等级要求
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_clubs_owner ON clubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_clubs_public ON clubs(is_public);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_announcements_club ON club_announcements(club_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_club ON club_posts(club_id);
CREATE INDEX IF NOT EXISTS idx_club_post_likes_post ON club_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_club_comments_post ON club_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_club_games_club ON club_games(club_id);
CREATE INDEX IF NOT EXISTS idx_club_leaderboard_club ON club_leaderboard(club_id);
CREATE INDEX IF NOT EXISTS idx_club_applications_club ON club_applications(club_id);

-- RLS 策略
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_settings ENABLE ROW LEVEL SECURITY;

-- clubs 策略
DROP POLICY IF EXISTS "所有人可以查看公开棋社" ON clubs;
CREATE POLICY "所有人可以查看公开棋社" ON clubs FOR SELECT TO authenticated USING (is_public = true);

DROP POLICY IF EXISTS "成员可以查看自己加入的棋社" ON clubs;
CREATE POLICY "成员可以查看自己加入的棋社" ON clubs FOR SELECT TO authenticated 
  USING (id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "用户可以创建棋社" ON clubs;
CREATE POLICY "用户可以创建棋社" ON clubs FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "社长可以更新棋社" ON clubs;
CREATE POLICY "社长可以更新棋社" ON clubs FOR UPDATE TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "社长可以删除棋社" ON clubs;
CREATE POLICY "社长可以删除棋社" ON clubs FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- club_members 策略
DROP POLICY IF EXISTS "棋社成员可以查看成员列表" ON club_members;
CREATE POLICY "棋社成员可以查看成员列表" ON club_members FOR SELECT TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "用户可以申请加入棋社" ON club_members;
CREATE POLICY "用户可以申请加入棋社" ON club_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "成员可以退出棋社" ON club_members;
CREATE POLICY "成员可以退出棋社" ON club_members FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "管理员可以管理成员" ON club_members;
CREATE POLICY "管理员可以管理成员" ON club_members FOR UPDATE TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- club_announcements 策略
DROP POLICY IF EXISTS "成员可以查看公告" ON club_announcements;
CREATE POLICY "成员可以查看公告" ON club_announcements FOR SELECT TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "管理员可以发布公告" ON club_announcements;
CREATE POLICY "管理员可以发布公告" ON club_announcements FOR INSERT TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "管理员可以管理公告" ON club_announcements;
CREATE POLICY "管理员可以管理公告" ON club_announcements FOR UPDATE TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "管理员可以删除公告" ON club_announcements;
CREATE POLICY "管理员可以删除公告" ON club_announcements FOR DELETE TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- club_posts 策略
DROP POLICY IF EXISTS "成员可以查看帖子" ON club_posts;
CREATE POLICY "成员可以查看帖子" ON club_posts FOR SELECT TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "成员可以发帖" ON club_posts;
CREATE POLICY "成员可以发帖" ON club_posts FOR INSERT TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "作者和管理员可以管理帖子" ON club_posts;
CREATE POLICY "作者和管理员可以管理帖子" ON club_posts FOR UPDATE TO authenticated 
  USING (
    author_id = auth.uid() OR 
    club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

DROP POLICY IF EXISTS "作者和管理员可以删除帖子" ON club_posts;
CREATE POLICY "作者和管理员可以删除帖子" ON club_posts FOR DELETE TO authenticated 
  USING (
    author_id = auth.uid() OR 
    club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- club_post_likes 策略
DROP POLICY IF EXISTS "成员可以查看帖子点赞" ON club_post_likes;
CREATE POLICY "成员可以查看帖子点赞" ON club_post_likes FOR SELECT TO authenticated 
  USING (post_id IN (SELECT id FROM club_posts WHERE club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "成员可以点赞" ON club_post_likes;
CREATE POLICY "成员可以点赞" ON club_post_likes FOR INSERT TO authenticated 
  USING (post_id IN (SELECT id FROM club_posts WHERE club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "用户可以取消点赞" ON club_post_likes;
CREATE POLICY "用户可以取消点赞" ON club_post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- club_comments 策略
DROP POLICY IF EXISTS "成员可以查看评论" ON club_comments;
CREATE POLICY "成员可以查看评论" ON club_comments FOR SELECT TO authenticated 
  USING (post_id IN (SELECT id FROM club_posts WHERE club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "成员可以评论" ON club_comments;
CREATE POLICY "成员可以评论" ON club_comments FOR INSERT TO authenticated 
  USING (post_id IN (SELECT id FROM club_posts WHERE club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "作者和管理员可以管理评论" ON club_comments;
CREATE POLICY "作者和管理员可以管理评论" ON club_comments FOR UPDATE TO authenticated 
  USING (
    author_id = auth.uid() OR 
    post_id IN (SELECT id FROM club_posts WHERE club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')))
  );

DROP POLICY IF EXISTS "作者和管理员可以删除评论" ON club_comments;
CREATE POLICY "作者和管理员可以删除评论" ON club_comments FOR DELETE TO authenticated 
  USING (
    author_id = auth.uid() OR 
    post_id IN (SELECT id FROM club_posts WHERE club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')))
  );

-- club_games 策略
DROP POLICY IF EXISTS "成员可以查看社内对弈" ON club_games;
CREATE POLICY "成员可以查看社内对弈" ON club_games FOR SELECT TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "成员可以记录对弈" ON club_games;
CREATE POLICY "成员可以记录对弈" ON club_games FOR INSERT TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid()));

-- club_leaderboard 策略
DROP POLICY IF EXISTS "成员可以查看社内排行榜" ON club_leaderboard;
CREATE POLICY "成员可以查看社内排行榜" ON club_leaderboard FOR SELECT TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "系统可以更新排行榜" ON club_leaderboard;
CREATE POLICY "系统可以更新排行榜" ON club_leaderboard FOR UPDATE TO authenticated USING (true);

-- club_applications 策略
DROP POLICY IF EXISTS "成员可以查看申请" ON club_applications;
CREATE POLICY "成员可以查看申请" ON club_applications FOR SELECT TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "用户可以申请加入" ON club_applications;
CREATE POLICY "用户可以申请加入" ON club_applications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "管理员可以处理申请" ON club_applications;
CREATE POLICY "管理员可以处理申请" ON club_applications FOR UPDATE TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- club_settings 策略
DROP POLICY IF EXISTS "成员可以查看设置" ON club_settings;
CREATE POLICY "成员可以查看设置" ON club_settings FOR SELECT TO authenticated 
  USING (club_id IN (SELECT club_id FROM club_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "系统可以创建默认设置" ON club_settings;
CREATE POLICY "系统可以创建默认设置" ON club_settings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "社长可以修改设置" ON club_settings;
CREATE POLICY "社长可以修改设置" ON club_settings FOR ALL TO authenticated 
  USING (club_id IN (SELECT id FROM clubs WHERE owner_id = auth.uid()));

-- 创建触发器
CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_announcements_updated_at
  BEFORE UPDATE ON club_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_posts_updated_at
  BEFORE UPDATE ON club_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_comments_updated_at
  BEFORE UPDATE ON club_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_leaderboard_updated_at
  BEFORE UPDATE ON club_leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_settings_updated_at
  BEFORE UPDATE ON club_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建默认设置触发器
CREATE OR REPLACE FUNCTION create_default_club_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO club_settings (club_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_club_created
  AFTER INSERT ON clubs
  FOR EACH ROW EXECUTE FUNCTION create_default_club_settings();

-- 初始化示例棋社
INSERT INTO clubs (name, description, owner_id, is_public) VALUES
  ('围棋交流社', '欢迎所有围棋爱好者加入！', auth.uid(), true)
WHERE EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid());

SELECT '棋社系统初始化完成！' AS status;
