-- ============================================
-- 完整修复匹配对弈系统
-- ============================================

-- 1. 首先删除旧的触发器和函数
DROP TRIGGER IF EXISTS after_matchmaking_insert ON matchmaking;
DROP FUNCTION IF EXISTS find_match();

-- 2. 重新创建触发器函数（修复 room_creator_id 逻辑）
-- 规则：先进入队列的用户（created_at 更早）是创建者
CREATE OR REPLACE FUNCTION find_match()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_player RECORD;
  my_time timestamp;
  opp_time timestamp;
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
      -- 【修复】判断谁是创建者：谁先进入队列，谁就是创建者
      -- matched_player.created_at 更早，所以 matched_player 是创建者
      
      -- 更新当前玩家（新进入的）的状态
      NEW.status := 'matched';
      NEW.matched_with := matched_player.user_id;
      NEW.room_creator_id := matched_player.user_id;  -- 【关键】创建者是先进入的
      
      -- 更新匹配玩家（先进入的）的状态
      UPDATE matchmaking 
      SET status = 'matched', 
          matched_with = NEW.user_id,
          room_creator_id = matched_player.user_id  -- 【关键】创建者是先进入的
      WHERE id = matched_player.id;
      
      RAISE NOTICE '匹配成功: % <-> %，创建者: %', NEW.user_id, matched_player.user_id, matched_player.user_id;
    ELSE
      -- 没有找到匹配，当前用户就是潜在的创建者
      NEW.room_creator_id := NEW.user_id;
      RAISE NOTICE '进入等待队列: %', NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. 创建触发器
CREATE TRIGGER after_matchmaking_insert
BEFORE INSERT ON matchmaking
FOR EACH ROW
EXECUTE FUNCTION find_match();

-- 4. 确保 RLS 策略正确
ALTER TABLE matchmaking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以管理自己的匹配" ON matchmaking;
CREATE POLICY "用户可以管理自己的匹配" ON matchmaking
  FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "可以通过matched_with查看" ON matchmaking;
CREATE POLICY "可以通过matched_with查看" ON matchmaking
  FOR SELECT 
  TO authenticated 
  USING (matched_with = auth.uid());

-- 5. 修复已有的错误数据（将 room_creator_id 设为 NULL 的记录修正）
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

-- 6. 清理旧的无用记录
DELETE FROM matchmaking 
WHERE status = 'matched' 
  AND game_id IS NULL 
  AND created_at < now() - interval '1 hour';

-- 7. 验证结果
SELECT 
  id,
  user_id,
  status,
  matched_with,
  room_creator_id,
  game_id,
  created_at
FROM matchmaking 
ORDER BY created_at DESC 
LIMIT 10;

-- 8. 确认触发器存在
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND event_object_table = 'matchmaking';

-- 9. 确认 RLS 已启用
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'matchmaking';

-- 10. 确认 Realtime publication
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE tablename = 'matchmaking';
