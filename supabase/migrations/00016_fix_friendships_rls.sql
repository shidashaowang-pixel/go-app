-- 修复 friendships 表的 RLS 策略

-- 添加 friendships 的 UPDATE 策略（接受好友请求需要更新 status）
DROP POLICY IF EXISTS "用户可以更新自己的好友关系" ON friendships;
CREATE POLICY "用户可以更新自己的好友关系" ON friendships FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- 修改 DELETE 策略，允许双向删除好友关系
DROP POLICY IF EXISTS "用户可以删除自己的好友关系" ON friendships;
CREATE POLICY "用户可以删除自己的好友关系" ON friendships FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());
