import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getUserProgress } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { LearningProgress } from '@/types/types';
import { CHECKPOINT_LEVELS } from '@/data/problems';
import { getCheckpointProblems, getPracticeProblems } from '@/db/api';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronRight, Target, BookOpen, Dumbbell } from 'lucide-react';
import { playHintSound } from '@/lib/sounds';

export default function LearningProgressPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<LearningProgress[]>([]);

  useEffect(() => {
    if (user) {
      loadProgress();
    }
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;
    const data = await getUserProgress(user.id);
    setProgress(data);
  };

  // 从真实数据计算闯关进度（包括云端题目）
  const [checkpointProgress, setCheckpointProgress] = useState<any[]>([]);
  
  useEffect(() => {
    const loadProgressData = async () => {
      // 先加载所有关卡的题目数据
      const levelData = await Promise.all(
        CHECKPOINT_LEVELS.map(async (level, idx) => {
          const levelNum = idx + 1;
          const localProblemIds = level.map((_, i) => `local-cp${levelNum}-${i}`);
          const cloudProblems = await getCheckpointProblems(levelNum);
          const cloudProblemIds = cloudProblems.map((p: any) => p.id || p.systemId);
          return {
            levelNum,
            allProblemIds: new Set([...localProblemIds, ...cloudProblemIds]),
            total: localProblemIds.length + cloudProblemIds.length,
          };
        })
      );
      
      // 计算每关的完成情况
      const cp = levelData.map((data, idx) => {
        const completedProblems = progress.filter(
          p => p.problem_id && p.completed && data.allProblemIds.has(p.problem_id)
        );
        
        const percentage = data.total > 0 ? Math.round((completedProblems.length / data.total) * 100) : 0;
        const isCompleted = percentage >= 100;
        const isUnlocked = idx === 0 || cp[idx - 1]?.isCompleted || checkpointProgress[idx - 1]?.isCompleted;
        
        return {
          level: data.levelNum,
          total: data.total,
          completed: completedProblems.length,
          percentage,
          isCompleted,
          isUnlocked,
        };
      });
      
      setCheckpointProgress(cp);
    };
    
    if (progress.length >= 0) {
      loadProgressData();
    }
  }, [progress]);

  // 题目练习统计
  const practiceProblems = progress.filter(p => p.problem_id && p.completed);
  const courseProgress = progress.filter(p => p.course_id);

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">学习进度</h1>
          <p className="text-sm text-muted-foreground">查看你的学习完成情况</p>
        </div>

        <div className="grid gap-4">
          {/* 闯关进度 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5 text-primary" />
                  闯关进度
                </CardTitle>
                <Link to="/learn/checkpoint">
                  <Button variant="ghost" size="sm">
                    去闯关 <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkpointProgress.map((cp) => (
                <div key={cp.level}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium">
                      第{cp.level}关
                      {cp.isCompleted && <CheckCircle2 className="inline h-4 w-4 text-primary ml-1" />}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cp.isCompleted ? '已完成' : cp.isUnlocked ? `${cp.completed}/${cp.total} 题` : '🔒 未解锁'}
                    </span>
                  </div>
                  <Progress value={cp.isUnlocked ? cp.percentage : 0} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 课程学习 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-5 w-5 text-chart-3" />
                  课程学习
                </CardTitle>
                <Link to="/learn/courses">
                  <Button variant="ghost" size="sm">
                    去学习 <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {courseProgress.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">暂无学习记录，去课程中心看看吧</p>
              ) : (
                <div className="space-y-3">
                  {courseProgress.map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm">课程学习</span>
                        <span className="text-xs text-muted-foreground">
                          {item.completed ? '✓ 已完成' : `${item.progress}%`}
                        </span>
                      </div>
                      <Progress value={item.progress} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 题目练习统计 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Dumbbell className="h-5 w-5 text-chart-2" />
                  题目练习
                </CardTitle>
                <Link to="/learn/practice">
                  <Button variant="ghost" size="sm">
                    去练习 <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-accent rounded-lg">
                  <p className="text-3xl font-bold text-primary">{practiceProblems.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">已完成题目</p>
                </div>
                <div className="text-center p-4 bg-accent rounded-lg">
                  <p className="text-3xl font-bold text-chart-2">
                    {practiceProblems.length > 0
                      ? Math.round(practiceProblems.filter(p => p.progress >= 100).length / practiceProblems.length * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">正确率</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
