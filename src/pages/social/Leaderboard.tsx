import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getLeaderboard, getPeriodLeaderboard } from '@/db/api';
import type { PeriodRankEntry } from '@/db/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Profile } from '@/types/types';
import { Trophy, Medal, Award } from 'lucide-react';

export default function Leaderboard() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [monthRank, setMonthRank] = useState<PeriodRankEntry[]>([]);
  const [weekRank, setWeekRank] = useState<PeriodRankEntry[]>([]);
  const [loading, setLoading] = useState({ all: true, month: true, week: true });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading({ all: true, month: true, week: true });
    const [p, m, w] = await Promise.all([
      getLeaderboard(50),
      getPeriodLeaderboard('month', 50),
      getPeriodLeaderboard('week', 50),
    ]);
    setPlayers(p);
    setMonthRank(m);
    setWeekRank(w);
    setLoading({ all: false, month: false, week: false });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
  };

  const periodLabel = (period: 'month' | 'week') => {
    const now = new Date();
    if (period === 'month') {
      return `${now.getFullYear()}年${now.getMonth() + 1}月`;
    }
    return `本周`;
  };

  const renderPeriodList = (
    data: PeriodRankEntry[],
    period: 'month' | 'week',
    isLoading: boolean
  ) => {
    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{periodLabel(period)}排行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg animate-pulse">
                  <div className="w-12 h-6 bg-muted rounded" />
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 h-4 bg-muted rounded" />
                  <div className="w-16 h-6 bg-muted rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{periodLabel(period)}排行</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((entry, index) => (
              <div
                key={entry.userId}
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent"
              >
                <div className="w-12 flex justify-center">
                  {getRankIcon(index + 1)}
                </div>
                <Avatar>
                  <AvatarImage src={entry.avatarUrl || undefined} alt={entry.nickname || entry.username || ''} />
                  <AvatarFallback>
                    {entry.nickname?.[0] || entry.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {entry.nickname || entry.username || '未知用户'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.games}场 · 胜率{entry.winRate}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{entry.wins}</p>
                  <p className="text-sm text-muted-foreground">胜场</p>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                本时段暂无对弈记录
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl float-gentle">🏆</span> 排行榜
          </h1>
          <p className="text-muted-foreground">查看积分排名，争夺围棋之星 ✨</p>
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
                  {loading.all
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-lg animate-pulse">
                          <div className="w-12 h-6 bg-muted rounded" />
                          <div className="w-10 h-10 bg-muted rounded-full" />
                          <div className="flex-1 h-4 bg-muted rounded" />
                          <div className="w-16 h-6 bg-muted rounded" />
                        </div>
                      ))
                    : players.map((player, index) => (
                        <div
                          key={player.id}
                          className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent"
                        >
                          <div className="w-12 flex justify-center">
                            {getRankIcon(index + 1)}
                          </div>
                          <Avatar>
                            <AvatarImage src={player.avatar_url || undefined} alt={player.nickname || player.username} />
                            <AvatarFallback>
                              {player.nickname?.[0] || player.username[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">
                              {player.nickname || player.username}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              {player.rating}
                            </p>
                            <p className="text-sm text-muted-foreground">积分</p>
                          </div>
                        </div>
                      ))}
                  {!loading.all && players.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      暂无排名数据
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="month">
            {renderPeriodList(monthRank, 'month', loading.month)}
          </TabsContent>

          <TabsContent value="week">
            {renderPeriodList(weekRank, 'week', loading.week)}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
