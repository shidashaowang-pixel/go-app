-- 好友对战邀请表
CREATE TABLE IF NOT EXISTS friend_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id),
  invited_id UUID NOT NULL REFERENCES auth.users(id),
  board_size INTEGER NOT NULL DEFAULT 9,
  time_control TEXT,
  handicap_mode TEXT DEFAULT 'even',
  handicap_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_pending_invitation UNIQUE (inviter_id, invited_id, status)
);

-- RLS 策略
ALTER TABLE friend_invitations ENABLE ROW LEVEL SECURITY;

-- 发起邀请者可以查看
DROP POLICY IF EXISTS "inviter_can_view" ON friend_invitations;
CREATE POLICY "inviter_can_view" ON friend_invitations
  FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR invited_id = auth.uid());

-- 认证用户可以插入邀请
DROP POLICY IF EXISTS "authenticated_can_invite" ON friend_invitations;
CREATE POLICY "authenticated_can_invite" ON friend_invitations
  FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid());

-- 被邀请者可以更新（接受/拒绝）
DROP POLICY IF EXISTS "invited_can_update" ON friend_invitations;
CREATE POLICY "invited_can_update" ON friend_invitations
  FOR UPDATE TO authenticated
  USING (invited_id = auth.uid());

-- 发起者可以删除（取消邀请）
DROP POLICY IF EXISTS "inviter_can_delete" ON friend_invitations;
CREATE POLICY "inviter_can_delete" ON friend_invitations
  FOR DELETE TO authenticated
  USING (inviter_id = auth.uid());

-- 自动清理过期邀请（1小时后）
DELETE FROM friend_invitations 
WHERE status = 'pending' 
  AND created_at < now() - interval '1 hour';

-- 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE friend_invitations;
