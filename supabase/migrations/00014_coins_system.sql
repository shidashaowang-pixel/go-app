-- =============================================
-- 虚拟金币系统
-- =============================================

-- 第1部分：用户金币余额表
CREATE TABLE IF NOT EXISTS user_coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance bigint DEFAULT 0 CHECK (balance >= 0),
  total_earned bigint DEFAULT 0,
  total_spent bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 第2部分：金币交易记录表
CREATE TYPE coin_transaction_type AS ENUM (
  'daily_login',      -- 每日登录
  'game_win',         -- 对弈胜利
  'game_lose',        -- 对弈失败
  'game_stake_win',   -- 下注获胜
  'game_stake_lose',  -- 下注失败
  'task_reward',      -- 任务奖励
  'achievement',      -- 成就奖励
  'purchase',         -- 购买物品
  'membership',       -- 会员购买
  'transfer_in',      -- 转账收入
  'transfer_out',     -- 转账支出
  'club_join_bonus',  -- 加入棋社奖励
  'purchase_coins'    -- 充值金币（预留）
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type coin_transaction_type NOT NULL,
  amount bigint NOT NULL,
  balance_after bigint NOT NULL,
  description text,
  reference_id uuid,  -- 关联ID（如 game_id, item_id 等)
  created_at timestamptz DEFAULT now()
);

-- 第3部分：每日签到表
CREATE TABLE IF NOT EXISTS daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  coins_earned bigint DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

-- 第4部分：连续签到记录（用于计算奖励倍率）
CREATE TABLE IF NOT EXISTS checkin_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  last_checkin_date date,
  updated_at timestamptz DEFAULT now()
);

-- 第5部分：任务系统配置
CREATE TYPE task_type AS ENUM (
  'daily_login',      -- 每日登录
  'win_games',        -- 赢得对弈
  'complete_checkpoints',  -- 完成闯关
  'invite_friends',   -- 邀请好友
  'daily_games',      -- 完成每日对弈次数
  'perfect_game'      -- 完美对弈（净胜对手40目以上）
);

CREATE TABLE IF NOT EXISTS task_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type task_type NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  target_count int DEFAULT 1,
  coins_reward bigint DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 第6部分：用户任务进度
CREATE TABLE IF NOT EXISTS user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_type task_type NOT NULL,
  current_progress int DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id, task_type)
);

-- 第7部分：商城物品表
CREATE TYPE item_category AS ENUM (
  'avatar_frame',     -- 头像框
  'board_theme',      -- 棋盘主题
  'piece_style',      -- 棋子样式
  'profile_badge',    -- 主页徽章
  'membership'        -- 会员
);

CREATE TABLE IF NOT EXISTS shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category item_category NOT NULL,
  name text NOT NULL,
  description text,
  icon_url text,
  price bigint DEFAULT 0,
  is_active boolean DEFAULT true,
  is_premium boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 第8部分：用户背包（已购买的物品）
CREATE TABLE IF NOT EXISTS user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  purchased_at timestamptz DEFAULT now(),
  is_equipped boolean DEFAULT false,
  UNIQUE(user_id, item_id)
);

-- 第9部分：用户装备（当前使用的物品）
CREATE TABLE IF NOT EXISTS user_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  avatar_frame_id uuid REFERENCES shop_items(id),
  board_theme_id uuid REFERENCES shop_items(id),
  piece_style_id uuid REFERENCES shop_items(id),
  profile_badge_id uuid REFERENCES shop_items(id),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_coins_user ON user_coins(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created ON coin_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_streaks_user ON checkin_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_equipment_user ON user_equipment(user_id);

-- RLS 策略
ALTER TABLE user_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;

-- user_coins 策略
DROP POLICY IF EXISTS "用户可以查看自己的金币" ON user_coins;
CREATE POLICY "用户可以查看自己的金币" ON user_coins FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "系统可以更新用户金币" ON user_coins;
CREATE POLICY "系统可以更新用户金币" ON user_coins FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "系统可以创建金币记录" ON user_coins;
CREATE POLICY "系统可以创建金币记录" ON user_coins FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- coin_transactions 策略
DROP POLICY IF EXISTS "用户可以查看自己的交易记录" ON coin_transactions;
CREATE POLICY "用户可以查看自己的交易记录" ON coin_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "系统可以创建交易记录" ON coin_transactions;
CREATE POLICY "系统可以创建交易记录" ON coin_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- daily_checkins 策略
DROP POLICY IF EXISTS "用户可以查看自己的签到记录" ON daily_checkins;
CREATE POLICY "用户可以查看自己的签到记录" ON daily_checkins FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "用户可以创建签到记录" ON daily_checkins;
CREATE POLICY "用户可以创建签到记录" ON daily_checkins FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- checkin_streaks 策略
DROP POLICY IF EXISTS "用户可以查看自己的签到连续记录" ON checkin_streaks;
CREATE POLICY "用户可以查看自己的签到连续记录" ON checkin_streaks FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "用户可以更新自己的签到连续记录" ON checkin_streaks;
CREATE POLICY "用户可以更新自己的签到连续记录" ON checkin_streaks FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "用户可以创建签到连续记录" ON checkin_streaks;
CREATE POLICY "用户可以创建签到连续记录" ON checkin_streaks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- task_definitions 策略
DROP POLICY IF EXISTS "所有人可以查看任务定义" ON task_definitions;
CREATE POLICY "所有人可以查看任务定义" ON task_definitions FOR SELECT TO authenticated USING (is_active = true);

-- user_tasks 策略
DROP POLICY IF EXISTS "用户可以管理自己的任务" ON user_tasks;
CREATE POLICY "用户可以管理自己的任务" ON user_tasks FOR ALL TO authenticated USING (user_id = auth.uid());

-- shop_items 策略
DROP POLICY IF EXISTS "所有人可以查看商城物品" ON shop_items;
CREATE POLICY "所有人可以查看商城物品" ON shop_items FOR SELECT TO authenticated USING (is_active = true);

-- user_inventory 策略
DROP POLICY IF EXISTS "用户可以管理自己的背包" ON user_inventory;
CREATE POLICY "用户可以管理自己的背包" ON user_inventory FOR ALL TO authenticated USING (user_id = auth.uid());

-- user_equipment 策略
DROP POLICY IF EXISTS "用户可以管理自己的装备" ON user_equipment;
CREATE POLICY "用户可以管理自己的装备" ON user_equipment FOR ALL TO authenticated USING (user_id = auth.uid());

-- 第10部分：创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_coins_updated_at
  BEFORE UPDATE ON user_coins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkin_streaks_updated_at
  BEFORE UPDATE ON checkin_streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tasks_updated_at
  BEFORE UPDATE ON user_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_equipment_updated_at
  BEFORE UPDATE ON user_equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初始化任务定义
INSERT INTO task_definitions (type, title, description, target_count, coins_reward) VALUES
  ('daily_login', '每日登录', '每天登录游戏', 1, 5),
  ('win_games', '对弈胜利', '赢得一局对弈', 1, 20),
  ('complete_checkpoints', '闯关成功', '完成一个闯关题目', 1, 10),
  ('invite_friends', '邀请好友', '成功邀请一位好友', 1, 50),
  ('daily_games', '每日对弈', '每天完成3局对弈', 3, 15),
  ('perfect_game', '完美胜利', '净胜对手40目以上', 1, 100)
ON CONFLICT (type) DO NOTHING;

-- 初始化商城物品
INSERT INTO shop_items (category, name, description, price) VALUES
  ('avatar_frame', '金色头像框', '闪亮的金色头像框', 100),
  ('avatar_frame', '水晶头像框', '透明水晶头像框', 200),
  ('avatar_frame', '冠军头像框', '冠军专属头像框', 500),
  ('board_theme', '古典棋盘', '古典木纹棋盘主题', 150),
  ('board_theme', '翡翠棋盘', '翠绿翡翠棋盘主题', 300),
  ('piece_style', '玉石棋子', '温润玉石棋子样式', 200),
  ('piece_style', '金属棋子', '金属质感棋子样式', 400),
  ('profile_badge', '新秀徽章', '新手专属徽章', 0),
  ('profile_badge', '达人徽章', '完成100局对弈', 0),
  ('membership', '月度会员', '30天会员特权', 500),
  ('membership', '年度会员', '365天会员特权', 1500)
ON CONFLICT DO NOTHING;

SELECT '虚拟金币系统初始化完成！' AS status;

-- =============================================
-- 辅助函数：金币原子操作
-- =============================================

-- 添加金币的存储过程
CREATE OR REPLACE FUNCTION add_coins(
  p_user_id uuid,
  p_amount bigint,
  p_type text,
  p_description text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS user_coins
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance bigint;
BEGIN
  -- 更新余额
  UPDATE user_coins
  SET balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- 记录交易
  INSERT INTO coin_transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (p_user_id, p_type::coin_transaction_type, p_amount, v_new_balance, p_description, p_reference_id);

  -- 返回更新后的记录
  RETURN (SELECT * FROM user_coins WHERE user_id = p_user_id);
END;
$$;

-- 扣除金币的存储过程
CREATE OR REPLACE FUNCTION deduct_coins(
  p_user_id uuid,
  p_amount bigint,
  p_type text,
  p_description text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance bigint;
  v_new_balance bigint;
BEGIN
  -- 检查余额
  SELECT balance INTO v_balance FROM user_coins WHERE user_id = p_user_id;
  
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN false;
  END IF;

  -- 更新余额
  UPDATE user_coins
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- 记录交易
  INSERT INTO coin_transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (p_user_id, p_type::coin_transaction_type, -p_amount, v_new_balance, p_description, p_reference_id);

  RETURN true;
END;
$$;

-- 更新棋社对弈统计的存储过程
CREATE OR REPLACE FUNCTION update_club_game_stats(
  p_club_id uuid,
  p_black_id uuid,
  p_white_id uuid,
  p_result text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 记录社内对弈
  INSERT INTO club_games (club_id, black_player_id, white_player_id, result)
  VALUES (p_club_id, p_black_id, p_white_id, p_result);

  -- 更新成员的对弈统计
  UPDATE club_members SET join_games = join_games + 1 WHERE club_id = p_club_id AND user_id IN (p_black_id, p_white_id);

  -- 更新排行榜
  IF p_result = 'black_win' THEN
    -- 黑方胜
    INSERT INTO club_leaderboard (club_id, user_id, rating, wins, losses, win_rate)
    VALUES (p_club_id, p_black_id, 1500, 1, 0, 100.0)
    ON CONFLICT (club_id, user_id) DO UPDATE
    SET rating = club_leaderboard.rating + 25,
        wins = club_leaderboard.wins + 1,
        win_rate = ((club_leaderboard.wins + 1)::numeric / NULLIF(club_leaderboard.wins + club_leaderboard.losses + 1, 0)) * 100,
        updated_at = now();
    
    INSERT INTO club_leaderboard (club_id, user_id, rating, wins, losses, win_rate)
    VALUES (p_club_id, p_white_id, 1500, 0, 1, 0.0)
    ON CONFLICT (club_id, user_id) DO UPDATE
    SET rating = GREATEST(1000, club_leaderboard.rating - 25),
        losses = club_leaderboard.losses + 1,
        win_rate = (club_leaderboard.wins::numeric / NULLIF(club_leaderboard.wins + club_leaderboard.losses + 1, 0)) * 100,
        updated_at = now();
  ELSIF p_result = 'white_win' THEN
    -- 白方胜
    INSERT INTO club_leaderboard (club_id, user_id, rating, wins, losses, win_rate)
    VALUES (p_club_id, p_white_id, 1500, 1, 0, 100.0)
    ON CONFLICT (club_id, user_id) DO UPDATE
    SET rating = club_leaderboard.rating + 25,
        wins = club_leaderboard.wins + 1,
        win_rate = ((club_leaderboard.wins + 1)::numeric / NULLIF(club_leaderboard.wins + club_leaderboard.losses + 1, 0)) * 100,
        updated_at = now();
    
    INSERT INTO club_leaderboard (club_id, user_id, rating, wins, losses, win_rate)
    VALUES (p_club_id, p_black_id, 1500, 0, 1, 0.0)
    ON CONFLICT (club_id, user_id) DO UPDATE
    SET rating = GREATEST(1000, club_leaderboard.rating - 25),
        losses = club_leaderboard.losses + 1,
        win_rate = (club_leaderboard.wins::numeric / NULLIF(club_leaderboard.wins + club_leaderboard.losses + 1, 0)) * 100,
        updated_at = now();
  END IF;

  -- 更新棋社总对弈数
  UPDATE clubs SET total_games = total_games + 1 WHERE id = p_club_id;
END;
$$;
