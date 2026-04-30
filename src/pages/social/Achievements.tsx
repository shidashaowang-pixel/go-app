import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { getUserAchievements, getUserStats } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { ACHIEVEMENT_DEFINITIONS, type AchievementDefinition, type UserStats } from '@/db/achievements';
import type { Achievement } from '@/types/types';
import { Award, Trophy, Target, BookOpen, Lock, Check, Flame, TrendingUp } from 'lucide-react';

export default function Achievements() {
  const { user } = useAuth();
  const [earnedAchievements, setEarnedAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [achievements, stats] = await Promise.all([
      getUserAchievements(user.id),
      getUserStats(user.id),
    ]);
    setEarnedAchievements(achievements);
    setUserStats(stats);
    setLoading(false);
  };

  const earnedIds = new Set(earnedAchievements.map(a => a.id));

  // 按类型分组成就
  const achievementsByType = {
    game: ACHIEVEMENT_DEFINITIONS.filter(a => a.type === 'game'),
    checkpoint: ACHIEVEMENT_DEFINITIONS.filter(a => a.type === 'checkpoint'),
    practice: ACHIEVEMENT_DEFINITIONS.filter(a => a.type === 'practice'),
    course: ACHIEVEMENT_DEFINITIONS.filter(a => a.type === 'course'),
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'checkpoint': return Target;
      case 'practice': return BookOpen;
      case 'game': return Trophy;
      case 'course': return Award;
      default: return Award;
    }
  };

  // 计算进度
  const getProgress = (def: AchievementDefinition): { current: number; target: number; percent: number } => {
    if (!userStats) return { current: 0, target: 1, percent: 0 };
    
    let current = 0;
    let target = 1;

    switch (def.id) {
      // 对弈类
      case 'first_win':
        current = userStats.totalWins;
        target = 1;
        break;
      case 'win_streak_3':
        current = Math.min(userStats.consecutiveWins, 3);
        target = 3;
        break;
      case 'win_streak_5':
        current = Math.min(userStats.consecutiveWins, 5);
        target = 5;
        break;
      case 'win_streak_10':
        current = Math.min(userStats.consecutiveWins, 10);
        target = 10;
        break;
      case 'win_streak_20':
        current = Math.min(userStats.consecutiveWins, 20);
        target = 20;
        break;
      case 'win_10_opponents':
      case 'win_50_opponents':
      case 'win_100_opponents':
        current = userStats.uniqueOpponents.length;
        target = parseInt(def.id.split('_')[1]);
        break;
      case 'total_games_10':
        current = userStats.totalGames;
        target = 10;
        break;
      case 'total_games_50':
        current = userStats.totalGames;
        target = 50;
        break;
      case 'total_games_100':
        current = userStats.totalGames;
        target = 100;
        break;
      case 'total_games_500':
        current = userStats.totalGames;
        target = 500;
        break;
      case 'win_rate_50':
        current = userStats.totalGames > 0 ? Math.round((userStats.totalWins / userStats.totalGames) * 100) : 0;
        target = 50;
        break;
      case 'win_rate_70':
        current = userStats.totalGames > 0 ? Math.round((userStats.totalWins / userStats.totalGames) * 100) : 0;
        target = 70;
        break;
      // 闯关类
      case 'checkpoint_1':
        current = userStats.checkpointLevel;
        target = 1;
        break;
      case 'checkpoint_2':
        current = userStats.checkpointLevel;
        target = 2;
        break;
      case 'checkpoint_3':
        current = userStats.checkpointLevel;
        target = 3;
        break;
      // 练习类
      case 'problems_first':
        current = userStats.totalProblemsSolved;
        target = 1;
        break;
      case 'problems_10':
        current = userStats.totalProblemsSolved;
        target = 10;
        break;
      case 'problems_50':
        current = userStats.totalProblemsSolved;
        target = 50;
        break;
      case 'problems_100':
        current = userStats.totalProblemsSolved;
        target = 100;
        break;
      case 'problems_500':
        current = userStats.totalProblemsSolved;
        target = 500;
        break;
      // 课程类
      case 'course_first':
        current = userStats.coursesCompleted;
        target = 1;
        break;
      case 'courses_5':
        current = userStats.coursesCompleted;
        target = 5;
        break;
      case 'courses_10':
        current = userStats.coursesCompleted;
        target = 10;
        break;
      // 社交类
      case 'friend_first':
        current = userStats.friendsCount;
        target = 1;
        break;
      case 'friends_10':
        current = userStats.friendsCount;
        target = 10;
        break;
      // 在线类
      case 'online_1hour':
        current = userStats.totalOnlineMinutes;
        target = 60;
        break;
      case 'online_10hours':
        current = userStats.totalOnlineMinutes;
        target = 600;
        break;
      case 'online_100hours':
        current = userStats.totalOnlineMinutes;
        target = 6000;
        break;
      default:
        current = 0;
        target = 1;
    }

    return {
      current: Math.min(current, target),
      target,
      percent: Math.min(100, Math.round((current / target) * 100)),
    };
  };

  // 渲染单个成就卡片
  const renderAchievementCard = (def: AchievementDefinition, earned?: Achievement) => {
    const isEarned = earnedIds.has(def.id);
    const progress = getProgress(def);
    const Icon = getIcon(def.type);

    return (
      <Card 
        key={def.id} 
        className={`relative overflow-hidden transition-all ${
          isEarned 
            ? 'border-primary/50 bg-primary/5 shadow-md' 
            : 'border-dashed border-2 hover:border-primary/30 hover:shadow-sm'
        }`}
      >
        {isEarned && (
          <div className="absolute top-2 right-2">
            <Badge variant="default" className="bg-green-500 shadow-sm">
              <Check className="h-3 w-3 mr-1" />
              已获得
            </Badge>
          </div>
        )}
        {!isEarned && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              未解锁
            </Badge>
          </div>
        )}
        <CardHeader className="pb-2">
          <div className={`flex items-center gap-3 ${isEarned ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`text-3xl ${!isEarned && 'grayscale'}`}>{def.icon}</div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{def.title}</CardTitle>
              <Badge variant="secondary" className="text-xs mt-1">
                {def.type === 'game' && '对弈'}
                {def.type === 'checkpoint' && '闯关'}
                {def.type === 'practice' && '练习'}
                {def.type === 'course' && '课程'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{def.description}</p>
          {!isEarned && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>当前进度</span>
                <span className="font-medium">{progress.current} / {progress.target}</span>
              </div>
              <Progress value={progress.percent} className="h-2" />
              <p className="text-xs text-center text-muted-foreground/70">
                {progress.percent === 0 ? '刚刚开始，继续加油！' : 
                 progress.percent < 50 ? '进行中...加油！' :
                 progress.percent < 100 ? '快完成了！' : '即将达成！'}
              </p>
            </div>
          )}
          {isEarned && earned && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-4 w-4 text-green-500" />
              <span>获得于 {new Date(earned.earned_at).toLocaleDateString('zh-CN')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const totalCount = ACHIEVEMENT_DEFINITIONS.length;
  const earnedCount = earnedAchievements.length;

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl">🏅</span> 成就徽章
          </h1>
          <p className="text-muted-foreground">完成各项挑战，解锁更多成就，向着围棋大师的目标前进！</p>
        </div>

        {/* 总体进度 */}
        <Card className="mb-6 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                成就进度
              </span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {earnedCount} / {totalCount}
              </span>
            </div>
            <Progress value={(earnedCount / totalCount) * 100} className="h-3" />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground">
                {totalCount - earnedCount > 0 
                  ? `还有 ${totalCount - earnedCount} 个成就等待解锁！` 
                  : '🎉 恭喜！所有成就都已解锁！'}
              </p>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {Math.round((earnedCount / totalCount) * 100)}% 完成
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 快速统计 */}
        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="py-4 text-center">
                <Trophy className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{userStats.totalGames}</p>
                <p className="text-xs text-muted-foreground">总对局</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">
                  {userStats.totalGames > 0 ? Math.round((userStats.totalWins / userStats.totalGames) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">胜率</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <Flame className="h-5 w-5 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">{userStats.consecutiveWins}</p>
                <p className="text-xs text-muted-foreground">当前连胜</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <BookOpen className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{userStats.totalProblemsSolved}</p>
                <p className="text-xs text-muted-foreground">解题数</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="game">对弈</TabsTrigger>
            <TabsTrigger value="checkpoint">闯关</TabsTrigger>
            <TabsTrigger value="practice">练习</TabsTrigger>
            <TabsTrigger value="course">课程</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ACHIEVEMENT_DEFINITIONS.map(def => 
                renderAchievementCard(def, earnedAchievements.find(a => a.id === def.id))
              )}
            </div>
          </TabsContent>

          <TabsContent value="game">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievementsByType.game.map(def => 
                renderAchievementCard(def, earnedAchievements.find(a => a.id === def.id))
              )}
            </div>
          </TabsContent>

          <TabsContent value="checkpoint">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievementsByType.checkpoint.map(def => 
                renderAchievementCard(def, earnedAchievements.find(a => a.id === def.id))
              )}
            </div>
          </TabsContent>

          <TabsContent value="practice">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievementsByType.practice.map(def => 
                renderAchievementCard(def, earnedAchievements.find(a => a.id === def.id))
              )}
            </div>
          </TabsContent>

          <TabsContent value="course">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievementsByType.course.map(def => 
                renderAchievementCard(def, earnedAchievements.find(a => a.id === def.id))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
