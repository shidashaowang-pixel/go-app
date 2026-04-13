import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getLeaderboard } from '@/db/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Profile } from '@/types/types';
import { Trophy, Medal, Award } from 'lucide-react';

export default function Leaderboard() {
  const [players, setPlayers] = useState<Profile[]>([]);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const data = await getLeaderboard(50);
    setPlayers(data);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">排行榜</h1>
          <p className="text-muted-foreground">查看积分排名</p>
        </div>

        <Tabs defaultValue="all" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">总榜</TabsTrigger>
            <TabsTrigger value="month">月榜</TabsTrigger>
            <TabsTrigger value="week">周榜</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>总积分排行</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {players.map((player, index) => (
                    <div key={player.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent">
                      <div className="w-12 flex justify-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <Avatar>
                        <AvatarFallback>{player.nickname?.[0] || player.username[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{player.nickname || player.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{player.rating}</p>
                        <p className="text-sm text-muted-foreground">积分</p>
                      </div>
                    </div>
                  ))}
                  {players.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">暂无排名数据</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="month">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">月榜功能开发中</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="week">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">周榜功能开发中</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
