-- 对弈记录增强：新增更丰富的字段

-- 结束方式
ALTER TABLE games ADD COLUMN IF NOT EXISTS end_type text DEFAULT NULL;
COMMENT ON COLUMN games.end_type IS '结束方式: score/resign/timeout/abandon';

-- 终局数子得分详情 (jsonb)
ALTER TABLE games ADD COLUMN IF NOT EXISTS score_detail jsonb DEFAULT NULL;
COMMENT ON COLUMN games.score_detail IS '终局数子得分详情';

-- 提子数
ALTER TABLE games ADD COLUMN IF NOT EXISTS black_captures integer DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS white_captures integer DEFAULT 0;

-- 总手数
ALTER TABLE games ADD COLUMN IF NOT EXISTS move_count integer DEFAULT 0;

-- 对弈时长(秒)
ALTER TABLE games ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT NULL;
COMMENT ON COLUMN games.duration_seconds IS '对弈时长(秒)';

-- 将旧 moves 格式 (number[][]) 的数据迁移标记（不自动转换，新数据用新格式）
-- 新格式: [{row, col, color, isPass?}]

-- ============ 每日活跃统计表 ============
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

-- RLS
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户可以查看自己的每日统计" ON daily_stats FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "用户可以更新自己的每日统计" ON daily_stats FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============ 围棋文化浏览记录表 ============
CREATE TABLE IF NOT EXISTS culture_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  story_id text NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_culture_views_user ON culture_views(user_id);

ALTER TABLE culture_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户可以查看自己的浏览记录" ON culture_views FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "用户可以记录自己的浏览" ON culture_views FOR ALL TO authenticated USING (user_id = auth.uid());
