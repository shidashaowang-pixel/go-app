-- ============================================
-- 修复 matchmaking 触发器被 RLS 阻止的问题
-- ============================================

-- 方案：创建一个 SECURITY DEFINER 函数，让触发器可以绕过 RLS
-- 这样触发器内的 UPDATE 可以更新任何用户的记录

-- 1. 删除旧的触发器
DROP TRIGGER IF EXISTS after_matchmaking_insert ON matchmaking;
DROP FUNCTION IF EXISTS find_match();

-- 2. 创建 SECURITY DEFINER 函数（以表owner权限运行，绕过RLS）
CREATE OR REPLACE FUNCTION find_match()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_player RECORD;
BEGIN
  -- 如果是 searching 状态，尝试找匹配
  IF NEW.status = 'searching' THEN
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
      
      -- 判断谁是创建者：谁先进入队列，谁就是创建者
      NEW.room_creator_id := matched_player.user_id;
      
      -- 更新匹配玩家的状态（这个UPDATE需要绕过RLS）
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
$$;

-- 3. 创建触发器
CREATE TRIGGER after_matchmaking_insert
BEFORE INSERT ON matchmaking
FOR EACH ROW
EXECUTE FUNCTION find_match();

-- 4. 确保 RLS 策略允许用户操作自己的记录
DROP POLICY IF EXISTS "用户可以管理自己的匹配" ON matchmaking;
CREATE POLICY "用户可以管理自己的匹配" ON matchmaking
  FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid());

-- 5. 添加一个允许通过 matched_with 访问的策略（查看匹配自己的用户）
DROP POLICY IF EXISTS "可以通过matched_with查看" ON matchmaking;
CREATE POLICY "可以通过matched_with查看" ON matchmaking
  FOR SELECT 
  TO authenticated 
  USING (matched_with = auth.uid());

-- 验证触发器是否正确创建
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND event_object_table = 'matchmaking';
