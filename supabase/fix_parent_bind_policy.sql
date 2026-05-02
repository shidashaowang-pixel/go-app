-- 修复家长绑定孩子的 RLS 策略
-- 允许家长更新孩子的 parent_id 字段

-- 添加允许家长绑定孩子的策略
DROP POLICY IF EXISTS "家长可以绑定孩子" ON profiles;
CREATE POLICY "家长可以绑定孩子" ON profiles
  FOR UPDATE TO authenticated 
  USING (
    -- 允许更新孩子的 parent_id（当 parent_id 为空时）
    (role = 'child' AND parent_id IS NULL)
    OR 
    -- 或者更新自己的 profile
    auth.uid() = id
  )
  WITH CHECK (
    -- 确保只能设置 parent_id 为当前用户 ID
    (role = 'child' AND parent_id = auth.uid())
    OR
    -- 或者保持自己的 profile
    auth.uid() = id
  );

-- 或者更简单的方案：允许更新 role='child' 且 parent_id 为空或等于当前用户的记录
DROP POLICY IF EXISTS "家长可以绑定孩子" ON profiles;
CREATE POLICY "家长可以绑定孩子" ON profiles
  FOR UPDATE TO authenticated 
  USING (role = 'child' AND (parent_id IS NULL OR parent_id = auth.uid()))
  WITH CHECK (role = 'child' AND (parent_id IS NULL OR parent_id = auth.uid()));