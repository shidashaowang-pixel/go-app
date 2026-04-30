import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import GoBoard from '@/components/GoBoard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/db/supabase';
import { createGame, updateGame, getFriends, upsertDailyStat } from '@/db/api';
import { awardGameAchievements } from '@/db/achievements';
import { useAuth } from '@/contexts/AuthContext';
import { GoEngine, type StoneColor, type GoGameResult, type PositionEstimate, type TerritoryEstimate } from '@/lib/go-engine';
import type { GameMove, GameEndType, ScoreDetail } from '@/types/types';
import {
  ArrowLeft, Users, Shuffle, Timer, Loader2, Swords,
  Trophy, Flag, Circle, TrendingUp, AlertCircle,
  FlaskConical, ChevronLeft, Check, X, Undo2, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { getRankInfo } from '@/pages/Home';
import {
  playCorrectSound, playLevelUpSound,
  speak, stopSpeak, getCorrectPhrase, getLevelUpPhrase,
} from '@/lib/sounds';

type MatchState = 'idle' | 'searching' | 'matched' | 'playing' | 'finished';

interface OnlinePlayer {
  id: string;
  nickname: string | null;
  username: string;
  rating: number;
}

export default function HumanGame() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [boardSize, setBoardSize] = useState(9);
  const [timeKey, setTimeKey] = useState('10min');
  const [opponent, setOpponent] = useState<OnlinePlayer | null>(null);
  const [friends, setFriends] = useState<OnlinePlayer[]>([]);
  const [engine, setEngine] = useState<GoEngine | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState<StoneColor>('black');
  const [isOpponentThinking, setIsOpponentThinking] = useState(false);
  const [gameResult, setGameResult] = useState<GoGameResult | null>(null);
  // 形势判断
  const [positionEstimate, setPositionEstimate] = useState<PositionEstimate | null>(null);
  const [territoryEstimate, setTerritoryEstimate] = useState<TerritoryEstimate | null>(null);
  const [showEstimate, setShowEstimate] = useState(false); // 形势判断弹窗
  // 试下模式
  const [isVariationMode, setIsVariationMode] = useState(false);
  // 让子设置
  const [handicapMode, setHandicapMode] = useState<'even' | 'first' | 'stones'>('even'); // 分先/让先/让子
  const [handicapCount, setHandicapCount] = useState(2); // 让子数量(2-9)
  const [handicapDirection, setHandicapDirection] = useState<'user-gives' | 'ai-gives'>('user-gives'); // 让子方向
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const engineRef = useRef<GoEngine | null>(null);
  const matchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 倒计时相关
  const [blackTime, setBlackTime] = useState(600); // 黑棋剩余秒数
  const [whiteTime, setWhiteTime] = useState(600); // 白棋剩余秒数

  // 匹配确认相关
  const [myConfirmed, setMyConfirmed] = useState(false); // 我是否已点击开始
  const [opponentConfirmed, setOpponentConfirmed] = useState(false); // 对手是否已点击开始
  const [isRoomCreator, setIsRoomCreator] = useState(false); // 我是否是房间创建者
  const [joinedGameId, setJoinedGameId] = useState<string | null>(null); // 已加入的游戏ID（另一方用）

  // 根据时间设置获取初始秒数
  const getInitialTime = () => {
    switch (timeKey) {
      case '5min': return 300;
      case '10min': return 600;
      case '20min': return 1200;
      case '30min': return 1800;
      default: return 600;
    }
  };

  // 格式化时间为 MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 启动游戏计时器
  const startGameTimer = () => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    const initial = getInitialTime();
    setBlackTime(initial);
    setWhiteTime(initial);

    gameTimerRef.current = setInterval(() => {
      if (currentColor === 'black') {
        setBlackTime(prev => {
          if (prev <= 1) {
            // 黑棋超时，判负
            clearInterval(gameTimerRef.current!);
            handleGameTimeout('black');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setWhiteTime(prev => {
          if (prev <= 1) {
            // 白棋超时，判负
            clearInterval(gameTimerRef.current!);
            handleGameTimeout('white');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
  };

  // 超时处理
  const handleGameTimeout = (loserColor: StoneColor) => {
    const eng = engineRef.current;
    if (eng) {
      const winner = loserColor === 'black' ? 'white' : 'black';
      handleGameEnd(eng, winner, 'timeout');
      toast.error(`${loserColor === 'black' ? '黑棋' : '白棋'}超时！${winner === currentColor ? '你' : '对手'}获胜！`);
    }
  };

  // 保持 engineRef 同步
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  // 形势判断定时更新（每手更新一次）
  useEffect(() => {
    if (!engine) return;
    setPositionEstimate(engine.estimatePosition());
  }, [engine?.moveHistory.length]);

  useEffect(() => {
    if (user) loadFriends();
    return () => {
      cleanup();
    };
  }, [user]);

  const cleanup = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    if (searchTimerRef.current) {
      clearInterval(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    if (matchPollRef.current) {
      clearInterval(matchPollRef.current);
      matchPollRef.current = null;
    }
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    // 重置确认状态
    setMyConfirmed(false);
    setOpponentConfirmed(false);
    setIsRoomCreator(false);
    setJoinedGameId(null);
  };

  const loadFriends = async () => {
    if (!user) return;
    const data = await getFriends(user.id);
    setFriends(data.map(f => ({
      id: f.id,
      nickname: f.nickname,
      username: f.username,
      rating: f.rating,
    })));
  };

  // 检查我是否是创建者（通过比较创建时间）
  // 谁先进入匹配队列，谁就是创建者
  const checkIfICreatedTheMatch = async (opponentId: string): Promise<boolean> => {
    if (!user) return false;
    
    const myRecord = await supabase
      .from('matchmaking')
      .select('created_at')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const opponentRecord = await supabase
      .from('matchmaking')
      .select('created_at')
      .eq('user_id', opponentId)
      .maybeSingle();
    
    if (!myRecord || !opponentRecord) return false;
    
    // 谁先创建谁就是创建者
    const myTime = new Date(myRecord.created_at).getTime();
    const opponentTime = new Date(opponentRecord.created_at).getTime();
    
    return myTime < opponentTime;
  };

  // ========== 随机匹配 ==========
  const handleRandomMatch = async () => {
    if (!user) return;
    setMatchState('searching');
    setSearchTime(0);

    searchTimerRef.current = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);

    try {
      // 1. 先检查有没有已经在等待的对手
      const { data: existing } = await supabase
        .from('matchmaking')
        .select('user_id')
        .eq('status', 'searching')
        .eq('board_size', boardSize)
        .neq('user_id', user.id)
        .limit(1);

      if (existing && existing.length > 0) {
        // 找到等待中的对手，直接匹配
        // 对方在等待，我是后来加入的，所以对方是创建者，我是加入者
        const opponentId = existing[0].user_id;
        await matchWith(opponentId, false); // iAmCreator = false
        return;
      }

      // 2. 没有对手，自己进入等待队列
      // 我先进入等待，我是创建者
      const { error } = await supabase
        .from('matchmaking')
        .upsert({
          user_id: user.id,
          board_size: boardSize,
          time_control: timeKey,
          status: 'searching',
          rating: profile?.rating ?? 0,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // 3. 监听自己的匹配状态
      const channel = supabase
        .channel('matchmaking-' + user.id)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'matchmaking',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          const data = payload.new as { status: string; matched_with: string };
          if (data.status === 'matched' && data.matched_with) {
            handleMatchFound(data.matched_with);
          }
        })
        .subscribe();

      subscriptionRef.current = channel;

      // 4. 备用轮询：每秒检查一次是否已匹配（以防 Realtime 延迟）
      matchPollRef.current = setInterval(async () => {
        // 如果已经匹配或正在游戏中，停止轮询
        if (matchState === 'matched' || matchState === 'playing') {
          if (matchPollRef.current) {
            clearInterval(matchPollRef.current);
            matchPollRef.current = null;
          }
          return;
        }

        try {
          const { data: myRecord } = await supabase
            .from('matchmaking')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (myRecord?.status === 'matched' && myRecord?.matched_with) {
            // 匹配成功
            // 如果是被匹配上的（对方先进入队列），则我不是创建者
            const iAmCreator = myRecord.created_at && 
              await checkIfICreatedTheMatch(myRecord.matched_with);
            
            if (matchPollRef.current) {
              clearInterval(matchPollRef.current);
              matchPollRef.current = null;
            }
            handleMatchFound(myRecord.matched_with, iAmCreator);
          }
        } catch (e) {
          console.error('轮询错误:', e);
        }
      }, 1000);

    } catch {
      toast.error('匹配失败，请重试');
      setMatchState('idle');
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    }
  };

  // 匹配某个对手
  const matchWith = async (opponentId: string, iAmCreator: boolean = false) => {
    if (!user) return;

    // 更新双方状态为已匹配
    await supabase
      .from('matchmaking')
      .update({ status: 'matched', matched_with: opponentId })
      .eq('user_id', user.id);

    await supabase
      .from('matchmaking')
      .update({ status: 'matched', matched_with: user.id })
      .eq('user_id', opponentId);

    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    if (matchPollRef.current) clearInterval(matchPollRef.current);

    await handleMatchFound(opponentId, iAmCreator);
  };

  const handleMatchFound = async (opponentId: string, _iAmCreatorHint: boolean = false) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', opponentId)
      .maybeSingle();

    if (data) {
      const matchedOpponent: OnlinePlayer = {
        id: data.id,
        nickname: data.nickname,
        username: data.username,
        rating: data.rating,
      };
      setOpponent(matchedOpponent);
      
      // 清理计时器
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      if (matchPollRef.current) clearInterval(matchPollRef.current);
      searchTimerRef.current = null;
      matchPollRef.current = null;

      // 重新判断我是否是创建者（通过创建时间）
      const iAmCreator = await checkIfICreatedTheMatch(opponentId);
      console.log('[匹配] 匹配成功，对手:', opponentId, '我是创建者:', iAmCreator);
      
      setOpponent(matchedOpponent);
      setMatchState('matched');
      
      // 重置确认状态
      setMyConfirmed(false);
      setOpponentConfirmed(false);
      setIsRoomCreator(iAmCreator);
      setJoinedGameId(null);

      // 显示确认界面，让用户点击"开始"按钮后再进入游戏
    }
  };

  const handleCancelMatch = async () => {
    if (user) {
      await supabase
        .from('matchmaking')
        .delete()
        .eq('user_id', user.id);
    }
    cleanup();
    setMatchState('idle');
    setSearchTime(0);
  };

  // ========== 确认开始（不立即开始游戏） ==========
  const handleConfirmStart = async () => {
    if (!user || !opponent) return;

    // 设置我的确认状态
    setMyConfirmed(true);

    if (isRoomCreator) {
      // 创建者：创建游戏房间
      await createGameRoom();
    } else {
      // 加入者：通知创建者我已确认
      // 更新自己的 confirmed 状态，同时通知创建者
      await supabase
        .from('matchmaking')
        .update({ confirmed: true })
        .eq('user_id', user.id);
      
      // 同时更新对手的 ready_to_play 标记，让对手能收到通知
      await supabase
        .from('matchmaking')
        .update({ ready_to_play: true })
        .eq('user_id', opponent.id);
      
      toast.info('等待房主创建房间...');
    }
  };

  // ========== 创建游戏房间（仅创建者调用） ==========
  const createGameRoom = async () => {
    if (!user || !opponent) {
      console.error('[匹配] createGameRoom: 缺少用户或对手信息');
      return;
    }

    // 黑白分配：随机决定
    const userIsBlack = currentColor === 'black';
    const blackPlayerId = userIsBlack ? user.id : opponent.id;

    console.log('[匹配] 创建游戏房间，执', userIsBlack ? '黑' : '白', '棋');
    console.log('[匹配] 黑棋:', blackPlayerId, '白棋:', userIsBlack ? opponent.id : user.id);

    try {
      // 创建游戏
      const komiValue = handicapMode === 'even' 
        ? (boardSize <= 9 ? 5.5 : boardSize <= 13 ? 6.5 : 7.5)
        : 0;

      const game = await createGame({
        type: 'human',
        status: 'ongoing',
        result: null,
        black_player_id: blackPlayerId,
        white_player_id: userIsBlack ? opponent.id : user.id,
        ai_difficulty: null,
        board_size: boardSize,
        moves: [],
        end_type: null,
        score_detail: null,
        black_captures: 0,
        white_captures: 0,
        move_count: 0,
        duration_seconds: null,
      });

      if (game?.id) {
        console.log('[匹配] 游戏创建成功:', game.id);
        setGameId(game.id);
        
        // 更新 matchmaking，记录 game_id
        const { error: updateError } = await supabase
          .from('matchmaking')
          .update({ 
            status: 'playing',
            game_id: game.id,
            black_player_id: blackPlayerId
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('[匹配] 更新 matchmaking 失败:', updateError);
        } else {
          console.log('[匹配] matchmaking 更新成功');
        }

        // 进入游戏
        initGameEngine(userIsBlack, game.id);
      } else {
        console.error('[匹配] 游戏创建失败，返回空');
        toast.error('创建对弈失败');
        setMyConfirmed(false);
      }
    } catch (err) {
      console.error('[匹配] 创建对弈异常:', err);
      toast.error('创建对弈失败');
      setMyConfirmed(false);
    }
  };

  // ========== 加入已有游戏（仅加入者调用） ==========
  const joinGameRoom = async (gId: string) => {
    if (!user || !opponent) {
      console.error('[匹配] joinGameRoom: 缺少用户或对手信息');
      return;
    }

    console.log('[匹配] 加入游戏房间:', gId);
    setJoinedGameId(gId);
    setGameId(gId);

    // 获取游戏信息，确定自己的颜色
    const { data: gameData, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gId)
      .maybeSingle();

    if (error) {
      console.error('[匹配] 获取游戏信息失败:', error);
      toast.error('加入游戏失败');
      return;
    }

    if (!gameData) {
      console.error('[匹配] 游戏不存在:', gId);
      toast.error('游戏房间不存在');
      return;
    }

    console.log('[匹配] 游戏信息:', gameData);
    const userIsBlack = gameData.black_player_id === user.id;
    console.log('[匹配] 我是执', userIsBlack ? '黑' : '白', '棋');
    initGameEngine(userIsBlack, gId);
  };

  // ========== 初始化游戏引擎 ==========
  const initGameEngine = (userIsBlack: boolean, gId: string) => {
    const komiValue = handicapMode === 'even' 
      ? (boardSize <= 9 ? 5.5 : boardSize <= 13 ? 6.5 : 7.5)
      : 0;

    const newEngine = new GoEngine(boardSize, komiValue);
    setCurrentColor(userIsBlack ? 'black' : 'white');

    if (handicapMode === 'stones') {
      newEngine.setHandicap(handicapCount);
      if (handicapDirection === 'ai-gives') {
        newEngine.placeHandicapAsWhite();
        setCurrentColor('black');
      } else {
        newEngine.placeHandicap();
        setCurrentColor('white');
      }
    }

    setEngine(newEngine);
    engineRef.current = newEngine;
    setMatchState('playing');

    // 启动游戏计时器
    startGameTimer();

    const handicapText = handicapCount > 0 ? `（${handicapCount}子局）` : '（猜先）';
    const colorText = currentColor === 'black' ? '执黑' : '执白';
    toast.success(`对弈开始！${handicapText}你${colorText}`);

    // 订阅对手落子的 Realtime 频道
    subscribeToOpponentMoves(gId);
  };

  // 监听对方创建游戏（加入者监听）
  useEffect(() => {
    if (matchState !== 'matched' || !user || !opponent || isRoomCreator) return;

    const channel = supabase
      .channel('match-game-' + user.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matchmaking',
        filter: `user_id=eq.${opponent.id}`,
      }, (payload) => {
        const data = payload.new as { status: string; game_id: string; ready_to_play?: boolean };
        console.log('[匹配] 加入者收到更新:', data);
        
        // 检查是否是对手创建了游戏
        if (data.status === 'playing' && data.game_id && !joinedGameId) {
          console.log('[匹配] 对手已创建游戏，加入房间');
          setOpponentConfirmed(true);
          joinGameRoom(data.game_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchState, user, opponent, isRoomCreator, joinedGameId]);

  // 监听对手确认（创建者监听）
  useEffect(() => {
    if (matchState !== 'matched' || !user || !opponent || !isRoomCreator) return;

    const channel = supabase
      .channel('match-confirm-' + user.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matchmaking',
        filter: `user_id=eq.${opponent.id}`,
      }, (payload) => {
        const data = payload.new as { confirmed?: boolean; ready_to_play?: boolean };
        console.log('[匹配] 创建者收到对手更新:', data);
        
        if (data.ready_to_play || data.confirmed) {
          setOpponentConfirmed(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchState, user, opponent, isRoomCreator]);

  // 加入者：轮询检查是否已有游戏
  useEffect(() => {
    if (matchState !== 'matched' || !user || !opponent || isRoomCreator || joinedGameId) return;

    const pollGameId = async () => {
      const { data } = await supabase
        .from('matchmaking')
        .select('status, game_id')
        .eq('user_id', opponent.id)
        .maybeSingle();

      if (data && data.status === 'playing' && data.game_id) {
        setOpponentConfirmed(true);
        joinGameRoom(data.game_id);
      }
    };

    const interval = setInterval(pollGameId, 1000);
    return () => clearInterval(interval);
  }, [matchState, user, opponent, isRoomCreator, joinedGameId]);

  // ========== 好友对战 ==========
  const handleFriendChallenge = async (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;

    setOpponent({
      id: friend.id,
      nickname: friend.nickname,
      username: friend.username,
      rating: friend.rating,
    });
    setMatchState('matched');
  };

  // ========== 订阅对手落子 ==========
  const subscribeToOpponentMoves = (gId: string) => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase
      .channel('game-moves-' + gId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_moves',
        filter: `game_id=eq.${gId}`,
      }, (payload) => {
        const move = payload.new as { row: number; col: number; player: string };
        const eng = engineRef.current;
        if (!eng || eng.gameOver) return;

        // 对手落子（白棋）
        const moveColor: StoneColor = move.player === 'black' ? 'black' : 'white';
        if (moveColor !== currentColor && eng.isValidMove(move.row, move.col, moveColor)) {
          eng.placeStone(move.row, move.col);
          setEngine(Object.assign(Object.create(Object.getPrototypeOf(eng)), eng));
          setIsOpponentThinking(false);
        }
      })
      .subscribe();

    subscriptionRef.current = channel;
  };

  // ========== 对弈落子 ==========
  const handleMove = useCallback(async (row: number, col: number, eng: GoEngine) => {
    if (!eng || eng.gameOver) return;
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(eng)), eng));

    // 记录刚下的颜色
    const myColor = currentColor;

    // 切换到对手
    setCurrentColor(currentColor === 'black' ? 'white' : 'black');
    setIsOpponentThinking(true);

    // 广播落子
    if (gameId) {
      await supabase
        .from('game_moves')
        .insert({
          game_id: gameId,
          move_number: eng.getMoveCount(),
          row,
          col,
          player: myColor,
          created_at: new Date().toISOString(),
        });
    }

    // 等待对手通过 Realtime 落子，不再使用 AI 替代
  }, [gameId, currentColor]);

  const handleGameEnd = (eng: GoEngine, winnerOverride?: StoneColor, endType: GameEndType = 'score') => {
    const result = eng.calculateScore(true);
    if (winnerOverride) result.winner = winnerOverride;
    setGameResult(result);
    setPositionEstimate(eng.estimatePosition());

    // 构建丰富棋谱
    const gameMoves: GameMove[] = eng.moveHistory.map(m => ({
      row: m.row, col: m.col, color: m.color, isPass: false,
    }));

    const scoreDetail: ScoreDetail = {
      winner: result.winner,
      blackScore: result.blackScore,
      whiteScore: result.whiteScore,
      komi: result.komi,
      details: result.details,
    };

    if (gameId) {
      updateGame(gameId, {
        status: 'finished',
        result: result.winner === 'black' ? 'black_win' : result.winner === 'white' ? 'white_win' : 'draw',
        moves: gameMoves,
        end_type: winnerOverride ? endType : 'score',
        score_detail: scoreDetail,
        black_captures: eng.capturedStones.black,
        white_captures: eng.capturedStones.white,
        move_count: eng.getMoveCount(),
        duration_seconds: null,
        finished_at: new Date().toISOString(),
      }).catch(console.error);
    }
    setMatchState('finished');

    // 胜负语音反馈
    const isWin = result.winner === currentColor;
    if (isWin) {
      playLevelUpSound();
      speak(getLevelUpPhrase());
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      playWrongSound();
      speak('没关系，继续加油！你一定行的！');
    }

    // 记录每日统计
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      // 判断用户是否获胜（基于用户执棋颜色）
      const userWon = result.winner === currentColor;
      upsertDailyStat(user.id, today, {
        games_played: 1,
        games_won: userWon ? 1 : 0,
      }).catch(console.error);

      // 检查并授予成就
      awardGameAchievements(user.id, userWon, opponent?.id ?? null)
        .then(newAchievements => {
          if (newAchievements.length > 0) {
            newAchievements.forEach((a, i) => {
              setTimeout(() => {
                toast.success(`🏆 获得成就：${a.title}！`, { duration: 4000 });
              }, i * 2000);
            });
          }
        })
        .catch(console.error);
    }
  };

  const handlePass = () => {
    if (!engine || engine.gameOver) return;
    engine.pass();
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
    toast.info('你选择了虚手');
    if (engine.consecutivePasses >= 2) {
      handleGameEnd(engine);
    }
  };

  const handleResign = () => {
    if (!engine) return;
    const winner = engine.resign(); // 返回赢家
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
    handleGameEnd(engine, winner, 'resign');
    toast.info('你认输了');
  };

  // ============== 试下模式处理 ==============
  /** 进入试下模式 */
  const handleEnterVariation = () => {
    if (!engine || engine.gameOver) return;
    engine.enterVariationMode();
    setIsVariationMode(true);
    toast.info('已进入试下模式，可以尝试不同的着法');
  };

  /** 试下模式落子 */
  const handleVariationMove = useCallback((row: number, col: number, eng: GoEngine) => {
    eng.addVariationMove(row, col);
    // 强制刷新引擎状态
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(eng)), eng));
  }, []);

  /** 试下后退一步 */
  const handleVariationUndo = () => {
    if (!engine) return;
    engine.undoVariationMove();
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
  };

  /** 试下前进一步 */
  const handleVariationRedo = () => {
    if (!engine) return;
    const moveCount = engine.getVariationMoveCount();
    // 如果还没到最后一手试下，就前进
    if (engine.variationMoves && engine.variationMoves.length < moveCount) {
      const nextMove = engine.variationMoves[engine.variationMoves.length];
      if (nextMove) {
        engine.addVariationMove(nextMove.row, nextMove.col);
        setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
      }
    }
  };

  /** 退出试下模式 */
  const handleExitVariation = () => {
    if (!engine) return;
    engine.exitVariationMode();
    setIsVariationMode(false);
    toast.info('已退出试下模式');
  };

  /** 试下模式下刷新引擎 */
  const syncVariationEngine = useCallback(() => {
    if (engine) {
      setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
    }
  }, [engine]);

  const myRankInfo = getRankInfo(profile?.rating ?? 0);
  const opponentRankInfo = getRankInfo(opponent?.rating ?? 0);

  // ========== 空闲状态：选择模式 ==========
  if (matchState === 'idle') {
    return (
      <MainLayout>
        <div className="container px-4 py-6 max-w-md mx-auto pb-20">
          <Button variant="ghost" onClick={() => navigate('/game')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> 返回对弈中心
          </Button>

          <h1 className="text-xl font-bold mb-4">真人对弈</h1>

          {/* 对弈设置 */}
          <Card className="mb-4 overflow-hidden border-0 shadow-md">
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">棋盘大小</label>
                <Select value={boardSize.toString()} onValueChange={(v) => setBoardSize(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">9路棋盘</SelectItem>
                    <SelectItem value="13">13路棋盘</SelectItem>
                    <SelectItem value="19">19路棋盘</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Timer className="w-4 h-4" /> 用时设置
                </label>
                <Select value={timeKey} onValueChange={setTimeKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10min">10分钟快棋</SelectItem>
                    <SelectItem value="20min">20分钟标准</SelectItem>
                    <SelectItem value="30min">30分钟慢棋</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Flag className="w-4 h-4" /> 对局设置
                </label>
                <Select value={handicapMode} onValueChange={(v) => setHandicapMode(v as 'even' | 'first' | 'stones')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="even">分先（有贴目，猜先）</SelectItem>
                    <SelectItem value="first">让先（无贴目，黑先下）</SelectItem>
                    <SelectItem value="stones">让子（无贴目）</SelectItem>
                  </SelectContent>
                </Select>
                
                {handicapMode === 'stones' && (
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground mb-1 block">让子数</label>
                    <Select value={handicapCount.toString()} onValueChange={(v) => setHandicapCount(Number(v))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">让二子</SelectItem>
                        <SelectItem value="3">让三子</SelectItem>
                        <SelectItem value="4">让四子</SelectItem>
                        <SelectItem value="5">让五子</SelectItem>
                        <SelectItem value="6">让六子</SelectItem>
                        <SelectItem value="7">让七子</SelectItem>
                        <SelectItem value="8">让八子</SelectItem>
                        <SelectItem value="9">让九子</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="mt-2">
                      <label className="text-xs text-muted-foreground mb-1 block">让子方向</label>
                      <Select value={handicapDirection} onValueChange={(v) => setHandicapDirection(v as 'user-gives' | 'ai-gives')}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user-gives">我让对手（对手执黑放子）</SelectItem>
                          <SelectItem value="ai-gives">对手让我（我执黑放子）</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 随机匹配 */}
          <Card className="mb-4 overflow-hidden border-0 shadow-md card-kid">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg">
                  <Shuffle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">随机匹配</h3>
                  <p className="text-sm text-muted-foreground">与水平相近的棋友对弈</p>
                </div>
              </div>
              <Button onClick={handleRandomMatch} className="w-full py-5 bg-gradient-to-r from-violet-500 to-purple-600">
                开始匹配
              </Button>
            </CardContent>
          </Card>

          {/* 好友对战 */}
          <Card className="overflow-hidden border-0 shadow-md card-kid">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">好友对战</h3>
                  <p className="text-sm text-muted-foreground">邀请好友一起下棋</p>
                </div>
              </div>

              {friends.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">暂无好友</p>
                  <p className="text-xs mt-1">去社交页面添加好友吧！</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {friends.map((friend) => {
                    const online = friend.updated_at
                      ? new Date(friend.updated_at).getTime() > Date.now() - 5 * 60 * 1000
                      : false;
                    return (
                      <div key={friend.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                              {(friend.nickname || friend.username)[0]}
                            </div>
                            <Circle className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 ${
                              online ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{friend.nickname || friend.username}</p>
                            <p className="text-xs text-muted-foreground">积分 {friend.rating}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleFriendChallenge(friend.id)}>
                          <Swords className="h-3 w-3 mr-1" /> 邀请
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // ========== 搜索中 ==========
  if (matchState === 'searching') {
    return (
      <MainLayout>
        <div className="container px-4 py-8 max-w-md mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-bold mb-2">正在寻找对手...</h2>
            <p className="text-muted-foreground">
              已等待 {searchTime} 秒
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {boardSize}路棋盘 · 
              {handicapMode === 'even' ? '分先' : handicapMode === 'first' ? '让先' : `让${handicapCount}子`}
              {handicapMode !== 'even' ? '（无贴目）' : ''} · 
              {timeKey === '10min' ? '10分钟' : timeKey === '20min' ? '20分钟' : '30分钟'}
            </p>
          </div>
          <Button variant="outline" onClick={handleCancelMatch}>
            取消匹配
          </Button>
        </div>
      </MainLayout>
    );
  }

  // ========== 匹配成功 ==========
  if (matchState === 'matched' && opponent) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold mb-6">匹配成功！</h2>

          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl shadow-lg mx-auto mb-2 relative">
                🦊
                {myConfirmed && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <p className="font-medium text-sm">{profile?.nickname || '你'}</p>
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 text-xs mt-1">
                {myRankInfo.icon} {myRankInfo.label}
              </Badge>
              {isRoomCreator && (
                <p className="text-xs text-amber-600 mt-1">房主</p>
              )}
            </div>

            <div className="text-2xl font-bold text-primary">VS</div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-2xl shadow-lg mx-auto mb-2 relative">
                🐼
                {opponentConfirmed && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <p className="font-medium text-sm">{opponent.nickname || opponent.username}</p>
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 text-xs mt-1">
                {opponentRankInfo.icon} {opponentRankInfo.label}
              </Badge>
              {!isRoomCreator && (
                <p className="text-xs text-muted-foreground mt-1">等待房主...</p>
              )}
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground mb-6">
            <p>{boardSize}路棋盘{handicapMode !== 'even' ? '（无贴目）' : ` · 贴目${boardSize <= 9 ? '5.5' : boardSize <= 13 ? '6.5' : '7.5'}目`}</p>
            {handicapMode === 'first' && (
              <p className="text-primary font-medium">让先（黑先下）</p>
            )}
            {handicapMode === 'stones' && (
              <p className="text-primary font-medium">
                让{handicapCount}子，
                {handicapDirection === 'user-gives' ? '对手执黑放子，白先下' : '你执黑放子，白先下'}
              </p>
            )}
          </div>

          {/* 等待状态提示 */}
          {myConfirmed && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-amber-700 text-sm">
                {isRoomCreator ? '正在创建房间...' : '等待房主创建房间...'}
              </p>
            </div>
          )}

          {!myConfirmed ? (
            <Button onClick={handleConfirmStart} className="w-full py-5 text-lg bg-gradient-to-r from-emerald-500 to-teal-600">
              <Swords className="mr-2 h-5 w-5" /> {isRoomCreator ? '创建房间' : '加入游戏'}
            </Button>
          ) : (
            <Button disabled className="w-full py-5 text-lg bg-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {isRoomCreator ? '创建中...' : '等待中...'}
            </Button>
          )}
          <Button variant="ghost" onClick={async () => {
            // 取消确认
            if (user) {
              await supabase
                .from('matchmaking')
                .update({ status: 'matched', black_player_id: null, game_id: null })
                .eq('user_id', user.id);
            }
            setMyConfirmed(false);
            setOpponentConfirmed(false);
            setIsRoomCreator(false);
            setJoinedGameId(null);
          }} className="w-full mt-2">
            取消
          </Button>
        </div>
      </MainLayout>
    );
  }

  // ========== 对弈中 ==========
  if ((matchState === 'playing' || matchState === 'finished') && engine) {
    const isMyTurn = engine.currentPlayer === currentColor;

    return (
      <MainLayout>
        <div className="container px-4 py-4 max-w-lg mx-auto pb-20">
          <div className="flex justify-between items-center mb-3">
            <Button variant="ghost" onClick={() => { setMatchState('idle'); setEngine(null); cleanup(); }} size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> 退出
            </Button>
            <Badge variant="outline">{boardSize}路 · 真人对弈</Badge>
          </div>

          {/* 对手信息 */}
          <Card className={`mb-3 ${!isMyTurn && !engine.gameOver ? 'ring-2 ring-primary' : 'opacity-80'}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-lg shadow">🐼</div>
              <div className="flex-1">
                <p className="font-medium text-sm">{opponent?.nickname || '对手'}</p>
                <p className="text-xs text-muted-foreground">
                  {currentColor === 'black' ? '⚪ 白棋' : '⚫ 黑棋'} · {opponentRankInfo.label}
                  {!isMyTurn && !engine.gameOver && isOpponentThinking && ' · 思考中...'}
                </p>
              </div>
              {/* 对方倒计时 */}
              <div className={`text-lg font-mono font-bold ${(currentColor === 'black' ? blackTime : whiteTime) < 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {currentColor === 'black' ? formatTime(blackTime) : formatTime(whiteTime)}
              </div>
            </CardContent>
          </Card>

          {/* 我的倒计时 */}
          <Card className={`mb-3 ${isMyTurn && !engine.gameOver ? 'ring-2 ring-primary' : 'opacity-80'}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-lg shadow">🦊</div>
              <div className="flex-1">
                <p className="font-medium text-sm">{profile?.nickname || '你'}</p>
                <p className="text-xs text-muted-foreground">
                  {currentColor === 'black' ? '⚫ 黑棋' : '⚪ 白棋'} · {myRankInfo.label}
                  {isMyTurn && !engine.gameOver && ' · 轮到你'}
                </p>
              </div>
              {/* 我的倒计时 */}
              <div className={`text-lg font-mono font-bold ${(currentColor === 'white' ? blackTime : whiteTime) < 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {currentColor === 'white' ? formatTime(blackTime) : formatTime(whiteTime)}
              </div>
            </CardContent>
          </Card>

          {/* 棋盘 */}
          <div className="flex justify-center my-4">
            <GoBoard
              size={boardSize}
              engine={engine}
              onMove={handleMove}
              onVariationMove={isVariationMode ? handleVariationMove : undefined}
              disabled={!isMyTurn && !isVariationMode || engine.gameOver}
              highlightLastMove
              showTerritory={engine.gameOver || showEstimate}
              territoryEstimate={showEstimate ? territoryEstimate : null}
              showVariationMoves={isVariationMode}
            />
          </div>

          {/* 形势判断按钮 */}
          {!engine?.gameOver && (
            <div className="mt-3">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => {
                  const estimate = engine?.estimatePosition() ?? null;
                  const territory = engine?.estimateTerritory() ?? null;
                  setPositionEstimate(estimate);
                  setTerritoryEstimate(territory);
                  setShowEstimate(true);
                }}
              >
                <TrendingUp className="w-4 h-4" /> 形势判断
              </Button>
            </div>
          )}

          {/* 形势判断弹窗 */}
          {showEstimate && positionEstimate && (
            <div className="mt-3">
              <PositionEstimatePanel
                estimate={positionEstimate}
                userIsBlack={currentColor === 'black'}
                onClose={() => setShowEstimate(false)}
              />
            </div>
          )}

          {/* 我的信息 */}
          <Card className={`mt-3 ${isMyTurn && !engine.gameOver ? 'ring-2 ring-primary' : 'opacity-80'}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-lg shadow">🦊</div>
              <div className="flex-1">
                <p className="font-medium text-sm">{profile?.nickname || '你'}</p>
                <p className="text-xs text-muted-foreground">
                  {currentColor === 'black' ? '⚫ 黑棋' : '⚪ 白棋'} · {myRankInfo.label}
                  {isMyTurn && !engine.gameOver && ' · 轮到你了'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 操作 */}
          {!engine.gameOver && (
            <>
              {/* 试下模式操作区 */}
              {isVariationMode ? (
                <div className="mt-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      <FlaskConical className="w-4 h-4" /> 试下模式
                    </span>
                    <span className="text-xs text-muted-foreground">
                      第{(engine?.variationMoves?.length ?? 0) + 1}手
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={handleVariationUndo}
                            className="col-span-1 text-xs">
                      <ChevronLeft className="mr-1 h-3 w-3" />后退
                    </Button>
                    <Button variant="default" size="sm" onClick={handleVariationRedo}
                            disabled={(engine?.variationMoves?.length ?? 0) === 0}
                            className="col-span-1 text-xs bg-blue-600 hover:bg-blue-700">
                      <RotateCcw className="mr-1 h-3 w-3" />前进
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExitVariation}
                            className="col-span-1 text-xs text-destructive hover:text-destructive">
                      <X className="mr-1 h-3 w-3" />退出
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    试下着法用虚线圆圈和数字标记，退出后全部消失
                  </p>
                </div>
              ) : (
                /* 正常操作区 */
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={handlePass}>
                      虚手
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleResign} className="text-destructive">
                      <Flag className="mr-1 h-3 w-3" /> 认输
                    </Button>
                  </div>
                  {/* 试下按钮 */}
                  <Button variant="secondary" size="sm" onClick={handleEnterVariation}
                          className="w-full text-xs">
                    <FlaskConical className="mr-1 h-3 w-3" /> 试下（研究不同着法）
                  </Button>
                </div>
              )}
            </>
          )}

          {/* 对弈结束 */}
          {engine.gameOver && (
            <Card className="mt-4 card-kid">
              <CardContent className="p-4 text-center">
                <span className="text-4xl block mb-2">{gameResult?.winner === currentColor ? '🎉' : '💪'}</span>
                <p className="font-bold text-lg">
                  {gameResult?.winner === currentColor ? '你赢了！' : '对手获胜'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {gameResult?.winner === currentColor ? '太厉害了！你是围棋小英雄！' : '没关系，继续加油！'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {gameResult
                    ? `黑 ${gameResult.blackScore.toFixed(1)} 目 vs 白 ${gameResult.whiteScore.toFixed(1)} 目`
                    : ''}
                </p>
                <div className="flex gap-3 mt-3">
                  <Button onClick={() => { stopSpeak(); setMatchState('idle'); setEngine(null); setGameResult(null); cleanup(); }} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">🎮 返回大厅</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    );
  }

  return null;
}

/** 简单撒花动画组件 */
function ConfettiOverlay() {
  const emojis = ['🎉', '⭐', '🌟', '✨', '🎊', '💫', '🏆', '🥇'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 20 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const duration = 1.5 + Math.random() * 1;
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        return (
          <span
            key={i}
            className="absolute text-2xl confetti-fall"
            style={{
              left: `${left}%`,
              top: '-5%',
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
}

// ============== 形势判断面板 ==============
function PositionEstimatePanel({ estimate, userIsBlack, onClose }: {
  estimate: PositionEstimate; userIsBlack: boolean; onClose: () => void;
}) {
  const phaseLabels: Record<string, string> = { opening: '布局', middlegame: '中盘', endgame: '官子', finished: '终局' };
  const confidenceLabel = estimate.confidence >= 0.9 ? '高' : estimate.confidence >= 0.6 ? '中' : '低';
  const confidenceColor = estimate.confidence >= 0.9 ? 'text-green-600' : estimate.confidence >= 0.6 ? 'text-amber-600' : 'text-gray-400';

  // 计算目数
  const userLead = (userIsBlack ? estimate.leadBy : -estimate.leadBy);
  const leadText = userLead > 0.5 ? `你领先 ${userLead.toFixed(1)} 目` :
                    userLead < -0.5 ? `你落后 ${(-userLead).toFixed(1)} 目` : '局势相当';

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> 形势判断
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 目数领先 */}
        <div className="text-center py-3 mb-3 rounded-lg bg-secondary/50">
          <p className={`text-xl font-bold ${userLead > 0.5 ? 'text-green-600' : userLead < -0.5 ? 'text-red-500' : 'text-muted-foreground'}`}>
            {leadText}
          </p>
        </div>

        {/* 黑白目数详情 */}
        <div className="flex justify-between text-sm mb-2">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-black" />
            <span>黑 {estimate.leadBy > 0 ? '+' : ''}{estimate.leadBy.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>白 {estimate.leadBy < 0 ? '+' : ''}{(-estimate.leadBy).toFixed(1)}</span>
            <span className="w-4 h-4 rounded-full bg-white border border-gray-300" />
          </div>
        </div>

        {/* 阶段和置信度 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded bg-secondary">{phaseLabels[estimate.phase]}</span>
          <span className={confidenceColor}>置信度：{confidenceLabel}</span>
        </div>

        {/* 提示 */}
        {estimate.confidence < 0.8 && (
          <p className="text-[10px] text-amber-500 mt-2 text-center">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            {estimate.confidence < 0.4 ? '布局阶段，目数仅供参考' : '形势仅供参考，终局后精确数子'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
