-- 快速修复 matchmaking 表的 CHECK 约束
-- 添加 'playing' 状态支持

ALTER TABLE matchmaking DROP CONSTRAINT IF EXISTS matchmaking_status_check;
ALTER TABLE matchmaking ADD CONSTRAINT matchmaking_status_check 
  CHECK (status IN ('searching', 'matched', 'cancelled', 'playing'));
