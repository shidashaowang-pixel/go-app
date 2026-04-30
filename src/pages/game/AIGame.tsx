import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import GoBoard from '@/components/GoBoard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createGame, updateGame, upsertDailyStat } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { GameMove, GameEndType, ScoreDetail } from '@/types';
import {
  ArrowLeft, Undo2, Flag, Trophy, RotateCcw,
  Timer, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, Eye, Heart,
  BookOpen, Zap, Crown, Calculator, TrendingUp, AlertCircle, FlaskConical, X, Check, Minus
} from 'lucide-react';
import { GoEngine, type GoGameResult, type StoneColor, type PositionEstimate } from '@/lib/go-engine';
import { getAIMove, getAdvancedAILastStatus, type AIDifficulty } from '@/lib/ai-engine';
import { getRankInfo } from '@/pages/Home';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  playCorrectSound, playWrongSound, playLevelUpSound,
  speak, stopSpeak, getCorrectPhrase, getLevelUpPhrase,
} from '@/lib/sounds';

// ============== AI难度段位映射 ==============
const AI_RANK_MAP: Record<AIDifficulty, { label: string; rankLabel: string; desc: string }> = {
  beginner:  { label: '初级', rankLabel: '18K', desc: '随机落子，适合初学' },
  intermediate: { label: '中级', rankLabel: '10K', desc: '启发式AI，需要基础' },
  advanced:  { label: '高级', rankLabel: '1K', desc: '强化启发式AI，深度思考' },
};

// ============== 时间设置类型 ==============
interface TimeControl {
  mainTime: number;      // 基础时间（秒）
  byoyomi: number;       // 读秒（每步秒数）
  byoyomiPeriods: number; // 读秒次数
}

const TIME_PRESETS: Record<string, TimeControl & { label: string }> = {
  '10min':   { label: '10分钟快棋',    mainTime: 600,  byoyomi: 15, byoyomiPeriods: 3 },
  '20min':   { label: '20分钟标准',     mainTime: 1200, byoyomi: 30, byoyomiPeriods: 3 },
  '30min':   { label: '30分钟慢棋',     mainTime: 1800, byoyomi: 30, byoyomiPeriods: 5 },
  '60min':   { label: '60分钟深度对弈',  mainTime: 3600, byoyomi: 60, byoyomiPeriods: 5 },
  'byoyomi': { label: '纯读秒(30s×5)',   mainTime: 0,    byoyomi: 30, byoyomiPeriods: 5 },
};

type ClockState = {
  blackMain: number;
  blackByoyomi: number;
  blackPeriods: number;
  whiteMain: number;
  whiteByoyomi: number;
  whitePeriods: number;
  blackInByoyomi: boolean;
  whiteInByoyomi: boolean;
};

// ============== 对局计时器（含读秒） ==============
function useGameClock(
  timeKey: string, gameStarted: boolean, gameOver: boolean,
  currentPlayer: StoneColor, isAIThinking: boolean
) {
  const preset = TIME_PRESETS[timeKey] || TIME_PRESETS['20min'];
  const [clock, setClock] = useState<ClockState>({
    blackMain: preset.mainTime, blackByoyomi: preset.byoyomi, blackPeriods: preset.byoyomiPeriods,
    whiteMain: preset.mainTime, whiteByoyomi: preset.byoyomi, whitePeriods: preset.byoyomiPeriods,
    blackInByoyomi: false, whiteInByoyomi: false,
  });
  
  // 使用 ref 追踪状态，避免 effect 频繁重置
  const currentPlayerRef = useRef(currentPlayer);
  const isAIThinkingRef = useRef(isAIThinking);
  useEffect(() => { currentPlayerRef.current = currentPlayer; }, [currentPlayer]);
  useEffect(() => { isAIThinkingRef.current = isAIThinking; }, [isAIThinking]);

  useEffect(() => {
    const p = TIME_PRESETS[timeKey] || TIME_PRESETS['20min'];
    setClock({
      blackMain: p.mainTime, blackByoyomi: p.byoyomi, blackPeriods: p.byoyomiPeriods,
      whiteMain: p.mainTime, whiteByoyomi: p.byoyomi, whitePeriods: p.byoyomiPeriods,
      blackInByoyomi: false, whiteInByoyomi: false,
    });
  }, [timeKey]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    
    const preset = TIME_PRESETS[timeKey] || TIME_PRESETS['20min'];
    
    const interval = setInterval(() => {
      setClock(prev => {
        if (gameOver) return prev;
        
        // 使用 ref 获取最新状态
        const player = currentPlayerRef.current;
        const aiThinking = isAIThinkingRef.current;
        
        // 扣除轮到走棋那方的时间
        // AI 思考时 player 是 AI，扣除 AI 时间
        // 玩家回合时 player 是玩家，扣除玩家时间
        return {
          ...prev,
          ...(player === 'black' 
            ? tickPlayerClock('black', prev, preset.byoyomi) 
            : tickPlayerClock('white', prev, preset.byoyomi)
          ),
        };
      });
    }, 200);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, timeKey]); // 移除所有依赖，只依赖 closure

  const formatTime = (main: number, byo: number, inByo: boolean) => {
    if (!inByo && main > 0) {
      const m = Math.floor(main / 60); const s = Math.floor(main % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    // 读秒阶段：显示剩余秒数，至少显示 1
    return `${Math.max(1, Math.floor(byo))}s`;
  };

  const isTimeOut = (clock.blackInByoyomi && clock.blackByoyomi <= 0 && clock.blackPeriods <= 0)
                  || (clock.whiteInByoyomi && clock.whiteByoyomi <= 0 && clock.whitePeriods <= 0);
  const timedOutPlayer: StoneColor | null =
    (clock.blackInByoyomi && clock.blackByoyomi <= 0 && clock.blackPeriods <= 0) ? 'black'
    : (clock.whiteInByoyomi && clock.whiteByoyomi <= 0 && clock.whitePeriods <= 0) ? 'white' : null;

  // 落子时调用
  const onMove = (player: StoneColor) => {
    const preset = TIME_PRESETS[timeKey] || TIME_PRESETS['20min'];
    setClock(prev => {
      if (player === 'black') {
        if (prev.blackInByoyomi) {
          // 读秒中落子：重置读秒时间，不扣 periods
          return { ...prev, blackByoyomi: preset.byoyomi };
        }
        // 基础时间中落子：不做处理
        return prev;
      } else {
        if (prev.whiteInByoyomi) {
          // 读秒中落子：重置读秒时间，不扣 periods
          return { ...prev, whiteByoyomi: preset.byoyomi };
        }
        return prev;
      }
    });
  };

  return { clock, formatTime, isTimeOut, timedOutPlayer, onMove };
}

function tickPlayerClock(player: 'black' | 'white', prev: ClockState, byoyomiTime: number = 30): Partial<ClockState> {
  const main = player === 'black' ? prev.blackMain : prev.whiteMain;
  const inByo = player === 'black' ? prev.blackInByoyomi : prev.whiteInByoyomi;
  const byo = player === 'black' ? prev.blackByoyomi : prev.whiteByoyomi;
  const periods = player === 'black' ? prev.blackPeriods : prev.whitePeriods;

  if (!inByo && main > 0) {
    const newMain = Math.max(0, main - 0.2);
    const newInByo = newMain <= 0;
    return player === 'black'
      ? { blackMain: newMain, blackInByoyomi: newInByo }
      : { whiteMain: newMain, whiteInByoyomi: newInByo };
  }
  if (inByo) {
    const newByo = Math.max(0, byo - 0.2);
    if (newByo <= 0 && periods > 0) {
      // 读秒时间用完，扣1次periods并重置读秒时间
      const newPeriods = periods - 1;
      return player === 'black'
        ? { blackByoyomi: byoyomiTime, blackPeriods: newPeriods, blackInByoyomi: newPeriods > 0 }
        : { whiteByoyomi: byoyomiTime, whitePeriods: newPeriods, whiteInByoyomi: newPeriods > 0 };
    }
    return player === 'black' ? { blackByoyomi: newByo } : { whiteByoyomi: newByo };
  }
  return {};
}

// ============== 健康提醒 ==============
function useHealthReminder(gameStarted: boolean, gameOver: boolean) {
  const [showReminder, setShowReminder] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const lastReminderRef = useRef<number>(0);

  useEffect(() => {
    if (!gameStarted || gameOver) { startTimeRef.current = null; return; }
    if (!startTimeRef.current) { startTimeRef.current = Date.now(); lastReminderRef.current = Date.now(); }
    const interval = setInterval(() => {
      if (Date.now() - lastReminderRef.current >= 10 * 60 * 1000) {
        setShowReminder(true); lastReminderRef.current = Date.now();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  const getPlayDuration = () => {
    if (!startTimeRef.current) return '';
    const m = Math.floor((Date.now() - startTimeRef.current) / 60000);
    return m < 1 ? '不到1分钟' : `${m}分钟`;
  };
  return { showReminder, dismissReminder: () => setShowReminder(false), getPlayDuration };
}

// ============== 棋谱回放 ==============
interface ReplayState { moves: { row: number; col: number; color: StoneColor }[]; currentStep: number; isPlaying: boolean; isReplayMode: boolean; }

function useGameReplay() {
  const [replay, setReplay] = useState<ReplayState>({ moves: [], currentStep: 0, isPlaying: false, isReplayMode: false });
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const enterReplayMode = (moves: { row: number; col: number; color: StoneColor }[]) =>
    setReplay({ moves: moves.filter(m => m.row >= 0), currentStep: 0, isPlaying: false, isReplayMode: true });

  const exitReplayMode = () => { if (playTimerRef.current) clearInterval(playTimerRef.current); setReplay(p => ({ ...p, isReplayMode: false, isPlaying: false })); };
  const goToStep = (step: number) => setReplay(p => ({ ...p, currentStep: Math.max(0, Math.min(step, p.moves.length)) }));

  useEffect(() => {
    if (replay.isPlaying) playTimerRef.current = setInterval(() => setReplay(p => p.currentStep >= p.moves.length ? { ...p, isPlaying: false } : { ...p, currentStep: p.currentStep + 1 }), 800);
    else if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
    return () => { if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; } };
  }, [replay.isPlaying]);

  return {
    replay, enterReplayMode, exitReplayMode,
    goForward: () => goToStep(replay.currentStep + 1),
    goBack: () => goToStep(replay.currentStep - 1),
    goToStart: () => goToStep(0),
    goToEnd: () => goToStep(replay.moves.length),
    toggleAutoPlay: () => setReplay(p => ({ ...p, isPlaying: !p.isPlaying })),
    goToStep,
  };
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

// ============== 双方头像组件 ==============
function PlayerCard({
  side, name, avatarUrl, avatarFallback, rankLabel, timeStr, isActive, isThinking, isLowTime,
}: {
  side: 'top' | 'bottom'; name: string; avatarUrl?: string | null; avatarFallback?: string; rankLabel: string;
  timeStr: string; isActive: boolean; isThinking?: boolean; isLowTime?: boolean;
}) {
  return (
    <Card className={`overflow-hidden border transition-all ${isActive ? 'ring-2 ring-primary shadow-md scale-[1.02]' : 'opacity-80'}`}>
      <CardContent className="p-3 flex items-center gap-3">
        {/* 头像 */}
        <div className={`relative shrink-0 ${side === 'top' ? 'order-first' : ''}`}>
          <Avatar className={`w-12 h-12 shadow-md ring-2 ${
            side === 'top' ? 'ring-slate-200' : 'ring-white'
          }`}>
            <AvatarImage src={avatarUrl || undefined} alt={name} />
            <AvatarFallback className={`text-lg ${
              side === 'top' ? 'bg-gradient-to-br from-slate-600 to-slate-800 text-white' : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
            }`}>
              {avatarFallback || (side === 'top' ? '🤖' : '🦊')}
            </AvatarFallback>
          </Avatar>
          {(isActive || isThinking) && (
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${
              isThinking ? 'bg-amber-400 animate-pulse ring-2 ring-white' : 'bg-primary ring-2 ring-white'
            }`} />
          )}
        </div>
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="font-bold text-sm truncate max-w-[100px]">{name}</span>
            <span className="text-[10px] px-1.5 py-0 rounded font-bold bg-secondary text-muted-foreground">{rankLabel}</span>
          </div>
          {isThinking ? (
            <span className="text-xs text-amber-500 animate-pulse flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
              思考中...
            </span>
          ) : (
            <span className={`font-mono text-base font-bold ${isLowTime ? 'text-destructive animate-pulse' : ''}`}>
              {timeStr}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============== 主组件 ==============
export default function AIGame() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [difficulty, setDifficulty] = useState<AIDifficulty>('beginner');
  const [boardSize, setBoardSize] = useState(9);
  const [timeKey, setTimeKey] = useState('20min');
  const [gameStarted, setGameStarted] = useState(false);
  const [engine, setEngine] = useState<GoEngine | null>(null);
  const [gameResult, setGameResult] = useState<GoGameResult | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [capturedBlack, setCapturedBlack] = useState(0);
  const [capturedWhite, setCapturedWhite] = useState(0);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const aiThinkingRef = useRef(false);
  const [undoCount, setUndoCount] = useState(0);
  const maxUndos = 3;
  const [countStoneOpen, setCountStoneOpen] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  // 试下模式状态
  const [isVariationMode, setIsVariationMode] = useState(false);

  // 让子设置
  const [handicapMode, setHandicapMode] = useState<'even' | 'first' | 'stones'>('even'); // 分先/让先/让子
  const [handicapCount, setHandicapCount] = useState(2); // 让子数量(2-9)
  const [handicapDirection, setHandicapDirection] = useState<'user-gives' | 'ai-gives'>('user-gives'); // 让子方向

  // 计时器
  const { clock, formatTime, isTimeOut, timedOutPlayer, onMove: onClockMove } = useGameClock(
    timeKey, gameStarted, engine?.gameOver ?? false,
    engine?.currentPlayer ?? 'black', isAIThinking
  );

  // 健康提醒
  const { showReminder, dismissReminder, getPlayDuration } = useHealthReminder(gameStarted, engine?.gameOver ?? false);
  // 棋谱回放
  const replayControls = useGameReplay();
  // 形势判断
  const [positionEstimate, setPositionEstimate] = useState<PositionEstimate | null>(null);
  const [showEstimate, setShowEstimate] = useState(false); // 形势判断弹窗
  // 庆祝彩带
  const [showConfetti, setShowConfetti] = useState(false);

  // 超时处理
  useEffect(() => {
    if (isTimeOut && engine && !engine.gameOver) {
      const winner: StoneColor = timedOutPlayer === 'black' ? 'white' : 'black';
      engine.gameOver = true;
      handleGameEnd(engine, winner, 'timeout');
      toast.error(timedOutPlayer === 'black' ? '你超时了！' : 'AI超时了！');
    }
  }, [isTimeOut, timedOutPlayer, engine]);

  // 形势判断定时更新（节流：每3手更新一次，避免性能问题）
  const lastEstimateMoveRef = useRef(0);
  useEffect(() => {
    if (engine && gameStarted && !engine.gameOver) {
      // 优化：每3手才更新一次形势判断，减少计算量
      const moveDiff = moveCount - lastEstimateMoveRef.current;
      if (moveDiff >= 3) {
        setPositionEstimate(engine.estimatePosition());
        lastEstimateMoveRef.current = moveCount;
      }
    }
  }, [moveCount, engine?.gameOver, gameStarted, engine]);

  // 计算用户是否执黑
  const getUserIsBlack = (engine?: GoEngine): boolean => {
    if (handicapMode === 'even') {
      return engine ? engine.blackPlayerGoesFirst : Math.random() < 0.5;
    } else if (handicapMode === 'first') {
      return true; // 让先用户执黑
    } else {
      return handicapDirection === 'ai-gives'; // 让子时根据方向决定
    }
  };

  const syncEngine = (eng: GoEngine) => {
    setMoveCount(eng.getMoveCount());
    setCapturedBlack(eng.capturedStones.black);
    setCapturedWhite(eng.capturedStones.white);
    setEngine(Object.assign(Object.create(Object.getPrototypeOf(eng)), eng));
  };

  // ============== AI服务懒加载 ==============
  const [aiStarting, setAiStarting] = useState(false);
  const [aiStartError, setAiStartError] = useState<string | null>(null);

  const ensureAIServicesRunning = useCallback(async (difficulty: AIDifficulty) => {
    // 根据难度确定需要哪个服务
    const serviceName = difficulty === 'beginner' ? 'beginner' : 
                       difficulty === 'intermediate' ? 'intermediate' : 'katago';
    const expectedPort = difficulty === 'beginner' ? 5002 : 
                        difficulty === 'intermediate' ? 5001 : 5000;
    
    // 先检查服务是否已运行
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const response = await fetch(`http://localhost:${expectedPort}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        console.log(`[AI] Service on port ${expectedPort} is running`);
        return true;
      }
    } catch {}

    // 服务未运行，尝试启动
    console.log(`[AI] Service on port ${expectedPort} not running, trying to start...`);
    setAiStarting(true);
    setAiStartError(null);

    try {
      // 尝试通过启动器启动
      const launcherUrl = 'http://localhost:4999';
      const endpoint = `/start-${serviceName}`;
      
      const response = await Promise.race([
        fetch(launcherUrl + endpoint),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]).catch(() => null);

      if (response?.ok) {
        console.log(`[AI] Start command sent via launcher`);
        // 等待服务启动
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const check = await fetch(`http://localhost:${expectedPort}/health`);
            if (check.ok) {
              console.log(`[AI] Service started successfully on port ${expectedPort}`);
              setAiStarting(false);
              return true;
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn(`[AI] Launcher not available: ${e}`);
    }

    // 启动器不可用，检查是否有手动启动的服务
    // 如果有直接运行的服务（端口已开放），也可以使用
    try {
      const check = await fetch(`http://localhost:${expectedPort}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: [], current_player: 1, size: 19 }),
      });
      if (check.ok || check.status === 400) {  // 400表示服务在运行但请求格式问题
        setAiStarting(false);
        return true;
      }
    } catch {}

    setAiStarting(false);
    setAiStartError(`无法启动${difficulty === 'beginner' ? '初级' : difficulty === 'intermediate' ? '中级' : '高级'}AI服务，请手动运行: backend/启动全部服务.bat`);
    return false;
  }, []);

  const handleStartGame = async () => {
    // 尝试确保AI服务运行（但不阻塞游戏开始）
    const ready = await ensureAIServicesRunning(difficulty);
    if (!ready) {
      // 后端服务不可用，但游戏仍可继续（会使用本地后备算法）
      const serviceName = difficulty === 'beginner' ? '初级' : difficulty === 'intermediate' ? '中级' : '高级';
      toast.warning(`${serviceName}AI后端未启动，将使用本地算法代替`);
    }

    // 根据模式设置贴目
    let komiValue: number;
    if (handicapMode === 'even') {
      // 分先：有贴目
      komiValue = boardSize <= 9 ? 5.5 : boardSize <= 13 ? 6.5 : 7.5;
    } else {
      // 让先/让子：无贴目
      komiValue = 0;
    }
    const newEngine = new GoEngine(boardSize, komiValue);

    if (handicapMode === 'even') {
      // 分先：有贴目，随机黑白
      const blackGoesFirst = Math.random() < 0.5;
      newEngine.blackPlayerGoesFirst = blackGoesFirst;
    } else if (handicapMode === 'first') {
      // 让先：无贴目，黑先下
      newEngine.blackPlayerGoesFirst = true;
    } else {
      // 让子：无贴目，被让方执黑放子，白先下
      newEngine.setHandicap(handicapCount);
      if (handicapDirection === 'user-gives') {
        // AI执黑放子
        newEngine.placeHandicap();
      } else {
        // 用户执黑放子
        newEngine.placeHandicapAsWhite();
      }
    }

    setEngine(newEngine); setGameStarted(true); setGameResult(null);
    setMoveCount(0); setCapturedBlack(0); setCapturedWhite(0);
    setIsAIThinking(false); setUndoCount(0); aiThinkingRef.current = false;
    startTimeRef.current = Date.now();
    setGameId(null);

    // 尝试在数据库创建对局记录（可选，失败不影响本地对弈）
    if (user) {
      try {
        const game = await createGame({ type: 'ai', status: 'ongoing', result: null, black_player_id: user.id, white_player_id: null, ai_difficulty: difficulty, board_size: boardSize, moves: [], end_type: null, score_detail: null, black_captures: 0, white_captures: 0, move_count: 0, duration_seconds: null });
        setGameId(game?.id ?? null);
      } catch { /* 数据库不可用，不影响对弈 */ }
    }

    const handicapText = handicapMode === 'stones' ? `（${handicapCount}子局）` : handicapMode === 'first' ? '（让先）' : '（分先）';
    toast.success(`对弈开始！${handicapText}`);
  };

  const advancedBackendWarnedRef = useRef(false);

  const warnAdvancedBackendIfNeeded = useCallback(() => {
    if (difficulty !== 'advanced') return;
    const status = getAdvancedAILastStatus();
    if (status.ok) return;
    if (advancedBackendWarnedRef.current) return;
    advancedBackendWarnedRef.current = true;
    toast.warning(`高级AI后端未连通，已自动回退到本地AI。后端地址：${status.url}`, { duration: 7000 });
  }, [difficulty]);

  const handlePlayerMove = useCallback(async (row: number, col: number, eng: GoEngine) => {
    if (!eng || aiThinkingRef.current || eng.gameOver) return;

    // AI 思考期间禁用棋盘（立即设置，不等 React 渲染）
    setIsAIThinking(true);
    aiThinkingRef.current = true;
    
    // 同步当前局面
    syncEngine(eng);
    
    // 根据让子设置和让子方向确定玩家颜色
    const userIsBlack = getUserIsBlack(eng);
    const playerColor: StoneColor = userIsBlack ? 'black' : 'white';
    const aiColor: StoneColor = userIsBlack ? 'white' : 'black';
    
    // 更新计时器
    onClockMove(playerColor);
    
    // 更新手数显示
    setMoveCount(eng.getMoveCount());

    try {
      if (!eng.gameOver) {
        // AI思考并落子
        const aiMove = await getAIMove(eng, difficulty, aiColor);
        warnAdvancedBackendIfNeeded();
        
        if (aiMove && !eng.gameOver) { 
          // 验证落子是否合法
          const [row, col] = aiMove;
          if (eng.isValidMove(row, col)) {
            eng.placeStone(row, col); 
            // 强制创建新的 engine 引用，确保 GoBoard 重新渲染
            const newEngine = new GoEngine(eng.size);
            newEngine.board = eng.board.map(r => [...r]);
            newEngine.moveHistory = [...eng.moveHistory];
            newEngine.currentPlayer = eng.currentPlayer;
            newEngine.capturedStones = { ...eng.capturedStones };
            newEngine.blackPlayerGoesFirst = eng.blackPlayerGoesFirst;
            newEngine.consecutivePasses = eng.consecutivePasses;
            newEngine._gameResult = eng._gameResult;
            setEngine(newEngine);
            onClockMove(aiColor);
            setMoveCount(newEngine.getMoveCount());
          } else {
            console.warn(`[AIGame] AI returned invalid move: (${row}, ${col}), skipping`);
            // AI返回非法着法，跳过这步
            eng.pass(); 
            syncEngine(eng);
            onClockMove(aiColor);
          }
        }
        else if (!aiMove) { 
          eng.pass(); 
          if (eng.consecutivePasses >= 2) handleGameEnd(eng); 
          syncEngine(eng); 
          onClockMove(aiColor); 
        }
      }
    } catch (error) {
      console.error('AI move error:', error);
      toast.error('AI 响应出错，请重试');
    } finally {
      // 确保无论成功失败都重置状态
      setIsAIThinking(false);
      aiThinkingRef.current = false;
    }
    
    if (eng.gameOver) handleGameEnd(eng);
  }, [difficulty, onClockMove, handicapCount, handicapDirection, warnAdvancedBackendIfNeeded]);

  const handleGameEnd = (eng: GoEngine, winnerOverride?: StoneColor, endType: GameEndType = 'score') => {
    // 终局数子时清除死子
    const result = eng.calculateScore(true);
    if (winnerOverride) {
      result.winner = winnerOverride;
    }
    setGameResult(result); setResultDialogOpen(true); setPositionEstimate(eng.estimatePosition());

    // 胜负语音反馈（根据让子方向判断玩家颜色）
    const playerIsBlack = getUserIsBlack(engine ?? undefined);
    const playerColor: StoneColor = playerIsBlack ? 'black' : 'white';
    const isWin = result.winner === playerColor;
    if (isWin) {
      playLevelUpSound();
      speak(getLevelUpPhrase());
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else if (result.winner !== playerColor && result.winner !== null) {
      playWrongSound();
      speak('没关系，再接再厉！下次一定能赢！');
    }

    // 构建丰富棋谱
    const gameMoves: GameMove[] = eng.moveHistory.map(m => ({
      row: m.row, col: m.col, color: m.color, isPass: false,
    }));
    // 补上 pass 记录（consecutivePasses 无法从 moveHistory 获取，但可以从手数推断）

    const scoreDetail: ScoreDetail = {
      winner: result.winner,
      blackScore: result.blackScore,
      whiteScore: result.whiteScore,
      komi: result.komi,
      details: result.details,
    };
    const durationSec = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : null;

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
        duration_seconds: durationSec,
        finished_at: new Date().toISOString(),
      }).catch(() => { /* 数据库不可用，忽略 */ });
    }

    // 记录每日统计（可选）
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const playerIsBlack = getUserIsBlack(engine ?? undefined);
      const playerColor: StoneColor = playerIsBlack ? 'black' : 'white';
      const isWin = result.winner === playerColor;
      upsertDailyStat(user.id, today, {
        games_played: 1,
        games_won: isWin ? 1 : 0,
      }).catch(() => { /* 数据库不可用，忽略 */ });
    }
  };

  const handleUndo = () => {
    if (!engine || aiThinkingRef.current || undoCount >= maxUndos) return;
    if (engine.moveHistory.length >= 2) { engine.undo(); engine.undo(); }
    else if (engine.moveHistory.length === 1) engine.undo();
    setUndoCount(prev => prev + 1); syncEngine(engine);
    toast.success(`已悔棋（剩余${maxUndos - undoCount - 1}次）`);
  };

  const handlePass = () => {
    if (!engine || aiThinkingRef.current || engine.gameOver) return;
    const playerIsBlack = getUserIsBlack(engine);
    const playerColor: StoneColor = playerIsBlack ? 'black' : 'white';
    const aiColor: StoneColor = playerIsBlack ? 'white' : 'black';
    engine.pass(); toast.info('你选择了虚手'); onClockMove(playerColor);
    if (engine.consecutivePasses >= 2) { handleGameEnd(engine); syncEngine(engine); return; }
    setIsAIThinking(true); aiThinkingRef.current = true;
    getAIMove(engine, difficulty, aiColor).then(aiMove => {
      warnAdvancedBackendIfNeeded();
      if (aiMove && !engine.gameOver) { 
        const [row, col] = aiMove;
        if (engine.isValidMove(row, col)) {
          engine.placeStone(row, col); 
          onClockMove(aiColor);
        } else {
          console.warn(`[AIGame] AI returned invalid move in pass: (${row}, ${col}), passing`);
          engine.pass(); 
          onClockMove(aiColor);
        }
      }
      else { engine.pass(); onClockMove(aiColor); }
      if (engine.consecutivePasses >= 2) handleGameEnd(engine);
      syncEngine(engine); setIsAIThinking(false); aiThinkingRef.current = false;
    });
  };

  const handleResign = () => {
    if (!engine) return;
    const winner = engine.resign(); // 返回认输方的对手（赢家）
    handleGameEnd(engine, winner, 'resign');
    syncEngine(engine);
    toast.info('你认输了，AI获胜');
  };

  /** 申请数子 */
  const handleRequestCount = () => {
    if (!engine || engine.gameOver) return;
    const aiIsBlack = handicapCount > 0 ? (handicapDirection === 'user-gives') : (engine.blackPlayerGoesFirst);
    const playerColor: StoneColor = aiIsBlack ? 'white' : 'black';
    const aiColor: StoneColor = aiIsBlack ? 'black' : 'white';
    // 先pass再让AI判断
    engine.pass();
    onClockMove(playerColor);
    toast.info('已申请数子，等待AI回应...');
    // AI自动pass进入终局
    setTimeout(() => {
      if (!engine!.gameOver) {
        engine!.pass();
        onClockMove(aiColor);
        if (engine!.consecutivePasses >= 2) {
          handleGameEnd(engine!); syncEngine(engine!);
          setCountStoneOpen(true);
        }
      }
    }, 800);
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
    syncEngine(eng);
  }, []);

  /** 试下后退一步 */
  const handleVariationUndo = () => {
    if (!engine) return;
    engine.undoVariationMove();
    syncEngine(engine);
  };

  /** 试下前进一步 */
  const handleVariationRedo = () => {
    if (!engine) return;
    const moveCount = engine.getVariationMoveCount();
    if (engine.variationMoves && engine.variationMoves.length < moveCount) {
      const nextMove = engine.variationMoves[engine.variationMoves.length];
      if (nextMove) {
        engine.addVariationMove(nextMove.row, nextMove.col);
        syncEngine(engine);
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

  const handleNewGame = () => { setResultDialogOpen(false); setGameStarted(false); setEngine(null); setGameResult(null); replayControls.exitReplayMode(); setCountStoneOpen(false); setIsVariationMode(false); };
  const handleEnterReplay = () => { if (!engine) return; replayControls.enterReplayMode(engine.moveHistory); setResultDialogOpen(false); };

  // 计算用户执棋颜色（考虑让子模式）
  const userIsBlack = getUserIsBlack(engine ?? undefined);
  const userColor: StoneColor = userIsBlack ? 'black' : 'white';

  const fmtTime = (player: 'black' | 'white') => {
    const c = player === 'black'
      ? { main: clock.blackMain, byo: clock.blackByoyomi, inByo: clock.blackInByoyomi }
      : { main: clock.whiteMain, byo: clock.whiteByoyomi, inByo: clock.whiteInByoyomi };
    return formatTime(c.main, c.byo, c.inByo);
  };

  const aiIsBlack = !userIsBlack;
  const userTimeStr = userColor === 'black' ? fmtTime('black') : fmtTime('white');
  const aiTimeStr = aiIsBlack ? fmtTime('black') : fmtTime('white');
  const userIsLowTime = userColor === 'black'
    ? (clock.blackInByoyomi && clock.blackByoyomi <= 10)
    : (clock.whiteInByoyomi && clock.whiteByoyomi <= 10);
  const aiIsLowTime = aiIsBlack
    ? (clock.blackInByoyomi && clock.blackByoyomi <= 10)
    : (clock.whiteInByoyomi && clock.whiteByoyomi <= 10);

  // ============== 开始界面 ==============
  if (!gameStarted) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 max-w-md mx-auto pb-20">
          <Button variant="ghost" onClick={() => navigate('/game')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> 返回对弈中心
          </Button>

          {/* 对阵卡片预览 */}
          <Card className="mb-5 overflow-hidden border-0 shadow-md card-kid">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <PlayerCard side="bottom" name="你" avatarFallback="🦊" rankLabel={getRankInfo(profile?.rating ?? 0).label} timeStr="--:--" isActive={false} />
                <div className="text-center px-3">
                  <p className="text-xs text-muted-foreground">VS</p>
                  <span className="text-lg font-bold gradient-text">人机对弈</span>
                </div>
                <PlayerCard side="top" name="AI" avatarFallback="🤖" rankLabel="?" timeStr="--:--" isActive={false} />
              </div>
            </CardContent>
          </Card>

          <Card className="max-w-md mx-auto overflow-hidden border-0 shadow-md card-kid">
            <CardContent className="space-y-5 p-5">
              <div>
                <label className="text-sm font-medium mb-2 block">选择难度</label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as AIDifficulty)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">🌱 初级（~18K 随机落子）</SelectItem>
                    <SelectItem value="intermediate">⚡ 中级（~10K 启发式AI）</SelectItem>
                    <SelectItem value="advanced">🤖 高级（~1K+ 强化启发式AI）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">棋盘大小</label>
                <Select value={boardSize.toString()} onValueChange={(v) => setBoardSize(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">9路棋盘（推荐入门）</SelectItem>
                    <SelectItem value="13">13路棋盘（进阶练习）</SelectItem>
                    <SelectItem value="19">19路棋盘（正式比赛）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Minus className="w-4 h-4" /> 对局设置
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
                    <label className="text-[11px] text-muted-foreground mb-1 block">让子数</label>
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
                      <label className="text-[11px] text-muted-foreground mb-1 block">让子方向</label>
                      <Select value={handicapDirection} onValueChange={(v) => setHandicapDirection(v as 'user-gives' | 'ai-gives')}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user-gives">我让AI（AI执黑放子）</SelectItem>
                          <SelectItem value="ai-gives">AI让我（我执黑放子）</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                <p className="text-[11px] text-muted-foreground mt-2">
                  {handicapMode === 'even' && '有贴目，随机猜先决定黑白'}
                  {handicapMode === 'first' && '无贴目，黑先下（相当于让一子）'}
                  {handicapMode === 'stones' && (
                    handicapDirection === 'user-gives' 
                      ? `AI执黑放${handicapCount}子，白先下`
                      : `你执黑放${handicapCount}子，白先下`
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Timer className="w-4 h-4" /> 用时设置
                </label>
                <Select value={timeKey} onValueChange={setTimeKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIME_PRESETS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}{val.mainTime > 0 ? ` (+读秒${val.byoyomi}s×${val.byoyomiPeriods})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  基础时间耗完后进入读秒阶段
                </p>
              </div>
              <Button 
                onClick={handleStartGame} 
                disabled={aiStarting}
                className="w-full text-lg py-5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md disabled:opacity-70"
              >
                {aiStarting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    正在启动AI服务...
                  </>
                ) : aiStartError ? (
                  <>
                    <span className="mr-2">⚠️</span>
                    启动失败，点击重试
                  </>
                ) : (
                  '开始对弈'
                )}
              </Button>
              {aiStartError && (
                <p className="text-xs text-red-500 mt-2 text-center">{aiStartError}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!engine) return null;

  // ============== 棋谱回放模式 ==============
  if (replayControls.replay.isReplayMode) {
    const { replay } = replayControls;
    const replayEngine = new GoEngine(boardSize, boardSize <= 9 ? 5.5 : boardSize <= 13 ? 6.5 : 7.5);
    for (let i = 0; i < replay.currentStep; i++) { const m = replay.moves[i]; if (m && m.row >= 0 && m.col >= 0) replayEngine.placeStone(m.row, m.col); }

    return (
      <MainLayout>
        <div className="container px-4 py-4 max-w-lg mx-auto pb-20">
          <div className="flex justify-between items-center mb-3">
            <Button variant="ghost" onClick={replayControls.exitReplayMode} size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> 退出回放
            </Button>
            <span className="text-sm font-medium text-primary flex items-center gap-1">
              <BookOpen className="h-4 w-4" /> 对局研究
            </span>
          </div>
          <div className="flex justify-center mb-4">
            <GoBoard size={boardSize} engine={replayEngine} disabled highlightLastMove showTerritory />
          </div>
          <Card><CardContent className="p-4">
            <div className="text-center mb-3"><span className="text-2xl font-bold text-primary">{replay.currentStep} / {replay.moves.length}</span><p className="text-xs text-muted-foreground mt-1">手数</p></div>
            <div className="flex items-center justify-center gap-1 mb-3">
              <Button variant="outline" size="sm" onClick={replayControls.goToStart}><SkipBack className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={replayControls.goBack}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant={replay.isPlaying ? "default" : "outline"} size="sm" onClick={replayControls.toggleAutoPlay}>
                {replay.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={replayControls.goForward}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={replayControls.goToEnd}><SkipForward className="h-4 w-4" /></Button>
            </div>
            <input type="range" min={0} max={replay.moves.length} value={replay.currentStep}
                   onChange={(e) => replayControls.goToStep(Number(e.target.value))}
                   className="w-full h-2 accent-primary cursor-pointer" />
            {replay.currentStep > 0 && replay.moves[replay.currentStep - 1] && (
              <div className="mt-3 text-center text-sm">
                第{replay.currentStep}手：
                <span className="font-bold ml-1">{replay.moves[replay.currentStep - 1].color === 'black' ? '⚫黑' : '⚪白'}</span>
                {' '}落子{' '}
                <span className="font-mono text-primary font-bold">
                  {String.fromCharCode(65 + (replay.moves[replay.currentStep - 1].col >= 8 ? replay.moves[replay.currentStep - 1].col + 1 : replay.moves[replay.currentStep - 1].col))}
                  {boardSize - replay.moves[replay.currentStep - 1].row}
                </span>
              </div>
            )}
          </CardContent></Card>
          <Button onClick={replayControls.exitReplayMode} className="w-full mt-3" variant="outline">返回对弈结果</Button>
        </div>
      </MainLayout>
    );
  }

  // ============== 对弈界面 ==============
  const isPlayerTurn = engine?.currentPlayer === 'black';

  return (
    <MainLayout>
      <div className="container px-4 py-4 max-w-lg mx-auto pb-20">
        {/* 顶部控制栏 */}
        <div className="flex justify-between items-center mb-3">
          <Button variant="ghost" onClick={() => navigate('/game')} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> 返回
          </Button>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary font-medium">
              {AI_RANK_MAP[difficulty].label} · {AI_RANK_MAP[difficulty].rankLabel}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary font-medium">{boardSize}路</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-0.5">
              <Timer className="w-3 h-3" /> {TIME_PRESETS[timeKey]?.label.split('(')[0]}
            </span>
          </div>
        </div>

        {/* ===== AI方信息（顶部） ===== */}
        <PlayerCard
          side="top" name="AI" avatarFallback="🤖" rankLabel={
            AI_RANK_MAP[difficulty].rankLabel
          }
          timeStr={aiTimeStr} isActive={!isPlayerTurn}
          isThinking={isAIThinking}
          isLowTime={aiIsLowTime}
        />

        {/* 棋盘区域 */}
        <div className="flex justify-center my-4">
          <GoBoard
            size={boardSize}
            engine={engine ?? undefined}
            onMove={handlePlayerMove}
            onVariationMove={handleVariationMove}
            disabled={isAIThinking || (engine?.gameOver ?? false)}
            highlightLastMove
            showTerritory={(engine?.gameOver ?? false) || showEstimate}
            showVariationMoves={true}
          />
        </div>

        {/* ===== 形势判断按钮 ===== */}
        {!engine?.gameOver && (
          <div className="mt-3">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => {
                setPositionEstimate(engine?.estimatePosition() ?? null);
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
              userIsBlack={getUserIsBlack(engine)}
              onClose={() => setShowEstimate(false)}
            />
          </div>
        )}

        {/* 修改棋盘 showTerritory：当形势判断激活时显示领地 */}
        {showEstimate && (() => {
          // 临时修改 engine 逻辑来显示领地
          return null; // GoBoard 的 showTerritory 由下面的条件控制
        })()}

        {/* ===== 你（玩家）信息（底部） ===== */}
        <div className="mt-3">
          <PlayerCard
            side="bottom" name={profile?.nickname || profile?.username || '你'} avatarUrl={profile?.avatar_url} avatarFallback={profile?.nickname?.[0] || profile?.username?.[0]} rankLabel={getRankInfo(profile?.rating ?? 0).label}
            timeStr={userTimeStr} isActive={isPlayerTurn}
            isLowTime={userIsLowTime}
          />
        </div>

        {/* ===== 操作区 ===== */}
        {isVariationMode ? (
          /* 试下模式操作区 */
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
                      disabled={(engine?.variationMoves?.length ?? 0) === 0}
                      className="col-span-1 text-xs">
                <ChevronLeft className="mr-1 h-3 w-3" />后退
              </Button>
              <Button variant="outline" size="sm" onClick={handleVariationRedo}
                      disabled={(engine?.variationMoves?.length ?? 0) === 0}
                      className="col-span-1 text-xs">
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
          <div className="mt-3 grid grid-cols-4 gap-2">
            <Button variant="outline" size="sm" onClick={handleUndo}
                    disabled={isAIThinking || (engine?.moveHistory?.length ?? 0) < 2 || engine?.gameOver || undoCount >= maxUndos}
                    className="col-span-1 text-xs">
              <Undo2 className="mr-1 h-3 w-3" />悔{maxUndos-undoCount}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePass}
                    disabled={isAIThinking || engine?.gameOver} className="col-span-1 text-xs">
              虚手
            </Button>
            <Button variant="outline" size="sm" onClick={handleRequestCount}
                    disabled={isAIThinking || engine?.gameOver} className="col-span-1 text-xs flex items-center justify-center gap-0.5">
              <Calculator className="w-3 h-3" /> 数子
            </Button>
            <Button variant="outline" size="sm" onClick={handleResign}
                    disabled={isAIThinking || engine?.gameOver}
                    className="col-span-1 text-xs text-destructive hover:text-destructive">
              <Flag className="mr-1 h-3 w-3" /> 认输
            </Button>
            {/* 试下按钮 */}
            <Button variant="secondary" size="sm" onClick={handleEnterVariation}
                    disabled={isAIThinking || engine?.gameOver}
                    className="col-span-4 text-xs mt-2">
              <FlaskConical className="mr-1 h-3 w-3" /> 试下（研究不同着法）
            </Button>
          </div>
        )}

        {/* 提子/手数信息 */}
        <div className="mt-2 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span>提子 ⚫{capturedBlack} ⚪{capturedWhite}</span>
          <span>第{moveCount}手</span>
        </div>

        {/* 对弈结束后按钮 */}
        {engine?.gameOver && (
          <div className="mt-3 space-y-2">
            <Button onClick={handleEnterReplay} className="w-full" variant="outline">
              <Eye className="mr-2 h-4 w-4" /> 对局研究
            </Button>
            <Button onClick={handleNewGame} className="w-full" variant="default">
              <RotateCcw className="mr-2 h-4 w-4" /> 新对局
            </Button>
          </div>
        )}

        {/* ========== 对弈结果弹窗 ========== */}
        <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 justify-center text-2xl">
                {gameResult?.winner === (getUserIsBlack() ? 'black' : 'white') ? <span className="text-3xl">🎉</span> : <span className="text-3xl">💪</span>}
                {gameResult?.winner === (getUserIsBlack() ? 'black' : 'white') ? '你赢了！' : gameResult?.winner === null ? '和棋' : 'AI获胜'}
              </DialogTitle>
              <DialogDescription className="text-center">
                {gameResult && (
                  <div className="space-y-2 mt-4 text-sm">
                    <div className="flex justify-between"><span>{getUserIsBlack() ? '⚫ 你' : '⚫ AI'}</span><span className="font-bold">{gameResult.blackScore.toFixed(1)} 目</span></div>
                    <div className="flex justify-between"><span>{getUserIsBlack() ? '⚪ AI' : '⚪ 你'}</span><span className="font-bold">{gameResult.whiteScore.toFixed(1)} 目</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>贴目</span><span>{gameResult.komi} 目</span></div>
                    <hr />
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>黑子 {gameResult.details.blackStones} + 黑地 {gameResult.details.blackTerritory} = {gameResult.blackScore.toFixed(1)}</p>
                      <p>白子 {gameResult.details.whiteStones} + 白地 {gameResult.details.whiteTerritory} + 贴目 {gameResult.details.whiteKomi} = {gameResult.whiteScore.toFixed(1)}</p>
                    </div>
                    {positionEstimate && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-xs text-muted-foreground">
                          {positionEstimate.leadBy > 0
                            ? `黑方领先 ${positionEstimate.leadBy.toFixed(1)} 目`
                            : positionEstimate.leadBy < 0
                            ? `白方领先 ${(-positionEstimate.leadBy).toFixed(1)} 目`
                            : '形势均衡'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleEnterReplay} variant="outline" className="flex-1"><Eye className="mr-2 h-4 w-4" />对局研究</Button>
              <Button onClick={handleNewGame} className="flex-1"><RotateCcw className="mr-2 h-4 w-4" />再来一局</Button>
            </div>
            <Button variant="ghost" onClick={() => navigate('/game')} className="w-full mt-1">返回对弈中心</Button>
          </DialogContent>
        </Dialog>

        {/* ========== 健康提醒弹窗 ========== */}
        <Dialog open={showReminder} onOpenChange={() => {}}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 justify-center text-xl">
                <Heart className="h-7 w-7 text-red-500" /> 休息一下
              </DialogTitle>
              <DialogDescription className="text-center space-y-3 mt-4">
                <p className="text-lg">你已经连续下棋 <span className="font-bold text-primary">{getPlayDuration()}</span> 了</p>
                <p className="text-muted-foreground">适当休息可以保护视力和大脑，站起来活动一下！</p>
                <div className="text-4xl mt-2">🌿 👀 🌿</div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 mt-4">
              <Button onClick={dismissReminder} className="flex-1">好的，休息一会</Button>
              <Button variant="outline" onClick={dismissReminder} className="flex-1">再下一会</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
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
