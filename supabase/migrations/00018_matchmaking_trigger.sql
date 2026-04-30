-- 创建匹配触发器函数
CREATE OR REPLACE FUNCTION find_match()
RETURNS trigger AS $$
DECLARE
  matched_player RECORD;
BEGIN
  -- 查找匹配的另一个玩家（不同用户，相同棋盘大小）
  SELECT id, user_id INTO matched_player
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
    
    -- 更新匹配玩家的状态
    UPDATE matchmaking 
    SET status = 'matched', matched_with = NEW.user_id
    WHERE id = matched_player.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：当插入 searching 记录时自动匹配
DROP TRIGGER IF EXISTS after_matchmaking_insert ON matchmaking;
CREATE TRIGGER after_matchmaking_insert
BEFORE INSERT ON matchmaking
FOR EACH ROW
WHEN (NEW.status = 'searching')
EXECUTE FUNCTION find_match();
