import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import GoBoard from '@/components/GoBoard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getCheckpointProblems, updateProgress, upsertDailyStat } from '@/db/api';
import { awardCheckpointAchievements } from '@/db/achievements';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Problem } from '@/types/types';
import { GoEngine } from '@/lib/go-engine';
import { ArrowLeft, CheckCircle2, XCircle, Trophy, RotateCcw, ArrowRight } from 'lucide-react';
import { CHECKPOINT_LEVELS, mergeCloudProblems } from '@/data/problems';
import { getCustomProblems } from '@/data/custom-problems';
import {
  playCorrectSound, playWrongSound, playLevelUpSound,
  speak, stopSpeak,
  getCorrectPhrase, getWrongPhrase, getLevelUpPhrase,
} from '@/lib/sounds';

export default function CheckpointLevel() {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [engine, setEngine] = useState<GoEngine | null>(null);
  const [completedInLevel, setCompletedInLevel] = useState(0);
  const [feedbackPhrase, setFeedbackPhrase] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (level) {
      loadProblems(Number.parseInt(level));
    }
    return () => stopSpeak();
  }, [level]);

  const loadProblems = async (levelNum: number) => {
    // 1. 加载本地题目（带 systemId）
    const levelIndex = Math.max(0, Math.min(levelNum - 1, CHECKPOINT_LEVELS.length - 1));
    const localProblems = CHECKPOINT_LEVELS[levelIndex].map((p, i) => ({
      ...p,
      id: p.systemId || `local-cp${levelNum}-${i}`,
      created_at: new Date().toISOString(),
    })) as Problem[];

    // 2. 从云端加载题目
    const cloudProblems = await getCheckpointProblems(levelNum);
    
    // 3. 用云端题目覆盖本地题目（如果有相同 systemId）
    let data = mergeCloudProblems(localProblems, cloudProblems);

    // 4. 获取自定义关卡题目并添加
    const customProblems = await getCustomProblems();
    const checkpointCustomProblems = customProblems.filter(p => 
      p.type === 'checkpoint' && p.checkpoint_level === levelNum
    );
    if (checkpointCustomProblems.length > 0) {
      console.log(`[关卡] 第${levelNum}关发现 ${checkpointCustomProblems.length} 道自定义题目`);
      data = [...data, ...checkpointCustomProblems];
    }

    // 如果数据库有数据，用数据库的题目ID和完成状态覆盖本地（保持用户进度）
    const dbData = await getCheckpointProblems(levelNum);
    if (dbData && dbData.length > 0) {
      console.log(`[关卡] 第${levelNum}关数据库有${dbData.length}题，使用本地题目（已验证）`);
    }

    // 额外自检：用引擎验证每道题的气数
    if (data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        const p = data[i];
        try {
          const eng = new GoEngine(p.board_size);
          eng.loadPosition(p.initial_position);
          for (const [wr, wc] of p.initial_position.white) {
            const libCount = eng.getLibertyCount(wr, wc);
            if (p.description?.includes('1口气') && libCount !== 1) {
              console.warn(`[关卡自检] "${p.title}": 说白子有1气但实际${libCount}气`);
            }
            if (p.description?.includes('2口气') && libCount !== 2) {
              console.warn(`[关卡自检] "${p.title}": 说白子有2气但实际${libCount}气`);
            }
            if (p.description?.includes('3口气') && libCount !== 3) {
              console.warn(`[关卡自检] "${p.title}": 说白子有3气但实际${libCount}气`);
            }
          }
          // 验证答案合法性
          for (const [mr, mc] of p.solution.moves) {
            if (!eng.isValidMove(mr, mc)) {
              console.error(`[关卡自检] "${p.title}": 答案[${mr},${mc}]不合法!`);
            }
          }
        } catch (e) {
          // 引擎验证失败不影响加载
        }
      }
    }

    setProblems(data);
    if (data.length > 0) {
      initEngine(data[0]);
    }
  };

  const initEngine = (problem: Problem) => {
    const e = new GoEngine(problem.board_size);
    if (problem.initial_position) {
      e.loadPosition(problem.initial_position);
    }
    setEngine(e);
  };

  const currentProblem = problems[currentProblemIndex];

  const handleMove = useCallback((row: number, col: number, eng: GoEngine) => {
    if (!currentProblem) return;

    const winCondition = currentProblem.solution.win_condition || 'exact_move';

    // ===== 提子判定模式：吃到对方棋子就算赢（101围棋风格） =====
    if (winCondition === 'capture') {
      const captureMin = currentProblem.solution.capture_min || 1;
      const solution = currentProblem.solution.moves[0];
      
      // 检查是否下在正确答案位置
      const isCorrectMove = solution && row === solution[0] && col === solution[1];
      
      // 检查是否提了对方子：看当前棋盘上白子是否已被提掉
      const whitePositions = currentProblem.initial_position.white;
      let capturedCount = 0;
      for (const [wr, wc] of whitePositions) {
        if (eng.board[wr][wc] !== 'white') {
          capturedCount++;
        }
      }
      
      if (isCorrectMove && capturedCount >= captureMin) {
        const phrase = getCorrectPhrase();
        setResult('correct');
        setFeedbackPhrase(phrase);
        playCorrectSound();
        speak(phrase);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
        setCompletedInLevel(prev => prev + 1);

        if (user) {
          updateProgress(user.id, null, currentProblem.id, 100, true).catch(err => console.error('保存进度失败:', err));
          const today = new Date().toISOString().split('T')[0];
          upsertDailyStat(user.id, today, { problems_solved: 1 }).catch(err => console.error('保存统计失败:', err));
        }
      } else {
        const phrase = getWrongPhrase();
        setResult('wrong');
        setFeedbackPhrase(phrase);
        playWrongSound();
        speak(phrase);
      }
      return;
    }

    // ===== 做活判定模式：下在正确位置做眼 =====
    if (winCondition === 'make_eyes') {
      const solution = currentProblem.solution.moves;
      const lastMove = eng.getLastMove();
      const moveIndex = eng.getMoveCount() - 1;
      
      // 检查是否下在正确位置
      const matchesMain = lastMove && lastMove.row === solution[moveIndex][0] && lastMove.col === solution[moveIndex][1];
      
      if (matchesMain && moveIndex === solution.length - 1) {
        const phrase = getCorrectPhrase();
        setResult('correct');
        setFeedbackPhrase(phrase);
        playCorrectSound();
        speak(phrase);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
        setCompletedInLevel(prev => prev + 1);

        if (user) {
          updateProgress(user.id, null, currentProblem.id, 100, true).catch(err => console.error('保存进度失败:', err));
          const today = new Date().toISOString().split('T')[0];
          upsertDailyStat(user.id, today, { problems_solved: 1 }).catch(err => console.error('保存统计失败:', err));
        }
      } else {
        const phrase = getWrongPhrase();
        setResult('wrong');
        setFeedbackPhrase(phrase);
        playWrongSound();
        speak(phrase);
      }
      return;
    }

    // ===== 杀棋判定模式：下在破眼位置 =====
    if (winCondition === 'kill_opponent') {
      const solution = currentProblem.solution.moves;
      const lastMove = eng.getLastMove();
      const moveIndex = eng.getMoveCount() - 1;
      
      const matchesMain = lastMove && lastMove.row === solution[moveIndex][0] && lastMove.col === solution[moveIndex][1];
      
      if (matchesMain && moveIndex === solution.length - 1) {
        const phrase = getCorrectPhrase();
        setResult('correct');
        setFeedbackPhrase(phrase);
        playCorrectSound();
        speak(phrase);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
        setCompletedInLevel(prev => prev + 1);

        if (user) {
          updateProgress(user.id, null, currentProblem.id, 100, true).catch(err => console.error('保存进度失败:', err));
          const today = new Date().toISOString().split('T')[0];
          upsertDailyStat(user.id, today, { problems_solved: 1 }).catch(err => console.error('保存统计失败:', err));
        }
      } else {
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
    const moveIndex = eng.getMoveCount() - 1;

    if (moveIndex < solution.length) {
      // 检查是否匹配主答案或任意替代答案
      const lastMove = eng.getLastMove();
      const matchesMain = lastMove && lastMove.row === solution[moveIndex][0] && lastMove.col === solution[moveIndex][1];
      const matchesAlternative = alternatives.some(alt =>
        moveIndex < alt.length && lastMove && lastMove.row === alt[moveIndex][0] && lastMove.col === alt[moveIndex][1]
      );

      if (matchesMain || matchesAlternative) {
        if (moveIndex === solution.length - 1) {
          // 全部正确
          const phrase = getCorrectPhrase();
          setResult('correct');
          setFeedbackPhrase(phrase);
          playCorrectSound();
          speak(phrase);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
          setCompletedInLevel(prev => prev + 1);

          // 保存进度
          if (user) {
            updateProgress(user.id, null, currentProblem.id, 100, true).catch(err => console.error('保存进度失败:', err));
            const today = new Date().toISOString().split('T')[0];
            upsertDailyStat(user.id, today, { problems_solved: 1 }).catch(err => console.error('保存统计失败:', err));
          }
        }
      } else {
        const phrase = getWrongPhrase();
        setResult('wrong');
        setFeedbackPhrase(phrase);
        playWrongSound();
        speak(phrase);
      }
    }
  }, [currentProblem, user, engine]);

  const handleNext = () => {
    stopSpeak();
    if (currentProblemIndex < problems.length - 1) {
      const nextIndex = currentProblemIndex + 1;
      setCurrentProblemIndex(nextIndex);
      setResult(null);
      setFeedbackPhrase('');
      initEngine(problems[nextIndex]);
    } else {
      // 通关！
      const phrase = getLevelUpPhrase();
      playLevelUpSound();
      speak(phrase);
      toast.success('恭喜通过本关！🎉');
      
      // 检查并授予闯关成就
      if (user && level) {
        const currentLevel = Number.parseInt(level);
        awardCheckpointAchievements(user.id, currentLevel)
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
      
      navigate('/learn/checkpoint');
    }
  };

  const handleRetry = () => {
    stopSpeak();
    setResult(null);
    setFeedbackPhrase('');
    if (currentProblem) {
      initEngine(currentProblem);
    }
  };

  const progressPercent = problems.length > 0 ? (completedInLevel / problems.length) * 100 : 0;

  if (!currentProblem || !engine) {
    return (
      <MainLayout>
        <div className="container px-4 py-8">
          <p>加载中...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        {/* 撒花效果 */}
        {showConfetti && <ConfettiOverlay />}

        <Button variant="ghost" onClick={() => navigate('/learn/checkpoint')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回闯关列表
        </Button>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">第{level}关</h2>
            <span className="text-sm text-muted-foreground">
              {completedInLevel}/{problems.length} 题
            </span>
          </div>
          <Progress value={progressPercent} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>题目 {currentProblemIndex + 1}/{problems.length}</CardTitle>
              <CardDescription>{currentProblem.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">{currentProblem.description}</p>

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

              <div className="flex gap-2">
                {result === 'correct' ? (
                  <Button onClick={handleNext} className="flex-1 h-12 text-base font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md">
                    {currentProblemIndex < problems.length - 1 ? (
                      <>🚀 下一题</>
                    ) : (
                      <>🏆 完成闯关</>
                    )}
                  </Button>
                ) : result === 'wrong' ? (
                  <Button onClick={handleRetry} variant="outline" className="flex-1 h-12 text-base font-bold rounded-xl border-2 border-orange-300 text-orange-600 hover:bg-orange-50">
                    🔄 再试一次
                  </Button>
                ) : (
                  <div className="text-center w-full py-2 text-sm text-muted-foreground">
                    👆 在棋盘上点击落子作答吧！
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
