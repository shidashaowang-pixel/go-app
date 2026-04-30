import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/db/supabase';
import { getUserGames, getUserProgress, getUserAchievements } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Game, LearningProgress, Achievement } from '@/types/types';
import { Users, Swords, BookOpen, Award, Eye, Search, Trophy, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StudentInfo {
  profile: Profile;
  games: Game[];
  progress: LearningProgress[];
  achievements: Achievement[];
}

export default function TeacherStudents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, [user]);

  const loadStudents = async () => {
    if (!user) return;
    try {
      // 查找该教师创建的课程的所有学习者
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', user.id);

      if (!courses || courses.length === 0) {
        setLoading(false);
        return;
      }

      const courseIds = courses.map(c => c.id);

      // 查找学习了这些课程的用户
      const { data: progressData } = await supabase
        .from('learning_progress')
        .select('user_id')
        .in('course_id', courseIds);

      if (!progressData || progressData.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(progressData.map(p => p.user_id))];

      // 获取学员资料
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds)
        .eq('role', 'child');

      if (!profiles) {
        setLoading(false);
        return;
      }

      const studentInfos: StudentInfo[] = [];
      for (const profile of profiles) {
        const [games, progress, achievements] = await Promise.all([
          getUserGames(profile.id, 20),
          getUserProgress(profile.id),
          getUserAchievements(profile.id),
        ]);
        studentInfos.push({ profile, games, progress, achievements });
      }

      setStudents(studentInfos);
    } catch (error) {
      console.error('加载学员数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    !searchQuery ||
    s.profile.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </MainLayout>
    );
  }

  // 学员详情视图
  if (selectedStudent) {
    const { profile: student, games, progress, achievements } = selectedStudent;
    const totalGames = games.length;
    const wins = games.filter(g => {
      if (!g.result) return false;
      const isBlack = g.black_player_id === student.id;
      return (isBlack && g.result === 'black_win') || (!isBlack && g.result === 'white_win');
    }).length;
    const completedCourses = progress.filter(p => p.course_id && p.completed).length;
    const completedProblems = progress.filter(p => p.problem_id && p.completed).length;

    return (
      <MainLayout>
        <div className="container px-4 py-6 max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => setSelectedStudent(null)} className="mb-4">
            ← 返回学员列表
          </Button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold">
              {student.nickname?.[0] || student.username[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{student.nickname || student.username}</h1>
              <p className="text-sm text-muted-foreground">积分: {student.rating}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card><CardContent className="p-4 text-center">
              <Swords className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{totalGames}</div>
              <p className="text-xs text-muted-foreground">对弈总数</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <Award className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{wins}</div>
              <p className="text-xs text-muted-foreground">获胜局数</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-chart-3" />
              <div className="text-2xl font-bold">{completedCourses}</div>
              <p className="text-xs text-muted-foreground">完成课程</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 mx-auto mb-2 text-chart-2" />
              <div className="text-2xl font-bold">{completedProblems}</div>
              <p className="text-xs text-muted-foreground">完成题目</p>
            </CardContent></Card>
          </div>

          {/* 对弈记录 */}
          <Card className="mb-4">
            <CardHeader><CardTitle>对弈记录</CardTitle></CardHeader>
            <CardContent>
              {games.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">暂无对弈记录</p>
              ) : (
                <div className="space-y-2">
                  {games.slice(0, 10).map(game => (
                    <div key={game.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm">{game.type === 'ai' ? 'AI对弈' : '真人对弈'}</span>
                      <Badge variant={game.result ? 'default' : 'secondary'}>
                        {game.result === 'black_win' ? '黑胜' : game.result === 'white_win' ? '白胜' : '进行中'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 成就 */}
          <Card>
            <CardHeader><CardTitle>成就</CardTitle></CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">暂无成就</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {achievements.map(a => (
                    <Badge key={a.id} variant="secondary" className="py-1.5 px-3">
                      {a.icon && <span className="mr-1">{a.icon}</span>}
                      {a.title}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // 学员列表视图
  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">学员管理</h1>
          <p className="text-muted-foreground">查看学员学习进度和对弈数据</p>
        </div>

        {/* 搜索 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索学员..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm"
          />
        </div>

        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">
                {students.length === 0 ? '暂无学员数据' : '没有找到匹配的学员'}
              </p>
              <p className="text-xs text-muted-foreground">
                {students.length === 0
                  ? '发布课程后，学习该课程的学员将自动出现在这里'
                  : '请尝试其他搜索条件'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredStudents.map(({ profile: student, games, achievements }) => {
              const totalGames = games.length;
              const wins = games.filter(g => {
                if (!g.result) return false;
                const isBlack = g.black_player_id === student.id;
                return (isBlack && g.result === 'black_win') || (!isBlack && g.result === 'white_win');
              }).length;

              return (
                <Card key={student.id} className="hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedStudent({ profile: student, games, progress: [], achievements })}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold">
                          {student.nickname?.[0] || student.username[0]}
                        </div>
                        <div>
                          <p className="font-medium">{student.nickname || student.username}</p>
                          <p className="text-xs text-muted-foreground">积分: {student.rating}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex gap-3 mt-3 text-xs">
                      <span className="flex items-center gap-1"><Swords className="h-3 w-3" /> {totalGames}局</span>
                      <span className="flex items-center gap-1"><Award className="h-3 w-3 text-yellow-500" /> {wins}胜</span>
                      <span className="flex items-center gap-1"><Trophy className="h-3 w-3" /> {achievements.length}成就</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
