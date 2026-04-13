import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUserGames } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Game } from '@/types/types';
import { format } from 'date-fns';

export default function GameHistory() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    if (user) {
      loadGames();
    }
  }, [user]);

  const loadGames = async () => {
    if (!user) return;
    const data = await getUserGames(user.id);
    setGames(data);
  };

  const getResultBadge = (game: Game) => {
    if (!game.result) return <Badge variant="secondary">进行中</Badge>;
    
    const isBlack = game.black_player_id === user?.id;
    const won = (isBlack && game.result === 'black_win') || (!isBlack && game.result === 'white_win');
    
    return won ? (
      <Badge className="bg-primary">胜</Badge>
    ) : (
      <Badge variant="destructive">负</Badge>
    );
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">对弈战绩</h1>
          <p className="text-muted-foreground">查看历史对局记录</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>对局记录</CardTitle>
            </CardHeader>
            <CardContent>
              {games.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无对局记录</p>
              ) : (
                <div className="space-y-4">
                  {games.map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent">
                      <div>
                        <p className="font-medium">
                          {game.type === 'ai' ? 'AI对弈' : '真人对弈'}
                          {game.ai_difficulty && ` - ${game.ai_difficulty}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(game.started_at), 'yyyy-MM-dd HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        {getResultBadge(game)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
