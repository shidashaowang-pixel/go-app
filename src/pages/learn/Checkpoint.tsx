import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle2 } from 'lucide-react';

export default function Checkpoint() {
  const levels = [
    { level: 1, title: '第1关：基础吃子', description: '学习如何吃掉对方的棋子', unlocked: true, completed: false },
    { level: 2, title: '第2关：连接棋子', description: '学习如何连接自己的棋子', unlocked: false, completed: false },
    { level: 3, title: '第3关：围地得分', description: '学习如何围出自己的地盘', unlocked: false, completed: false }
  ];

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">基础定式闯关</h1>
          <p className="text-muted-foreground">通过3关闯关练习，巩固围棋基础知识</p>
        </div>

        <div className="grid gap-6 max-w-2xl mx-auto">
          {levels.map((level) => (
            <Card key={level.level} className={!level.unlocked ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {level.title}
                    {level.completed && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    {!level.unlocked && <Lock className="h-5 w-5 text-muted-foreground" />}
                  </CardTitle>
                  {level.completed && <Badge>已完成</Badge>}
                  {!level.unlocked && <Badge variant="secondary">未解锁</Badge>}
                </div>
                <CardDescription>{level.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {level.unlocked ? (
                  <Link to={`/learn/checkpoint/${level.level}`}>
                    <Button className="w-full">
                      {level.completed ? '重新挑战' : '开始闯关'}
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full" disabled onClick={() => {}}>
                    完成上一关解锁
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
