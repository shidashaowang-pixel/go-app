import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const modules = [
  {
    emoji: '📖',
    title: '围棋文化',
    description: '了解围棋的历史、故事和经典案例',
    link: '/learn/culture',
    gradient: 'from-primary/10 to-primary/5',
    btnClass: 'bg-gradient-to-r from-primary to-primary/80',
  },
  {
    emoji: '✨',
    title: '基础入门',
    description: 'AI引导式教学，学习围棋基础规则',
    link: '/learn/basics',
    gradient: 'from-emerald-400/10 to-teal-400/10',
    btnClass: 'bg-gradient-to-r from-emerald-500 to-teal-500',
  },
  {
    emoji: '⚔️',
    title: '基础定式闯关',
    description: '通过7关闯关练习巩固基础',
    link: '/learn/checkpoint',
    gradient: 'from-orange-400/10 to-red-400/10',
    btnClass: 'bg-gradient-to-r from-orange-500 to-red-500',
  },
  {
    emoji: '🧠',
    title: '题目练习',
    description: '死活题、手筋题等练习',
    link: '/learn/practice',
    gradient: 'from-violet-400/10 to-purple-400/10',
    btnClass: 'bg-gradient-to-r from-violet-500 to-purple-500',
  },
  {
    emoji: '🎯',
    title: '死活题专区',
    description: '多分支正解，精确判定',
    link: '/learn/life-death',
    gradient: 'from-rose-400/10 to-pink-400/10',
    btnClass: 'bg-gradient-to-r from-rose-500 to-pink-500',
  },
  {
    emoji: '🎬',
    title: '真人教学',
    description: '动画微课、视频和图文课程',
    link: '/learn/courses',
    gradient: 'from-blue-400/10 to-indigo-400/10',
    btnClass: 'bg-gradient-to-r from-blue-500 to-indigo-500',
  },
];

export default function LearnCenter() {
  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl float-gentle">🐼</span> 学习中心
          </h1>
          <p className="text-muted-foreground">选择学习模块，开始你的围棋之旅 🚀</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.link} to={module.link}>
              <Card className={`h-full transition-all hover:shadow-lg hover:scale-105 card-kid bg-gradient-to-br ${module.gradient}`}>
                <CardHeader>
                  <span className="text-4xl mb-2 kid-bounce">{module.emoji}</span>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className={`w-full font-bold rounded-xl text-white ${module.btnClass}`}>
                    🚀 开始学习
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
