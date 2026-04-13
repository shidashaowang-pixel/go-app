import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Trophy, Award } from 'lucide-react';

export default function Social() {
  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">社交与排行</h1>
          <p className="text-muted-foreground">添加好友、查看排行榜、分享成就</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link to="/social/friends">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <UserPlus className="h-12 w-12 mb-4 text-primary" />
                <CardTitle>好友列表</CardTitle>
                <CardDescription>添加好友，发起对弈</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">查看好友</Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/social/leaderboard">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <Trophy className="h-12 w-12 mb-4 text-destructive" />
                <CardTitle>排行榜</CardTitle>
                <CardDescription>查看积分排名</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">查看排行</Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/social/achievements">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <Award className="h-12 w-12 mb-4 text-chart-3" />
                <CardTitle>成就徽章</CardTitle>
                <CardDescription>查看已获得的成就</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">查看成就</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
