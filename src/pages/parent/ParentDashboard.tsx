import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { getUserGames, getUserProgress, getUserAchievements } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Game, LearningProgress, Achievement } from '@/types/types';
import { Users, BookOpen, Swords, Award, ChevronRight, Eye, Plus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ChildInfo {
  profile: Profile;
  games: Game[];
  progress: LearningProgress[];
  achievements: Achievement[];
}

export default function ParentDashboard() {
  const { user, profile } = useAuth();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 绑定已有孩子的对话框状态
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [bindUsername, setBindUsername] = useState('');
  const [bindLoading, setBindLoading] = useState(false);

  useEffect(() => {
    if (user && profile?.role === 'parent') {
      loadChildren();
    }
  }, [user, profile]);

  // 绑定已有孩子账号
  const handleBindChild = async () => {
    if (!user || !bindUsername.trim()) {
      toast.error('请输入孩子用户名');
      return;
    }

    setBindLoading(true);
    try {
      // 查找该用户名对应的儿童账号
      const { data: childProfile, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', bindUsername.trim())
        .eq('role', 'child')
        .maybeSingle();

      if (findError) throw findError;

      if (!childProfile) {
        toast.error('未找到该用户名对应的儿童账号');
        return;
      }

      if (childProfile.parent_id === user.id) {
        toast.success('该孩子已经绑定到您的账号');
        setShowBindDialog(false);
        setBindUsername('');
        return;
      }

      if (childProfile.parent_id) {
        toast.error('该账号已经绑定到其他家长');
        return;
      }

      // 更新绑定关系
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ parent_id: user.id })
        .eq('id', childProfile.id);

      if (updateError) throw updateError;

      toast.success(`成功绑定 ${childProfile.nickname || childProfile.username}！`);
      setShowBindDialog(false);
      setBindUsername('');
      loadChildren(); // 刷新列表
    } catch (error) {
      console.error('绑定失败:', error);
      toast.error('绑定失败，请稍后重试');
    } finally {
      setBindLoading(false);
    }
  };

  // 解绑孩子
  const handleUnbindChild = async (childId: string) => {
    if (!confirm('确定要解除绑定吗？解绑后您将无法查看该孩子的数据。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ parent_id: null })
        .eq('id', childId);

      if (error) throw error;

      toast.success('已解除绑定');
      loadChildren();
    } catch (error) {
      console.error('解绑失败:', error);
      toast.error('解绑失败，请稍后重试');
    }
  };

  const loadChildren = async () => {
    if (!user) return;
    try {
      // 查找绑定到此家长的所有儿童
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', user.id)
        .eq('role', 'child');

      if (error) throw error;

      const childProfiles: Profile[] = Array.isArray(data) ? data : [];
      const childInfos: ChildInfo[] = [];

      for (const child of childProfiles) {
        const [games, progress, achievements] = await Promise.all([
          getUserGames(child.id, 20),
          getUserProgress(child.id),
          getUserAchievements(child.id),
        ]);
        childInfos.push({ profile: child, games, progress, achievements });
      }

      setChildren(childInfos);
    } catch (error) {
      console.error('加载儿童数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 统计数据
  const getGameStats = (games: Game[]) => {
    const total = games.length;
    const wins = games.filter(g => g.result === 'black_win' || g.result === 'white_win').length;
    return { total, wins };
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </MainLayout>
    );
  }

  // 如果选中了某个孩子，显示详情
  if (selectedChild) {
    const { profile: child, games, progress, achievements } = selectedChild;
    const { total, wins } = getGameStats(games);
    const completedCourses = progress.filter(p => p.course_id && p.completed).length;
    const completedProblems = progress.filter(p => p.problem_id && p.completed).length;

    return (
      <MainLayout>
        <div className="container px-4 py-8 max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => setSelectedChild(null)} className="mb-4">
            ← 返回孩子列表
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold">{child.nickname || child.username} 的学习数据</h1>
            <p className="text-muted-foreground">实时查看孩子的学习进度和对弈记录</p>
          </div>

          <div className="grid gap-4 md:grid-cols-6 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Swords className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{total}</div>
                <p className="text-xs text-muted-foreground">对弈总数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">{wins}</div>
                <p className="text-xs text-muted-foreground">获胜局数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-chart-3" />
                <div className="text-2xl font-bold">{completedCourses}</div>
                <p className="text-xs text-muted-foreground">完成课程</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-chart-2" />
                <div className="text-2xl font-bold">{completedProblems}</div>
                <p className="text-xs text-muted-foreground">完成题目</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <svg className="h-6 w-6 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <div className="text-2xl font-bold">{total > 0 ? Math.round((wins / total) * 100) : 0}%</div>
                <p className="text-xs text-muted-foreground">胜率</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <svg className="h-6 w-6 mx-auto mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-2xl font-bold">{Math.round((total + completedProblems + completedCourses) / 7)}</div>
                <p className="text-xs text-muted-foreground">日均活动</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="games">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="games">对弈记录</TabsTrigger>
              <TabsTrigger value="progress">学习进度</TabsTrigger>
              <TabsTrigger value="achievements">成就</TabsTrigger>
              <TabsTrigger value="plan">学习计划</TabsTrigger>
            </TabsList>

            <TabsContent value="games">
              <Card>
                <CardContent className="p-4">
                  {games.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">暂无对弈记录</p>
                  ) : (
                    <div className="space-y-2">
                      {games.slice(0, 10).map(game => (
                        <div key={game.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <span className="text-sm font-medium">
                              {game.type === 'ai' ? 'AI对弈' : '真人对弈'}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {game.ai_difficulty && `难度: ${game.ai_difficulty}`}
                            </span>
                          </div>
                          <Badge variant={game.result ? 'default' : 'secondary'}>
                            {game.result ? (game.result === 'black_win' ? '黑胜' : '白胜') : '进行中'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress">
              <Card>
                <CardContent className="p-4">
                  {progress.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">暂无学习记录</p>
                  ) : (
                    <div className="space-y-3">
                      {progress.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <span className="text-sm">
                            {p.course_id ? '课程' : '题目'}学习
                          </span>
                          <Badge variant={p.completed ? 'default' : 'secondary'}>
                            {p.completed ? '已完成' : `${p.progress}%`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card>
                <CardContent className="p-4">
                  {achievements.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">暂无成就</p>
                  ) : (
                    <div className="space-y-2">
                      {achievements.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <span className="text-sm font-medium">{a.title}</span>
                          <Badge variant="secondary">{a.type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plan">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">查看个性化学习计划</h3>
                    <p className="text-muted-foreground mb-4">
                      为{child.nickname || child.username}制定科学的学习计划，根据数据分析提供个性化建议
                    </p>
                    <Button onClick={() => window.open('/parent/plan', '_blank')} className="gap-2">
                      查看详细学习计划
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    );
  }

  // 孩子列表
  return (
    <MainLayout>
      <div className="container px-4 py-8 max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">家长中心</h1>
            <p className="text-muted-foreground">查看绑定孩子的学习数据和对弈记录</p>
          </div>
          <Button onClick={() => setShowBindDialog(true)} className="gap-2" variant="outline">
            <Plus className="h-4 w-4" />
            绑定已有孩子
          </Button>
        </div>

        {children.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">暂无绑定的孩子账号</p>
              <p className="text-xs text-muted-foreground mb-4">请绑定孩子的账号来查看他们的学习数据</p>
              <Button onClick={() => setShowBindDialog(true)} className="gap-2">
                <UserCheck className="h-4 w-4" />
                绑定已有孩子
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {children.map(({ profile: child, games, achievements }) => {
              const { total, wins } = getGameStats(games);
              return (
                <Card key={child.id} className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                          {child.nickname?.[0] || child.username[0]}
                        </div>
                        <div>
                          <CardTitle>{child.nickname || child.username}</CardTitle>
                          <p className="text-sm text-muted-foreground">积分: {child.rating}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleUnbindChild(child.id)} className="text-destructive hover:text-destructive">
                          解绑
                        </Button>
                        <Button size="sm" onClick={() => setSelectedChild({ profile: child, games, progress: [], achievements })}>
                          <Eye className="mr-1 h-4 w-4" />
                          查看详情
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Swords className="h-4 w-4 text-muted-foreground" />
                        <span>{total}局</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <span>{wins}胜</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4 text-chart-3" />
                        <span>{achievements.length}成就</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 绑定已有孩子对话框 */}
      <Dialog open={showBindDialog} onOpenChange={setShowBindDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>绑定已有孩子账号</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              请输入您孩子的用户名（他们注册时使用的账号名），绑定后您可以在家长中心查看他们的学习数据。
            </p>
            <div className="space-y-2">
              <Input
                placeholder="输入孩子用户名"
                value={bindUsername}
                onChange={(e) => setBindUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBindChild()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBindDialog(false)}>取消</Button>
            <Button onClick={handleBindChild} disabled={bindLoading}>
              {bindLoading ? '绑定中...' : '确认绑定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
