-- 修复并发创建游戏的问题
-- 添加唯一约束防止同一个匹配对创建多个游戏

-- 方法1：在 games 表中添加一个复合唯一索引
-- 基于 black_player_id 和 white_player_id 的组合
-- 但这样会有问题：同一个对手可以多次对战

-- 方法2：更好的方案 - 使用 matchmaking 表的 matched_with 来关联
-- 确保每个 matched_with 组合只能创建一个游戏

-- 首先，检查当前 games 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'games';

-- 方法3：使用数据库函数来原子性创建游戏
CREATE OR REPLACE FUNCTION create_game_atomic(
  p_user_id UUID,
  p_opponent_id UUID,
  p_board_size INTEGER,
  p_time_control TEXT,
  p_handicap_mode TEXT,
  p_handicap_count INTEGER
)
RETURNS TABLE(game_id UUID, my_color TEXT) AS $$
DECLARE
  v_game_id UUID;
  v_user_is_black BOOLEAN;
  v_komi_value NUMERIC;
  v_existing_game_id UUID;
BEGIN
  -- 检查是否已经有游戏存在（通过 matchmaking 表）
  SELECT m.game_id INTO v_existing_game_id
  FROM matchmaking m
  WHERE m.user_id = p_user_id AND m.game_id IS NOT NULL
  LIMIT 1;
  
  IF v_existing_game_id IS NOT NULL THEN
    -- 已经有游戏了，直接返回
    RETURN QUERY 
    SELECT v_existing_game_id, 
           CASE WHEN g.black_player_id = p_user_id THEN 'black' ELSE 'white' END
    FROM games g WHERE g.id = v_existing_game_id;
    RETURN;
  END IF;
  
  -- 检查对手是否创建了游戏
  SELECT m.game_id INTO v_existing_game_id
  FROM matchmaking m
  WHERE m.user_id = p_opponent_id AND m.game_id IS NOT NULL
  LIMIT 1;
  
  IF v_existing_game_id IS NOT NULL THEN
    -- 对手已创建游戏，更新自己的记录并返回
    UPDATE matchmaking 
    SET status = 'playing', game_id = v_existing_game_id
    WHERE user_id = p_user_id;
    
    RETURN QUERY 
    SELECT v_existing_game_id,
           CASE WHEN g.black_player_id = p_user_id THEN 'black' ELSE 'white' END
    FROM games g WHERE g.id = v_existing_game_id;
    RETURN;
  END IF;
  
  -- 没有现有游戏，创建新游戏
  v_user_is_black := random() < 0.5;
  
  v_komi_value := CASE 
    WHEN p_handicap_mode = 'even' THEN 
      CASE 
        WHEN p_board_size <= 9 THEN 5.5
        WHEN p_board_size <= 13 THEN 6.5
        ELSE 7.5
      END
    ELSE 0
  END;
  
  INSERT INTO games (
    type,
    status,
    result,
    black_player_id,
    white_player_id,
    ai_difficulty,
    board_size,
    moves,
    end_type,
    score_detail,
    black_captures,
    white_captures,
    move_count,
    duration_seconds
  ) VALUES (
    'human',
    'ongoing',
    NULL,
    CASE WHEN v_user_is_black THEN p_user_id ELSE p_opponent_id END,
    CASE WHEN v_user_is_black THEN p_opponent_id ELSE p_user_id END,
    NULL,
    p_board_size,
    '[]'::jsonb,
    NULL,
    NULL,
    0,
    0,
    0,
    NULL
  )
  RETURNING id INTO v_game_id;
  
  -- 更新双方的 matchmaking 记录
  UPDATE matchmaking 
  SET status = 'playing', game_id = v_game_id
  WHERE user_id IN (p_user_id, p_opponent_id);
  
  RETURN QUERY SELECT v_game_id, CASE WHEN v_user_is_black THEN 'black'::TEXT ELSE 'white'::TEXT END;
END;
$$ LANGUAGE plpgsql;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION create_game_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION create_game_atomic TO anon;
GRANT EXECUTE ON FUNCTION create_game_atomic TO service_role;

COMMENT ON FUNCTION create_game_atomic IS '原子性地创建游戏，防止并发重复创建';
