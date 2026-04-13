import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getUserProgress } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { LearningProgress } from '@/types/types';

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

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">学习进度</h1>
          <p className="text-muted-foreground">查看你的学习完成情况</p>
        </div>

        <div className="grid gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>闯关进度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>第1关</span>
                    <span className="text-sm text-muted-foreground">未完成</span>
                  </div>
                  <Progress value={0} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>第2关</span>
                    <span className="text-sm text-muted-foreground">未解锁</span>
                  </div>
                  <Progress value={0} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>第3关</span>
                    <span className="text-sm text-muted-foreground">未解锁</span>
                  </div>
                  <Progress value={0} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>课程学习</CardTitle>
            </CardHeader>
            <CardContent>
              {progress.filter(p => p.course_id).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无学习记录</p>
              ) : (
                <div className="space-y-4">
                  {progress.filter(p => p.course_id).map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between mb-2">
                        <span>课程</span>
                        <span className="text-sm text-muted-foreground">
                          {item.completed ? '已完成' : `${item.progress}%`}
                        </span>
                      </div>
                      <Progress value={item.progress} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>题目练习</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-accent rounded-lg">
                  <p className="text-3xl font-bold text-primary">0</p>
                  <p className="text-sm text-muted-foreground mt-1">已完成题目</p>
                </div>
                <div className="text-center p-4 bg-accent rounded-lg">
                  <p className="text-3xl font-bold text-destructive">0%</p>
                  <p className="text-sm text-muted-foreground mt-1">正确率</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
