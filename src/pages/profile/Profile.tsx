import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, History, Settings } from 'lucide-react';

export default function Profile() {
  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">个人中心</h1>
          <p className="text-muted-foreground">查看学习进度和对弈战绩</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link to="/profile/progress">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <TrendingUp className="h-12 w-12 mb-4 text-primary" />
                <CardTitle>学习进度</CardTitle>
                <CardDescription>查看学习完成情况</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">查看进度</Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/profile/history">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <History className="h-12 w-12 mb-4 text-destructive" />
                <CardTitle>对弈战绩</CardTitle>
                <CardDescription>查看历史对局记录</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">查看战绩</Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/profile/settings">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <Settings className="h-12 w-12 mb-4 text-chart-3" />
                <CardTitle>账号设置</CardTitle>
                <CardDescription>修改个人信息</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">进入设置</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
