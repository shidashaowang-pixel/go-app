import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import GoBoard from '@/components/GoBoard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GoEngine } from '@/lib/go-engine';
import {
  ALL_TSUMEGO_PROBLEMS,
  TSUMEGO_CATEGORIES,
  DIFFICULTY_LABELS,
  type TsumegoProblem,
} from '@/data/tsumego';
import {
  playCorrectSound, playWrongSound, playLevelUpSound,
  speak, stopSpeak,
  getCorrectPhrase, getWrongPhrase,
} from '@/lib/sounds';
import { ArrowLeft, ArrowRight, RotateCcw, Lightbulb, Eye, ChevronRight, Star, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { updateProgress } from '@/db/api';
import { toast } from 'sonner';

export default function ProblemSolve() {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 找到当前题目
  const problemIndex = ALL_TSUMEGO_PROBLEMS.findIndex(p => p.id === problemId);
  const problem = ALL_TSUMEGO_PROBLEMS[problemIndex];

  const [engine, setEngine] = useState<GoEngine | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [showHint, setShowHint] = useState(0); // 0=不显示, 1=提示1, 2=提示2...
  const [showSolution, setShowSolution] = useState(false);
  const [solutionEngine, setSolutionEngine] = useState<GoEngine | null>(null);
  const [solutionStep, setSolutionStep] = useState(0);
  const [feedbackPhrase, setFeedbackPhrase] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('tsumego-solved');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  // AI对弈模式状态
  const [aiBattleStep, setAiBattleStep] = useState(0); // 当前进行到正解序列的第几步
  const [aiWrongFeedback, setAiWrongFeedback] = useState(''); // AI对弈模式的错误反馈
  const [aiThinking, setAiThinking] = useState(false); // AI是否正在思考（防止用户重复点击）
  const [aiWrongBranchActive, setAiWrongBranchActive] = useState(false); // 是否处于错误分支继续状态

  // 初始化引擎
  useEffect(() => {
    if (problem) {
      initEngine(problem);
      setResult(null);
      setShowHint(0);
      setShowSolution(false);
      setSolutionEngine(null);
      setSolutionStep(0);
      setFeedbackPhrase('');
    }
    return () => stopSpeak();
  }, [problemId]);

  // 保存已解题目
  useEffect(() => {
    try {
      localStorage.setItem('tsumego-solved', JSON.stringify([...solvedProblems]));
    } catch {}
  }, [solvedProblems]);

  const initEngine = (p: TsumegoProblem) => {
    const e = new GoEngine(p.boardSize);
    e.loadPosition(p.initialPosition, (p.solution as any)?.to_play || 'black');
    setEngine(e);
    setAiBattleStep(0);
    setAiWrongFeedback('');
    setAiThinking(false);
    setAiWrongBranchActive(false);
  };

  // AI对弈模式：检查用户落子是否匹配某个分支
  // 返回说明：
  //   - correct: true=正解, false=错误
  //   - done: true=结束（正解完成或完全不在分支中）, false=继续（AI还要走或错误分支继续）
  //   - feedback: 提示信息
  //   - isWrongBranch: 是否匹配到了错误分支（需要显示失败提示但继续走）
  const checkAIBattleMove = (row: number, col: number, eng: GoEngine): { correct: boolean; done: boolean; feedback?: string; isWrongBranch?: boolean } => {
    if (!problem) return { correct: false, done: false };

    const aiMoves = (problem.solution as any)?.ai_moves as Array<{ row: number; col: number; color?: string }> | undefined;
    const altAiMoves = (problem.solution as any)?.alternative_ai_moves as Array<Array<{ row: number; col: number; color?: string }>> | undefined;
    const wrongAiMoves = problem.wrong_answers?.map(wa => (wa as any).ai_moves as Array<{ row: number; col: number; color?: string }> | undefined);
    const toPlay = (problem.solution as any)?.to_play as 'black' | 'white' || 'black';

    const userColor = toPlay;
    // 计算这是用户的第几步（只算用户颜色的步数）
    const history = eng.getMoveHistory();
    const userMoveCount = history.filter(m => m.color === userColor).length;

    console.log('[AI对弈] 用户落子:', { row, col, userMoveCount, totalMoves: history.length });

    // 辅助函数：创建新引擎实例来触发React重渲染
    const cloneEngineForRender = (sourceEng: GoEngine): GoEngine => {
      const newEng = new GoEngine(sourceEng.size);
      // 复制棋盘状态
      newEng.board = sourceEng.board.map(r => [...r]);
      newEng.currentPlayer = sourceEng.currentPlayer;
      newEng.moveHistory = sourceEng.moveHistory.map(m => ({ ...m, captured: m.captured.map(r => [...r]) }));
      newEng.capturedStones = { ...sourceEng.capturedStones };
      newEng.koPoint = sourceEng.koPoint ? { ...sourceEng.koPoint } : null;
      newEng.consecutivePasses = sourceEng.consecutivePasses;
      newEng.gameOver = sourceEng.gameOver;
      newEng.lastBoardState = sourceEng.lastBoardState;
      return newEng;
    };

    // 检查是否匹配任何错误分支
    if (wrongAiMoves) {
      for (let wi = 0; wi < wrongAiMoves.length; wi++) {
        const wa = wrongAiMoves[wi];
        if (!wa || wa.length === 0) continue;
        // 检查用户当前步是否匹配错误分支的对应步
        // wa[0]=用户第1步, wa[1]=AI第1步, wa[2]=用户第2步, ...
        const expectedUserStepIdx = (userMoveCount - 1) * 2;
        if (expectedUserStepIdx < wa.length) {
          const expected = wa[expectedUserStepIdx];
          if (expected && expected.row === row && expected.col === col) {
            // 用户走到了错误分支！
            // AI需要继续按错误分支走下一步（如果有）
            const aiResponse = wa[expectedUserStepIdx + 1]; // AI在错误分支中的应手
            const hasMoreUserMoves = expectedUserStepIdx + 2 < wa.length; // 错误分支后面还有用户的步吗

            if (aiResponse) {
              setAiThinking(true);
              setTimeout(() => {
                eng.placeStone(aiResponse.row, aiResponse.col);
                setEngine(cloneEngineForRender(eng));
                setAiThinking(false);
              }, 600);
            }
            const wrongExp = problem.wrong_answers?.[wi]?.explanation || '这个走法不正确';
            // 错误分支：显示失败提示，但继续走（如果还有后续步）
            return { correct: false, done: !hasMoreUserMoves, feedback: wrongExp, isWrongBranch: true };
          }
        }
      }
    }

    // 检查是否匹配主正解分支
    if (aiMoves && aiMoves.length > 0) {
      const expectedUserStepIdx = (userMoveCount - 1) * 2;
      if (expectedUserStepIdx < aiMoves.length) {
        const expected = aiMoves[expectedUserStepIdx];
        if (expected && expected.row === row && expected.col === col) {
          // 匹配正解！检查是否还有AI应手
          const aiResponse = aiMoves[expectedUserStepIdx + 1];
          const isLastUserMove = expectedUserStepIdx + 2 >= aiMoves.length; // 后面没有用户的步了

          if (aiResponse) {
            // AI自动落子
            setAiThinking(true);
            setTimeout(() => {
              eng.placeStone(aiResponse.row, aiResponse.col);
              setEngine(cloneEngineForRender(eng));
              setAiBattleStep(userMoveCount);
              setAiThinking(false);
            }, 600);
            return { correct: true, done: false }; // AI走完后继续让用户走
          }

          // 没有AI应手，用户走完了正解序列的最后一步
          return { correct: true, done: true };
        }
      }
    }

    // 检查是否匹配替代正解分支
    if (altAiMoves) {
      for (const alt of altAiMoves) {
        if (!alt || alt.length === 0) continue;
        const expectedUserStepIdx = (userMoveCount - 1) * 2;
        if (expectedUserStepIdx < alt.length) {
          const expected = alt[expectedUserStepIdx];
          if (expected && expected.row === row && expected.col === col) {
            const aiResponse = alt[expectedUserStepIdx + 1];
            const isLastUserMove = expectedUserStepIdx + 2 >= alt.length;

            if (aiResponse) {
              setAiThinking(true);
              setTimeout(() => {
                eng.placeStone(aiResponse.row, aiResponse.col);
                setEngine(cloneEngineForRender(eng));
                setAiBattleStep(userMoveCount);
                setAiThinking(false);
              }, 600);
              return { correct: true, done: false };
            }

            return { correct: true, done: true };
          }
        }
      }
    }

    // 不匹配任何分支 → 直接判错（真正结束）
    return { correct: false, done: true, feedback: '这个走法不在正解或常见错误分支中', isWrongBranch: false };
  };

  // 处理落子
  const handleMove = useCallback((row: number, col: number, eng: GoEngine) => {
    if (!problem) return;

    const wc = problem.solution.win_condition;

    // AI对弈模式
    if (wc === 'ai_battle') {
      const result = checkAIBattleMove(row, col, eng);

      if (result.isWrongBranch) {
        // 匹配到错误分支：显示失败提示，但继续走（如果还有后续步）
        if (result.feedback) {
          setAiWrongFeedback(result.feedback);
        }
        // 播放错误音效和语音
        const phrase = getWrongPhrase();
        setResult('wrong');
        setFeedbackPhrase(phrase);
        playWrongSound();
        speak(phrase);

        if (!result.done) {
          // 错误分支还有后续，让用户继续走（AI已经落子）
          setAiWrongBranchActive(true);
          // 3秒后自动清除错误状态，让用户继续
          setTimeout(() => {
            setResult(null);
            setFeedbackPhrase('');
            setAiWrongBranchActive(false);
          }, 3000);
        }
        return;
      }

      if (result.done) {
        if (result.correct) {
          handleCorrect();
        } else {
          // 完全不在任何分支中
          if (result.feedback) {
            setAiWrongFeedback(result.feedback);
          }
          handleWrong();
        }
      }
      // 如果 done=false（正解且AI还要走），等AI走完再让用户走
      return;
    }

    if (wc === 'capture') {
      // 提子判定：吃到子算赢
      const captureMin = problem.solution.capture_min || 1;
      const totalCaptured = eng.capturedStones.black;
      
      const solution = problem.solution.moves;
      const lastMove = eng.getLastMove();
      const matchesSolution = lastMove && 
        lastMove.row === solution[0][0] && 
        lastMove.col === solution[0][1];

      if (matchesSolution && totalCaptured >= captureMin) {
        handleCorrect();
      } else {
        handleWrong();
      }
      return;
    }

    // 精确匹配模式
    const solution = problem.solution.moves;
    const alternatives = problem.solution.alternative_moves ?? [];
    const moveCount = eng.getMoveCount();

    if (moveCount >= 1) {
      const lastMove = eng.getLastMove();
      const matchesMain = lastMove && lastMove.row === solution[0][0] && lastMove.col === solution[0][1];
      const matchesAlt = alternatives.some(alt =>
        lastMove && alt[0] && lastMove.row === alt[0][0] && lastMove.col === alt[0][1]
      );

      if (matchesMain || matchesAlt) {
        handleCorrect();
      } else {
        handleWrong();
      }
    }
  }, [problem, engine]);

  const handleCorrect = async () => {
    const phrase = getCorrectPhrase();
    setResult('correct');
    setFeedbackPhrase(phrase);
    playCorrectSound();
    speak(phrase);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2500);
    
    if (problem) {
      // 1. 保存到本地存储
      setSolvedProblems(prev => new Set([...prev, problem.id]));
      
      // 2. 保存到云端（如果已登录，静默失败）
      if (user?.id) {
        updateProgress(
          user.id,
          null, // courseId
          problem.id,
          100, // progress 100%
          true  // completed
        );
      }
    }
  };

  const handleWrong = () => {
    const phrase = getWrongPhrase();
    setResult('wrong');
    setFeedbackPhrase(phrase);
    playWrongSound();
    speak(phrase);
  };

  const handleRetry = () => {
    stopSpeak();
    setResult(null);
    setFeedbackPhrase('');
    setAiWrongFeedback('');
    setShowSolution(false);
    setSolutionEngine(null);
    setSolutionStep(0);
    setAiBattleStep(0);
    setAiThinking(false);
    setAiWrongBranchActive(false);
    if (problem) initEngine(problem);
  };

  const handleNext = () => {
    stopSpeak();
    if (problemIndex < ALL_TSUMEGO_PROBLEMS.length - 1) {
      navigate(`/problems/solve/${ALL_TSUMEGO_PROBLEMS[problemIndex + 1].id}`);
    } else {
      navigate('/problems');
    }
  };

  const handlePrev = () => {
    stopSpeak();
    if (problemIndex > 0) {
      navigate(`/problems/solve/${ALL_TSUMEGO_PROBLEMS[problemIndex - 1].id}`);
    }
  };

  // 显示提示
  const handleShowHint = () => {
    if (problem && showHint < problem.hints.length) {
      setShowHint(prev => prev + 1);
    }
  };

  // 查看正解
  const handleShowSolution = () => {
    if (!problem) return;
    setShowSolution(true);
    setResult(null);
    setFeedbackPhrase('');

    // 创建一个新引擎来演示正解
    const e = new GoEngine(problem.boardSize);
    e.loadPosition(problem.initialPosition, (problem.solution as any)?.to_play || 'black');
    setSolutionEngine(e);
    setSolutionStep(0);
  };

  // 正解动画步进
  const handleSolutionStep = () => {
    if (!problem || !solutionEngine) return;
    const nextStep = solutionStep;
    if (nextStep < problem.solution.moves.length) {
      const [r, c] = problem.solution.moves[nextStep];
      solutionEngine.placeStone(r, c);
      setSolutionEngine(solutionEngine); // 触发重绘
      setSolutionStep(nextStep + 1);
    }
  };

  if (!problem || !engine) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-muted-foreground mb-4">题目未找到</p>
          <Button onClick={() => navigate('/problems')}>返回题库</Button>
        </div>
      </MainLayout>
    );
  }

  const categoryInfo = TSUMEGO_CATEGORIES.find(c => c.key === problem.category);
  const isSolved = solvedProblems.has(problem.id);
  const displayEngine = showSolution && solutionEngine ? solutionEngine : engine;

  return (
    <MainLayout>
      <div className="container px-4 py-4 max-w-5xl mx-auto">
        {showConfetti && <ConfettiOverlay />}

        {/* 顶部导航栏 */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/problems')} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> 题库
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {problemIndex + 1} / {ALL_TSUMEGO_PROBLEMS.length}
            </span>
            {isSolved && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                <Star className="h-3 w-3 mr-1 fill-emerald-500 text-emerald-500" /> 已解
              </Badge>
            )}
          </div>
        </div>

        {/* 主体区域：左侧棋盘 + 右侧信息 */}
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* 棋盘 */}
          <div className="flex justify-center">
            <GoBoard
              size={problem.boardSize}
              engine={displayEngine}
              onMove={handleMove}
              disabled={(result !== null && !aiWrongBranchActive) || showSolution || aiThinking}
              highlightLastMove
            />
          </div>

          {/* 右侧面板 */}
          <div className="space-y-3">
            {/* 题目信息卡 */}
            <Card className={`overflow-hidden border-2 ${result === 'correct' ? 'border-emerald-300' : result === 'wrong' ? 'border-orange-300' : 'border-border'}`}>
              <div className={`px-4 py-3 ${
                problem.category === 'capture' ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20' :
                problem.category === 'life_death' ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20' :
                'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{categoryInfo?.icon}</span>
                    <div>
                      <h2 className="font-bold text-base leading-tight">{problem.title}</h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {categoryInfo?.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {DIFFICULTY_LABELS[problem.difficulty]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: problem.difficulty }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    ))}
                    {Array.from({ length: 5 - problem.difficulty }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 text-gray-200" />
                    ))}
                  </div>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <p className="text-sm leading-relaxed">{problem.description}</p>

                {/* 正确反馈 */}
                {result === 'correct' && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-3 rounded-xl celebrate">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl bounce-in">🎉</span>
                      <div className="flex-1">
                        <p className="font-bold">{feedbackPhrase}</p>
                        <p className="text-xs mt-1 leading-relaxed">{problem.solution.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 错误反馈 */}
                {result === 'wrong' && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 p-3 rounded-xl">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl bounce-in">💪</span>
                      <div>
                        <p className="font-bold">{feedbackPhrase}</p>
                        {aiWrongFeedback && (
                          <p className="text-xs mt-1 leading-relaxed">{aiWrongFeedback}</p>
                        )}
                        <p className="text-xs mt-1">再仔细看看棋盘，试试别的位置~</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 正解演示 */}
                {showSolution && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-xl">
                    <div className="flex items-start gap-2">
                      <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-blue-700 dark:text-blue-400 text-sm">正解演示</p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">{problem.solution.explanation}</p>
                        {solutionStep < problem.solution.moves.length && (
                          <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={handleSolutionStep}>
                            <ChevronRight className="h-3 w-3 mr-1" />
                            第{solutionStep + 1}步
                          </Button>
                        )}
                        {solutionStep >= problem.solution.moves.length && (
                          <p className="text-xs text-blue-500 mt-1 font-medium">正解演示完毕</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 提示区域 */}
                {showHint > 0 && !showSolution && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        {problem.hints.slice(0, showHint).map((hint, i) => (
                          <p key={i} className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            💡 {hint}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="space-y-2">
                  {result === 'correct' ? (
                    <div className="flex gap-2">
                      <Button onClick={handleNext} className="flex-1 h-10 text-sm font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                        下一题 <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={handleRetry} title="再做一次">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : result === 'wrong' && !aiWrongBranchActive ? (
                    <div className="flex gap-2">
                      <Button onClick={handleRetry} variant="outline" className="flex-1 h-10 text-sm font-bold rounded-xl border-2 border-orange-300 text-orange-600 hover:bg-orange-50">
                        <RotateCcw className="h-4 w-4 mr-1" /> 再试一次
                      </Button>
                      <Button variant="outline" size="sm" className="h-10 px-3 rounded-xl" onClick={handleShowSolution}>
                        <Eye className="h-4 w-4 mr-1" /> 正解
                      </Button>
                    </div>
                  ) : result === 'wrong' && aiWrongBranchActive ? (
                    <div className="flex gap-2">
                      <div className="flex-1 text-center text-sm text-orange-600 py-2 font-medium">
                        ⚠️ 这是错误分支，AI已应对，请继续走棋...
                      </div>
                    </div>
                  ) : showSolution ? (
                    <div className="flex gap-2">
                      <Button onClick={handleRetry} className="flex-1 h-10 text-sm rounded-xl">
                        <RotateCcw className="h-4 w-4 mr-1" /> 自己试试
                      </Button>
                      <Button onClick={handleNext} variant="outline" className="flex-1 h-10 text-sm rounded-xl">
                        下一题 <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1 text-center text-sm text-muted-foreground py-2">
                          {aiThinking
                            ? '🤖 AI正在思考...'
                            : problem.solution.win_condition === 'ai_battle'
                            ? `🤖 AI对弈模式：你是${(problem.solution as any)?.to_play === 'white' ? '白棋' : '黑棋'}，请落子`
                            : '👆 在棋盘上点击落子作答'}
                        </div>
                        <Button variant="ghost" size="sm" className="h-10 px-3 rounded-xl" onClick={handleShowHint} disabled={showHint >= problem.hints.length}>
                          <Lightbulb className="h-4 w-4 mr-1" /> 提示
                        </Button>
                        <Button variant="ghost" size="sm" className="h-10 px-3 rounded-xl" onClick={handleShowSolution}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      {problem.solution.win_condition === 'ai_battle' && (
                        <p className="text-xs text-blue-600 text-center">
                          AI会自动按正解图/错误图应对你的走法
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 上一题/下一题导航 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl h-9"
                onClick={handlePrev}
                disabled={problemIndex <= 0}
              >
                上一题
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl h-9"
                onClick={handleNext}
                disabled={problemIndex >= ALL_TSUMEGO_PROBLEMS.length - 1}
              >
                下一题
              </Button>
            </div>

            {/* 题目标签 */}
            <div className="flex flex-wrap gap-1.5">
              {problem.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* 统计 */}
            <Card className="p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>已解 {solvedProblems.size} / {ALL_TSUMEGO_PROBLEMS.length} 题</span>
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all"
                    style={{ width: `${(solvedProblems.size / ALL_TSUMEGO_PROBLEMS.length) * 100}%` }}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

/** 撒花动画 */
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
