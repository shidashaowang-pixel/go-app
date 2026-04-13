import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Sparkles, Target, Dumbbell, Video } from 'lucide-react';

export default function LearnCenter() {
  const modules = [
    {
      icon: BookOpen,
      title: '围棋文化',
      description: '了解围棋的历史、故事和经典案例',
      link: '/learn/culture',
      color: 'text-primary'
    },
    {
      icon: Sparkles,
      title: '基础入门',
      description: 'AI引导式教学，学习围棋基础规则',
      link: '/learn/basics',
      color: 'text-chart-3'
    },
    {
      icon: Target,
      title: '基础定式闯关',
      description: '通过3关闯关练习巩固基础',
      link: '/learn/checkpoint',
      color: 'text-destructive'
    },
    {
      icon: Dumbbell,
      title: '题目练习',
      description: '死活题、手筋题等练习',
      link: '/learn/practice',
      color: 'text-chart-2'
    },
    {
      icon: Video,
      title: '真人教学',
      description: '观看教师发布的视频和图文课程',
      link: '/learn/courses',
      color: 'text-chart-4'
    }
  ];

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">学习中心</h1>
          <p className="text-muted-foreground">选择学习模块，开始你的围棋之旅</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.link} to={module.link}>
                <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
                  <CardHeader>
                    <Icon className={`h-12 w-12 mb-4 ${module.color}`} />
                    <CardTitle>{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">开始学习</Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
