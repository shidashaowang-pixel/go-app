import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import GoBoard from '@/components/GoBoard';
import { getPracticeProblems } from '@/db/api';
import type { Problem } from '@/types/types';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function Practice() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userMoves, setUserMoves] = useState<number[][]>([]);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    const data = await getPracticeProblems(20);
    setProblems(data);
  };

  const currentProblem = problems[currentIndex];

  const handleMove = (row: number, col: number) => {
    const newMoves = [...userMoves, [row, col]];
    setUserMoves(newMoves);

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
    if (currentIndex < problems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserMoves([]);
      setResult(null);
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
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">加载题目中...</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">题目练习</h1>
          <p className="text-muted-foreground">题目 {currentIndex + 1}/{problems.length}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{currentProblem.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{currentProblem.description}</p>
              {result && (
                <div className={`flex items-center gap-2 p-4 rounded-lg mb-4 ${result === 'correct' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
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
              <div className="flex gap-2">
                {result === 'correct' ? (
                  <Button onClick={handleNext} className="w-full">
                    下一题
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
