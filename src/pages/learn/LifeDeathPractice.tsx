import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import GoBoard from '@/components/GoBoard';
import {
  playCorrectSound, playWrongSound,
  speak, stopSpeak,
  getCorrectPhrase, getWrongPhrase,
} from '@/lib/sounds';
import {
  type LifeDeathProblem,
  type LifeDeathSolutionBranch,
  checkBranchComplete,
  getHintForCurrentStep,
  validateLifeDeathMove,
} from '@/types/life-death';
import { getLifeDeathProblems, getSystemLifeDeathProblems } from '@/data/life-death-problems';

export default function LifeDeathPractice() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<LifeDeathProblem[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载题目（包含自定义题目）
  useEffect(() => {
    getLifeDeathProblems().then((data) => {
      setProblems(data);
      setLoading(false);
    }).catch(() => {
      // 加载失败时使用系统题目
      setProblems(getSystemLifeDeathProblems());
      setLoading(false);
    });
  }, []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [board, setBoard] = useState<number[][]>([]);
  const [userMoves, setUserMoves] = useState<number[][]>([]);
  const [currentBranch, setCurrentBranch] = useState<LifeDeathSolutionBranch | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [feedbackPhrase, setFeedbackPhrase] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [wrongAnswerShown, setWrongAnswerShown] = useState(false);
  const [wrongMove, setWrongMove] = useState<[number, number] | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);  // 查看正解

  const currentProblem = problems[currentIndex];

  // 初始化棋盘
  useEffect(() => {
    if (currentProblem) {
      setBoard(JSON.parse(JSON.stringify(currentProblem.initialPosition)));
      setUserMoves([]);
      setResult(null);
      setFeedbackPhrase('');
      setShowHint(false);
      setWrongAnswerShown(false);
      setWrongMove(null);
      setCurrentBranch(null);
      setShowAnswer(false);
    }
    return () => stopSpeak();
  }, [currentProblem]);

  // 处理落子
  const handleMove = useCallback((row: number, col: number) => {
    if (result !== null) return; // 已答题完成
    if (board[row][col] !== 0) return; // 位置已有棋子

    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = 1; // 黑子
    setBoard(newBoard);

    const newMoves = [...userMoves, [row, col]];
    setUserMoves(newMoves);

    // 获取当前选中的分支或默认第一分支
    const targetBranch = selectedBranchId === 'all'
      ? currentProblem?.solutionBranches[0]
      : currentProblem?.solutionBranches.find(b => b.id === selectedBranchId);

    if (!targetBranch) return;

    // 验证落子
    const validation = validateLifeDeathMove(currentProblem!, newMoves, targetBranch.id);

    if (validation.isCorrect) {
      // 答对了
      const phrase = getCorrectPhrase();
      setResult('correct');
      setFeedbackPhrase(phrase);
      setCurrentBranch(targetBranch);
      playCorrectSound();
      speak(phrase);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
      setCompletedCount(prev => prev + 1);

      // 检查是否完成整个分支
      if (checkBranchComplete(targetBranch, newMoves)) {
        setFeedbackPhrase(prev => prev + ' ' + targetBranch.explanation);
      }
    } else {
      // 答错了
      const phrase = getWrongPhrase();
      setResult('wrong');
      setFeedbackPhrase(phrase);
      setWrongMove([row, col]);
      playWrongSound();
      speak(phrase);

      // 显示错误解答
      setTimeout(() => setWrongAnswerShown(true), 500);
    }
  }, [board, userMoves, currentProblem, selectedBranchId, result]);

  // 下一题
  const handleNext = () => {
    stopSpeak();
    if (currentIndex < problems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // 重置
  const handleRetry = () => {
    stopSpeak();
    setBoard(JSON.parse(JSON.stringify(currentProblem!.initialPosition)));
    setUserMoves([]);
    setResult(null);
    setFeedbackPhrase('');
    setShowHint(false);
    setWrongAnswerShown(false);
    setWrongMove(null);
    setShowAnswer(false);
  };

  // 获取提示
  const getHint = (): [number, number] | null => {
    if (!currentProblem) return null;
    const targetBranch = selectedBranchId === 'all'
      ? currentProblem.solutionBranches[0]
      : currentProblem.solutionBranches.find(b => b.id === selectedBranchId);
    if (!targetBranch) return null;
    return getHintForCurrentStep(targetBranch, userMoves);
  };

  const progressPercent = problems.length > 0 ? (completedCount / problems.length) * 100 : 0;
  const hint = showHint ? getHint() : null;

  if (!currentProblem) {
    return (
      <MainLayout>
        <div className="container px-4 py-8">
          <Card className="card-kid">
            <CardContent className="py-12 text-center">
              <div className="text-5xl mb-4">🤔</div>
              <p className="text-muted-foreground">正在加载题目...</p>
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
            <span className="text-3xl float-gentle">🧩</span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">死活题专区</h1>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={progressPercent} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {completedCount}/{problems.length}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/learn/practice')}
            >
              📖 通用练习
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            🎯 第 {currentIndex + 1} 题 · {currentProblem.difficulty} · {currentProblem.category}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 题目信息卡 */}
          <Card className="card-kid overflow-hidden">
            <div className="bg-gradient-to-r from-violet-400/15 to-purple-400/10 p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <CardTitle className="text-lg">{currentProblem.title}</CardTitle>
                <span className="ml-auto text-xs px-2 py-1 bg-violet-100 dark:bg-violet-900 rounded-full">
                  {currentProblem.difficulty}
                </span>
              </div>
            </div>

            <CardContent className="p-4 space-y-4">
              <p className="leading-relaxed text-base">{currentProblem.description}</p>

              {/* 分支选择 */}
              {currentProblem.solutionBranches.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">正解分支：</span>
                  <Button
                    size="sm"
                    variant={selectedBranchId === 'all' ? 'default' : 'outline'}
                    onClick={() => setSelectedBranchId('all')}
                    className="h-7 text-xs"
                  >
                    全部
                  </Button>
                  {currentProblem.solutionBranches.map(branch => (
                    <Button
                      key={branch.id}
                      size="sm"
                      variant={selectedBranchId === branch.id ? 'default' : 'outline'}
                      onClick={() => setSelectedBranchId(branch.id)}
                      className="h-7 text-xs"
                    >
                      {branch.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* 答题进度 */}
              {currentBranch && (
                <div className="text-sm text-muted-foreground">
                  📍 进度：{userMoves.length} / {currentBranch.moves.length} 手
                </div>
              )}

              {/* 答对反馈 */}
              {result === 'correct' && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-2xl celebrate">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl bounce-in">🎉</span>
                    <div>
                      <p className="font-bold text-lg">{feedbackPhrase}</p>
                      {currentBranch?.explanation && (
                        <p className="text-sm mt-2 leading-relaxed">{currentBranch.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 正解显示 */}
              {showAnswer && currentProblem.solutionBranches.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 p-4 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl bounce-in">📖</span>
                    <div className="flex-1">
                      <p className="font-bold text-lg mb-2">正解着法</p>
                      <div className="space-y-1">
                        {currentProblem.solutionBranches[0].moves.map((move, idx) => (
                          <p key={idx} className="text-sm">
                            <span className="font-medium">{idx + 1}.</span>{' '}
                            {String.fromCharCode(65 + move[1])}{move[0] + 1}
                          </p>
                        ))}
                      </div>
                      <p className="text-sm mt-2 pt-2 border-t border-blue-200/50">
                        💡 {currentProblem.solutionBranches[0].explanation}
                      </p>
                    </div>
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
                      <p className="text-sm mt-1">再想想，还有其他走法吗？</p>

                      {/* 显示错误解答 */}
                      {wrongAnswerShown && currentProblem.wrongAnswers.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-orange-200/50">
                          <p className="text-xs font-medium mb-1">💡 常见错误：</p>
                          {currentProblem.wrongAnswers.map((wa, i) => {
                            const moveCoord = Array.isArray(wa.move) ? wa.move : wa.moves?.[0];
                            if (!moveCoord) return null;
                            return (
                              <p key={i} className="text-xs">
                                {String.fromCharCode(65 + moveCoord[1])}{moveCoord[0] + 1} - {wa.explanation}
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2">
                {result === 'correct' ? (
                  <Button
                    onClick={handleNext}
                    className="flex-1 h-12 text-base font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500"
                  >
                    🚀 下一题
                  </Button>
                ) : result === 'wrong' ? (
                  <>
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      className="flex-1 h-12 text-base font-bold rounded-xl border-2 border-orange-300 text-orange-600"
                    >
                      🔄 再试
                    </Button>
                    <Button
                      onClick={handleNext}
                      variant="ghost"
                      className="h-12"
                    >
                      跳过
                    </Button>
                    <Button
                      onClick={() => setShowAnswer(true)}
                      variant="secondary"
                      className="h-12"
                    >
                      📖 查看正解
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2 w-full">
                    <Button
                      onClick={() => setShowHint(!showHint)}
                      variant="outline"
                      className="h-12"
                    >
                      💡 {showHint ? '隐藏提示' : '提示'}
                    </Button>
                    <div className="flex-1 text-center py-2 text-sm text-muted-foreground">
                      👆 点击棋盘落子
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 棋盘区 */}
          <div className="flex flex-col items-center">
            {/* 提示显示 */}
            {hint && (
              <div className="mb-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-sm">
                💡 提示：{String.fromCharCode(65 + hint[1])}{hint[0] + 1}
              </div>
            )}

            <GoBoard
              size={currentProblem.boardSize}
              position={board}
              onMove={handleMove}
              disabled={result !== null}
              highlightLastMove
              coordinates
              highlightPoints={hint ? [hint] : []}
              highlightColor="bg-yellow-400"
            />

            {/* 棋盘坐标说明 */}
            <p className="text-xs text-muted-foreground mt-2">
              黑方 · {currentProblem.title}
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// 撒花动画组件
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
