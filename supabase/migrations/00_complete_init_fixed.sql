-- =============================================
-- 围棋应用数据库初始化脚本（修复版）
-- =============================================

-- 第1部分：创建用户角色和profiles表
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('child', 'parent', 'teacher');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  nickname text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'child',
  parent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, username, nickname, role, rating)
    VALUES (
      NEW.id,
      split_part(NEW.email, '@', 1),
      split_part(NEW.email, '@', 1),
      'child'::public.user_role,
      0
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = uid AND p.role = role_name::user_role
  );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看所有profiles" ON profiles;
CREATE POLICY "用户可以查看所有profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "用户可以更新自己的profile" ON profiles;
CREATE POLICY "用户可以更新自己的profile" ON profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "教师可以查看所有profiles" ON profiles;
CREATE POLICY "教师可以查看所有profiles" ON profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'teacher'));

DROP POLICY IF EXISTS "公开profiles查询" ON profiles;
CREATE POLICY "公开profiles查询" ON profiles
  FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating DESC);

-- 第2部分：创建核心表
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_type') THEN
    CREATE TYPE course_type AS ENUM ('video', 'article', 'animation');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'problem_type') THEN
    CREATE TYPE problem_type AS ENUM ('checkpoint', 'practice');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_type') THEN
    CREATE TYPE game_type AS ENUM ('ai', 'human');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_status') THEN
    CREATE TYPE game_status AS ENUM ('ongoing', 'finished', 'abandoned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_result') THEN
    CREATE TYPE game_result AS ENUM ('black_win', 'white_win', 'draw');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_type') THEN
    CREATE TYPE achievement_type AS ENUM ('checkpoint', 'practice', 'game', 'course');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type course_type NOT NULL,
  content_url text,
  cover_image_url text,
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duration integer,
  animation_steps jsonb DEFAULT NULL,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type problem_type NOT NULL,
  checkpoint_level integer,
  board_size integer DEFAULT 19,
  initial_position jsonb,
  solution jsonb NOT NULL,
  difficulty integer DEFAULT 1,
  teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  systemId text UNIQUE,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type game_type NOT NULL,
  status game_status DEFAULT 'ongoing',
  result game_result,
  black_player_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  white_player_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ai_difficulty text,
  board_size integer DEFAULT 19,
  moves jsonb DEFAULT '[]',
  end_type text DEFAULT NULL,
  score_detail jsonb DEFAULT NULL,
  black_captures integer DEFAULT 0,
  white_captures integer DEFAULT 0,
  move_count integer DEFAULT 0,
  duration_seconds integer DEFAULT NULL,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type achievement_type NOT NULL,
  title text NOT NULL,
  description text,
  icon text,
  earned_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  progress integer DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id),
  UNIQUE(user_id, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published);
CREATE INDEX IF NOT EXISTS idx_problems_type ON problems(type, checkpoint_level);
CREATE INDEX IF NOT EXISTS idx_problems_published ON problems(published);
CREATE INDEX IF NOT EXISTS idx_problems_systemId ON problems(systemId);
ALTER TABLE problems ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_problems_teacher ON problems(teacher_id);
CREATE INDEX IF NOT EXISTS idx_games_players ON games(black_player_id, white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON learning_progress(user_id);

-- RLS 策略
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可以查看课程" ON courses;
DROP POLICY IF EXISTS "教师可以管理自己的课程" ON courses;
DROP POLICY IF EXISTS "匿名用户查看已发布课程" ON courses;
DROP POLICY IF EXISTS "教师可以创建课程" ON courses;
DROP POLICY IF EXISTS "教师可以更新课程" ON courses;
DROP POLICY IF EXISTS "教师可以删除课程" ON courses;

CREATE POLICY "所有人可以查看课程" ON courses
  FOR SELECT TO authenticated
  USING (published = true OR teacher_id = auth.uid());

CREATE POLICY "教师可以创建课程" ON courses
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "教师可以更新课程" ON courses
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "教师可以删除课程" ON courses
  FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "匿名用户查看已发布课程" ON courses
  FOR SELECT TO anon
  USING (published = true);

DROP POLICY IF EXISTS "所有人可以查看题目" ON problems;
CREATE POLICY "所有人可以查看题目" ON problems
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "教师可以创建题目" ON problems;
CREATE POLICY "教师可以创建题目" ON problems
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "教师可以更新题目" ON problems;
CREATE POLICY "教师可以更新题目" ON problems
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "教师可以删除题目" ON problems;
CREATE POLICY "教师可以删除题目" ON problems
  FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "用户可以查看自己的对弈" ON games;
CREATE POLICY "用户可以查看自己的对弈" ON games FOR SELECT TO authenticated 
  USING (black_player_id = auth.uid() OR white_player_id = auth.uid());
DROP POLICY IF EXISTS "用户可以创建对弈" ON games;
CREATE POLICY "用户可以创建对弈" ON games FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "用户可以更新自己的对弈" ON games;
CREATE POLICY "用户可以更新自己的对弈" ON games FOR UPDATE TO authenticated 
  USING (black_player_id = auth.uid() OR white_player_id = auth.uid());

DROP POLICY IF EXISTS "用户可以查看自己的好友关系" ON friendships;
CREATE POLICY "用户可以查看自己的好友关系" ON friendships FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR friend_id = auth.uid());
DROP POLICY IF EXISTS "用户可以添加好友" ON friendships;
CREATE POLICY "用户可以添加好友" ON friendships FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "用户可以更新自己的好友关系" ON friendships;
CREATE POLICY "用户可以更新自己的好友关系" ON friendships FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() OR friend_id = auth.uid());
DROP POLICY IF EXISTS "用户可以删除自己的好友关系" ON friendships;
CREATE POLICY "用户可以删除自己的好友关系" ON friendships FOR DELETE TO authenticated 
  USING (user_id = auth.uid() OR friend_id = auth.uid());

DROP POLICY IF EXISTS "用户可以查看自己的成就" ON achievements;
CREATE POLICY "用户可以查看自己的成就" ON achievements FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "系统可以创建成就" ON achievements;
CREATE POLICY "系统可以创建成就" ON achievements FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "用户可以查看自己的学习进度" ON learning_progress;
CREATE POLICY "用户可以查看自己的学习进度" ON learning_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "用户可以更新自己的学习进度" ON learning_progress;
DROP POLICY IF EXISTS "用户可以写入自己的学习进度" ON learning_progress;
DROP POLICY IF EXISTS "用户可以删除自己的学习进度" ON learning_progress;

CREATE POLICY "用户可以写入自己的学习进度" ON learning_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以更新自己的学习进度" ON learning_progress
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以删除自己的学习进度" ON learning_progress
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 第3部分：创建存储桶
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('course-videos', 'course-videos', true),
  ('course-images', 'course-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "用户可以上传自己的头像" ON storage.objects;
CREATE POLICY "用户可以上传自己的头像" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "所有人可以查看头像" ON storage.objects;
CREATE POLICY "所有人可以查看头像" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "用户可以删除自己的头像" ON storage.objects;
CREATE POLICY "用户可以删除自己的头像" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "教师可以上传课程视频" ON storage.objects;
CREATE POLICY "教师可以上传课程视频" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'course-videos' AND has_role(auth.uid(), 'teacher'));

DROP POLICY IF EXISTS "所有人可以查看课程视频" ON storage.objects;
CREATE POLICY "所有人可以查看课程视频" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'course-videos');

DROP POLICY IF EXISTS "教师可以上传课程图片" ON storage.objects;
CREATE POLICY "教师可以上传课程图片" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'course-images' AND has_role(auth.uid(), 'teacher'));

DROP POLICY IF EXISTS "所有人可以查看课程图片" ON storage.objects;
CREATE POLICY "所有人可以查看课程图片" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'course-images');

-- 第4部分：创建匹配和对弈相关表
CREATE TABLE IF NOT EXISTS matchmaking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  board_size integer DEFAULT 19,
  time_control text DEFAULT '20min',
  handicap_mode text DEFAULT 'even',
  handicap_count integer DEFAULT 0,
  handicap_direction text DEFAULT 'user-gives',
  status text DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'cancelled')),
  rating integer DEFAULT 0,
  matched_with uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matchmaking_status ON matchmaking(status, board_size);
CREATE INDEX IF NOT EXISTS idx_matchmaking_user ON matchmaking(user_id);

ALTER TABLE matchmaking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "用户可以管理自己的匹配" ON matchmaking;
CREATE POLICY "用户可以管理自己的匹配" ON matchmaking
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS game_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number integer NOT NULL,
  row integer NOT NULL,
  col integer NOT NULL,
  player text NOT NULL CHECK (player IN ('black', 'white')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_moves_game ON game_moves(game_id, move_number);

ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "对弈双方可以查看落子" ON game_moves;
CREATE POLICY "对弈双方可以查看落子" ON game_moves FOR SELECT TO authenticated 
  USING (game_id IN (SELECT id FROM games WHERE black_player_id = auth.uid() OR white_player_id = auth.uid()));
DROP POLICY IF EXISTS "对弈双方可以添加落子" ON game_moves;
CREATE POLICY "对弈双方可以添加落子" ON game_moves FOR INSERT TO authenticated WITH CHECK (
  game_id IN (SELECT id FROM games WHERE black_player_id = auth.uid() OR white_player_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS game_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  board_size integer DEFAULT 19,
  time_control text DEFAULT '20min',
  handicap_mode text DEFAULT 'even',
  handicap_count integer DEFAULT 0,
  handicap_direction text DEFAULT 'user-gives',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes'),
  UNIQUE(inviter_id, invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_game_invitations_invitee ON game_invitations(invitee_id, status);

ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "相关用户可以查看邀请" ON game_invitations;
CREATE POLICY "相关用户可以查看邀请" ON game_invitations FOR SELECT TO authenticated 
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
DROP POLICY IF EXISTS "用户可以创建邀请" ON game_invitations;
CREATE POLICY "用户可以创建邀请" ON game_invitations
  FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid());
DROP POLICY IF EXISTS "邀请人可取消" ON game_invitations;
CREATE POLICY "邀请人可取消" ON game_invitations FOR UPDATE TO authenticated 
  USING (inviter_id = auth.uid());
DROP POLICY IF EXISTS "被邀请人可接受/拒绝" ON game_invitations;
CREATE POLICY "被邀请人可接受/拒绝" ON game_invitations FOR UPDATE TO authenticated 
  USING (invitee_id = auth.uid());

-- 第5部分：创建统计和浏览记录表
CREATE TABLE IF NOT EXISTS daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  games_played integer DEFAULT 0,
  games_won integer DEFAULT 0,
  problems_solved integer DEFAULT 0,
  courses_studied integer DEFAULT 0,
  online_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date DESC);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "用户可以查看自己的每日统计" ON daily_stats;
CREATE POLICY "用户可以查看自己的每日统计" ON daily_stats FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "用户可以更新自己的每日统计" ON daily_stats;
CREATE POLICY "用户可以更新自己的每日统计" ON daily_stats
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS culture_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  story_id text NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_culture_views_user ON culture_views(user_id);

ALTER TABLE culture_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "用户可以查看自己的浏览记录" ON culture_views;
CREATE POLICY "用户可以查看自己的浏览记录" ON culture_views FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "用户可以记录自己的浏览" ON culture_views;
CREATE POLICY "用户可以记录自己的浏览" ON culture_views
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 第6部分：用户创建触发器
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 完成！
SELECT '数据库初始化完成！' AS status;
