import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Users } from 'lucide-react';

export default function GameCenter() {
  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">对弈中心</h1>
          <p className="text-muted-foreground">选择对弈模式，开始你的对局</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <Link to="/game/ai">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <Bot className="h-16 w-16 mb-4 text-primary" />
                <CardTitle>人机对弈</CardTitle>
                <CardDescription>与AI对弈，提升棋力</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">开始对弈</Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/game/human">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <Users className="h-16 w-16 mb-4 text-destructive" />
                <CardTitle>真人对弈</CardTitle>
                <CardDescription>与好友或随机玩家对弈</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">开始对弈</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
