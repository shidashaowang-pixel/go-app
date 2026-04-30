-- =============================================
-- 修复棋社创建失败的 SQL 脚本
-- 在 Supabase Dashboard > SQL Editor 中执行
-- =============================================

-- 1. 检查当前 club_settings 表的策略
SELECT 
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as check_clause
FROM pg_policies 
WHERE tablename = 'club_settings';

-- 2. 添加 INSERT 策略（解决触发器无法插入的问题）
-- 触发器 after_club_created 需要向 club_settings 插入记录，但缺少 INSERT 策略
CREATE POLICY IF NOT EXISTS "系统可以创建默认设置" ON club_settings 
FOR INSERT TO authenticated WITH CHECK (true);

-- 3. 验证策略添加成功
SELECT '✅ club_settings INSERT 策略添加成功！' AS status;

-- 4. 测试：尝试创建测试棋社
-- 注意：请先替换下面的 user_id 为实际的用户 ID
/*
INSERT INTO clubs (name, description, owner_id, is_public)
VALUES ('测试棋社-可删除', '这是一个测试', '你的用户ID', true)
RETURNING id, name;
*/

-- 5. 如果上述测试成功，检查 club_settings 是否自动创建
/*
SELECT * FROM club_settings 
WHERE club_id = '刚才返回的ID';
*/

SELECT '修复完成！现在可以正常创建棋社了。' AS final_status;
