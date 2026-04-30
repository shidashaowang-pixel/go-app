-- ============================================
-- 检查和启用 Realtime
-- ============================================

-- 1. 查看当前的 publication
SELECT * FROM pg_publication;

-- 2. 查看 matchmaking 表是否在 publication 中
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE tablename = 'matchmaking';

-- 3. 如果 matchmaking 不在 publication 中，添加它
-- 先创建 publication（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE matchmaking;
  ELSE
    -- 添加 matchmaking 表到现有 publication
    ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking;
  END IF;
END $$;

-- 4. 验证
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE tablename = 'matchmaking';
