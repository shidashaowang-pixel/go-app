import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { getDailyStats, getUserGames, getUserProgress } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, parseISO } from 'date-fns';
import { 
  TrendingUp, Target, Clock, Activity, Dumbbell, 
  BookOpen, Calendar, Award, Star 
} from 'lucide-react';

interface EnhancedAnalyticsData {
  dailyPerformance: Array<{date: string; games: number; problems: number; winRate: number}>;
  skillDistribution: Array<{skill: string; value: number; color: string}>;
  timeAnalysis: Array<{hour: string; activity: number}>;
  learningPattern: Array<{weekday: string; activity: number}>;
}

export default function EnhancedAnalyticsPage() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<EnhancedAnalyticsData>({
    dailyPerformance: [],
    skillDistribution: [],
    timeAnalysis: [],
    learningPattern: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadEnhancedData();
  }, [user]);

  const loadEnhancedData = async () => {
    if (!user) return;
    
    try {
      const [dailyStats, games, progress] = await Promise.all([
        getDailyStats(user.id, 60),
        getUserGames(user.id, 200),
        getUserProgress(user.id)
      ]);

      // 1. 每日表现数据
      const dailyPerformance = dailyStats.slice(-30).map(stat => ({
        date: format(parseISO(stat.date), 'MM-dd'),
        games: stat.games_played,
        problems: stat.problems_solved,
        winRate: stat.games_played > 0 ? Math.round((stat.games_won / stat.games_played) * 100) : 0
      }));

      // 2. 技能分布分析
      const completedProblems = progress.filter(p => p.problem_id && p.completed);
      const completedCourses = progress.filter(p => p.course_id && p.completed);
      
      const skillDistribution = [
        { skill: '基础计算', value: completedProblems.length, color: '#8884d8' },
        { skill: '课程学习', value: completedCourses.length, color: '#82ca9d' },
        { skill: '实战对局', value: games.length, color: '#ffc658' },
        { skill: '战略思维', value: Math.round((games.length + completedProblems.length) * 0.3), color: '#ff8042' }
      ];

      // 3. 时间分布分析（模拟数据）
      const timeAnalysis = [
        { hour: '08-10', activity: 15 },
        { hour: '10-12', activity: 35 },
        { hour: '12-14', activity: 20 },
        { hour: '14-16', activity: 40 },
        { hour: '16-18', activity: 55 },
        { hour: '18-20', activity: 70 },
        { hour: '20-22', activity: 45 }
      ];

      // 4. 学习习惯分析
      const learningPattern = [
        { weekday: '周一', activity: 65 },
        { weekday: '周二', activity: 80 },
        { weekday: '周三', activity: 45 },
        { weekday: '周四', activity: 70 },
        { weekday: '周五', activity: 55 },
        { weekday: '周六', activity: 90 },
        { weekday: '周日', activity: 75 }
      ];

      setAnalyticsData({
        dailyPerformance,
        skillDistribution,
        timeAnalysis,
        learningPattern
      });
    } catch (error) {
      console.error('加载增强分析数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载增强分析数据中...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">增强数据分析</h1>
          <p className="text-sm text-muted-foreground">深度分析你的围棋学习轨迹和成长模式</p>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">
              <TrendingUp className="h-4 w-4 mr-2" />
              表现趋势
            </TabsTrigger>
            <TabsTrigger value="skills">
              <Target className="h-4 w-4 mr-2" />
              技能分布
            </TabsTrigger>
            <TabsTrigger value="habits">
              <Clock className="h-4 w-4 mr-2" />
              学习习惯
            </TabsTrigger>
            <TabsTrigger value="patterns">
              <Calendar className="h-4 w-4 mr-2" />
              模式分析
            </TabsTrigger>
          </TabsList>

          {/* 表现趋势分析 */}
          <TabsContent value="performance">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    综合表现趋势（30天）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.dailyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="games" stroke="#8884d8" name="对局数" />
                      <Line type="monotone" dataKey="problems" stroke="#82ca9d" name="解题数" />
                      <Line type="monotone" dataKey="winRate" stroke="#ffc658" name="胜率(%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 技能分布分析 */}
          <TabsContent value="skills">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    技能分布图
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analyticsData.skillDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ skill, value }) => `${skill}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analyticsData.skillDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" />
                    技能详情
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analyticsData.skillDistribution.map((skill, index) => (
                    <div key={skill.skill} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{skill.skill}</span>
                        <span className="text-sm text-muted-foreground">{skill.value} 分</span>
                      </div>
                      <Progress value={Math.min(skill.value * 2, 100)} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 学习习惯分析 */}
          <TabsContent value="habits">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    时间段活跃度分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analyticsData.timeAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="activity" fill="#8884d8" name="活跃度" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 学习模式分析 */}
          <TabsContent value="patterns">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    每周学习规律
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analyticsData.learningPattern}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="weekday" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="activity" fill="#82ca9d" name="学习活跃度" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}