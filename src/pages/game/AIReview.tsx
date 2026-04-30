import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import GoBoard from '@/components/GoBoard';
import {
  analyzeGame,
  getEvaluationColor,
  getEvaluationIcon,
  type MoveAnalysis,
} from '@/lib/ai-review';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGames } from '@/db/api';
import type { Game, GameMove } from '@/types';
import {
  ArrowLeft,
  Sparkles,
  Trophy,
  AlertTriangle,
  ThumbsUp,
  Star,
  ChevronRight,
  ChevronLeft,
  Bot,
  Brain,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReviewState {
  game: Game | null;
  analysis: MoveAnalysis[] | null;
  overallScore: number;
  excellentMoves: number;
  goodMoves: number;
  mistakes: number;
  blunders: number;
  summary: string;
  loading: boolean;
  currentStep: number;
  engine: any; // GoEngine
}

export default function AIReviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [reviewState, setReviewState] = useState<ReviewState>({
    game: null,
    analysis: null,
    overallScore: 0,
    excellentMoves: 0,
    goodMoves: 0,
    mistakes: 0,
    blunders: 0,
    summary: '',
    loading: false,
    currentStep: 0,
    engine: null,
  });

  useEffect(() => {
    if (user) loadGames();
  }, [user]);

  const loadGames = async () => {
    if (!user) return;
    const userGames = await getUserGames(user.id, 20);
    // 只显示已完成的 AI 对局
    const aiGames = userGames.filter(
      (g) => g.type === 'ai' && g.status === 'finished' && Array.isArray(g.moves) && g.moves.length > 0
    );
    setGames(aiGames);
  };

  const startReview = async (game: Game) => {
    if (!Array.isArray(game.moves) || game.moves.length === 0) {
      toast.error('该对局没有棋谱数据');
      return;
    }

    setReviewState((prev) => ({ ...prev, loading: true, game }));

    try {
      // 使用 AI 分析
      const result = await analyzeGame(
        game.moves as GameMove[],
        game.board_size,
        game.board_size <= 9 ? 5.5 : 7.5
      );

      // 初始化棋盘
      const { GoEngine } = await import('@/lib/go-engine');
      const engine = new GoEngine(game.board_size, game.board_size <= 9 ? 5.5 : 7.5);

      setReviewState((prev) => ({
        ...prev,
        ...result,
        loading: false,
        currentStep: 0,
        engine,
      }));

      toast.success('AI 复盘完成！');
    } catch (error) {
      console.error('复盘失败:', error);
      toast.error('复盘失败，请重试');
      setReviewState((prev) => ({ ...prev, loading: false }));
    }
  };

  const goToMove = (step: number) => {
    if (!reviewState.game || !reviewState.analysis) return;

    const { GoEngine } = require('@/lib/go-engine');
    const engine = new GoEngine(
      reviewState.game.board_size,
      reviewState.game.board_size <= 9 ? 5.5 : 7.5
    );

    // 重放前 step 步
    const moves = reviewState.game.moves as GameMove[];
    for (let i = 0; i < Math.min(step, moves.length); i++) {
      const move = moves[i];
      if (!move.isPass) {
        engine.placeStone(move.row, move.col, move.color);
      }
    }

    setReviewState((prev) => ({ ...prev, currentStep: step, engine }));
  };

  const { game, analysis, loading, currentStep, engine } = reviewState;

  // 选择对局页面
  if (!game && !loading) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">AI 辅助复盘</h1>
              <p className="text-sm text-muted-foreground">
                使用 AI 分析你的对局，找出每一步的优劣
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/profile/history')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
          </div>

          {games.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-2">暂无可复盘的对局</p>
                <p className="text-sm text-muted-foreground mb-4">
                  完成一局 AI 对弈后可以来这里复盘
                </p>
                <Button onClick={() => navigate('/game/ai')}>开始对弈</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {games.map((g) => (
                <Card
                  key={g.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => startReview(g)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {g.ai_difficulty || 'AI'}
                          </Badge>
                          <span className="font-medium">
                            {g.board_size}×{g.board_size}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {g.move_count || (Array.isArray(g.moves) ? g.moves.length : 0)} 手
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {g.result === 'black_win' ? '白胜' : g.result === 'white_win' ? '黑胜' : '平局'}
                          {g.end_type && ` · ${g.end_type}`}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Sparkles className="w-4 h-4 mr-2" />
                        开始复盘
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  // 加载中
  if (loading) {
    return (
      <MainLayout>
        <div className="container px-4 py-6 max-w-4xl mx-auto">
          <Card className="py-12">
            <CardContent className="text-center">
              <Bot className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
              <h2 className="text-xl font-bold mb-2">AI 正在分析中...</h2>
              <p className="text-muted-foreground">正在评估每一步棋的优劣</p>
              <Progress className="mt-4 max-w-xs mx-auto" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // 复盘结果页面
  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-6xl mx-auto">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => setReviewState((prev) => ({ ...prev, game: null, analysis: null }))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回选择
          </Button>
          <Badge variant="outline" className="flex items-center gap-1">
            <Bot className="w-4 h-4" />
            AI 复盘
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 - 概览和统计 */}
          <div className="space-y-4">
            {/* 综合评分 */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">综合评分</p>
                <div className="text-6xl font-bold text-primary mb-2">
                  {reviewState.overallScore}
                </div>
                <p className="text-sm">{reviewState.summary}</p>
              </CardContent>
            </Card>

            {/* 统计 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">着法分析</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-green-500" />
                    <span className="text-sm">妙手</span>
                  </div>
                  <span className="font-bold text-green-500">{reviewState.excellentMoves}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm">好棋</span>
                  </div>
                  <span className="font-bold text-emerald-500">{reviewState.goodMoves}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm">疑问手</span>
                  </div>
                  <span className="font-bold text-amber-500">{reviewState.mistakes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm">失误</span>
                  </div>
                  <span className="font-bold text-red-500">{reviewState.blunders}</span>
                </div>
              </CardContent>
            </Card>

            {/* 当前着法详情 */}
            {analysis && analysis[currentStep] && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className={getEvaluationColor(analysis[currentStep].evaluation)}>
                      {getEvaluationIcon(analysis[currentStep].evaluation)}
                    </span>
                    第 {currentStep + 1} 手分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {String.fromCharCode(65 + analysis[currentStep].col)}
                      {game!.board_size - analysis[currentStep].row}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {analysis[currentStep].color === 'black' ? '⚫ 黑' : '⚪ 白'}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">胜率变化</span>
                      <span className={analysis[currentStep].winRateChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {analysis[currentStep].winRateChange >= 0 ? '+' : ''}
                        {analysis[currentStep].winRateChange.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">目数变化</span>
                      <span className={analysis[currentStep].scoreLeadChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {analysis[currentStep].scoreLeadChange >= 0 ? '+' : ''}
                        {analysis[currentStep].scoreLeadChange.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {analysis[currentStep].comment}
                  </p>

                  {analysis[currentStep].suggestion && (
                    <div className="bg-primary/10 rounded-lg p-3">
                      <p className="text-xs font-medium mb-1">💡 AI 建议</p>
                      <p className="text-sm">{analysis[currentStep].suggestion}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧 - 棋盘和着法列表 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 棋盘 */}
            <Card className="overflow-hidden">
              <CardContent className="p-4 flex justify-center">
                {engine && (
                  <GoBoard
                    size={game!.board_size}
                    engine={engine}
                    disabled
                    showCoordinates
                    highlightLastMove
                  />
                )}
              </CardContent>
            </Card>

            {/* 播放控制 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToMove(0)}
                    disabled={currentStep === 0}
                  >
                    ⏮️
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToMove(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToMove(Math.min((analysis?.length || 1) - 1, currentStep + 1))}
                    disabled={currentStep >= (analysis?.length || 1) - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToMove((analysis?.length || 1) - 1)}
                    disabled={currentStep >= (analysis?.length || 1) - 1}
                  >
                    ⏭️
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 着法列表 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">着法列表</CardTitle>
              </CardHeader>
              <CardContent className="max-h-64 overflow-y-auto">
                <div className="grid grid-cols-10 gap-1">
                  {analysis?.map((move, i) => (
                    <button
                      key={i}
                      onClick={() => goToMove(i)}
                      className={`p-2 rounded text-xs font-medium transition-colors ${
                        i === currentStep
                          ? 'bg-primary text-primary-foreground'
                          : move.evaluation === 'blunder' || move.evaluation === 'mistake'
                          ? 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50'
                          : move.evaluation === 'excellent'
                          ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      <span className="block">{getEvaluationIcon(move.evaluation)}</span>
                      <span className="block text-[10px]">{i + 1}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
