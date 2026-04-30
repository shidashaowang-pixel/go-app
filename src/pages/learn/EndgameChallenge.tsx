import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import GoBoard from '@/components/GoBoard';
import {
  ENDGAME_PUZZLES,
  PUZZLES_BY_DIFFICULTY,
  DIFFICULTY_NAMES,
  getRandomPuzzle,
  type EndgamePuzzle,
} from '@/data/endgame-puzzles';
import { GoEngine, type StoneColor } from '@/lib/go-engine';
import { updateProgress } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Timer,
  Trophy,
  Lightbulb,
  RotateCcw,
  ChevronRight,
  Star,
  Clock,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'go-endgame-progress';

interface EndgameProgress {
  totalScore: number;
  completedCount: number;
  totalValue: number;
  lastPlayedAt: string;
}

function loadEndgameProgress(): EndgameProgress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[Endgame] 加载进度失败:', e);
  }
  return { totalScore: 0, completedCount: 0, totalValue: 0, lastPlayedAt: '' };
}

function saveEndgameProgress(progress: EndgameProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('[Endgame] 保存进度失败:', e);
  }
}

interface PuzzleState {
  puzzle: EndgamePuzzle;
  engine: GoEngine;
  attempts: number;
  hintsUsed: number;
  startTime: number;
  completed: boolean;
  selectedMove: { row: number; col: number } | null;
}

export default function EndgameChallengePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState<number>(1);
  const [mode, setMode] = useState<'menu' | 'playing' | 'result'>('menu');
  const [puzzleState, setPuzzleState] = useState<PuzzleState | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [totalScore, setTotalScore] = useState(() => loadEndgameProgress().totalScore);
  const [completedCount, setCompletedCount] = useState(() => loadEndgameProgress().completedCount);
  const [totalValue, setTotalValue] = useState(() => loadEndgameProgress().totalValue);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 进度变化时保存到本地
  useEffect(() => {
    saveEndgameProgress({
      totalScore,
      completedCount,
      totalValue,
      lastPlayedAt: new Date().toISOString(),
    });
  }, [totalScore, completedCount, totalValue]);

  // 计时器
  useEffect(() => {
    if (mode === 'playing' && puzzleState && !puzzleState.completed) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, puzzleState?.completed]);

  const startPuzzle = useCallback((diff: number) => {
    const puzzle = getRandomPuzzle(diff);
    const engine = new GoEngine(puzzle.boardSize, 0);
    
    // 设置初始局面
    if (puzzle.initialPosition.black.length > 0) {
      puzzle.initialPosition.black.forEach(([r, c]) => engine.placeStone(r, c, 'black'));
    }
    if (puzzle.initialPosition.white.length > 0) {
      puzzle.initialPosition.white.forEach(([r, c]) => engine.placeStone(r, c, 'white'));
    }

    setPuzzleState({
      puzzle,
      engine,
      attempts: 0,
      hintsUsed: 0,
      startTime: Date.now(),
      completed: false,
      selectedMove: null,
    });
    setTimeLeft(60);
    setDifficulty(diff);
    setMode('playing');
  }, []);

  const handleTimeout = () => {
    if (puzzleState && !puzzleState.completed) {
      toast.error('时间到！换个思路试试吧');
      nextPuzzle();
    }
  };

  const handleMove = useCallback(
    (row: number, col: number, eng: GoEngine) => {
      if (!puzzleState || puzzleState.completed) return;

      const correct = puzzleState.puzzle.correctMove;
      const alternatives = puzzleState.puzzle.alternativeMoves || [];
      const isCorrect =
        (row === correct.row && col === correct.col) ||
        alternatives.some((a) => a.row === row && a.col === col);

      setPuzzleState((prev) => {
        if (!prev) return prev;
        return { ...prev, attempts: prev.attempts + 1, selectedMove: { row, col } };
      });

      if (isCorrect) {
        // 计算得分
        const baseValue = puzzleState.puzzle.value;
        const hintPenalty = puzzleState.hintsUsed * 0.2;
        const timeBonus = Math.floor(timeLeft / 10);
        const score = Math.max(
          Math.floor(baseValue * (1 - hintPenalty)) + timeBonus,
          1
        );

        setTotalScore((prev) => prev + score);
        setTotalValue((prev) => prev + baseValue);
        setCompletedCount((prev) => prev + 1);

        // 标记完成
        setPuzzleState((prev) => {
          if (!prev) return prev;
          return { ...prev, completed: true };
        });

        toast.success(`正确！+${score}分`);
      } else {
        toast.error('再想想...');
      }
    },
    [puzzleState, timeLeft]
  );

  const useHint = () => {
    if (!puzzleState || puzzleState.hintsUsed >= puzzleState.puzzle.hints.length) return;

    const hint = puzzleState.puzzle.hints[puzzleState.hintsUsed];
    setPuzzleState((prev) => {
      if (!prev) return prev;
      return { ...prev, hintsUsed: prev.hintsUsed + 1 };
    });
    toast.info(`提示: ${hint}`);
  };

  const nextPuzzle = () => {
    startPuzzle(difficulty);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        {mode === 'menu' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">残局挑战</h1>
              <p className="text-sm text-muted-foreground">
                在限时内解决收官、死活等残局难题
              </p>
            </div>

            {/* 统计概览 */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <Trophy className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold">{totalScore}</p>
                    <p className="text-xs text-muted-foreground">总分</p>
                  </div>
                  <div>
                    <Target className="w-6 h-6 mx-auto mb-1 text-green-500" />
                    <p className="text-2xl font-bold">{completedCount}</p>
                    <p className="text-xs text-muted-foreground">完成题数</p>
                  </div>
                  <div>
                    <Star className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
                    <p className="text-2xl font-bold">
                      {totalValue > 0 ? Math.round((totalScore / totalValue) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">得分率</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 难度选择 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((d) => (
                <Card
                  key={d}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => startPuzzle(d)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">
                      {d === 1 && '🌱'}
                      {d === 2 && '⚡'}
                      {d === 3 && '🎯'}
                      {d === 4 && '🔥'}
                      {d === 5 && '👑'}
                    </div>
                    <h3 className="font-bold">{DIFFICULTY_NAMES[d]}</h3>
                    <p className="text-xs text-muted-foreground">
                      {PUZZLES_BY_DIFFICULTY[d]?.length || 0} 题
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {mode === 'playing' && puzzleState && (
          <>
            {/* 顶部信息栏 */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" onClick={() => setMode('menu')}>
                ← 返回
              </Button>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm">
                  <Target className="w-4 h-4 mr-1" />
                  价值: {puzzleState.puzzle.value} 目
                </Badge>
                <Badge
                  variant={timeLeft <= 10 ? 'destructive' : 'outline'}
                  className="text-sm"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  {formatTime(timeLeft)}
                </Badge>
              </div>
            </div>

            {/* 进度条 */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>已完成: {completedCount} 题</span>
                <span>总分: {totalScore}</span>
              </div>
              <Progress value={(completedCount / 10) * 100} className="h-2" />
            </div>

            {/* 题目信息 */}
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{puzzleState.puzzle.title}</span>
                  <Badge>
                    {DIFFICULTY_NAMES[puzzleState.puzzle.difficulty]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {puzzleState.puzzle.description}
                </p>

                {/* 提示 */}
                {puzzleState.hintsUsed > 0 && (
                  <div className="bg-primary/10 rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      提示 {puzzleState.hintsUsed}/{puzzleState.puzzle.hints.length}
                    </p>
                    {puzzleState.puzzle.hints.slice(0, puzzleState.hintsUsed).map((hint, i) => (
                      <p key={i} className="text-sm text-muted-foreground mt-1">
                        {i + 1}. {hint}
                      </p>
                    ))}
                  </div>
                )}

                {/* 操作 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={useHint}
                    disabled={
                      puzzleState.hintsUsed >= puzzleState.puzzle.hints.length
                    }
                  >
                    <Lightbulb className="w-4 h-4 mr-1" />
                    提示 ({puzzleState.puzzle.hints.length - puzzleState.hintsUsed}次)
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextPuzzle}>
                    跳过
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 棋盘 */}
            <Card className="overflow-hidden">
              <CardContent className="p-4 flex justify-center">
                <GoBoard
                  size={puzzleState.puzzle.boardSize}
                  engine={puzzleState.engine}
                  onMove={handleMove}
                  disabled={puzzleState.completed}
                  highlightLastMove
                />
              </CardContent>
            </Card>

            {/* 正确提示 */}
            {puzzleState.completed && (
              <Card className="mt-4 bg-green-50 dark:bg-green-900/20 border-green-200">
                <CardContent className="p-4 text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <h3 className="text-lg font-bold text-green-600 mb-2">正确！</h3>
                  <Button onClick={nextPuzzle}>
                    下一题
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
