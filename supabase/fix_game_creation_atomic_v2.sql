-- 改进版 v3：使用 advisory lock 防止并发创建游戏
-- 修复 UUID 比较问题，改为文本比较
-- 双方都可以调用此函数，数据库保证只有一个游戏被创建

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
  v_lock_key BIGINT;
  v_min_id TEXT;
  v_max_id TEXT;
BEGIN
  -- 使用两个 user id 的文本形式来计算锁 key
  -- 确保无论谁先调用，都获得同一个锁
  v_min_id := LEAST(p_user_id::text, p_opponent_id::text);
  v_max_id := GREATEST(p_user_id::text, p_opponent_id::text);
  SELECT hashtext(v_min_id || v_max_id) INTO v_lock_key;

  -- 获取 advisory lock（事务级别，事务结束自动释放）
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- 1. 先检查自己是否已经有 game_id
  SELECT m.game_id INTO v_existing_game_id
  FROM matchmaking m
  WHERE m.user_id = p_user_id AND m.game_id IS NOT NULL
  LIMIT 1;
  
  IF v_existing_game_id IS NOT NULL THEN
    -- 已经有游戏了，验证游戏存在后直接返回
    RETURN QUERY 
    SELECT v_existing_game_id, 
           CASE WHEN g.black_player_id = p_user_id THEN 'black'::TEXT ELSE 'white'::TEXT END
    FROM games g WHERE g.id = v_existing_game_id;
    RETURN;
  END IF;
  
  -- 2. 检查对手是否已经创建了游戏
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
           CASE WHEN g.black_player_id = p_user_id THEN 'black'::TEXT ELSE 'white'::TEXT END
    FROM games g WHERE g.id = v_existing_game_id;
    RETURN;
  END IF;

  -- 3. 双方都没有游戏，创建新游戏
  -- 使用文本比较来确定颜色（避免 UUID 类型的比较问题）
  v_user_is_black := p_user_id::text < p_opponent_id::text;
  
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
  
  -- 验证游戏确实创建成功且玩家 ID 正确
  IF v_game_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create game';
  END IF;
  
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

COMMENT ON FUNCTION create_game_atomic IS '原子性地创建游戏，使用 advisory lock 防止并发重复创建。双方都可以调用，数据库保证只创建一个游戏。';
