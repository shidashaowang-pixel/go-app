-- 为 matchmaking 表添加 room_creator_id 字段
-- 用于明确指定谁负责创建游戏房间，避免双方都创建游戏的问题

ALTER TABLE matchmaking ADD COLUMN IF NOT EXISTS room_creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 更新触发器，在匹配时明确设置 room_creator_id
-- 规则：先进入队列的用户（created_at 更早）就是创建者
CREATE OR REPLACE FUNCTION find_match()
RETURNS trigger AS $$
DECLARE
  matched_player RECORD;
  my_time timestamp;
  matched_time timestamp;
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
      -- （等有对手加入时，触发器会更新 room_creator_id）
      NEW.room_creator_id := NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 重新创建触发器
DROP TRIGGER IF EXISTS after_matchmaking_insert ON matchmaking;
CREATE TRIGGER after_matchmaking_insert
BEFORE INSERT ON matchmaking
FOR EACH ROW
EXECUTE FUNCTION find_match();

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_matchmaking_room_creator ON matchmaking(room_creator_id) WHERE room_creator_id IS NOT NULL;
