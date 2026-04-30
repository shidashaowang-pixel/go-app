-- =============================================
-- 修复棋社系统 RLS 策略问题
-- =============================================

-- club_settings 表缺少 INSERT 策略，导致创建棋社时触发器无法插入默认设置
-- 需要添加允许插入的策略

-- 首先检查策略是否存在
DO $$
BEGIN
  -- 添加 INSERT 策略，允许任何人插入 club_settings（触发器需要）
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'club_settings' 
    AND policyname = '系统可以创建默认设置'
  ) THEN
    CREATE POLICY "系统可以创建默认设置" ON club_settings 
    FOR INSERT TO authenticated WITH CHECK (true);
    RAISE NOTICE '已添加 club_settings INSERT 策略';
  ELSE
    RAISE NOTICE 'club_settings INSERT 策略已存在';
  END IF;
END $$;

-- 验证策略
SELECT schemaname, tablename, policyname, cmd FROM pg_policies 
WHERE tablename = 'club_settings';

SELECT '修复完成！club_settings 表现在可以正常接收触发器插入的记录。' AS status;
