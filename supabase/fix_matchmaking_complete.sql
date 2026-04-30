-- ============================================
-- 完整修复对弈匹配问题的 SQL
-- ============================================

-- 1. 添加 room_creator_id 字段
ALTER TABLE matchmaking ADD COLUMN IF NOT EXISTS room_creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. 修复触发器函数
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
      -- matched_player.created_at 更早，所以 matched_player.user_id 是创建者
      NEW.room_creator_id := matched_player.user_id;
      
      -- 更新匹配玩家的状态
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

-- 3. 删除旧触发器并创建新触发器
DROP TRIGGER IF EXISTS after_matchmaking_insert ON matchmaking;
CREATE TRIGGER after_matchmaking_insert
BEFORE INSERT ON matchmaking
FOR EACH ROW
EXECUTE FUNCTION find_match();

-- 4. 添加索引
CREATE INDEX IF NOT EXISTS idx_matchmaking_room_creator ON matchmaking(room_creator_id) WHERE room_creator_id IS NOT NULL;

-- 5. 修复已有的 matched 记录（给没有 room_creator_id 的记录补充）
-- 对于已经 matched 的记录，需要根据 created_at 确定创建者
UPDATE matchmaking m1
SET room_creator_id = (
  SELECT m2.user_id 
  FROM matchmaking m2 
  WHERE m2.matched_with = m1.user_id 
    AND m2.status = 'matched'
  ORDER BY m2.created_at ASC
  LIMIT 1
)
WHERE m1.status = 'matched' 
  AND m1.room_creator_id IS NULL;

-- 6. 清理无效记录（可选）
-- 删除超过 30 分钟的 searching 记录
DELETE FROM matchmaking 
WHERE status = 'searching' 
  AND created_at < now() - interval '30 minutes';

-- 验证结果
SELECT 
  status,
  COUNT(*) as count,
  COUNT(room_creator_id) as with_creator,
  COUNT(matched_with) as matched_count
FROM matchmaking 
GROUP BY status;
