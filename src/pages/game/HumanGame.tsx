import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Shuffle } from 'lucide-react';
import { toast } from 'sonner';

export default function HumanGame() {
  const handleFriendMatch = () => {
    toast.info('好友对战功能开发中');
  };

  const handleRandomMatch = () => {
    toast.info('随机匹配功能开发中');
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">真人对弈</h1>
          <p className="text-muted-foreground">选择对弈模式</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <Users className="h-16 w-16 mb-4 text-primary" />
              <CardTitle>好友对战</CardTitle>
              <CardDescription>邀请好友进行对弈</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleFriendMatch} className="w-full">
                选择好友
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <Shuffle className="h-16 w-16 mb-4 text-destructive" />
              <CardTitle>随机匹配</CardTitle>
              <CardDescription>与随机玩家对弈</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleRandomMatch} className="w-full">
                开始匹配
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
