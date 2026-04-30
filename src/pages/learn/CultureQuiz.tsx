import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, CheckCircle2, Star, Trophy, RotateCcw, ArrowLeft } from 'lucide-react';
import { CULTURE_QUIZ_LEVELS, getQuizProgress, getCompletedLevelsCount, resetQuizProgress } from '@/data/culture-quiz';

interface LevelStatus {
  level: number;
  completed: boolean;
  score: number;
  bestScore: number;
  unlocked: boolean;
}

export default function CultureQuiz() {
  const location = useLocation();
  const [levels, setLevels] = useState<LevelStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReset, setShowReset] = useState(false);

  // 页面加载或返回时刷新进度
  useEffect(() => {
    loadProgress();
  }, [location.key]);

  const loadProgress = () => {
    const progress = getQuizProgress();
    const completedCount = getCompletedLevelsCount();
    
    const levelStatuses: LevelStatus[] = CULTURE_QUIZ_LEVELS.map((levelDef, index) => {
      const levelProgress = progress[levelDef.level];
      // 第一关自动解锁，或者前一关已完成则解锁
      const unlocked = index === 0 || (progress[CULTURE_QUIZ_LEVELS[index - 1].level]?.completed);
      
      return {
        level: levelDef.level,
        completed: levelProgress?.completed || false,
        score: levelProgress?.score || 0,
        bestScore: levelProgress?.bestScore || 0,
        unlocked,
      };
    });
    
    setLevels(levelStatuses);
    setLoading(false);
  };

  const handleReset = () => {
    if (window.confirm('确定要重置所有进度吗？此操作不可撤销！')) {
      resetQuizProgress();
      loadProgress();
      setShowReset(false);
    }
  };

  const totalLevels = CULTURE_QUIZ_LEVELS.length;
  const completedCount = levels.filter(l => l.completed).length;
  const totalProgress = totalLevels > 0 ? (completedCount / totalLevels) * 100 : 0;

  // 获取星星数量
  const getStars = (level: LevelStatus) => {
    if (!level.completed) return 0;
    const percentage = (level.score / 100);
    if (percentage >= 100) return 3;
    if (percentage >= 80) return 2;
    return 1;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-8 max-w-3xl mx-auto">
        {/* 返回按钮 */}
        <Link to="/learn/culture" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          返回围棋文化
        </Link>

        {/* 标题区 */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold mb-2">围棋文化小知识闯关</h1>
          <p className="text-muted-foreground mb-4">
            通过选择题，了解围棋的历史、礼仪、典故和趣闻
          </p>
          
          {/* 进度条 */}
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">总进度</span>
              <span className="font-medium">{completedCount} / {totalLevels} 关</span>
            </div>
            <Progress value={totalProgress} className="h-3" />
          </div>
        </div>

        {/* 重置按钮 */}
        {completedCount > 0 && (
          <div className="text-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowReset(!showReset)}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {showReset ? '取消' : '重置进度'}
            </Button>
            {showReset && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleReset}
                className="ml-2"
              >
                确认重置
              </Button>
            )}
          </div>
        )}

        {/* 关卡列表 */}
        <div className="space-y-4">
          {CULTURE_QUIZ_LEVELS.map((levelDef, index) => {
            const status = levels.find(l => l.level === levelDef.level) || {
              level: levelDef.level,
              completed: false,
              score: 0,
              bestScore: 0,
              unlocked: index === 0,
            };
            
            const stars = getStars(status);
            
            return (
              <Card 
                key={levelDef.level}
                className={`transition-all ${
                  !status.unlocked 
                    ? 'opacity-60' 
                    : status.completed 
                      ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200'
                      : 'hover:shadow-md hover:scale-[1.01] cursor-pointer'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* 关卡图标/编号 */}
                    <div className={`
                      w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                      ${!status.unlocked 
                        ? 'bg-gray-100 dark:bg-gray-800' 
                        : status.completed 
                          ? 'bg-gradient-to-br from-amber-400 to-yellow-400 text-white shadow-lg'
                          : 'bg-gradient-to-br from-purple-400 to-pink-400 text-white shadow-lg'
                      }
                    `}>
                      {status.unlocked ? (
                        <span>{levelDef.icon}</span>
                      ) : (
                        <Lock className="h-6 w-6 text-gray-400" />
                      )}
                    </div>

                    {/* 关卡信息 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">第{levelDef.level}关</h3>
                        <Badge variant="secondary" className="text-xs">
                          {levelDef.category}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2">
                        {levelDef.title} · {levelDef.description}
                      </p>
                      
                      {/* 进度信息 */}
                      {status.completed && (
                        <div className="flex items-center gap-3">
                          <div className="flex">
                            {[1, 2, 3].map((s) => (
                              <Star
                                key={s}
                                className={`h-4 w-4 ${
                                  s <= stars 
                                    ? 'text-amber-500 fill-amber-500' 
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            最高 {status.bestScore}分
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div>
                      {status.unlocked ? (
                        status.completed ? (
                          <Link to={`/learn/culture-quiz/${levelDef.level}`}>
                            <Button variant="outline" size="sm">
                              再来一次
                            </Button>
                          </Link>
                        ) : (
                          <Link to={`/learn/culture-quiz/${levelDef.level}`}>
                            <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500">
                              开始挑战
                            </Button>
                          </Link>
                        )
                      ) : (
                        <Button variant="ghost" size="sm" disabled>
                          <Lock className="h-4 w-4 mr-1" />
                          未解锁
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 完成提示 */}
        {completedCount === totalLevels && (
          <Card className="mt-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-amber-500" />
              <h3 className="text-xl font-bold mb-2">恭喜全部通关！</h3>
              <p className="text-muted-foreground">
                你已掌握围棋文化知识，成为了真正的围棋小达人！
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
