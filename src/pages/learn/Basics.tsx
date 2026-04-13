import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function Basics() {
  const lessons = [
    { id: 1, title: '认识棋盘', description: '了解围棋棋盘的结构和术语', completed: false },
    { id: 2, title: '黑白棋子', description: '学习黑白棋子的使用规则', completed: false },
    { id: 3, title: '落子规则', description: '掌握围棋的基本落子规则', completed: false },
    { id: 4, title: '气的概念', description: '理解"气"的概念和计算方法', completed: false },
    { id: 5, title: '提子规则', description: '学习如何吃掉对方的棋子', completed: false },
    { id: 6, title: '胜负判定', description: '了解围棋的胜负判定方法', completed: false }
  ];

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">基础入门</h1>
          <p className="text-muted-foreground">AI引导式教学，学习围棋基础规则</p>
        </div>

        <div className="grid gap-4 max-w-2xl mx-auto">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">第{lesson.id}课：{lesson.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                  </div>
                  <Button size="sm" onClick={() => {}}>
                    开始学习
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
