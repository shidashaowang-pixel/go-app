import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getUserGames } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Game, GameMove, ScoreDetail } from '@/types';
import { format } from 'date-fns';
import { Clock, Trophy, Swords, Timer, ChevronDown, ChevronUp, Zap, Flag, Calculator, Download, Share2 } from 'lucide-react';
import { downloadSGF, shareGame } from '@/lib/sgf';
import { toast } from 'sonner';

/** 结束方式标签 */
function EndTypeBadge({ endType }: { endType: string | null }) {
  switch (endType) {
    case 'score':
      return <Badge variant="secondary" className="text-xs"><Calculator className="h-3 w-3 mr-1" />数子</Badge>;
    case 'resign':
      return <Badge variant="outline" className="text-xs text-orange-600"><Flag className="h-3 w-3 mr-1" />认输</Badge>;
    case 'timeout':
      return <Badge variant="outline" className="text-xs text-red-600"><Timer className="h-3 w-3 mr-1" />超时</Badge>;
    case 'abandon':
      return <Badge variant="outline" className="text-xs text-gray-500">放弃</Badge>;
    default:
      return null;
  }
}

/** 格式化时长 */
function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}小时${m}分`;
}

/** 判断棋谱格式是否为新格式 */
function isNewMoveFormat(moves: GameMove[] | number[][]): moves is GameMove[] {
  return moves.length > 0 && typeof moves[0] === 'object' && 'color' in (moves[0] as GameMove);
}

export default function GameHistory() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadGames();
  }, [user]);

  const loadGames = async () => {
    if (!user) return;
    const data = await getUserGames(user.id, 50);
    setGames(data);
  };

  const getResultBadge = (game: Game) => {
    if (!game.result) return <Badge variant="secondary">进行中</Badge>;
    const isBlack = game.black_player_id === user?.id;
    const won = (isBlack && game.result === 'black_win') || (!isBlack && game.result === 'white_win');
    return won ? (
      <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">🎉 胜</Badge>
    ) : game.result === 'draw' ? (
      <Badge variant="secondary">🤝 平</Badge>
    ) : (
      <Badge variant="destructive">💪 负</Badge>
    );
  };

  // 统计数据
  const totalGames = games.length;
  const finishedGames = games.filter(g => g.status === 'finished');
  const wins = finishedGames.filter(g => {
    if (!g.result || g.result === 'draw') return false;
    const isBlack = g.black_player_id === user?.id;
    return (isBlack && g.result === 'black_win') || (!isBlack && g.result === 'white_win');
  }).length;
  const winRate = finishedGames.length > 0 ? Math.round((wins / finishedGames.length) * 100) : 0;
  const aiGames = games.filter(g => g.type === 'ai').length;
  const humanGames = games.filter(g => g.type === 'human').length;

  const toggleExpand = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">对弈战绩</h1>
          <p className="text-muted-foreground">查看历史对局记录，下载棋谱</p>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-4 gap-3 mb-6 max-w-2xl">
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <Swords className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{totalGames}</p>
              <p className="text-[10px] text-muted-foreground">总对局</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <Trophy className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-xl font-bold">{winRate}%</p>
              <p className="text-[10px] text-muted-foreground">胜率</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <Zap className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xl font-bold">{aiGames}</p>
              <p className="text-[10px] text-muted-foreground">AI对弈</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-3">
              <Swords className="w-5 h-5 mx-auto mb-1 text-purple-600" />
              <p className="text-xl font-bold">{humanGames}</p>
              <p className="text-[10px] text-muted-foreground">真人对弈</p>
            </CardContent>
          </Card>
        </div>

        {/* 对局列表 */}
        <div className="max-w-4xl mx-auto">
          {games.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Swords className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-2">暂无对局记录</p>
                <p className="text-sm text-muted-foreground">去对弈中心开始你的第一局吧！</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {games.map((game) => {
                const isExpanded = expandedGame === game.id;
                const sd = game.score_detail as ScoreDetail | null;

                return (
                  <Card key={game.id} className="overflow-hidden">
                    {/* 基础信息行 */}
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left"
                      onClick={() => toggleExpand(game.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          game.type === 'ai' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20'
                        }`}>
                          {game.type === 'ai' ? '🤖' : '⚔️'}
                        </div>
                        <div>
                          <p className="font-medium">
                            {game.type === 'ai' ? 'AI对弈' : '真人对弈'}
                            {game.ai_difficulty && <span className="text-muted-foreground ml-1 text-sm">· {game.ai_difficulty}</span>}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(game.started_at), 'MM-dd HH:mm')}
                            {game.board_size && <span>{game.board_size}×{game.board_size}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getResultBadge(game)}
                        <EndTypeBadge endType={game.end_type ?? null} />
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* 展开详情 */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t bg-accent/20">
                        {/* 得分详情 */}
                        {sd && (
                          <div className="pt-3">
                            <p className="text-sm font-medium mb-2">数子结果</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className={`p-3 rounded-lg ${sd.winner === 'black' ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200' : 'bg-secondary/50'}`}>
                                <p className="text-xs text-muted-foreground mb-1">黑棋</p>
                                <p className="text-lg font-bold">{sd.blackScore} 目</p>
                                <p className="text-xs text-muted-foreground">
                                  子{sd.details.blackStones} + 地{sd.details.blackTerritory}
                                </p>
                              </div>
                              <div className={`p-3 rounded-lg ${sd.winner === 'white' ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200' : 'bg-secondary/50'}`}>
                                <p className="text-xs text-muted-foreground mb-1">白棋</p>
                                <p className="text-lg font-bold">{sd.whiteScore} 目</p>
                                <p className="text-xs text-muted-foreground">
                                  子{sd.details.whiteStones} + 地{sd.details.whiteTerritory} + 贴{sd.details.whiteKomi}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 对局统计 */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded bg-secondary/50">
                            <p className="text-sm font-bold">{game.move_count || (Array.isArray(game.moves) ? game.moves.length : 0)}</p>
                            <p className="text-[10px] text-muted-foreground">总手数</p>
                          </div>
                          <div className="p-2 rounded bg-secondary/50">
                            <p className="text-sm font-bold">{game.black_captures ?? 0} / {game.white_captures ?? 0}</p>
                            <p className="text-[10px] text-muted-foreground">提子(黑/白)</p>
                          </div>
                          <div className="p-2 rounded bg-secondary/50">
                            <p className="text-sm font-bold">{formatDuration(game.duration_seconds)}</p>
                            <p className="text-[10px] text-muted-foreground">对弈时长</p>
                          </div>
                        </div>

                        {/* 棋谱预览 */}
                        {Array.isArray(game.moves) && game.moves.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-1">棋谱（前20手）</p>
                            <div className="flex flex-wrap gap-1">
                              {(isNewMoveFormat(game.moves) ? game.moves : []).slice(0, 20).map((m, i) => (
                                <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${
                                  m.color === 'black' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800 border'
                                }`}>
                                  {i + 1}.{m.isPass ? 'Pass' : `${String.fromCharCode(65 + (m.col >= 8 ? m.col + 1 : m.col))}${(game.board_size || 19) - m.row}`}
                                </span>
                              ))}
                              {game.moves.length > 20 && (
                                <span className="text-xs text-muted-foreground px-1.5 py-0.5">
                                  ...共{game.moves.length}手
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 时间 */}
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>开始: {format(new Date(game.started_at), 'yyyy-MM-dd HH:mm:ss')}</span>
                          {game.finished_at && (
                            <span>结束: {format(new Date(game.finished_at), 'yyyy-MM-dd HH:mm:ss')}</span>
                          )}
                        </div>

                        {/* 导出操作 */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              if (Array.isArray(game.moves) && game.moves.length > 0) {
                                const filename = `game_${format(new Date(game.started_at), 'yyyyMMdd_HHmm')}`;
                                downloadSGF(game.moves, game.board_size, filename);
                                toast.success('棋谱已下载为 SGF 文件');
                              } else {
                                toast.error('暂无棋谱数据');
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            导出SGF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={async () => {
                              if (Array.isArray(game.moves) && game.moves.length > 0) {
                                const success = await shareGame(
                                  game.moves,
                                  game.board_size,
                                  `${game.type === 'ai' ? 'AI' : '对战'}对局`
                                );
                                if (success) {
                                  toast.success('棋谱已分享');
                                } else {
                                  toast.info('已复制棋谱到剪贴板');
                                }
                              } else {
                                toast.error('暂无棋谱数据');
                              }
                            }}
                          >
                            <Share2 className="h-4 w-4 mr-1" />
                            分享
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
