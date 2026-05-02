import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/db/supabase';
import { getUserGames, getUserProgress, getDailyStats } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Game, LearningProgress, DailyStat } from '@/types/types';
import {
  Target,
  BookOpen,
  Trophy,
  Clock,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Lightbulb
} from 'lucide-react';

interface ChildLearningPlan {
  child: Profile;
  games: Game[];
  progress: LearningProgress[];
  dailyStats: DailyStat[];
  plan: {
    dailyGoals: {
      games: number;
      problems: number;
      time: number; // 分钟
    };
    weeklyTargets: {
      winRate: number;
      courses: number;
      checkpoints: number;
    };
    recommendations: string[];
    strengths: string[];
    areasToImprove: string[];
  };
}

export default function LearningPlanPage() {
  const { user, profile } = useAuth();
  const [childrenPlans, setChildrenPlans] = useState<ChildLearningPlan[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildLearningPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role === 'parent') {
      loadChildrenPlans();
    }
  }, [user, profile]);

  const loadChildrenPlans = async () => {
    if (!user) return;
    
    try {
      // 查找绑定到此家长的所有儿童
      const { data: children } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', user.id)
        .eq('role', 'child');

      if (!children) return;

      const plans: ChildLearningPlan[] = [];

      for (const child of children) {
        const [games, progress, dailyStats] = await Promise.all([
          getUserGames(child.id, 100),
          getUserProgress(child.id),
          getDailyStats(child.id, 30)
        ]);

        const plan = generateLearningPlan(child, games, progress, dailyStats);
        plans.push({
          child,
          games,
          progress,
          dailyStats,
          plan
        });
      }

      setChildrenPlans(plans);
    } catch (error) {
      console.error('加载学习计划失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 生成个性化学习计划
  const generateLearningPlan = (
    child: Profile,
    games: Game[],
    progress: LearningProgress[],
    dailyStats: DailyStat[]
  ): ChildLearningPlan['plan'] => {
    // 基础统计数据
    const totalGames = games.length;
    const completedGames = games.filter(g => g.status === 'finished').length;
    const winRate = completedGames > 0 
      ? Math.round((games.filter(g => 
          (g.result === 'black_win' && g.black_player_id === child.id) ||
          (g.result === 'white_win' && g.white_player_id === child.id)
        ).length / completedGames) * 100)
      : 0;

    const completedCourses = progress.filter(p => p.course_id && p.completed).length;
    const completedProblems = progress.filter(p => p.problem_id && p.completed).length;
    
    // 最近7天活动统计
    const last7Days = dailyStats.slice(-7);
    const avgDailyGames = Math.round(last7Days.reduce((sum, stat) => sum + stat.games_played, 0) / 7);
    const avgDailyProblems = Math.round(last7Days.reduce((sum, stat) => sum + stat.problems_solved, 0) / 7);
    const avgDailyTime = Math.round(last7Days.reduce((sum, stat) => sum + stat.online_minutes, 0) / 7);

    // AI对弈分析
    const aiGames = games.filter(g => g.type === 'ai' && g.status === 'finished');
    const aiWinRate = aiGames.length > 0
      ? Math.round((aiGames.filter(g => 
          (g.result === 'black_win' && g.black_player_id === child.id) ||
          (g.result === 'white_win' && g.white_player_id === child.id)
        ).length / aiGames.length) * 100)
      : 0;

    // 生成个性化建议
    const recommendations = [];
    const strengths = [];
    const areasToImprove = [];

    // 根据数据生成建议
    if (avgDailyGames < 1) {
      recommendations.push('建议每天至少完成1局对弈，保持手感和思考能力');
    }
    
    if (avgDailyProblems < 5) {
      recommendations.push('每天练习5-10道题目，提升棋感和计算能力');
    }

    if (aiWinRate < 50) {
      recommendations.push('建议先从初级AI开始练习，逐步提升难度');
      areasToImprove.push('基础对弈能力');
    } else if (aiWinRate >= 70) {
      strengths.push('AI对弈表现出色');
      recommendations.push('可以尝试挑战更高级别的AI或真人玩家');
    }

    if (completedCourses < 3) {
      recommendations.push('系统学习基础课程，打好围棋基础');
      areasToImprove.push('理论知识体系');
    }

    if (!strengths.length) {
      strengths.push('学习积极性良好');
    }

    return {
      dailyGoals: {
        games: Math.max(1, Math.round(avgDailyGames * 1.2)),
        problems: Math.max(5, Math.round(avgDailyProblems * 1.2)),
        time: Math.max(30, Math.round(avgDailyTime * 1.1))
      },
      weeklyTargets: {
        winRate: Math.min(100, winRate + 5),
        courses: Math.max(1, Math.round(completedCourses * 0.2)),
        checkpoints: 1
      },
      recommendations,
      strengths,
      areasToImprove
    };
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">加载学习计划中...</p>
        </div>
      </MainLayout>
    );
  }

  if (childrenPlans.length === 0) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">暂无绑定的孩子账号</p>
              <p className="text-xs text-muted-foreground">请先在家长中心绑定孩子的账号</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">个性化学习计划</h1>
          <p className="text-sm text-muted-foreground">基于数据分析为孩子制定科学的学习方案</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">学习概览</TabsTrigger>
            <TabsTrigger value="daily">每日目标</TabsTrigger>
            <TabsTrigger value="recommendations">个性化建议</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {childrenPlans.map((plan) => (
                <Card key={plan.child.id} className="hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {plan.child.nickname || plan.child.username}
                      </CardTitle>
                      <Badge variant="outline">{plan.child.rating}分</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{plan.games.length}</div>
                        <div className="text-xs text-muted-foreground">总对局</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {plan.plan.weeklyTargets.winRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">目标胜率</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>学习进度</span>
                        <span>
                          {plan.progress.filter(p => p.completed).length} / {plan.progress.length}
                        </span>
                      </div>
                      <Progress value={plan.progress.length > 0 ? 
                        (plan.progress.filter(p => p.completed).length / plan.progress.length) * 100 : 0
                      } />
                    </div>

                    <Button 
                      onClick={() => setSelectedChild(plan)}
                      className="w-full"
                      size="sm"
                    >
                      查看详细计划
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="daily">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {childrenPlans.map((plan) => (
                <Card key={plan.child.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="h-5 w-5 text-primary" />
                      {plan.child.nickname || plan.child.username} - 每日目标
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">对弈局数</span>
                      <Badge variant="secondary">{plan.plan.dailyGoals.games}局</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">题目练习</span>
                      <Badge variant="secondary">{plan.plan.dailyGoals.problems}题</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">学习时间</span>
                      <Badge variant="secondary">{plan.plan.dailyGoals.time}分钟</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recommendations">
            <div className="grid gap-4">
              {childrenPlans.map((plan) => (
                <Card key={plan.child.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      {plan.child.nickname || plan.child.username} - 个性化建议
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.plan.strengths.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          优势领域
                        </h4>
                        <div className="space-y-1">
                          {plan.plan.strengths.map((strength, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              {strength}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {plan.plan.areasToImprove.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          需要加强
                        </h4>
                        <div className="space-y-1">
                          {plan.plan.areasToImprove.map((area, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Target className="h-4 w-4 text-orange-500" />
                              {area}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium mb-2">学习建议</h4>
                      <div className="space-y-2">
                        {plan.plan.recommendations.map((rec, index) => (
                          <div key={index} className="text-sm text-muted-foreground">
                            • {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}