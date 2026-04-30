-- 课程类型枚举
CREATE TYPE course_type AS ENUM ('video', 'article');

-- 课程表
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type course_type NOT NULL,
  content_url text,
  cover_image_url text,
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duration integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 题目类型枚举
CREATE TYPE problem_type AS ENUM ('checkpoint', 'practice');

-- 题目表
CREATE TABLE problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type problem_type NOT NULL,
  checkpoint_level integer,
  board_size integer DEFAULT 19,
  initial_position jsonb,
  solution jsonb NOT NULL,
  difficulty integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- 对弈类型枚举
CREATE TYPE game_type AS ENUM ('ai', 'human');
CREATE TYPE game_status AS ENUM ('ongoing', 'finished', 'abandoned');
CREATE TYPE game_result AS ENUM ('black_win', 'white_win', 'draw');

-- 对弈记录表
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type game_type NOT NULL,
  status game_status DEFAULT 'ongoing',
  result game_result,
  black_player_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  white_player_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ai_difficulty text,
  board_size integer DEFAULT 19,
  moves jsonb DEFAULT '[]',
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz
);

-- 好友关系表
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- 成就类型枚举
CREATE TYPE achievement_type AS ENUM ('checkpoint', 'practice', 'game', 'course');

-- 成就表
CREATE TABLE achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type achievement_type NOT NULL,
  title text NOT NULL,
  description text,
  icon text,
  earned_at timestamptz DEFAULT now()
);

-- 学习进度表
CREATE TABLE learning_progress (
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

-- 创建索引
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_problems_type ON problems(type, checkpoint_level);
CREATE INDEX idx_games_players ON games(black_player_id, white_player_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_achievements_user ON achievements(user_id);
CREATE INDEX idx_learning_progress_user ON learning_progress(user_id);

-- 设置RLS策略
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- 课程策略
CREATE POLICY "所有人可以查看课程" ON courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "教师可以管理自己的课程" ON courses FOR ALL TO authenticated USING (teacher_id = auth.uid());

-- 题目策略
CREATE POLICY "所有人可以查看题目" ON problems FOR SELECT TO authenticated USING (true);

-- 对弈策略
CREATE POLICY "用户可以查看自己的对弈" ON games FOR SELECT TO authenticated 
  USING (black_player_id = auth.uid() OR white_player_id = auth.uid());
CREATE POLICY "用户可以创建对弈" ON games FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "用户可以更新自己的对弈" ON games FOR UPDATE TO authenticated 
  USING (black_player_id = auth.uid() OR white_player_id = auth.uid());

-- 好友策略
CREATE POLICY "用户可以查看自己的好友关系" ON friendships FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "用户可以添加好友" ON friendships FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "用户可以更新自己的好友关系" ON friendships FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "用户可以删除自己的好友关系" ON friendships FOR DELETE TO authenticated 
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- 成就策略
CREATE POLICY "用户可以查看自己的成就" ON achievements FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "系统可以创建成就" ON achievements FOR INSERT TO authenticated WITH CHECK (true);

-- 学习进度策略
CREATE POLICY "用户可以查看自己的学习进度" ON learning_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "用户可以更新自己的学习进度" ON learning_progress FOR ALL TO authenticated USING (user_id = auth.uid());