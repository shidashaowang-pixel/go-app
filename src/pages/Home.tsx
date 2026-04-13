import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Swords, Users, GraduationCap, Trophy, Target } from 'lucide-react';
import MainLayout from '@/components/layouts/MainLayout';

export default function Home() {
  const { profile } = useAuth();

  const childFeatures = [
    {
      icon: BookOpen,
      title: '学习中心',
      description: '围棋文化、基础入门、闯关练习',
      link: '/learn',
      color: 'text-primary'
    },
    {
      icon: Swords,
      title: '对弈中心',
      description: '人机对弈、真人对战',
      link: '/game',
      color: 'text-destructive'
    },
    {
      icon: Users,
      title: '社交排行',
      description: '好友对战、排行榜、成就',
      link: '/social',
      color: 'text-chart-3'
    }
  ];

  const teacherFeatures = [
    {
      icon: GraduationCap,
      title: '课程管理',
      description: '发布和管理教学课程',
      link: '/teacher/courses',
      color: 'text-primary'
    },
    {
      icon: Users,
      title: '学员管理',
      description: '查看学员学习进度',
      link: '/teacher/students',
      color: 'text-chart-2'
    }
  ];

  const features = profile?.role === 'teacher' ? teacherFeatures : childFeatures;

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        {/* 欢迎区域 */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 gradient-text">
            欢迎来到少儿围棋学习平台
          </h1>
          <p className="text-lg text-muted-foreground">
            {profile?.role === 'child' && '开启你的围棋学习之旅'}
            {profile?.role === 'parent' && '陪伴孩子一起学习围棋'}
            {profile?.role === 'teacher' && '传授围棋知识，培养未来棋手'}
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.link} to={feature.link}>
                <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
                  <CardHeader>
                    <Icon className={`h-12 w-12 mb-4 ${feature.color}`} />
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">进入</Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* 学习进度概览（仅儿童和家长） */}
        {profile?.role !== 'teacher' && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  闯关进度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">0/3</div>
                <p className="text-sm text-muted-foreground mt-2">已完成关卡</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-destructive" />
                  对弈战绩
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">0胜0负</div>
                <p className="text-sm text-muted-foreground mt-2">总战绩</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-chart-3" />
                  学习课程
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-chart-3">0</div>
                <p className="text-sm text-muted-foreground mt-2">已学习课程</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
