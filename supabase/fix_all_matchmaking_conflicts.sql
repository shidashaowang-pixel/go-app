-- ================================================
-- 完整修复好友对战系统
-- 清理所有可能的冲突和残留数据
-- ================================================

-- 1. 清理 matchmaking 表中的所有旧数据（这可能是导致"改了没效果"的原因）
DELETE FROM matchmaking WHERE status = 'searching';
DELETE FROM matchmaking WHERE status = 'matched';
DELETE FROM matchmaking WHERE status = 'playing' AND game_id IS NULL;
DELETE FROM matchmaking WHERE created_at < now() - interval '1 hour';

-- 2. 清理过期邀请（两个表）
DELETE FROM game_invitations WHERE status = 'pending' AND created_at < now() - interval '30 minutes';
DELETE FROM friend_invitations WHERE status = 'pending' AND created_at < now() - interval '30 minutes';

-- 3. 修复 matchmaking 表 CHECK 约束（允许 playing 状态）
DO $$
BEGIN
  -- 移除旧约束
  ALTER TABLE matchmaking DROP CONSTRAINT IF EXISTS matchmaking_status_check;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint already dropped or does not exist';
END $$;

ALTER TABLE matchmaking ADD CONSTRAINT matchmaking_status_check 
  CHECK (status IN ('searching', 'matched', 'cancelled', 'playing'));

-- 4. 确保 matchmaking 表必要的列都存在
ALTER TABLE matchmaking ADD COLUMN IF NOT EXISTS room_creator_id uuid;
ALTER TABLE matchmaking ADD COLUMN IF NOT EXISTS game_id uuid;

-- 5. 统一邀请表：删除旧的 game_invitations，使用 friend_invitations
-- 先清理旧数据
DELETE FROM game_invitations WHERE status = 'pending';

-- 6. 重新创建 friend_invitations 表（清理后重建）
DROP TABLE IF EXISTS friend_invitations;

CREATE TABLE friend_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  board_size INTEGER NOT NULL DEFAULT 9,
  time_control TEXT DEFAULT '20min',
  handicap_mode TEXT DEFAULT 'even',
  handicap_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. RLS 策略
ALTER TABLE friend_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friend_invitations_all" ON friend_invitations;
CREATE POLICY "friend_invitations_all" ON friend_invitations
  FOR ALL TO authenticated
  USING (
    inviter_id = auth.uid() OR 
    invited_id = auth.uid()
  );

-- 8. 重建触发器（使用最新逻辑）
DROP FUNCTION IF EXISTS find_match CASCADE;
DROP TRIGGER IF EXISTS after_matchmaking_insert ON matchmaking;

CREATE OR REPLACE FUNCTION find_match()
RETURNS trigger AS $$
DECLARE
  matched_player RECORD;
BEGIN
  IF NEW.status = 'searching' THEN
    -- 查找最早进入队列的玩家
    SELECT id, user_id, created_at INTO matched_player
    FROM matchmaking
    WHERE status = 'searching'
      AND matched_with IS NULL
      AND user_id != NEW.user_id
      AND board_size = NEW.board_size
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF matched_player.id IS NOT NULL THEN
      NEW.status := 'matched';
      NEW.matched_with := matched_player.user_id;
      NEW.room_creator_id := matched_player.user_id;
      
      UPDATE matchmaking 
      SET status = 'matched', 
          matched_with = NEW.user_id,
          room_creator_id = matched_player.user_id
      WHERE id = matched_player.id;
    ELSE
      NEW.room_creator_id := NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_matchmaking_insert
BEFORE INSERT ON matchmaking
FOR EACH ROW
WHEN (NEW.status = 'searching')
EXECUTE FUNCTION find_match();

-- 9. 添加索引
CREATE INDEX IF NOT EXISTS idx_friend_invitations_invitee ON friend_invitations(invited_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_matchmaking_room_creator ON matchmaking(room_creator_id);
CREATE INDEX IF NOT EXISTS idx_matchmaking_matched ON matchmaking(matched_with) WHERE matched_with IS NOT NULL;

-- 10. 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE friend_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking;

-- ================================================
-- 修复完成！现在在 Supabase Dashboard 执行以下验证：
-- ================================================
-- 1. SELECT * FROM matchmaking LIMIT 5;
-- 2. SELECT * FROM friend_invitations LIMIT 5;
-- 3. 确认 matchmaking 表的 status 列 CHECK 约束包含 'playing'
-- ================================================
