-- 为 matchmaking 表添加缺失的字段
-- 这些字段用于在匹配双方之间共享游戏信息

ALTER TABLE matchmaking ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES games(id) ON DELETE SET NULL;
ALTER TABLE matchmaking ADD COLUMN IF NOT EXISTS black_player_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE matchmaking ADD COLUMN IF NOT EXISTS ready_to_play boolean DEFAULT false;
ALTER TABLE matchmaking ADD COLUMN IF NOT EXISTS confirmed boolean DEFAULT false;

-- 清理过期记录的函数
CREATE OR REPLACE FUNCTION cleanup_expired_matchmaking()
RETURNS void AS $$
BEGIN
  -- 清理超过10分钟的未匹配记录
  DELETE FROM matchmaking WHERE status = 'searching' AND created_at < now() - interval '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_matchmaking_game_id ON matchmaking(game_id) WHERE game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matchmaking_matched_with ON matchmaking(matched_with) WHERE matched_with IS NOT NULL;
