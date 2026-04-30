import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Star,
  Volume2,
  VolumeX,
  Home
} from 'lucide-react';
import { getCultureQuizLevel, saveQuizProgress, type CultureQuizQuestion } from '@/data/culture-quiz';
import { speak, stopSpeak } from '@/lib/sounds';

export default function CultureQuizLevel() {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const levelNum = parseInt(level || '1', 10);
  const levelData = getCultureQuizLevel(levelNum);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [totalCorrect, setTotalCorrect] = useState(0);

  useEffect(() => {
    // 页面加载时播放语音
    if (levelData && soundEnabled) {
      speak(levelData.questions[currentIndex]?.question || '');
    }
    return () => {
      stopSpeak();
    };
  }, [currentIndex, levelData, soundEnabled]);

  if (!levelData) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">未找到该关卡</p>
          <Link to="/learn/culture-quiz">
            <Button>返回闯关列表</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const questions = levelData.questions;
  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + (showResult ? 1 : 0)) / questions.length) * 100;

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    
    setSelectedAnswer(index);
    setShowResult(true);
    
    const isCorrect = index === currentQuestion.correctIndex;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
    
    // 保存答案
    setAnswers(prev => [...prev, index]);
    
    // 播放语音反馈
    if (soundEnabled) {
      if (isCorrect) {
        speak('回答正确！');
      } else {
        speak('回答错误。' + currentQuestion.explanation);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      
      // 播放下一题语音
      if (soundEnabled) {
        setTimeout(() => {
          speak(questions[currentIndex + 1]?.question || '');
        }, 500);
      }
    } else {
      // 答题完成
      const finalCorrect = correctCount + (selectedAnswer === currentQuestion.correctIndex ? 1 : 0);
      setTotalCorrect(finalCorrect);
      setQuizComplete(true);
      
      // 保存进度
      const score = Math.round((finalCorrect / questions.length) * 100);
      saveQuizProgress(levelNum, score, [...answers]);
      
      if (soundEnabled) {
        speak(`恭喜完成！你答对了${finalCorrect}道题，共${questions.length}道。得分${score}分。`);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnswers([]);
    setCorrectCount(0);
    setQuizComplete(false);
    setTotalCorrect(0);
  };

  // 计算星星
  const calculateStars = () => {
    if (!quizComplete) return 0;
    const percentage = (totalCorrect / questions.length) * 100;
    if (percentage >= 100) return 3;
    if (percentage >= 80) return 2;
    if (percentage >= 60) return 1;
    return 0;
  };

  const stars = calculateStars();
  const finalScore = quizComplete ? Math.round((totalCorrect / questions.length) * 100) : 0;

  // 完成页面
  if (quizComplete) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 max-w-xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              {/* 星星展示 */}
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`h-10 w-10 ${
                      s <= stars 
                        ? 'text-amber-500 fill-amber-500' 
                        : 'text-gray-300'
                    } transition-all ${s <= stars ? 'scale-110' : 'scale-100'}`}
                  />
                ))}
              </div>
              
              {/* 标题 */}
              <div className="mb-4">
                {stars === 3 && (
                  <h2 className="text-2xl font-bold text-green-600 mb-2">完美通关！🌟</h2>
                )}
                {stars === 2 && (
                  <h2 className="text-2xl font-bold text-blue-600 mb-2">表现优秀！👏</h2>
                )}
                {stars === 1 && (
                  <h2 className="text-2xl font-bold text-orange-600 mb-2">继续加油！💪</h2>
                )}
                {stars === 0 && (
                  <h2 className="text-2xl font-bold text-gray-600 mb-2">再接再厉！🎯</h2>
                )}
              </div>
              
              {/* 得分 */}
              <div className="mb-6">
                <div className="text-5xl font-bold mb-2">{finalScore}</div>
                <p className="text-muted-foreground">
                  答对 {totalCorrect} / {questions.length} 题
                </p>
              </div>
              
              {/* 提示 */}
              <p className="text-muted-foreground mb-6">
                {stars >= 2 
                  ? '你已经掌握了这部分围棋文化知识！' 
                  : '可以再挑战一次，巩固知识哦！'}
              </p>
              
              {/* 按钮 */}
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/learn/culture-quiz')}
                >
                  <Home className="h-4 w-4 mr-2" />
                  返回关卡列表
                </Button>
                <Button 
                  onClick={handleRestart}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  再来一次
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-2xl mx-auto">
        {/* 顶部信息栏 */}
        <div className="flex items-center justify-between mb-4">
          <Link 
            to="/learn/culture-quiz" 
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-bold">
              {levelData.icon} 第{levelNum}关 · {levelData.title}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-8 w-8 p-0"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">第 {currentIndex + 1} / {questions.length} 题</span>
            <span className="text-muted-foreground">正确 {correctCount} 题</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 题目卡片 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* 问题 */}
            <h2 className="text-xl font-bold mb-6 leading-relaxed">
              {currentQuestion.question}
            </h2>

            {/* 选项 */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === currentQuestion.correctIndex;
                const showCorrect = showResult && isCorrect;
                const showWrong = showResult && isSelected && !isCorrect;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectAnswer(index)}
                    disabled={showResult}
                    className={`
                      w-full p-4 rounded-xl text-left transition-all
                      border-2
                      ${showCorrect 
                        ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-950/30 dark:border-green-500' 
                        : showWrong 
                          ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/30 dark:border-red-500'
                          : isSelected 
                            ? 'bg-purple-50 border-purple-500 dark:bg-purple-950/30 dark:border-purple-500'
                            : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-purple-500'
                      }
                      ${!showResult && 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {/* 选项字母 */}
                      <span className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${showCorrect 
                          ? 'bg-green-500 text-white' 
                          : showWrong 
                            ? 'bg-red-500 text-white' 
                            : isSelected 
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700'
                        }
                      `}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      
                      {/* 选项内容 */}
                      <span className="flex-1 font-medium">{option}</span>
                      
                      {/* 正确/错误图标 */}
                      {showCorrect && (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      )}
                      {showWrong && (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 解析（答错后显示） */}
            {showResult && selectedAnswer !== currentQuestion.correctIndex && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <span className="font-bold">解析：</span>
                  {currentQuestion.explanation}
                </p>
              </div>
            )}
            
            {/* 答对后的提示 */}
            {showResult && selectedAnswer === currentQuestion.correctIndex && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200">
                <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  回答正确！
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 下一题按钮 */}
        {showResult && (
          <Button 
            onClick={handleNext}
            className="w-full h-12 text-lg bg-gradient-to-r from-purple-500 to-pink-500"
          >
            {currentIndex < questions.length - 1 ? (
              <>
                下一题
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            ) : (
              <>
                <Trophy className="h-5 w-5 mr-2" />
                查看结果
              </>
            )}
          </Button>
        )}
      </div>
    </MainLayout>
  );
}
