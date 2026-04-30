import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import GoBoard from '@/components/GoBoard';
import { GoEngine, type StoneColor } from '@/lib/go-engine';
import { MOCK_LIVE_GAMES, getRankLabel, getRankIcon, type LiveGame } from '@/data/live-games';
import {
  ArrowLeft,
  Users,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SpectateState {
  game: LiveGame;
  engine: GoEngine;
  currentStep: number;
  isPlaying: boolean;
  speed: number; // ms per move
}

export default function SpectateGamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<SpectateState | null>(null);
  const [loading, setLoading] = useState(true);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // 模拟加载游戏数据
    const game = MOCK_LIVE_GAMES.find((g) => g.id === id);
    if (game) {
      const engine = new GoEngine(game.boardSize, game.boardSize <= 9 ? 5.5 : 7.5);
      
      // 重放所有落子
      game.moves.forEach((move) => {
        engine.placeStone(move.row, move.col, move.color);
      });

      setState({
        game,
        engine,
        currentStep: game.moves.length,
        isPlaying: false,
        speed: 1000,
      });
    }
    setLoading(false);
  }, [id]);

  // 自动播放
  useEffect(() => {
    if (state?.isPlaying && state.currentStep < state.game.moves.length) {
      playTimerRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev || prev.currentStep >= prev.game.moves.length) {
            return { ...prev!, isPlaying: false };
          }
          const nextMove = prev.game.moves[prev.currentStep];
          prev.engine.placeStone(nextMove.row, nextMove.col, nextMove.color);
          return { ...prev, currentStep: prev.currentStep + 1 };
        });
      }, state.speed);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [state?.isPlaying, state?.currentStep, state?.game.moves.length, state?.speed]);

  const togglePlay = () => {
    setState((prev) => prev ? { ...prev, isPlaying: !prev.isPlaying } : prev);
  };

  const goToStep = (step: number) => {
    if (!state) return;
    const engine = new GoEngine(state.game.boardSize, state.game.boardSize <= 9 ? 5.5 : 7.5);
    const movesToApply = state.game.moves.slice(0, step);
    movesToApply.forEach((move) => {
      engine.placeStone(move.row, move.col, move.color);
    });
    setState((prev) => prev ? { ...prev, engine, currentStep: step } : prev);
  };

  const toggleSpeed = () => {
    setState((prev) => {
      if (!prev) return prev;
      const speeds = [2000, 1000, 500, 200];
      const currentIndex = speeds.indexOf(prev.speed);
      const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
      return { ...prev, speed: nextSpeed };
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </MainLayout>
    );
  }

  if (!state) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">未找到对局</h1>
          <Button onClick={() => navigate('/game/spectate')}>返回观战大厅</Button>
        </div>
      </MainLayout>
    );
  }

  const { game, engine, currentStep, isPlaying, speed } = state;
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return '刚刚开始';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    return `${Math.floor(diff / 3600)}小时前`;
  };

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-5xl mx-auto">
        {/* 顶部信息栏 */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate('/game/spectate')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {game.spectatorCount} 人在看
            </Badge>
            {game.aiDifficulty && (
              <Badge variant="secondary">🤖 AI对弈</Badge>
            )}
          </div>
        </div>

        {/* 对局信息 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {/* 黑方 */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                  <span className="text-2xl">⚫</span>
                </div>
                <div>
                  <p className="font-bold">{game.blackPlayer.nickname}</p>
                  <p className="text-sm text-muted-foreground">
                    {getRankIcon(game.blackPlayer.rank)} {getRankLabel(game.blackPlayer.rank)}
                  </p>
                </div>
              </div>

              {/* VS */}
              <div className="text-center">
                <p className="text-2xl font-bold">{currentStep}</p>
                <p className="text-xs text-muted-foreground">手数</p>
              </div>

              {/* 白方 */}
              <div className="flex items-center gap-3 flex-row-reverse">
                <div className="w-12 h-12 rounded-full bg-white border-2 flex items-center justify-center">
                  <span className="text-2xl">⚪</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{game.whitePlayer.nickname}</p>
                  <p className="text-sm text-muted-foreground">
                    {getRankIcon(game.whitePlayer.rank)} {getRankLabel(game.whitePlayer.rank)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 棋盘 */}
        <Card className="overflow-hidden mb-4">
          <CardContent className="p-4 flex justify-center">
            <GoBoard
              size={game.boardSize}
              engine={engine}
              disabled
              showCoordinates
              highlightLastMove
            />
          </CardContent>
        </Card>

        {/* 播放控制 */}
        <Card>
          <CardContent className="p-4">
            {/* 进度条 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground w-10">1</span>
              <input
                type="range"
                min={1}
                max={game.moves.length || 1}
                value={currentStep}
                onChange={(e) => goToStep(parseInt(e.target.value))}
                className="flex-1 h-2"
              />
              <span className="text-sm text-muted-foreground w-10">
                {game.moves.length}
              </span>
            </div>

            {/* 控制按钮 */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToStep(Math.max(1, currentStep - 10))}
                disabled={currentStep <= 1}
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToStep(Math.max(1, currentStep - 1))}
                disabled={currentStep <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="w-12 h-12"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToStep(Math.min(game.moves.length, currentStep + 1))}
                disabled={currentStep >= game.moves.length}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToStep(Math.min(game.moves.length, currentStep + 10))}
                disabled={currentStep >= game.moves.length}
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              <Button variant="ghost" onClick={toggleSpeed} className="ml-4">
                {speed}ms
              </Button>
            </div>

            {/* 最后一手信息 */}
            {game.moves.length > 0 && currentStep > 0 && (
              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  第 {currentStep} 手：{' '}
                  <span className={game.moves[currentStep - 1]?.color === 'black' ? 'text-gray-800 font-bold' : 'text-gray-600 font-bold'}>
                    {String.fromCharCode(65 + game.moves[currentStep - 1]?.col)}
                    {game.boardSize - game.moves[currentStep - 1]?.row}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
