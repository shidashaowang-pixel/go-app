import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MOCK_LIVE_GAMES, getRankLabel, getRankIcon, type LiveGame } from '@/data/live-games';
import { Eye, Users, Search, Clock, RefreshCw, Sword, Bot } from 'lucide-react';

export default function SpectateLobbyPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<LiveGame[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    // 模拟加载数据
    await new Promise((resolve) => setTimeout(resolve, 500));
    setGames(MOCK_LIVE_GAMES);
    setLoading(false);
  };

  const filteredGames = games.filter(
    (game) =>
      game.blackPlayer.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.whitePlayer.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">观战大厅</h1>
            <p className="text-sm text-muted-foreground">
              观看其他玩家的精彩对局
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={loadGames} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* 搜索 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索玩家..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{games.length}</p>
              <p className="text-xs text-muted-foreground">正在进行</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">
                {games.reduce((sum, g) => sum + g.spectatorCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">总观战人数</p>
            </CardContent>
          </Card>
        </div>

        {/* 游戏列表 */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            加载中...
          </div>
        ) : filteredGames.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sword className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">暂无进行中的对局</p>
              <p className="text-sm text-muted-foreground">
                成为第一个开始对弈的玩家吧！
              </p>
              <Button className="mt-4" onClick={() => navigate('/game/ai')}>
                开始对弈
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredGames.map((game) => (
              <Card
                key={game.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/game/spectate/${game.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* 棋盘预览 */}
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 rounded-lg flex items-center justify-center">
                      <div className="grid grid-cols-3 gap-0.5 w-10 h-10">
                        {[...Array(9)].map((_, i) => (
                          <div
                            key={i}
                            className={`rounded-full ${
                              i === 0 || i === 2 || i === 6 || i === 8
                                ? i % 2 === 0
                                  ? 'bg-gray-800'
                                  : 'bg-white border'
                                : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 对局信息 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {/* 黑方 */}
                        <div className="flex items-center gap-1">
                          <span>⚫</span>
                          <span className="font-medium">
                            {game.blackPlayer.nickname}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getRankIcon(game.blackPlayer.rank)}
                            {getRankLabel(game.blackPlayer.rank)}
                          </span>
                        </div>

                        <span className="text-muted-foreground">vs</span>

                        {/* 白方 */}
                        <div className="flex items-center gap-1">
                          <span>⚪</span>
                          <span className="font-medium">
                            {game.whitePlayer.nickname}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {game.aiDifficulty ? (
                              <Badge variant="secondary" className="text-xs ml-1">
                                <Bot className="w-3 h-3 mr-1" />
                                AI
                              </Badge>
                            ) : (
                              <>
                                {getRankIcon(game.whitePlayer.rank)}
                                {getRankLabel(game.whitePlayer.rank)}
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(game.startedAt)}
                        </span>
                        <span>{game.boardSize}路棋盘</span>
                        <span>第 {game.currentMove} 手</span>
                      </div>
                    </div>

                    {/* 观战人数 */}
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-primary">
                        <Eye className="w-4 h-4" />
                        <span className="font-bold">{game.spectatorCount}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">在看</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              观战说明
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• 观战不影响正常对局，可随时进入观看</p>
            <p>• 支持棋谱回放，可快进、倒退查看历史着法</p>
            <p>• 观战大厅每分钟自动刷新</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
