import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, History, Settings, Trophy, Swords, BookOpen, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGames, getUserProgress, getUserAchievements } from '@/db/api';
import type { Game, Achievement } from '@/types/types';
import { getRankInfo } from '@/pages/Home';

export default function Profile() {
  const { user, profile } = useAuth();
  const [totalGames, setTotalGames] = useState(0);
  const [wins, setWins] = useState(0);
  const [completedCourses, setCompletedCourses] = useState(0);
  const [achievementCount, setAchievementCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
    else setLoading(false);
  }, [user]);

  const loadData = async () => {
    try {
      const [games, progress, achievements] = await Promise.all([
        getUserGames(user!.id, 100),
        getUserProgress(user!.id),
        getUserAchievements(user!.id),
      ]);

      setTotalGames(games.length);
      const winCount = games.filter(g => {
        if (!g.result || g.result === 'draw') return false;
        return (g.result === 'black_win' && g.black_player_id === user!.id)
          || (g.result === 'white_win' && g.white_player_id === user!.id);
      }).length;
      setWins(winCount);

      setCompletedCourses(progress.filter(p => p.course_id && p.completed).length);
      setAchievementCount(achievements.length);
    } catch (error) {
      console.error('加载个人数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const rankInfo = getRankInfo(profile?.rating ?? 0);

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">个人中心</h1>
          <p className="text-muted-foreground">查看学习进度和对弈战绩</p>
        </div>

        {/* 个人信息概览 */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-16 h-16 ring-4 ring-white shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.nickname || profile?.username || '用户'} />
                <AvatarFallback className="bg-gradient-to-br from-amber-200 via-orange-300 to-yellow-400 text-2xl">
                  {profile?.nickname?.[0] || profile?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold">{profile?.nickname || profile?.username || '用户'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 gap-1">
                    <span>{rankInfo.icon}</span> {rankInfo.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{profile?.rating} 分</span>
                </div>
              </div>
            </div>

            {/* 统计网格 */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-xl bg-secondary/50">
                <span className="text-lg">⚔️</span>
                <p className="text-lg font-bold">{totalGames}</p>
                <p className="text-[10px] text-muted-foreground">对局</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-secondary/50">
                <span className="text-lg">🏆</span>
                <p className="text-lg font-bold">{wins}</p>
                <p className="text-[10px] text-muted-foreground">胜局</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-secondary/50">
                <span className="text-lg">📚</span>
                <p className="text-lg font-bold">{completedCourses}</p>
                <p className="text-[10px] text-muted-foreground">课程</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-secondary/50">
                <span className="text-lg">⭐</span>
                <p className="text-lg font-bold">{achievementCount}</p>
                <p className="text-[10px] text-muted-foreground">成就</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 功能入口 */}
        <div className="grid gap-6 md:grid-cols-3">
          <Link to="/profile/progress">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <TrendingUp className="h-12 w-12 mb-4 text-primary" />
                <CardTitle>学习进度</CardTitle>
                <CardDescription>查看学习完成情况</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">查看进度</Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/profile/history">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <History className="h-12 w-12 mb-4 text-destructive" />
                <CardTitle>对弈战绩</CardTitle>
                <CardDescription>查看历史对局记录</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">查看战绩</Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/profile/analytics">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <BarChart3 className="h-12 w-12 mb-4 text-chart-5" />
                <CardTitle>数据分析</CardTitle>
                <CardDescription>成长曲线与统计分析</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">查看分析</Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/profile/settings">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <Settings className="h-12 w-12 mb-4 text-chart-3" />
                <CardTitle>账号设置</CardTitle>
                <CardDescription>修改个人信息</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">进入设置</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
