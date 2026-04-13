import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import GoBoard from '@/components/GoBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createGame } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function AIGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [gameStarted, setGameStarted] = useState(false);
  const [moves, setMoves] = useState<number[][]>([]);

  const handleStartGame = async () => {
    if (!user) return;

    try {
      await createGame({
        type: 'ai',
        status: 'ongoing',
        result: null,
        black_player_id: user.id,
        white_player_id: null,
        ai_difficulty: difficulty,
        board_size: 19,
        moves: []
      });
      setGameStarted(true);
      toast.success('对弈开始！');
    } catch (error) {
      toast.error('创建对弈失败');
    }
  };

  const handleMove = (row: number, col: number) => {
    setMoves([...moves, [row, col]]);
    // TODO: 调用AI接口获取AI落子
  };

  const handleResign = () => {
    toast.info('你认输了');
    navigate('/game');
  };

  if (!gameStarted) {
    return (
      <MainLayout>
        <div className="container px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/game')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回对弈中心
          </Button>

          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>选择难度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">初级</SelectItem>
                  <SelectItem value="intermediate">初级AI</SelectItem>
                  <SelectItem value="advanced">AI（大模型）</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleStartGame} className="w-full">
                开始对弈
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" onClick={() => navigate('/game')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResign}>
              认输
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <GoBoard size={19} onMove={handleMove} />
        </div>
      </div>
    </MainLayout>
  );
}
