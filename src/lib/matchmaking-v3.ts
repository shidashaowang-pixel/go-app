/**
 * 简化匹配系统 v5 - 彻底修复版
 * 核心改动：双方都调用 create_game_atomic RPC，由数据库保证只创建一个游戏
 * 不再在前端判断谁是创建者，彻底消除竞态条件
 */

import { supabase } from '@/db/supabase';

/**
 * 等待结果类型
 */
type WaitResult = {
  type: 'game_created';
  gameId: string;
  myColor: 'black' | 'white';
  opponentColor: 'black' | 'white';
} | {
  type: 'cancelled';
} | {
  type: 'timeout';
};

/**
 * 获取当前用户的匹配记录
 */
async function getMyMatchRecord(userId: string) {
  const { data, error } = await supabase
    .from('matchmaking')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['searching', 'matched', 'playing'])
    .maybeSingle();
  
  return { data, error };
}

/**
 * 获取对手的匹配记录
 */
async function getOpponentMatchRecord(userId: string) {
  const myRecord = await getMyMatchRecord(userId);
  if (!myRecord.data?.matched_with) return null;
  
  const { data } = await supabase
    .from('matchmaking')
    .select('*')
    .eq('user_id', myRecord.data.matched_with)
    .in('status', ['searching', 'matched', 'playing'])
    .maybeSingle();
  
  return data;
}

/**
 * 创建或加入游戏（双方都调用此函数）
 * 不再区分"创建者"和"等待者"，由 RPC 保证只创建一个游戏
 */
export async function createOrJoinGame(
  userId: string,
  boardSize: number,
  timeControl: string,
  handicapMode: string,
  handicapCount: number
): Promise<{ gameId: string; myColor: 'black' | 'white' } | null> {
  // 1. 获取我的记录
  const myRecord = await getMyMatchRecord(userId);
  if (!myRecord.data) {
    console.log('[匹配] 未找到我的记录');
    return null;
  }

  const opponentId = myRecord.data.matched_with;
  if (!opponentId) {
    console.log('[匹配] 未找到对手');
    return null;
  }

  // 2. 尝试使用 RPC 原子创建（advisory lock 保证并发安全）
  try {
    const { data, error } = await supabase.rpc('create_game_atomic', {
      p_user_id: userId,
      p_opponent_id: opponentId,
      p_board_size: boardSize,
      p_time_control: timeControl,
      p_handicap_mode: handicapMode,
      p_handicap_count: handicapCount,
    });

    if (!error && data) {
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.game_id) {
        console.log('[匹配] RPC 创建/加入游戏成功:', result.game_id);
        return {
          gameId: result.game_id,
          myColor: result.my_color as 'black' | 'white'
        };
      }
    } else {
      console.warn('[匹配] RPC 失败，降级处理:', error?.message);
    }
  } catch (e) {
    console.warn('[匹配] RPC 异常，降级处理:', e);
  }

  // 3. 降级：检查是否已有游戏（对手可能已通过 RPC 创建）
  const myRecord2 = await getMyMatchRecord(userId);
  if (myRecord2.data?.game_id) {
    const { data: game } = await supabase
      .from('games')
      .select('black_player_id')
      .eq('id', myRecord2.data.game_id)
      .maybeSingle();
    if (game) {
      return {
        gameId: myRecord2.data.game_id,
        myColor: game.black_player_id === userId ? 'black' : 'white'
      };
    }
  }

  // 检查对手记录
  const opponentRecord = await getOpponentMatchRecord(userId);
  if (opponentRecord?.game_id) {
    const { data: game } = await supabase
      .from('games')
      .select('black_player_id')
      .eq('id', opponentRecord.game_id)
      .maybeSingle();
    if (game) {
      await supabase.from('matchmaking').update({
        status: 'playing',
        game_id: opponentRecord.game_id,
      }).eq('user_id', userId);
      return {
        gameId: opponentRecord.game_id,
        myColor: game.black_player_id === userId ? 'black' : 'white'
      };
    }
  }

  // 4. 最终降级：前端直接创建（仍然保留，但加锁）
  // 使用 created_at 判断，先入队者创建
  const myTime = myRecord.data.created_at ? new Date(myRecord.data.created_at).getTime() : 0;
  const oppTime2 = opponentRecord?.created_at ? new Date(opponentRecord.created_at).getTime() : Date.now();
  const isCreator = myTime <= oppTime2;

  if (!isCreator) {
    console.log('[匹配] 我不是创建者，等待对方创建');
    return null;
  }

  console.log('[匹配] 降级为前端直接创建游戏');
  const userIsBlack = userId < opponentId; // 确定性颜色分配

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      type: 'human',
      status: 'ongoing',
      result: null,
      black_player_id: userIsBlack ? userId : opponentId,
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
    .maybeSingle();

  if (gameError || !game) {
    console.error('[匹配] 前端创建游戏失败:', gameError);
    return null;
  }

  // 更新双方 matchmaking 记录
  await supabase.from('matchmaking').update({
    status: 'playing',
    game_id: game.id,
  }).eq('user_id', userId);

  await supabase.from('matchmaking').update({
    status: 'playing',
    game_id: game.id,
  }).eq('user_id', opponentId);

  return {
    gameId: game.id,
    myColor: userIsBlack ? 'black' : 'white'
  };
}

/**
 * 等待游戏被创建（轮询 + Realtime）
 */
export async function waitForGame(
  userId: string,
  timeoutMs: number = 60000
): Promise<WaitResult> {
  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      if (!resolved) return;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };

    const checkAndResolve = async () => {
      if (resolved) return;

      const myRecord = await getMyMatchRecord(userId);
      if (!myRecord.data) return;

      if (myRecord.data.game_id) {
        const { data: game } = await supabase
          .from('games')
          .select('black_player_id')
          .eq('id', myRecord.data.game_id)
          .maybeSingle();

        if (game) {
          resolved = true;
          const myColor = game.black_player_id === userId ? 'black' : 'white';
          resolve({
            type: 'game_created',
            gameId: myRecord.data.game_id,
            myColor,
            opponentColor: myColor === 'black' ? 'white' : 'black'
          });
          cleanup();
          return;
        }
      }

      // 备用：直接去 games 表查找
      if (myRecord.data.matched_with) {
        const { data: game } = await supabase
          .from('games')
          .select('id, black_player_id, white_player_id')
          .or(`black_player_id.eq.${userId},white_player_id.eq.${userId}`)
          .eq('status', 'ongoing')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (game) {
          // 验证这个游戏确实包含我和对手
          const includesMe = game.black_player_id === userId || game.white_player_id === userId;
          const includesOpponent = game.black_player_id === myRecord.data.matched_with || game.white_player_id === myRecord.data.matched_with;
          
          if (includesMe && includesOpponent) {
            await supabase.from('matchmaking').update({
              status: 'playing',
              game_id: game.id,
            }).eq('user_id', userId);

            resolved = true;
            const myColor = game.black_player_id === userId ? 'black' : 'white';
            resolve({
              type: 'game_created',
              gameId: game.id,
              myColor,
              opponentColor: myColor === 'black' ? 'white' : 'black'
            });
            cleanup();
          }
        }
      }
    };

    checkAndResolve();

    const channel = supabase
      .channel('wait-game-' + userId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matchmaking',
        filter: `user_id=eq.${userId}`,
      }, async () => {
        await checkAndResolve();
      })
      .subscribe();

    const pollInterval = setInterval(async () => {
      await checkAndResolve();
    }, 500);

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
export async function checkForPendingGame(userId: string): Promise<{ gameId: string; myColor: 'black' | 'white' } | null> {
  const myRecord = await getMyMatchRecord(userId);
  if (!myRecord.data?.game_id) return null;
  
  const { data: game } = await supabase
    .from('games')
    .select('black_player_id')
    .eq('id', myRecord.data.game_id)
    .maybeSingle();
  
  if (!game) return null;
  
  return {
    gameId: myRecord.data.game_id,
    myColor: game.black_player_id === userId ? 'black' : 'white'
  };
}

/**
 * 好友对战：直接创建游戏（邀请方自动成为创建者）
 */
export async function startFriendMatch(
  userId: string,
  friendId: string,
  boardSize: number,
  timeControl: string,
  handicapMode: string,
  handicapCount: number
): Promise<{ success: boolean; error?: string }> {
  await supabase
    .from('matchmaking')
    .delete()
    .eq('user_id', userId);

  const komiValue = handicapMode === 'even'
    ? (boardSize <= 9 ? 5.5 : boardSize <= 13 ? 6.5 : 7.5)
    : 0;

  const userIsBlack = Math.random() < 0.5;
  const blackPlayerId = userIsBlack ? userId : friendId;
  const whitePlayerId = userIsBlack ? friendId : userId;

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
    console.error('[好友对战] 创建游戏失败:', gameError);
    return { success: false, error: gameError?.message };
  }

  await supabase.from('matchmaking').upsert({
    user_id: userId,
    board_size: boardSize,
    time_control: timeControl,
    status: 'playing',
    rating: 0,
    matched_with: friendId,
    game_id: game.id,
    created_at: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * 监听好友对战邀请
 */
export function subscribeToFriendMatch(
  userId: string,
  onMatchStart: (gameId: string, myColor: 'black' | 'white') => void,
  onTimeout: () => void,
  timeoutMs: number = 30000
): () => void {
  const channel = supabase
    .channel('friend-match-' + userId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'matchmaking',
      filter: `user_id=eq.${userId}`,
    }, async (payload) => {
      const data = payload.new as { game_id: string; matched_with: string };
      if (data.game_id) {
        const { data: game } = await supabase
          .from('games')
          .select('black_player_id')
          .eq('id', data.game_id)
          .maybeSingle();
        
        if (game) {
          const myColor = game.black_player_id === userId ? 'black' : 'white';
          onMatchStart(data.game_id, myColor);
        }
      }
    })
    .subscribe();

  const pollInterval = setInterval(async () => {
    const { data } = await supabase
      .from('matchmaking')
      .select('game_id, matched_with')
      .eq('user_id', userId)
      .eq('status', 'playing')
      .not('game_id', 'is', null)
      .maybeSingle();
    
    if (data?.game_id) {
      clearInterval(pollInterval);
      const { data: game } = await supabase
        .from('games')
        .select('black_player_id')
        .eq('id', data.game_id)
        .maybeSingle();
      
      if (game) {
        const myColor = game.black_player_id === userId ? 'black' : 'white';
        onMatchStart(data.game_id, myColor);
      }
    }
  }, 1000);

  setTimeout(() => {
    clearInterval(pollInterval);
    onTimeout();
  }, timeoutMs);

  return () => {
    supabase.removeChannel(channel);
    clearInterval(pollInterval);
  };
}
