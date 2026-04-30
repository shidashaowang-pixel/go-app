/**
 * 简化的匹配系统
 * 流程: searching → matched → playing (自动)
 * 规则: room_creator_id = 先进入队列的用户
 */

import { supabase } from '@/db/supabase';

// 创建游戏（简化版）
export async function createGameAndStartMatch(
  userId: string,
  opponentId: string,
  boardSize: number,
  timeControl: string,
  handicapMode: string,
  handicapCount: number
): Promise<{ success: boolean; gameId?: string; error?: string }> {
  try {
    // 1. 检查 matchmaking 记录
    const { data: myRecord, error: fetchError } = await supabase
      .from('matchmaking')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError || !myRecord) {
      return { success: false, error: '未找到匹配记录' };
    }

    // 2. 判断是否为创建者
    const { data: opponentRecord } = await supabase
      .from('matchmaking')
      .select('created_at')
      .eq('user_id', opponentId)
      .maybeSingle();

    let isCreator = false;
    if (opponentRecord && myRecord) {
      const myTime = new Date(myRecord.created_at).getTime();
      const oppTime = new Date(opponentRecord.created_at).getTime();
      isCreator = myTime <= oppTime;
    }

    // 只有创建者才创建游戏
    if (!isCreator) {
      return { success: false, error: '您不是创建者，等待对方创建游戏' };
    }

    // 3. 分配黑白棋
    const userIsBlack = Math.random() < 0.5;
    const blackPlayerId = userIsBlack ? userId : opponentId;

    // 4. 计算贴目
    const komiValue = handicapMode === 'even'
      ? (boardSize <= 9 ? 5.5 : boardSize <= 13 ? 6.5 : 7.5)
      : 0;

    // 5. 创建游戏记录
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        type: 'human',
        status: 'ongoing',
        result: null,
        black_player_id: blackPlayerId,
        white_player_id: userIsBlack ? opponentId : userId,
        ai_difficulty: null,
        board_size: boardSize,
        moves: [],
        end_type: null,
        score_detail: null,
        black_captures: 0,
        white_captures: 0,
        move_count: 0,
        duration_seconds: null,
      })
      .select()
      .single();

    if (gameError || !game) {
      console.error('[简化匹配] 创建游戏失败:', gameError);
      return { success: false, error: `创建游戏失败: ${gameError?.message}` };
    }

    console.log('[简化匹配] 游戏创建成功:', game.id);

    // 6. 更新 matchmaking 记录（双方）
    const { error: updateMyError } = await supabase
      .from('matchmaking')
      .update({
        status: 'playing',
        game_id: game.id,
      })
      .eq('user_id', userId);

    const { error: updateOppError } = await supabase
      .from('matchmaking')
      .update({
        status: 'playing',
        game_id: game.id,
      })
      .eq('user_id', opponentId);

    if (updateMyError || updateOppError) {
      console.error('[简化匹配] 更新 matchmaking 失败');
    }

    return { success: true, gameId: game.id };

  } catch (err) {
    console.error('[简化匹配] 异常:', err);
    return { success: false, error: String(err) };
  }
}

// 检查是否有待创建的游戏
export async function checkForPendingGame(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('matchmaking')
    .select('game_id, status')
    .eq('user_id', userId)
    .eq('status', 'playing')
    .not('game_id', 'is', null)
    .maybeSingle();

  return data?.game_id ?? null;
}
