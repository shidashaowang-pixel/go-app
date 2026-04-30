-- ============================================
-- 诊断匹配问题
-- ============================================

-- 1. 检查 matchmaking 表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'matchmaking' 
ORDER BY ordinal_position;

-- 2. 检查触发器是否存在
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'matchmaking';

-- 3. 检查当前 matchmaking 记录
SELECT 
  id,
  user_id,
  status,
  matched_with,
  room_creator_id,
  board_size,
  created_at
FROM matchmaking 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. 检查触发器函数定义
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname = 'find_match';
