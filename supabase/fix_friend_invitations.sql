-- 修复 friend_invitations 表结构
-- 确保与前端代码兼容

-- 1. 添加缺失的字段
ALTER TABLE friend_invitations ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE friend_invitations ADD COLUMN IF NOT EXISTS time_control TEXT DEFAULT '20min';

-- 2. 清理过期邀请
DELETE FROM friend_invitations WHERE status = 'pending' AND created_at < now() - interval '30 minutes';

-- 3. 验证表结构
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'friend_invitations';
