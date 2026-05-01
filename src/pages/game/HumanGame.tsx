import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import GoBoard from '@/components/GoBoard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/db/supabase';
import { updateGame, getFriends, upsertDailyStat } from '@/db/api';
import { awardGameAchievements } from '@/db/achievements';
import { useAuth } from '@/contexts/AuthContext';
import { GoEngine, type StoneColor, type GoGameResult, type PositionEstimate, type TerritoryEstimate } from '@/lib/go-engine';
import type { GameMove, GameEndType, ScoreDetail } from '@/types/types';
import {
  ArrowLeft, Users, Shuffle, Timer, Loader2,
  Flag, Circle, TrendingUp, AlertCircle,
  FlaskConical, ChevronLeft, X, RotateCcw, Swords, Calculator
} from 'lucide-react';
import { toast } from 'sonner';
import { tryCreateGame, waitForGame, checkForPendingGame } from '@/lib/matchmaking-v3';
import { 
  createFriendInvitation, 
  getReceivedInvitations, 
  acceptFriendInvitation, 
  rejectFriendInvitation,
  subscribeToFriendInvitations,
  subscribeToInvitationAccepted,
  type FriendInvitation 
} from '@/db/api';
import { getRankInfo } from '@/pages/Home';
import {
  playLevelUpSound, playWrongSound,
  speak, stopSpeak, getLevelUpPhrase,
} from '@/lib/sounds';

type MatchState = 'idle' | 'searching' | 'matched' | 'playing' | 'finished' | 'waiting_friend';

interface OnlinePlayer {
  id: string;
  nickname: string | null;
  username: string;
  rating: number;
  updated_at?: string;
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
  const [positionEstimate, setPositionEstimate] = useState<PositionEstimate | null>(null);
  const [territoryEstimate, setTerritoryEstimate] = useState<TerritoryEstimate | null>(null);
  const [showEstimate, setShowEstimate] = useState(false);
  const [isVariationMode, setIsVariationMode] = useState(false);
  const [handicapMode, setHandicapMode] = useState<'even' | 'first' | 'stones'>('even');
  const [handicapCount, setHandicapCount] = useState(2);
  const [handicapDirection, setHandicapDirection] = useState<'user-gives' | 'ai-gives'>('user-gives');
  const [showConfetti, setShowConfetti] = useState(false);
  const [countStoneOpen, setCountStoneOpen] = useState(false);

  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const engineRef = useRef<GoEngine | null>(null);
  const matchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const friendUnsubRef = useRef<(() => void) | null>(null);

  const [blackTime, setBlackTime] = useState(600);
  const [whiteTime, setWhiteTime] = useState(600);

  const getInitialTime = () => {
    switch (timeKey) {
      case '5min': return 300;
      case '10min': return 600;
      case '20min': return 1200;
      case '30min': return 1800;
      default: return 600;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startGameTimer = () => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    const initial = getInitialTime();
    setBlackTime(initial);
    setWhiteTime(initial);

    gameTimerRef.current = setInterval(() => {
      if (currentColor === 'black') {
        setBlackTime(prev => {
          if (prev <= 1) {
            clearInterval(gameTimerRef.current!);
            handleGameTimeout('black');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setWhiteTime(prev => {
          if (prev <= 1) {
            clearInterval(gameTimerRef.current!);
            handleGameTimeout('white');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
  };

  const handleGameTimeout = (loserColor: StoneColor) => {
    const eng = engineRef.current;
    if (eng) {
      const winner = loserColor === 'black' ? 'white' : 'black';
      handleGameEnd(eng, winner, 'timeout');
      toast.error(`${loserColor === 'black' ? '黑棋' : '白棋'}超时！${winner === currentColor ? '你' : '对手'}获胜！`);
    }
  };

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    if (!engine) return;
    setPositionEstimate(engine.estimatePosition());
  }, [engine?.moveHistory.length]);

  useEffect(() => {
    if (user) loadFriends();
    return () => cleanup();
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
    if (friendUnsubRef.current) {
      friendUnsubRef.current();
      friendUnsubRef.current = null;
    }
  };

  const loadFriends = async () => {
    if (!user) return;
    const data = await getFriends(user.id);
    setFriends(data.map(f => ({
      id: f.id,
      nickname: f.nickname,
      username: f.username,
      rating: f.rating,
      updated_at: f.updated_at,
    })));
  };

  // ========== 随机匹配 ==========
  const handleRandomMatch = async () => {
    if (!user) return;

    // 彻底清理旧状态
    cleanup();
    setEngine(null);
    setGameId(null);
    setGameResult(null);
    setOpponent(null);

    // 清理旧的匹配记录
    await supabase.from('matchmaking').delete().eq('user_id', user.id);

    setMatchState('searching');
    setSearchTime(0);

    searchTimerRef.current = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);

    try {
      // 先检查有没有已经在等待的对手
      const { data: existing } = await supabase
        .from('matchmaking')
        .select('user_id')
        .eq('status', 'searching')
        .eq('board_size', boardSize)
        .neq('user_id', user.id)
        .limit(1);

      if (existing && existing.length > 0) {
        // 找到等待中的对手
        const opponentId = existing[0].user_id;

        // 使用 upsert 确保自己的记录存在（避免触发器或并发问题）
        await supabase
          .from('matchmaking')
          .upsert({
            user_id: user.id,
            board_size: boardSize,
            time_control: timeKey,
            status: 'matched',
            matched_with: opponentId,
            rating: profile?.rating ?? 0,
            created_at: new Date().toISOString(),
          });

        // 更新对手的记录
        await supabase
          .from('matchmaking')
          .update({
            status: 'matched',
            matched_with: user.id,
          })
          .eq('user_id', opponentId);

        // 统一通过 handleMatchFound 处理后续逻辑（双方都会走这里）
        await handleMatchFound(opponentId);
        return;
      }

      // 没有对手，进入等待队列
      const { error: upsertError } = await supabase
        .from('matchmaking')
        .upsert({
          user_id: user.id,
          board_size: boardSize,
          time_control: timeKey,
          status: 'searching',
          rating: profile?.rating ?? 0,
          created_at: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;

      // 监听匹配状态
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

      // 备用轮询
      matchPollRef.current = setInterval(async () => {
        if (matchState === 'matched' || matchState === 'playing') {
          clearInterval(matchPollRef.current!);
          matchPollRef.current = null;
          return;
        }
        try {
          const { data: myRecord } = await supabase
            .from('matchmaking')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (myRecord?.status === 'matched' && myRecord?.matched_with) {
            clearInterval(matchPollRef.current!);
            matchPollRef.current = null;
            handleMatchFound(myRecord.matched_with);
          }
        } catch (e) {
          console.error('轮询错误:', e);
        }
      }, 1000);

    } catch (err) {
      toast.error('匹配失败，请重试');
      setMatchState('idle');
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    }
  };

  const handleMatchFound = async (opponentId: string) => {
    // 幂等性保护：如果已经在游戏中或已结束，不再处理
    if (matchState === 'playing' || matchState === 'finished') return;

    // 清理搜索计时器和旧监听
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    if (matchPollRef.current) clearInterval(matchPollRef.current);
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    searchTimerRef.current = null;
    matchPollRef.current = null;

    // 获取对手信息
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', opponentId)
      .maybeSingle();

    if (!data) {
      toast.error('无法获取对手信息');
      setMatchState('idle');
      return;
    }

    const oppData: OnlinePlayer = {
      id: data.id,
      nickname: data.nickname,
      username: data.username,
      rating: data.rating,
    };
    setOpponent(oppData);

    // 获取我的记录，检查是否已有游戏
    const { data: myRecord } = await supabase
      .from('matchmaking')
      .select('created_at, game_id')
      .eq('user_id', user!.id)
      .maybeSingle();

    // 如果已经有 game_id（比如对手已创建），直接进入游戏
    if (myRecord?.game_id) {
      const { data: game } = await supabase
        .from('games')
        .select('black_player_id')
        .eq('id', myRecord.game_id)
        .maybeSingle();
      if (game) {
        const myColor = game.black_player_id === user!.id ? 'black' : 'white';
        setGameId(myRecord.game_id);
        setCurrentColor(myColor);
        setMatchState('playing');
        joinGameRoom(myRecord.game_id, oppData);
        return;
      }
    }

    // 统一由 tryCreateGame 判断创建者，避免前后端判断不一致
    setMatchState('matched');

    // 先尝试创建游戏（内部会判断是否是创建者）
    const result = await tryCreateGame(
      user!.id,
      boardSize,
      timeKey,
      handicapMode,
      handicapCount
    );

    if (result) {
      // 我是创建者，游戏已创建
      setGameId(result.gameId);
      setCurrentColor(result.myColor);
      setMatchState('playing');
      joinGameRoom(result.gameId, oppData);
    } else {
      // 我不是创建者，等待对方创建
      const waitResult = await waitForGame(user!.id, 60000);

      if (waitResult.type === 'game_created') {
        setGameId(waitResult.gameId);
        setCurrentColor(waitResult.myColor);
        setMatchState('playing');
        joinGameRoom(waitResult.gameId, oppData);
      } else if (waitResult.type === 'cancelled') {
        toast.info('匹配已取消');
        setMatchState('idle');
      } else {
        toast.error('等待匹配超时，请重试');
        setMatchState('idle');
      }
    }
  };

  const handleCancelMatch = async () => {
    if (user) {
      await supabase.from('matchmaking').delete().eq('user_id', user.id);
    }
    cleanup();
    setMatchState('idle');
    setSearchTime(0);
  };

  // ========== 好友对战 ==========
  const handleFriendChallenge = async (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend || !user) return;

    // 设置对手信息
    setOpponent({
      id: friend.id,
      nickname: friend.nickname,
      username: friend.username,
      rating: friend.rating,
    });

    // 发起邀请
    const invitation = await createFriendInvitation(
      user.id,
      friendId,
      boardSize,
      timeKey,
      handicapMode,
      handicapCount
    );

    if (!invitation) {
      toast.error('发起对战失败');
      setMatchState('idle');
      return;
    }

    // 进入等待状态
    setMatchState('waiting_friend');
    toast.success(`已向 ${friend.nickname} 发送对战邀请，等待对方响应...`);
  };

  // 处理收到的好友邀请
  const handleIncomingInvitation = async (invitation: FriendInvitation) => {
    if (matchState === 'playing' || matchState === 'waiting_friend') return;
    if (!user) return;

    const inviter = invitation.inviter;
    if (!inviter) return;

    // 弹出确认框
    const confirmed = window.confirm(
      `${inviter.nickname || inviter.username} 邀请你进行 ${invitation.board_size}x${invitation.board_size} 对战，是否接受？`
    );

    if (confirmed) {
      // 接受邀请
      const result = await acceptFriendInvitation(invitation.id, user.id);
      
      if (result.success && result.gameId) {
        // 设置对手信息
        const oppData2: OnlinePlayer = {
          id: inviter.id,
          nickname: inviter.nickname,
          username: inviter.username,
          rating: inviter.rating,
        };
        setOpponent(oppData2);
        
        // 获取我是什么颜色
        const { data: game } = await supabase
          .from('games')
          .select('black_player_id')
          .eq('id', result.gameId)
          .maybeSingle();
        
        const myColor = game?.black_player_id === user.id ? 'black' : 'white';
        
        setGameId(result.gameId);
        setCurrentColor(myColor);
        setMatchState('playing');
        joinGameRoom(result.gameId, oppData2);
      } else {
        toast.error('接受邀请失败');
      }
    } else {
      // 拒绝邀请
      await rejectFriendInvitation(invitation.id, user.id);
      toast.info('已拒绝对战邀请');
    }
  };

  // 监听好友邀请
  useEffect(() => {
    if (!user) return;

    // 获取已有的邀请
    getReceivedInvitations(user.id).then(invitations => {
      invitations.forEach(handleIncomingInvitation);
    });

    // 监听新邀请
    const unsubscribeInvite = subscribeToFriendInvitations(user.id, handleIncomingInvitation);
    
    // 监听我发起的邀请是否被接受（邀请方）
    const unsubscribeAccept = subscribeToInvitationAccepted(user.id, (gameId, myColor) => {
      setGameId(gameId);
      setCurrentColor(myColor);
      setMatchState('playing');
      joinGameRoom(gameId);
    });

    return () => {
      unsubscribeInvite();
      unsubscribeAccept();
    };
  }, [user, matchState]);

  const joinGameRoom = async (gId: string, opponentOverride?: OnlinePlayer) => {
    const opp = opponentOverride || opponent;
    if (!user || !opp) return;

    setGameId(gId);

    const { data: gameData, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gId)
      .maybeSingle();

    if (error || !gameData) {
      toast.error('加入游戏失败');
      setMatchState('idle');
      return;
    }

    const userIsBlack = gameData.black_player_id === user.id;
    initGameEngine(userIsBlack, gId);
  };

  const initGameEngine = (userIsBlack: boolean, gId: string) => {
    const komiValue = handicapMode === 'even' 
      ? (boardSize <= 9 ? 5.5 : boardSize <= 13 ? 6.5 : 7.5)
      : 0;

    const newEngine = new GoEngine(boardSize, komiValue);

    if (handicapMode === 'stones') {
      newEngine.setHandicap(handicapCount);
      if (handicapDirection === 'ai-gives') {
        newEngine.placeHandicapAsWhite();
        setCurrentColor('black');
      } else {
        newEngine.placeHandicap();
        setCurrentColor('white');
      }
    } else {
      setCurrentColor(userIsBlack ? 'black' : 'white');
    }

    setEngine(newEngine);
    engineRef.current = newEngine;
    setMatchState('playing');
    startGameTimer();

    const handicapText = handicapCount > 0 ? `（${handicapCount}子局）` : '（猜先）';
    const colorText = userIsBlack ? '执黑' : '执白';
    toast.success(`对弈开始！${handicapText}你${colorText}`);

    subscribeToOpponentMoves(gId);
  };

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
        const move = payload.new as { row: number; col: number; player: string; user_id: string };
        const eng = engineRef.current;
        if (!eng || eng.gameOver) return;

        if (move.user_id === user?.id) return;

        // 对手虚手（pass）
        if (move.row === -1 && move.col === -1) {
          eng.pass();
          setEngine(Object.assign(Object.create(Object.getPrototypeOf(eng)), eng));
          setCurrentColor(eng.currentPlayer);
          setIsOpponentThinking(false);
          toast.info('对手选择了虚手');
          if (eng.consecutivePasses >= 2) {
            handleGameEnd(eng);
          }
          return;
        }

        if (eng.isValidMove(move.row, move.col)) {
          eng.placeStone(move.row, move.col);
          setEngine(Object.assign(Object.create(Object.getPrototypeOf(eng)), eng));
          setCurrentColor(eng.currentPlayer);
          setIsOpponentThinking(false);
        }
      })
      .subscribe();

    subscriptionRef.current = channel;
  };

  const handleMove = useCallback(async (row: number, col: number, eng: GoEngine) => {
    if (!eng || eng.gameOver) return;

    const myColor = eng.currentPlayer === 'black' ? 'white' : 'black';

    setEngine(Object.assign(Object.create(Object.getPrototypeOf(eng)), eng));
    setCurrentColor(eng.currentPlayer);
    setIsOpponentThinking(true);

    if (gameId) {
      await supabase.from('game_moves').insert({
        game_id: gameId,
        move_number: eng.getMoveCount(),
        row,
        col,
        player: myColor,
        user_id: user?.id,
        created_at: new Date().toISOString(),
      });
    }
  }, [gameId, user]);

  const handleGameEnd = (eng: GoEngine, winnerOverride?: StoneColor, endType: GameEndType = 'score') => {
    const result = eng.calculateScore(true);
    if (winnerOverride) result.winner = winnerOverride;
    setGameResult(result);
    setPositionEstimate(eng.estimatePosition());

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

    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const userWon = result.winner === currentColor;
      upsertDailyStat(user.id, today, {
        games_played: 1,
        games_won: userWon ? 1 : 0,
      }).catch(console.error);

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

  const handlePass = async () => {
    if (!engine || engine.gameOver) return;
    engine.pass();
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
    setCurrentColor(engine.currentPlayer);
    toast.info('你选择了虚手');
    setIsOpponentThinking(true);

    // 同步 pass 到对手
    if (gameId) {
      await supabase.from('game_moves').insert({
        game_id: gameId,
        move_number: engine.getMoveCount(),
        row: -1,
        col: -1,
        player: currentColor,
        user_id: user?.id,
        created_at: new Date().toISOString(),
      });
    }

    if (engine.consecutivePasses >= 2) {
      handleGameEnd(engine);
    }
  };

  /** 申请数子 */
  const handleRequestCount = async () => {
    if (!engine || engine.gameOver) return;
    // 玩家先 pass
    engine.pass();
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
    setCurrentColor(engine.currentPlayer);
    toast.info('已申请数子，等待对手回应...');
    setIsOpponentThinking(true);

    // 同步 pass 到对手
    if (gameId) {
      await supabase.from('game_moves').insert({
        game_id: gameId,
        move_number: engine.getMoveCount(),
        row: -1,
        col: -1,
        player: currentColor,
        user_id: user?.id,
        created_at: new Date().toISOString(),
      });
    }

    // 如果对手之前已经 pass 过，双方连续虚手直接终局
    if (engine.consecutivePasses >= 2) {
      handleGameEnd(engine);
      setCountStoneOpen(true);
    }
    // 否则等待对手也 pass（通过 subscribeToOpponentMoves 监听）
  };

  const handleResign = () => {
    if (!engine) return;
    const winner = engine.resign();
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
    handleGameEnd(engine, winner, 'resign');
    toast.info('你认输了');
  };

  const handleEnterVariation = () => {
    if (!engine || engine.gameOver) return;
    engine.enterVariationMode();
    setIsVariationMode(true);
    toast.info('已进入试下模式，可以尝试不同的着法');
  };

  const handleVariationMove = useCallback((row: number, col: number, eng: GoEngine) => {
    eng.addVariationMove(row, col);
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(eng)), eng));
  }, []);

  const handleVariationUndo = () => {
    if (!engine) return;
    engine.undoVariationMove();
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
  };

  const handleVariationRedo = () => {
    if (!engine) return;
    const moveCount = engine.getVariationMoveCount();
    if (engine.variationMoves && engine.variationMoves.length < moveCount) {
      const nextMove = engine.variationMoves[engine.variationMoves.length];
      if (nextMove) {
        engine.addVariationMove(nextMove.row, nextMove.col);
        setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
      }
    }
  };

  const handleExitVariation = () => {
    if (!engine) return;
    engine.exitVariationMode();
    setIsVariationMode(false);
    toast.info('已退出试下模式');
  };

  const myRankInfo = getRankInfo(profile?.rating ?? 0);
  const opponentRankInfo = getRankInfo(opponent?.rating ?? 0);

  // ========== 空闲状态 ==========
  if (matchState === 'idle') {
    return (
      <MainLayout>
        {showConfetti && <ConfettiOverlay />}
        <div className="container px-4 py-6 max-w-md mx-auto pb-20">
          <Button variant="ghost" onClick={() => navigate('/game')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> 返回对弈中心
          </Button>

          <h1 className="text-xl font-bold mb-4">真人对弈</h1>

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
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">让子数</label>
                      <Select value={handicapCount.toString()} onValueChange={(v) => setHandicapCount(Number(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2,3,4,5,6,7,8,9].map(n => (
                            <SelectItem key={n} value={n.toString()}>让{n}子</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
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
        {showConfetti && <ConfettiOverlay />}
        <div className="container px-4 py-8 max-w-md mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-bold mb-2">正在寻找对手...</h2>
            <p className="text-muted-foreground">已等待 {searchTime} 秒</p>
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
        {showConfetti && <ConfettiOverlay />}
        <div className="container px-4 py-8 max-w-md mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center mb-4 relative">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
            <h2 className="text-xl font-bold mb-2">匹配成功！</h2>
            <p className="text-muted-foreground">正在创建游戏房间...</p>
          </div>

          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl shadow-lg mx-auto mb-2">
                🦊
              </div>
              <p className="font-medium text-sm">{profile?.nickname || '你'}</p>
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 text-xs mt-1">
                {myRankInfo.icon} {myRankInfo.label}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-primary">VS</div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-2xl shadow-lg mx-auto mb-2">
                🐼
              </div>
              <p className="font-medium text-sm">{opponent.nickname || opponent.username}</p>
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 text-xs mt-1">
                {opponentRankInfo.icon} {opponentRankInfo.label}
              </Badge>
            </div>
          </div>

          <div className="mb-6 p-3 bg-secondary/50 rounded-lg">
            <p className="text-sm">
              {boardSize}路棋盘 · 
              {handicapMode === 'even' ? `贴目${boardSize <= 9 ? '5.5' : boardSize <= 13 ? '6.5' : '7.5'}` : 
               handicapMode === 'first' ? '让先' : `让${handicapCount}子`}
            </p>
          </div>

          <Button variant="outline" onClick={handleCancelMatch}>
            取消匹配
          </Button>
        </div>
      </MainLayout>
    );
  }

  // ========== 对弈中 ==========
  if ((matchState === 'playing' || matchState === 'finished') && engine) {
    const myColor = currentColor;
    const isMyTurn = engine.currentPlayer === myColor;

    return (
      <MainLayout>
        {showConfetti && <ConfettiOverlay />}
        <div className="container px-4 py-4 max-w-lg mx-auto pb-20">
          <div className="flex justify-between items-center mb-3">
            <Button variant="ghost" onClick={() => { setMatchState('idle'); setEngine(null); cleanup(); }} size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> 退出
            </Button>
            <Badge variant="outline">{boardSize}路 · 真人对弈</Badge>
          </div>

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
              <div className={`text-lg font-mono font-bold ${(currentColor === 'black' ? blackTime : whiteTime) < 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {currentColor === 'black' ? formatTime(blackTime) : formatTime(whiteTime)}
              </div>
            </CardContent>
          </Card>

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
              <div className={`text-lg font-mono font-bold ${(currentColor === 'white' ? blackTime : whiteTime) < 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {currentColor === 'white' ? formatTime(blackTime) : formatTime(whiteTime)}
              </div>
            </CardContent>
          </Card>

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

          {showEstimate && positionEstimate && (
            <div className="mt-3">
              <PositionEstimatePanel
                estimate={positionEstimate}
                userIsBlack={currentColor === 'black'}
                onClose={() => setShowEstimate(false)}
              />
            </div>
          )}

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

          {!engine.gameOver && (
            <>
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
                    <Button variant="outline" size="sm" onClick={handleVariationUndo} className="col-span-1 text-xs">
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
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={handlePass}>虚手</Button>
                    <Button variant="outline" size="sm" onClick={handleRequestCount}
                            disabled={isOpponentThinking}
                            className="flex items-center justify-center gap-0.5">
                      <Calculator className="w-3 h-3" /> 数子
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleResign} className="text-destructive">
                      <Flag className="mr-1 h-3 w-3" /> 认输
                    </Button>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleEnterVariation} className="w-full text-xs">
                    <FlaskConical className="mr-1 h-3 w-3" /> 试下（研究不同着法）
                  </Button>
                </div>
              )}
            </>
          )}

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

                {/* 数子得分详情 */}
                {gameResult && (
                  <div className="mt-3 p-3 bg-secondary/50 rounded-lg text-left space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>⚫ 黑方</span>
                      <span className="font-bold">{gameResult.blackScore.toFixed(1)} 目</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>⚪ 白方</span>
                      <span className="font-bold">{gameResult.whiteScore.toFixed(1)} 目</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground border-t pt-1">
                      <span>贴目</span>
                      <span>{gameResult.komi} 目</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-1">
                      <p>⚫ 黑子 {gameResult.details.blackStones} + 黑地 {gameResult.details.blackTerritory} = {gameResult.blackScore.toFixed(1)}</p>
                      <p>⚪ 白子 {gameResult.details.whiteStones} + 白地 {gameResult.details.whiteTerritory} + 贴目 {gameResult.details.whiteKomi} = {gameResult.whiteScore.toFixed(1)}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-3">
                  <Button onClick={() => { stopSpeak(); setMatchState('idle'); setEngine(null); setGameResult(null); cleanup(); }} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
                    🎮 返回大厅
                  </Button>
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

// ========== 辅助组件 ==========
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

function PositionEstimatePanel({ estimate, userIsBlack, onClose }: {
  estimate: PositionEstimate; userIsBlack: boolean; onClose: () => void;
}) {
  const phaseLabels: Record<string, string> = { opening: '布局', middlegame: '中盘', endgame: '官子', finished: '终局' };
  const confidenceLabel = estimate.confidence >= 0.9 ? '高' : estimate.confidence >= 0.6 ? '中' : '低';
  const confidenceColor = estimate.confidence >= 0.9 ? 'text-green-600' : estimate.confidence >= 0.6 ? 'text-amber-600' : 'text-gray-400';

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

        <div className="text-center py-3 mb-3 rounded-lg bg-secondary/50">
          <p className={`text-xl font-bold ${userLead > 0.5 ? 'text-green-600' : userLead < -0.5 ? 'text-red-500' : 'text-muted-foreground'}`}>
            {leadText}
          </p>
        </div>

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

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded bg-secondary">{phaseLabels[estimate.phase]}</span>
          <span className={confidenceColor}>置信度：{confidenceLabel}</span>
        </div>

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
