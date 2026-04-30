import { useState, useEffect, useCallback, useRef } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import GoBoard from '@/components/GoBoard';
import { getPracticeProblems, updateProgress, getUserProgress, upsertDailyStat } from '@/db/api';
import { awardPracticeAchievements } from '@/db/achievements';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Problem } from '@/types/types';
import { GoEngine } from '@/lib/go-engine';
import { VERIFIED_PRACTICE_PROBLEMS } from '@/data/problems';
import { getProblemOverrides, getCustomProblems } from '@/data/custom-problems';
import {
  playCorrectSound, playWrongSound, playLevelUpSound,
  speak, stopSpeak,
  getCorrectPhrase, getWrongPhrase,
} from '@/lib/sounds';

export default function Practice() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userMoves, setUserMoves] = useState<number[][]>([]);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [engine, setEngine] = useState<GoEngine | null>(null);
  const [completedProblemIds, setCompletedProblemIds] = useState<Set<string>>(new Set());
  const [feedbackPhrase, setFeedbackPhrase] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLastProblem, setIsLastProblem] = useState(false);

  useEffect(() => {
    loadProblems();
    return () => stopSpeak();
  }, []);

  const loadProblems = async () => {
    // 获取系统题目的覆盖版本（异步）
    const overrides = await getProblemOverrides();
    
    // 构建题目列表：系统题目 + 覆盖版本 + 自定义题目
    let systemProblems = VERIFIED_PRACTICE_PROBLEMS.map((p, i) => {
      // 检查是否有覆盖版本
      const overrideKey = p.systemId || `local-practice-${i}`;
      const override = overrides.get(overrideKey);
      
      return {
        ...(override || p),
        id: overrideKey,
        created_at: new Date().toISOString(),
      };
    }) as Problem[];

    // 获取自定义题目（异步）
    const customProblems = await getCustomProblems();
    if (customProblems.length > 0) {
      console.log(`[题目练习] 发现 ${customProblems.length} 道自定义题目，添加到系统题目后面`);
      systemProblems = [...systemProblems, ...customProblems];
    }

    // 如果数据库为空或失败，至少有系统题目
    if (systemProblems.length === 0) {
      systemProblems = VERIFIED_PRACTICE_PROBLEMS.map((p, i) => ({
        ...p,
        id: `local-practice-${i}`,
        created_at: new Date().toISOString(),
      })) as Problem[];
    }

    setProblems(systemProblems);
    if (systemProblems.length > 0) initEngine(systemProblems[0]);

    if (user) {
      try {
        const progress = await getUserProgress(user.id);
        const completedIds = new Set<string>();
        let count = 0;
        for (const p of progress) {
          if (p.problem_id && p.completed) {
            completedIds.add(p.problem_id);
            if (systemProblems.some(prob => prob.id === p.problem_id)) count++;
          }
        }
        setCompletedProblemIds(completedIds);
        setCompletedCount(count);
      } catch {}
    }
  };

  const initEngine = (problem: Problem) => {
    const e = new GoEngine(problem.board_size);
    if (problem.initial_position) {
      e.loadPosition(problem.initial_position);
    }
    setEngine(e);
  };

  const currentProblem = problems[currentIndex];

  const handleMove = useCallback((row: number, col: number, eng: GoEngine) => {
    const newMoves = [...userMoves, [row, col]];
    setUserMoves(newMoves);

    if (currentProblem) {
      const winCondition = currentProblem.solution.win_condition || 'exact_move';

      // ===== 提子判定模式（101围棋风格） =====
      if (winCondition === 'capture') {
        const captureMin = currentProblem.solution.capture_min || 1;
        const solution = currentProblem.solution.moves;
        
        // 检查落子位置是否正确（第一手答案）
        const solutionRow = solution[0][0];
        const solutionCol = solution[0][1];
        const isCorrectPosition = row === solutionRow && col === solutionCol;
        
        // 检查提子数
        // capturedStones.white = 被当前玩家（黑）提掉的白子数
        const whiteCapturedBefore = engine?.capturedStones.white ?? 0;
        const capturedNow = eng.capturedStones.white;
        const capturedThisMove = capturedNow - whiteCapturedBefore;

        if (isCorrectPosition && capturedThisMove >= captureMin) {
          // 提子成功！
          const phrase = getCorrectPhrase();
          setResult('correct');
          setFeedbackPhrase(phrase);
          playCorrectSound();
          speak(phrase);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);

          if (!completedProblemIds.has(currentProblem.id)) {
            setCompletedCount(prev => prev + 1);
            setCompletedProblemIds(prev => new Set([...prev, currentProblem.id]));
            if (user) {
              updateProgress(user.id, null, currentProblem.id, 100, true).catch(() => {});
              const today = new Date().toISOString().split('T')[0];
              upsertDailyStat(user.id, today, { problems_solved: 1 }).catch(() => {});
            }
          }
        } else if (isCorrectPosition) {
          // 位置正确但没吃到子（不应该发生）
          const phrase = getWrongPhrase();
          setResult('wrong');
          setFeedbackPhrase(phrase);
          playWrongSound();
          speak(phrase);
        } else {
          // 位置错误
          const phrase = getWrongPhrase();
          setResult('wrong');
          setFeedbackPhrase(phrase);
          playWrongSound();
          speak(phrase);
        }
        return;
      }

      // ===== 精确匹配模式（原有逻辑） =====
      const solution = currentProblem.solution.moves;
      const alternatives = currentProblem.solution.alternative_moves ?? [];
      const moveIndex = newMoves.length - 1;
      if (moveIndex < solution.length) {
        // 检查是否匹配主答案或任意替代答案
        const matchesMain = newMoves[moveIndex][0] === solution[moveIndex][0] && newMoves[moveIndex][1] === solution[moveIndex][1];
        const matchesAlternative = alternatives.some(alt =>
          moveIndex < alt.length && newMoves[moveIndex][0] === alt[moveIndex][0] && newMoves[moveIndex][1] === alt[moveIndex][1]
        );

        if (matchesMain || matchesAlternative) {
          if (newMoves.length === solution.length) {
            // 答对了！
            const phrase = getCorrectPhrase();
            setResult('correct');
            setFeedbackPhrase(phrase);
            playCorrectSound();
            speak(phrase);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2500);

            if (!completedProblemIds.has(currentProblem.id)) {
              setCompletedCount(prev => prev + 1);
              setCompletedProblemIds(prev => new Set([...prev, currentProblem.id]));
              if (user) {
                updateProgress(user.id, null, currentProblem.id, 100, true).catch(() => {});
                const today = new Date().toISOString().split('T')[0];
                upsertDailyStat(user.id, today, { problems_solved: 1 }).catch(() => {});
              }
            }
          }
        } else {
          // 答错了
          const phrase = getWrongPhrase();
          setResult('wrong');
          setFeedbackPhrase(phrase);
          playWrongSound();
          speak(phrase);
        }
      }
    }
  }, [userMoves, currentProblem, user, completedProblemIds, engine]);

  const handleNext = () => {
    stopSpeak();
    
    // 检查成就（每完成一题都可能获得成就）
    if (user && result === 'correct') {
      awardPracticeAchievements(user.id)
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
    
    if (currentIndex < problems.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setUserMoves([]);
      setResult(null);
      setFeedbackPhrase('');
      setIsLastProblem(nextIndex >= problems.length - 1);
      initEngine(problems[nextIndex]);
    } else {
      // 已经是最后一题
      setIsLastProblem(true);
    }
  };

  const handleRetry = () => {
    stopSpeak();
    setUserMoves([]);
    setResult(null);
    setFeedbackPhrase('');
    if (currentProblem) {
      initEngine(currentProblem);
    }
  };

  const progressPercent = problems.length > 0 ? (completedCount / problems.length) * 100 : 0;

  if (!currentProblem || !engine) {
    return (
      <MainLayout>
        <div className="container px-4 py-8">
          <Card className="card-kid">
            <CardContent className="py-12 text-center">
              <div className="text-5xl mb-4 float-gentle">🤔</div>
              <p className="text-muted-foreground">正在准备题目，请稍等...</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-5xl mx-auto">
        {/* 撒花效果 */}
        {showConfetti && <ConfettiOverlay />}

        {/* 标题区 */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl float-gentle">🧠</span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">题目练习</h1>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={progressPercent} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {completedCount}/{problems.length}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            📝 第 {currentIndex + 1} 题，共 {problems.length} 题
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 题目信息卡 */}
          <Card className="card-kid overflow-hidden">
            {/* 题目标题栏 */}
            <div className="bg-gradient-to-r from-emerald-400/15 to-teal-400/10 p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <CardTitle className="text-lg">{currentProblem.title}</CardTitle>
              </div>
            </div>

            <CardContent className="p-4 space-y-4">
              <p className="leading-relaxed text-base">{currentProblem.description}</p>

              {/* 答对反馈 */}
              {result === 'correct' && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-2xl celebrate">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl bounce-in">🎉</span>
                    <div>
                      <p className="font-bold text-lg">{feedbackPhrase}</p>
                      <p className="text-sm mt-2 leading-relaxed">{currentProblem.solution.explanation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-green-200/50">
                    <span className="text-xl sparkle">⭐</span>
                    <span className="text-xs text-green-600 font-medium">你真棒！继续保持！</span>
                  </div>
                </div>
              )}

              {/* 答错反馈 */}
              {result === 'wrong' && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-2 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 p-4 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl bounce-in">💪</span>
                    <div>
                      <p className="font-bold text-lg">{feedbackPhrase}</p>
                      <p className="text-sm mt-1">再仔细看看棋盘，答案就在上面哦~</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2">
                {result === 'correct' ? (
                  <Button 
                    onClick={handleNext} 
                    className="flex-1 h-12 text-base font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md"
                  >
                    {isLastProblem ? '🎉 练习完成！' : '🚀 下一题'}
                  </Button>
                ) : result === 'wrong' ? (
                  <div className="flex gap-2 w-full">
                    <Button onClick={handleRetry} variant="outline" className="flex-1 h-12 text-base font-bold rounded-xl border-2 border-orange-300 text-orange-600 hover:bg-orange-50">
                      🔄 再试一次
                    </Button>
                    <Button onClick={handleNext} variant="ghost" className="h-12">
                      跳过 →
                    </Button>
                  </div>
                ) : (
                  <div className="text-center w-full py-2 text-sm text-muted-foreground">
                    👆 在棋盘上点击落子作答吧！
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 棋盘区 */}
          <div className="flex justify-center">
            <GoBoard
              size={currentProblem.board_size}
              engine={engine}
              onMove={handleMove}
              disabled={result !== null}
              highlightLastMove
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

/** 简单撒花动画组件 */
function ConfettiOverlay() {
  const emojis = ['🎉', '⭐', '🌟', '✨', '🎊', '💫', '🏆'];
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
