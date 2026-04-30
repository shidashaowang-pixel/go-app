/**
 * 简化匹配系统 v3 - 最终修复版
 * 核心原则：数据库触发器已经确定谁是创建者，前端只需要遵循数据库的设置
 */

import { supabase } from '@/db/supabase';

// 等待类型
type WaitResult = {
  type: 'game_created';
  gameId: string;
} | {
  type: 'cancelled';
} | {
  type: 'timeout';
};

/**
 * 尝试创建游戏
 * 数据库触发器已经确定了谁是创建者（room_creator_id）
 * - 如果我是创建者，调用此函数创建游戏
 * - 如果我不是创建者，返回 null
 */
export async function tryCreateGame(
  userId: string,
  opponentId: string,
  boardSize: number,
  timeControl: string,
  handicapMode: string,
  handicapCount: number
): Promise<string | null> {
  // 1. 检查我的 matchmaking 记录，获取创建者信息
  const { data: myRecord, error: fetchError } = await supabase
    .from('matchmaking')
    .select('id, user_id, room_creator_id, status, matched_with')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError || !myRecord) {
    console.log('[匹配] 未找到我的 matchmaking 记录');
    return null;
  }

  // 2. 判断我是否是创建者
  // 如果 room_creator_id 等于我的 user_id，我就是创建者
  const isCreator = myRecord.room_creator_id === userId;
  
  if (!isCreator) {
    console.log('[匹配] 我不是创建者，应等待对方创建游戏');
    return null;
  }

  console.log('[匹配] 确认我是创建者，开始创建游戏');

  // 3. 创建游戏
  const komiValue = handicapMode === 'even'
    ? (boardSize <= 9 ? 5.5 : boardSize <= 13 ? 6.5 : 7.5)
    : 0;

  // 随机分配黑白
  const userIsBlack = Math.random() < 0.5;
  const blackPlayerId = userIsBlack ? userId : opponentId;
  const whitePlayerId = userIsBlack ? opponentId : userId;

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      type: 'human',
      status: 'ongoing',
      result: null,
      black_player_id: blackPlayerId,
      white_player_id: whitePlayerId,
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
    console.error('[匹配] 创建游戏失败:', gameError);
    return null;
  }

  console.log('[匹配] 游戏创建成功:', game.id);

  // 4. 更新我的 matchmaking 状态
  await supabase
    .from('matchmaking')
    .update({
      status: 'playing',
      game_id: game.id,
    })
    .eq('user_id', userId);

  return game.id;
}

/**
 * 等待游戏被创建（非创建者调用）
 */
export async function waitForGame(
  userId: string,
  timeoutMs: number = 60000
): Promise<WaitResult> {
  return new Promise((resolve) => {
    let resolved = false;
    
    const checkAndResolve = (gameId: string | null) => {
      if (resolved || !gameId) return;
      resolved = true;
      resolve({ type: 'game_created', gameId });
    };

    // 立即检查一次
    (async () => {
      const { data } = await supabase
        .from('matchmaking')
        .select('game_id, status')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data?.game_id && data?.status === 'playing') {
        checkAndResolve(data.game_id);
        return;
      }
    })();

    // Realtime 监听
    const channel = supabase
      .channel('wait-game-' + userId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matchmaking',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const data = payload.new as { game_id: string; status: string };
        if (data.game_id && data.status === 'playing') {
          checkAndResolve(data.game_id);
        }
      })
      .subscribe();

    // 备用轮询
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('matchmaking')
        .select('game_id, status')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data?.game_id && data?.status === 'playing') {
        clearInterval(pollInterval);
        checkAndResolve(data.game_id);
      }
    }, 1000);

    // 超时处理
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      resolve({ type: 'timeout' });
    }, timeoutMs);
  });
}

/**
 * 检查是否有待创建的游戏（恢复用）
 */
export async function checkForPendingGame(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('matchmaking')
    .select('game_id')
    .eq('user_id', userId)
    .eq('status', 'playing')
    .not('game_id', 'is', null)
    .maybeSingle();

  return data?.game_id ?? null;
}

/**
 * 好友对战：直接进入匹配队列
 * 好友对战不需要随机匹配，而是直接建立连接
 */
export async function startFriendMatch(
  userId: string,
  friendId: string,
  boardSize: number,
  timeControl: string,
  handicapMode: string,
  handicapCount: number
): Promise<{ success: boolean; error?: string }> {
  // 清理旧的匹配记录
  await supabase
    .from('matchmaking')
    .delete()
    .eq('user_id', userId);

  // 进入好友对战队列
  const { error } = await supabase
    .from('matchmaking')
    .upsert({
      user_id: userId,
      board_size: boardSize,
      time_control: timeControl,
      status: 'friend_waiting',
      rating: 0,
      matched_with: friendId,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[好友对战] 进入队列失败:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 监听好友对战邀请
 */
export function subscribeToFriendMatch(
  userId: string,
  friendId: string,
  onMatchStart: (gameId: string) => void,
  onTimeout: () => void,
  timeoutMs: number = 30000
): () => void {
  const channel = supabase
    .channel('friend-match-' + userId)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'matchmaking',
      filter: `user_id=eq.${friendId}`,
    }, (payload) => {
      const data = payload.new as { status: string; game_id: string };
      if (data.status === 'playing' && data.game_id) {
        onMatchStart(data.game_id);
      }
    })
    .subscribe();

  // 轮询备用
  const pollInterval = setInterval(async () => {
    const { data } = await supabase
      .from('matchmaking')
      .select('game_id, status')
      .eq('user_id', friendId)
      .maybeSingle();
    
    if (data?.game_id && data?.status === 'playing') {
      clearInterval(pollInterval);
      onMatchStart(data.game_id);
    }
  }, 1000);

  // 超时
  setTimeout(() => {
    clearInterval(pollInterval);
    onTimeout();
  }, timeoutMs);

  return () => {
    supabase.removeChannel(channel);
    clearInterval(pollInterval);
  };
}
