-- 匹配系统和实时落子同步表

-- ============ 匹配队列表 ============
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

-- RLS
ALTER TABLE matchmaking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户可以管理自己的匹配" ON matchmaking FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============ 游戏落子记录表（实时同步用） ============
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

-- RLS
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "对弈双方可以查看落子" ON game_moves FOR SELECT TO authenticated 
  USING (game_id IN (SELECT id FROM games WHERE black_player_id = auth.uid() OR white_player_id = auth.uid()));
CREATE POLICY "对弈双方可以添加落子" ON game_moves FOR INSERT TO authenticated WITH CHECK (
  game_id IN (SELECT id FROM games WHERE black_player_id = auth.uid() OR white_player_id = auth.uid())
);

-- ============ 好友对战邀请表 ============
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

-- RLS
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "相关用户可以查看邀请" ON game_invitations FOR SELECT TO authenticated 
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
CREATE POLICY "邀请人可取消" ON game_invitations FOR UPDATE TO authenticated 
  USING (inviter_id = auth.uid());
CREATE POLICY "被邀请人可接受/拒绝" ON game_invitations FOR UPDATE TO authenticated 
  USING (invitee_id = auth.uid());

-- ============ 启用 Realtime（需要 Supabase Dashboard 中启用） ============
-- 在 Supabase Dashboard -> Database -> Replication 中启用：
-- - tables: matchmaking, game_moves, game_invitations

-- ============ 自动清理过期匹配（可选，使用 cron） ============
-- 清理超过10分钟的未匹配记录
-- DELETE FROM matchmaking WHERE status = 'searching' AND created_at < now() - interval '10 minutes';

-- 清理过期邀请
-- DELETE FROM game_invitations WHERE status = 'pending' AND expires_at < now();
