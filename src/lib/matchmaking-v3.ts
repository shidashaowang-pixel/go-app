/**
 * 简化匹配系统 v4 - 彻底修复版
 * 核心思路：不再依赖 matchmaking 表的 room_creator_id，直接在创建游戏时判断
 * 谁先进入队列谁就是创建者（通过 created_at 时间戳判断）
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
 * 获取当前用户的匹配记录（查询所有状态，因为可能还没更新到 matched）
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
 * 获取对手的匹配记录（通过 matched_with 关联）
 */
async function getOpponentMatchRecord(userId: string) {
  // 先获取自己的记录
  const myRecord = await getMyMatchRecord(userId);
  if (!myRecord.data?.matched_with) return null;
  
  // 获取对手的记录（查询所有状态，因为对手可能还没来得及更新状态）
  const { data } = await supabase
    .from('matchmaking')
    .select('*')
    .eq('user_id', myRecord.data.matched_with)
    .in('status', ['searching', 'matched', 'playing'])
    .maybeSingle();
  
  return data;
}

// 前端创建锁，防止同一窗口重复创建
let creatingGame = false;

/**
 * 尝试创建游戏
 * 优先使用 RPC 原子创建，若不可用则降级为前端直接创建
 */
export async function tryCreateGame(
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

  // 2. 获取对手记录
  const opponentRecord = await getOpponentMatchRecord(userId);

  // 3. 再次确认我是创建者（created_at 更早的才是创建者）
  const myTime = myRecord.data.created_at ? new Date(myRecord.data.created_at).getTime() : 0;
  const oppTime = opponentRecord?.created_at ? new Date(opponentRecord.created_at).getTime() : Date.now();
  const isCreator = myTime <= oppTime;

  if (!isCreator) {
    console.log('[匹配] 我不是创建者，跳过创建');
    return null;
  }

  // 前端锁：防止同一窗口重复创建
  if (creatingGame) {
    console.log('[匹配] 正在创建游戏中，跳过重复调用');
    return null;
  }
  creatingGame = true;

  try {
    // 4. 检查是否已有游戏存在（双重检查防止重复）
    if (myRecord.data.game_id) {
      const { data: game } = await supabase
        .from('games')
        .select('black_player_id')
        .eq('id', myRecord.data.game_id)
        .maybeSingle();
      if (game) {
        return {
          gameId: myRecord.data.game_id,
          myColor: game.black_player_id === userId ? 'black' : 'white'
        };
      }
    }

    if (opponentRecord?.game_id) {
      const { data: game } = await supabase
        .from('games')
        .select('black_player_id')
        .eq('id', opponentRecord.game_id)
        .maybeSingle();
      if (game) {
        // 更新自己的记录
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

    // 5. 尝试使用 RPC 原子创建
    // 5. 尝试使用 RPC 原子创建
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
          console.log('[匹配] RPC 创建游戏成功:', result.game_id);
          return {
            gameId: result.game_id,
            myColor: result.my_color as 'black' | 'white'
          };
        }
      }
    } catch (e) {
      console.log('[匹配] RPC 不可用，降级为前端直接创建');
    }

    // 6. 降级：前端直接创建游戏
    console.log('[匹配] 前端直接创建游戏');
    const userIsBlack = Math.random() < 0.5;

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

    // 7. 分别更新双方的 matchmaking 记录（避免 RLS 批量更新问题）
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
  } finally {
    creatingGame = false;
  }
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

    const cleanup = () => {
      if (!resolved) return;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };

    const checkAndResolve = async () => {
      if (resolved) return;

      // 检查我的记录
      const myRecord = await getMyMatchRecord(userId);
      if (!myRecord.data) return;

      // 检查是否有 game_id
      if (myRecord.data.game_id) {
        // 获取我是什么颜色
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

      // 备用：matchmaking 没写入 game_id 时，直接去 games 表查找
      if (myRecord.data.matched_with) {
        const { data: game } = await supabase
          .from('games')
          .select('id, black_player_id')
          .or(`black_player_id.eq.${userId},white_player_id.eq.${userId}`)
          .or(`black_player_id.eq.${myRecord.data.matched_with},white_player_id.eq.${myRecord.data.matched_with}`)
          .eq('status', 'ongoing')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (game) {
          // 补写 game_id 到自己的记录
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
    };

    // 立即检查一次
    checkAndResolve();

    // Realtime 监听
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

    // 备用轮询（更频繁）
    const pollInterval = setInterval(async () => {
      await checkAndResolve();
    }, 500);

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
  // 清理旧的匹配记录
  await supabase
    .from('matchmaking')
    .delete()
    .eq('user_id', userId);

  // 邀请方直接创建游戏
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

  // 创建我的匹配记录
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
        // 获取我是什么颜色
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

  // 轮询备用
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
