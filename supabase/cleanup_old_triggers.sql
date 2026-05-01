-- ================================================
-- 清理 Supabase 中的旧触发器和函数
-- 解决多个 migration 版本冲突问题
-- ================================================

-- 1. 删除旧的 find_match 函数和触发器
DROP TRIGGER IF EXISTS after_matchmaking_insert ON matchmaking;
DROP FUNCTION IF EXISTS find_match();

-- 2. 删除其他可能残留的函数
DROP FUNCTION IF EXISTS cleanup_expired_matchmaking();

-- 3. 创建最新的 find_match 函数（版本3 - 修复版）
CREATE OR REPLACE FUNCTION find_match()
RETURNS trigger AS $$
DECLARE
  matched_player RECORD;
BEGIN
  IF NEW.status = 'searching' THEN
    -- 查找最早进入队列的玩家（ORDER BY created_at ASC）
    SELECT id, user_id, created_at INTO matched_player
    FROM matchmaking
    WHERE status = 'searching'
      AND matched_with IS NULL
      AND user_id != NEW.user_id
      AND board_size = NEW.board_size
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF matched_player.id IS NOT NULL THEN
      -- 找到匹配！更新当前玩家
      NEW.status := 'matched';
      NEW.matched_with := matched_player.user_id;
      NEW.room_creator_id := matched_player.user_id;
      
      -- 更新匹配玩家的状态（matched_player 是先进入队列的，所以它是创建者）
      UPDATE matchmaking 
      SET status = 'matched', 
          matched_with = NEW.user_id,
          room_creator_id = matched_player.user_id
      WHERE id = matched_player.id;
      
      RAISE NOTICE 'Match found: % matched with %', NEW.user_id, matched_player.user_id;
    ELSE
      -- 没有找到匹配，当前用户就是潜在的创建者
      NEW.room_creator_id := NEW.user_id;
      RAISE NOTICE 'No match found for %, waiting...', NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建触发器
CREATE TRIGGER after_matchmaking_insert
BEFORE INSERT ON matchmaking
FOR EACH ROW
WHEN (NEW.status = 'searching')
EXECUTE FUNCTION find_match();

-- 5. 验证：确认只有一个触发器
-- SELECT trigname, tablename FROM pg_trigger 
-- JOIN pg_tables ON pg_trigger.tgrelid = pg_tables.tablename
-- WHERE tablename = 'matchmaking';

-- 6. 清理残留的 matchmaking 数据
DELETE FROM matchmaking WHERE status IN ('searching', 'matched', 'playing');
DELETE FROM matchmaking WHERE created_at < now() - interval '10 minutes';

-- ================================================
-- 完成！现在只有最新的 find_match 函数和触发器
-- ================================================
