import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { getDailyStats, getUserGames, getUserProgress, getStudyStreak } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';
import {
  TrendingUp,
  Trophy,
  Target,
  Clock,
  Flame,
  BarChart3,
  Activity,
} from 'lucide-react';
import type { DailyStat, Game } from '@/types/types';

interface WinRateData {
  date: string;
  winRate: number;
  games: number;
  wins: number;
}

interface DifficultyStats {
  beginner: { games: number; wins: number };
  intermediate: { games: number; wins: number };
  advanced: { games: number; wins: number };
}

export default function GrowthAnalyticsPage() {
  const { user } = useAuth();
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [stats, userGames, userStreak] = await Promise.all([
      getDailyStats(user.id, 30),
      getUserGames(user.id, 100),
      getStudyStreak(user.id),
    ]);
    setDailyStats(stats);
    setGames(userGames);
    setStreak(userStreak);
    setLoading(false);
  };

  // 计算胜率趋势数据
  const winRateData: WinRateData[] = dailyStats
    .slice()
    .reverse()
    .map(stat => ({
      date: format(new Date(stat.date), 'MM-dd'),
      winRate: stat.games_played > 0
        ? Math.round((stat.games_won / stat.games_played) * 100)
        : 0,
      games: stat.games_played,
      wins: stat.games_won,
    }));

  // 计算总统计
  const totalStats = dailyStats.reduce(
    (acc, stat) => ({
      games: acc.games + stat.games_played,
      wins: acc.wins + stat.games_won,
      problems: acc.problems + stat.problems_solved,
      minutes: acc.minutes + stat.online_minutes,
    }),
    { games: 0, wins: 0, problems: 0, minutes: 0 }
  );

  const overallWinRate = totalStats.games > 0
    ? Math.round((totalStats.wins / totalStats.games) * 100)
    : 0;

  // AI难度通关统计
  const difficultyStats: DifficultyStats = {
    beginner: { games: 0, wins: 0 },
    intermediate: { games: 0, wins: 0 },
    advanced: { games: 0, wins: 0 },
  };

  games.forEach(game => {
    if (game.type === 'ai' && game.status === 'finished') {
      const diff = game.ai_difficulty?.toLowerCase() || '';
      if (diff.includes('beginner') || diff.includes('初级') || diff.includes('入门')) {
        difficultyStats.beginner.games++;
        if ((game.black_player_id === user?.id && game.result === 'black_win') ||
            (game.white_player_id === user?.id && game.result === 'white_win')) {
          difficultyStats.beginner.wins++;
        }
      } else if (diff.includes('intermediate') || diff.includes('中级') || diff.includes('进阶')) {
        difficultyStats.intermediate.games++;
        if ((game.black_player_id === user?.id && game.result === 'black_win') ||
            (game.white_player_id === user?.id && game.result === 'white_win')) {
          difficultyStats.intermediate.wins++;
        }
      } else if (diff.includes('advanced') || diff.includes('高级') || diff.includes('困难')) {
        difficultyStats.advanced.games++;
        if ((game.black_player_id === user?.id && game.result === 'black_win') ||
            (game.white_player_id === user?.id && game.result === 'white_win')) {
          difficultyStats.advanced.wins++;
        }
      }
    }
  });

  // 活跃度数据（使用解题数+对局数，更直观）
  const activityData = dailyStats
    .slice()
    .reverse()
    .map(stat => ({
      date: format(new Date(stat.date), 'MM-dd'),
      count: stat.problems_solved + stat.games_played,
    }));

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">数据分析</h1>
          <p className="text-sm text-muted-foreground">追踪你的围棋成长轨迹</p>
        </div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{overallWinRate}%</p>
              <p className="text-xs text-muted-foreground">总胜率</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Activity className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{totalStats.games}</p>
              <p className="text-xs text-muted-foreground">对弈总数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{totalStats.problems}</p>
              <p className="text-xs text-muted-foreground">解题数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Flame className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{streak}</p>
              <p className="text-xs text-muted-foreground">连续天数</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          {/* 胜率趋势图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                胜率趋势（近30天）
              </CardTitle>
              <p className="text-xs text-muted-foreground">基于AI对局数据统计，每日胜率 = 当日胜局 / 当日总对局</p>
            </CardHeader>
            <CardContent>
              {winRateData.length > 0 ? (
                <ChartContainer
                  config={{
                    winRate: {
                      label: '胜率',
                      color: 'hsl(var(--chart-1))',
                    },
                  }}
                  className="h-[250px]"
                >
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        content={({ payload, label }) => {
                          if (!payload?.[0]) return null;
                          const data = payload[0].payload as WinRateData;
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                              <p className="font-medium mb-1">{label}</p>
                              <p>胜率: {data.winRate}%</p>
                              <p>战绩: {data.wins}胜 {data.games - data.wins}负</p>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart
                      data={winRateData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        interval="preserveStartEnd"
                        minTickGap={30}
                      />
                      <Area
                        type="monotone"
                        dataKey="winRate"
                        stroke="hsl(var(--chart-1))"
                        fill="url(#winRateGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  暂无数据，继续加油！
                </div>
              )}
            </CardContent>
          </Card>

          {/* 活跃度趋势图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-chart-3" />
                学习活跃度（近30天）
              </CardTitle>
              <p className="text-xs text-muted-foreground">每日解题数 + 对局数，反映当日学习投入</p>
            </CardHeader>
            <CardContent>
              {activityData.length > 0 ? (
                <ChartContainer
                  config={{
                    count: {
                      label: '学习量',
                      color: 'hsl(var(--chart-3))',
                    },
                  }}
                  className="h-[200px]"
                >
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        content={({ payload, label }) => {
                          if (!payload?.[0]) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                              <p className="font-medium mb-1">{label}</p>
                              <p>学习量: {data.count} 题/局</p>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart
                      data={activityData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <YAxis
                        tickFormatter={(value) => `${value}`}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        interval="preserveStartEnd"
                        minTickGap={30}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--chart-3))"
                        fill="url(#activityGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  暂无活跃数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI难度通关统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-chart-2" />
                AI对弈战绩
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {/* 初级 */}
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">🤖 初级</p>
                  <p className="text-2xl font-bold text-green-600">
                    {difficultyStats.beginner.games > 0
                      ? Math.round((difficultyStats.beginner.wins / difficultyStats.beginner.games) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {difficultyStats.beginner.wins}胜 / {difficultyStats.beginner.games}局
                  </p>
                </div>
                {/* 中级 */}
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">🤖🤖 中级</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {difficultyStats.intermediate.games > 0
                      ? Math.round((difficultyStats.intermediate.wins / difficultyStats.intermediate.games) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {difficultyStats.intermediate.wins}胜 / {difficultyStats.intermediate.games}局
                  </p>
                </div>
                {/* 高级 */}
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">🤖🤖🤖 高级</p>
                  <p className="text-2xl font-bold text-red-600">
                    {difficultyStats.advanced.games > 0
                      ? Math.round((difficultyStats.advanced.wins / difficultyStats.advanced.games) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {difficultyStats.advanced.wins}胜 / {difficultyStats.advanced.games}局
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
