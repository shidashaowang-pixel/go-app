-- ================================================
-- 修复匹配系统数据库问题
-- 执行此脚本清理冲突数据并修复表结构
-- ================================================

-- 1. 首先查看当前 matchmaking 表的状态
-- SELECT * FROM matchmaking LIMIT 10;

-- 2. 清理所有旧的匹配记录（解决残留数据冲突）
DELETE FROM matchmaking WHERE status IN ('searching', 'matched');
DELETE FROM matchmaking WHERE status = 'playing' AND (game_id IS NULL OR game_id NOT IN (SELECT id FROM games));

-- 3. 更新 playing 状态的记录（如果有孤立记录）
UPDATE matchmaking SET status = 'matched' WHERE status = 'playing' AND game_id IS NULL;

-- 4. 清理超过30分钟的过期记录
DELETE FROM matchmaking WHERE status = 'searching' AND created_at < now() - interval '30 minutes';
DELETE FROM matchmaking WHERE status = 'matched' AND created_at < now() - interval '30 minutes';

-- 5. 修复 CHECK 约束，允许 'playing' 状态
ALTER TABLE matchmaking DROP CONSTRAINT IF EXISTS matchmaking_status_check;
ALTER TABLE matchmaking ADD CONSTRAINT matchmaking_status_check 
  CHECK (status IN ('searching', 'matched', 'cancelled', 'playing'));

-- 6. 确保 room_creator_id 字段存在
ALTER TABLE matchmaking ADD COLUMN IF NOT EXISTS room_creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 7. 确保 game_id 字段存在
ALTER TABLE matchmaking ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES games(id) ON DELETE SET NULL;

-- 8. 重建触发器函数（使用最新版本）
CREATE OR REPLACE FUNCTION find_match()
RETURNS trigger AS $$
DECLARE
  matched_player RECORD;
BEGIN
  -- 如果是 searching 状态，尝试找匹配
  IF NEW.status = 'searching' THEN
    -- 查找匹配的另一个玩家（不同用户，相同棋盘大小）
    SELECT id, user_id, created_at INTO matched_player
    FROM matchmaking
    WHERE status = 'searching'
      AND matched_with IS NULL
      AND user_id != NEW.user_id
      AND board_size = NEW.board_size
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- 如果找到匹配
    IF matched_player.id IS NOT NULL THEN
      -- 更新当前玩家的状态
      NEW.status := 'matched';
      NEW.matched_with := matched_player.user_id;
      
      -- 判断谁是创建者：谁先进入队列，谁就是创建者
      -- matched_player 是先进入队列的（created_at 更早），所以它是创建者
      NEW.room_creator_id := matched_player.user_id;
      
      -- 更新匹配玩家的状态和 room_creator_id
      UPDATE matchmaking 
      SET status = 'matched', 
          matched_with = NEW.user_id,
          room_creator_id = matched_player.user_id
      WHERE id = matched_player.id;
    ELSE
      -- 没有找到匹配，当前用户就是潜在的创建者
      NEW.room_creator_id := NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 删除旧触发器并重新创建
DROP TRIGGER IF EXISTS after_matchmaking_insert ON matchmaking;
CREATE TRIGGER after_matchmaking_insert
BEFORE INSERT ON matchmaking
FOR EACH ROW
WHEN (NEW.status = 'searching')
EXECUTE FUNCTION find_match();

-- 10. 添加索引
CREATE INDEX IF NOT EXISTS idx_matchmaking_room_creator ON matchmaking(room_creator_id) WHERE room_creator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matchmaking_game_id ON matchmaking(game_id) WHERE game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matchmaking_matched_with ON matchmaking(matched_with) WHERE matched_with IS NOT NULL;

-- 11. 查看清理后的状态
-- SELECT status, COUNT(*) FROM matchmaking GROUP BY status;
-- SELECT * FROM matchmaking ORDER BY created_at DESC LIMIT 10;

-- ================================================
-- 执行完成！现在可以重新测试匹配功能
-- ================================================
