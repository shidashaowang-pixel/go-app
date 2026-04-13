import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import GoBoard from '@/components/GoBoard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCheckpointProblems } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Problem } from '@/types/types';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export default function CheckpointLevel() {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [userMoves, setUserMoves] = useState<number[][]>([]);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    if (level) {
      loadProblems(Number.parseInt(level));
    }
  }, [level]);

  const loadProblems = async (levelNum: number) => {
    const data = await getCheckpointProblems(levelNum);
    setProblems(data);
  };

  const currentProblem = problems[currentProblemIndex];

  const handleMove = (row: number, col: number) => {
    const newMoves = [...userMoves, [row, col]];
    setUserMoves(newMoves);

    // 简单判断：检查是否与解答匹配
    if (currentProblem) {
      const solution = currentProblem.solution.moves;
      if (newMoves.length === solution.length) {
        const isCorrect = newMoves.every((move, idx) =>
          move[0] === solution[idx][0] && move[1] === solution[idx][1]
        );
        setResult(isCorrect ? 'correct' : 'wrong');
      }
    }
  };

  const handleNext = () => {
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1);
      setUserMoves([]);
      setResult(null);
    } else {
      toast.success('恭喜通过本关！');
      navigate('/learn/checkpoint');
    }
  };

  const handleRetry = () => {
    setUserMoves([]);
    setResult(null);
  };

  if (!currentProblem) {
    return (
      <MainLayout>
        <div className="container px-4 py-8">
          <p>加载中...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/learn/checkpoint')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回闯关列表
        </Button>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>第{level}关 - 题目 {currentProblemIndex + 1}/{problems.length}</CardTitle>
              <CardDescription>{currentProblem.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{currentProblem.description}</p>
              {result && (
                <div className={`flex items-center gap-2 p-4 rounded-lg ${result === 'correct' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                  {result === 'correct' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span>回答正确！{currentProblem.solution.explanation}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5" />
                      <span>回答错误，请重试</span>
                    </>
                  )}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                {result === 'correct' ? (
                  <Button onClick={handleNext} className="w-full">
                    {currentProblemIndex < problems.length - 1 ? '下一题' : '完成闯关'}
                  </Button>
                ) : (
                  <Button onClick={handleRetry} variant="outline" className="w-full">
                    重试
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <GoBoard
              size={currentProblem.board_size}
              initialPosition={currentProblem.initial_position}
              onMove={handleMove}
              disabled={result !== null}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
