import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Scroll, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Culture() {
  const modules = [
    {
      icon: BookOpen,
      title: '文化启蒙',
      description: '了解围棋的起源、历史和文化内涵',
      content: '围棋，起源于中国，是一种策略性棋类游戏，使用格状棋盘及黑白二色棋子进行对弈。围棋蕴含着中华文化的丰富内涵，是琴棋书画四艺之一。'
    },
    {
      icon: Scroll,
      title: '趣味故事',
      description: '围棋相关的有趣故事和传说',
      content: '传说围棋是尧帝为了教育儿子丹朱而发明的。还有"烂柯"的故事，讲述樵夫王质观仙人对弈，不觉斧柄已烂。'
    },
    {
      icon: Star,
      title: '经典案例',
      description: '玄玄棋经、三十六计等经典棋谱',
      content: '《玄玄棋经》是宋代围棋著作，收录了大量精妙的死活题和手筋题，是学习围棋的经典教材。'
    }
  ];

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">围棋文化</h1>
          <p className="text-muted-foreground">了解围棋的历史、故事和经典案例</p>
        </div>

        <div className="grid gap-6 max-w-4xl mx-auto">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.title}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Icon className="h-12 w-12 text-primary" />
                    <div>
                      <CardTitle>{module.title}</CardTitle>
                      <CardDescription>{module.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{module.content}</p>
                  <Button variant="outline" onClick={() => {}}>了解更多</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
