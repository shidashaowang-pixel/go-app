import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import GoBoard from '@/components/GoBoard';
import { GoEngine } from '@/lib/go-engine';
import { ArrowRight, ArrowLeft, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  playCorrectSound, playWrongSound, playLevelUpSound,
  speak, stopSpeak,
  getCorrectPhrase, getWrongPhrase, getLevelUpPhrase,
} from '@/lib/sounds';

const STORAGE_KEY = 'go-learn-basics-progress';

/** 从localStorage加载完成的课程 */
function loadCompletedLessons(): Set<number> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const arr = JSON.parse(saved);
      return new Set(arr);
    }
  } catch (e) {
    console.error('[Basics] 加载进度失败:', e);
  }
  return new Set();
}

/** 保存完成的课程到localStorage */
function saveCompletedLessons(completed: Set<number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
    console.log('[Basics] 保存进度成功:', [...completed]);
  } catch (e) {
    console.error('[Basics] 保存进度失败:', e);
  }
}

interface LessonStep {
  instruction: string;
  highlight?: string;
  position?: { black: number[][]; white: number[][] };
  /** 期望落子坐标（精确匹配） */
  expectedMove?: [number, number];
  /** 是否接受任意合法落子（用于认识棋盘等教学步骤） */
  acceptAnyMove?: boolean;
  successMessage?: string;
  boardSize?: number;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  icon: string;
  steps: LessonStep[];
}

const lessons: Lesson[] = [
  {
    id: 1,
    title: '认识棋盘',
    description: '了解围棋棋盘的结构和术语',
    icon: '🔲',
    steps: [
      {
        instruction: '围棋棋盘由横竖线交叉组成。标准的围棋棋盘有19条横线和19条竖线，交叉形成361个点。棋子就落在这些交叉点上。对于初学者，我们常用9路小棋盘（9×9=81个点）来练习。',
        highlight: '棋盘上的交叉点就是落子的位置',
        boardSize: 9,
        position: { black: [], white: [] },
      },
      {
        instruction: '棋盘上有一些特殊的点叫"星位"，用小黑点标记。9路棋盘上通常有5个星位，中心那个叫"天元"。星位可以帮助我们定位和布局。',
        highlight: '记住星位的位置，它们很重要！',
        boardSize: 9,
        position: { black: [], white: [] },
      },
      {
        instruction: '试试在棋盘上任意一个交叉点落子吧！点击棋盘上的交叉点，放下一颗黑子。',
        highlight: '点击棋盘上任意交叉点落子',
        acceptAnyMove: true,
        successMessage: '太棒了！你成功落子了！棋子一旦落在交叉点上，就不能再移动了。',
        boardSize: 9,
        position: { black: [], white: [] },
      },
    ],
  },
  {
    id: 2,
    title: '黑白棋子',
    description: '学习黑白棋子的使用规则',
    icon: '⚫⚪',
    steps: [
      {
        instruction: '围棋使用黑白两种颜色的棋子。黑棋有181颗，白棋有180颗。对弈时，执黑棋的一方先落子，然后双方轮流各下一手。',
        boardSize: 9,
        position: { black: [], white: [] },
      },
      {
        instruction: '看这个棋盘，黑棋和白棋交替落子。黑1、白2、黑3、白4……每一方每次只能下一颗棋子。',
        boardSize: 9,
        position: {
          black: [[2, 2], [4, 4], [2, 6]],
          white: [[6, 2], [6, 6], [4, 2]],
        },
      },
      {
        instruction: '现在试着下一手黑棋！点击任意空的交叉点落子。',
        acceptAnyMove: true,
        successMessage: '很好！你已经学会了交替落子的规则。',
        boardSize: 9,
        position: {
          black: [[2, 2], [4, 4]],
          white: [[6, 2], [6, 6]],
        },
      },
    ],
  },
  {
    id: 3,
    title: '落子规则',
    description: '掌握围棋的基本落子规则',
    icon: '👇',
    steps: [
      {
        instruction: '落子规则很简单：棋子必须放在交叉点上，不能放在线上或格子里。每次只能放一颗棋子，一旦放好就不能再移动。',
        boardSize: 9,
        position: { black: [], white: [] },
      },
      {
        instruction: '棋子放在棋盘上后，就永远留在那里（除非被对方吃掉）。所以每一步棋都要认真思考！试试在任意位置落子。',
        acceptAnyMove: true,
        successMessage: '下得好！你已经知道如何正确落子了。',
        boardSize: 9,
        position: { black: [], white: [] },
      },
      {
        instruction: '但是注意：不能在已经有棋子的交叉点落子。看这个棋盘，有标记的位置已经有棋子了，不能再落子。',
        boardSize: 9,
        position: {
          black: [[2, 2], [4, 4]],
          white: [[2, 4], [4, 2]],
        },
      },
    ],
  },
  {
    id: 4,
    title: '气的概念',
    description: '理解"气"的概念和计算方法',
    icon: '💨',
    steps: [
      {
        instruction: '"气"是围棋中最重要的概念！一颗棋子的"气"就是它上下左右相邻的空交叉点。中间的一颗子有4口气，边上的有3口气，角上的只有2口气。',
        highlight: '记住：气越多越安全，气越少越危险！',
        boardSize: 9,
        position: { black: [[4, 4]], white: [] },
      },
      {
        instruction: '看这个黑子，它在棋盘中间，上下左右4个位置都是空的，所以它有4口气。如果这些位置被白子占领，黑子的气就会减少。',
        boardSize: 9,
        position: { black: [[4, 4]], white: [] },
      },
      {
        instruction: '现在看这个角上的黑子，它只有2口气（右边和下边）。角上的棋子气最少，最容易被吃掉。而边上的棋子有3口气。',
        boardSize: 9,
        position: { black: [[0, 0]], white: [] },
      },
      {
        instruction: '多颗同色棋子连在一起时，它们的气是共享的！看这两颗相连的黑子，它们的气比一颗子多得多。这就是为什么要"连接"棋子！',
        boardSize: 9,
        position: { black: [[4, 4], [4, 5]], white: [] },
      },
    ],
  },
  {
    id: 5,
    title: '提子规则',
    description: '学习如何吃掉对方的棋子',
    icon: '✋',
    steps: [
      {
        instruction: '当一颗棋子或一组相连的棋子所有的"气"都被对方堵住时，这些棋子就被"提"走了——从棋盘上拿掉！这叫"提子"。',
        highlight: '没有气的棋子必须从棋盘上拿走！',
        boardSize: 9,
        position: {
          black: [[2, 1], [1, 2], [3, 2], [2, 3]],
          white: [[2, 2]],
        },
      },
      {
        instruction: '看这个白子！它已经被3颗黑子包围了，只剩上方1口气。现在你来试试——点击白子上方那个空位，把它最后一口气堵住，提掉它！',
        expectedMove: [1, 2],
        successMessage: '太棒了！你成功提掉了白子！记住：把对方棋子的气全部堵住，就能吃掉它。',
        boardSize: 9,
        position: {
          black: [[2, 1], [3, 2], [2, 3]],
          white: [[2, 2]],
        },
      },
      {
        instruction: '再来一次！这个角上的白子，已经被黑子围住了右边，只剩下方1口气。点击下方空位提掉它！',
        expectedMove: [1, 0],
        successMessage: '又提掉一个！角上的子气最少，最容易吃。',
        boardSize: 9,
        position: {
          black: [[0, 1]],
          white: [[0, 0]],
        },
      },
      {
        instruction: '多颗相连的棋子也可以一起被提！看这两颗白子，它们共享气，只剩1口气了。试试提掉它们！',
        expectedMove: [3, 5],
        successMessage: '厉害！你一气提了两颗白子！相连的棋子气是共享的，堵住最后一口气就能一起提。',
        boardSize: 9,
        position: {
          black: [[2, 3], [4, 3], [3, 2], [2, 4], [4, 4]],
          white: [[3, 3], [3, 4]],
        },
      },
      {
        instruction: '最后来一个有挑战性的：三颗白子连在一起，只剩1口气了！找到那个关键位置，一气提三子！',
        expectedMove: [3, 2],
        successMessage: '太厉害了！一气提三子！记住：相连的棋子越多，一旦被围住，损失就越大！',
        boardSize: 9,
        position: {
          black: [[2, 3], [4, 3], [2, 4], [4, 4], [2, 5], [4, 5], [3, 6]],
          white: [[3, 3], [3, 4], [3, 5]],
        },
      },
    ],
  },
  {
    id: 6,
    title: '禁入点与劫',
    description: '了解不能落子的情况和劫的规则',
    icon: '🚫',
    steps: [
      {
        instruction: '围棋中有些位置是不能落子的！规则规定：落子后如果棋子既没有气、也不能提掉对方的子，那就是"禁入点"（也叫自杀手），不允许落子。',
        highlight: '禁入点规则：落子后必须有气或能提子！',
        boardSize: 9,
        position: {
          black: [[1, 2], [2, 1], [2, 3], [3, 2]],
          white: [],
        },
      },
      {
        instruction: '看这个例子：黑棋围住了(2,2)这个空位。如果白棋下在(2,2)，这颗白子周围全是黑子，没有一丝空隙，也没有气——这是白棋的禁入点，不能下！',
        boardSize: 9,
        position: {
          black: [[1, 2], [2, 1], [2, 3], [3, 2]],
          white: [],
        },
      },
      {
        instruction: '但是！如果落子后能提掉对方的子，那就不是禁入点了！看这个图：白棋在(2,2)被包围，只剩(2,3)最后一口气。黑棋下在(2,3)虽然会被白棋包围，但因为它能提掉白子，所以允许落子！',
        expectedMove: [2, 3],
        successMessage: '太棒了！你理解了：只要能提子，就不算禁入点。',
        boardSize: 9,
        position: {
          black: [[1, 2], [2, 1], [3, 2]],
          white: [[2, 2], [1, 3], [3, 3], [2, 4]],
        },
      },
      {
        instruction: '"劫"是围棋中一个特别的规则！看这个图：中间的黑子(2,3)和白子(2,2)互相对峙。如果黑棋下在(2,3)提掉白子，白棋如果马上提回(2,2)的黑子，棋局就会陷入无限循环。',
        highlight: '劫的形成：双方互吃一子',
        boardSize: 9,
        position: {
          black: [[1, 2], [2, 1], [3, 2]],
          white: [[1, 3], [2, 4], [3, 3], [2, 2]],
        },
      },
      {
        instruction: '所以规则规定：在打劫时，被提走一子的位置，对方不能立即提回！必须先在别处下一手（寻劫），迫使对方应一手，然后才能提回。现在请你作为黑棋，先提掉(2,2)的白子，正确落子点应该是(2,3)！',
        expectedMove: [2, 3],
        successMessage: '好！现在白棋不能立即提回(2,2)，这就是"劫"的规则。',
        boardSize: 9,
        position: {
          black: [[1, 2], [2, 1], [3, 2]],
          white: [[1, 3], [2, 4], [3, 3], [2, 2]],
        },
      },
    ],
  },
  {
    id: 7,
    title: '胜负判定',
    description: '了解围棋的胜负判定方法',
    icon: '🏆',
    steps: [
      {
        instruction: '围棋的胜负是怎么判定的呢？围棋有两种主要规则：中国规则（数子法）和日本/韩国规则（数目法）。中国规则下：一方的"子数"= 己方活棋数 + 己方围住的空点数。黑棋先走有优势，所以白棋要加"贴目"来补偿。',
        highlight: '中国规则：子数 + 空点',
        boardSize: 9,
        position: { black: [], white: [] },
      },
      {
        instruction: '看这个简化例子：黑棋围住左上角（12个空点），白棋围住右下角（也是12个空点）。在中国规则下，需要计算：黑子数+黑围空点 vs 白子数+白围空点+贴目。注意：贴目规则与棋盘大小无关！无论9路、13路还是19路，中国规则统一贴7.5目（3又3/4子），日韩规则统一贴6.5目。本应用使用中国规则。',
        boardSize: 9,
        position: {
          black: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 3], [2, 0], [2, 3], [3, 0], [3, 1], [3, 2], [3, 3]],
          white: [[5, 5], [5, 6], [5, 7], [5, 8], [6, 5], [6, 8], [7, 5], [7, 8], [8, 5], [8, 6], [8, 7], [8, 8]],
        },
      },
      {
        instruction: '对弈结束有两种方式：1. 双方都认为没有地可围了，双方连续虚着（Pass）结束。2. 一方认输。结束时计算双方子数（中国规则）或目数（日本规则），多的获胜！贴目的作用就是平衡黑棋先手的优势。',
        boardSize: 9,
        position: { black: [], white: [] },
      },
    ],
  },
];

export default function Basics() {
  const navigate = useNavigate();
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepCompleted, setStepCompleted] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(loadCompletedLessons);
  const [lessonEngine, setLessonEngine] = useState<GoEngine | null>(null);

  const startLesson = (lessonId: number) => {
    setActiveLesson(lessonId);
    setCurrentStep(0);
    setStepCompleted(false);
    const lesson = lessons.find(l => l.id === lessonId)!;
    const step = lesson.steps[0];
    const e = new GoEngine(step.boardSize || 9);
    if (step.position) {
      e.loadPosition(step.position);
    }
    setLessonEngine(e);
    // 语音朗读第一步教学指令
    speak(step.instruction, 1.1);
  };

  const handleBoardMove = useCallback((row: number, col: number, eng: GoEngine) => {
    if (!activeLesson) return;
    const lesson = lessons.find(l => l.id === activeLesson)!;
    const step = lesson.steps[currentStep];

    if (step.acceptAnyMove) {
      // 接受任意合法落子
      setStepCompleted(true);
      playCorrectSound();
      speak(step.successMessage || getCorrectPhrase());
    } else if (step.expectedMove) {
      // 严格验证落子坐标！必须完全匹配 expectedMove
      if (row === step.expectedMove[0] && col === step.expectedMove[1]) {
        setStepCompleted(true);
        playCorrectSound();
        speak(step.successMessage || getCorrectPhrase());
      } else {
        // 落错位置，提示用户
        const phrase = getWrongPhrase();
        playWrongSound();
        speak(phrase);
        toast.error(`${phrase} 提示：试试坐标 (${String.fromCharCode(65 + (step.expectedMove[1] >= 8 ? step.expectedMove[1] + 1 : step.expectedMove[1]))}, ${9 - step.expectedMove[0]})`);
      }
    }
  }, [activeLesson, currentStep]);

  const nextStep = () => {
    if (!activeLesson) return;
    const lesson = lessons.find(l => l.id === activeLesson)!;

    if (currentStep < lesson.steps.length - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      setStepCompleted(false);

      const step = lesson.steps[nextIndex];
      const e = new GoEngine(step.boardSize || 9);
      if (step.position) {
        e.loadPosition(step.position);
      }
      setLessonEngine(e);
      // 语音朗读下一步指令
      speak(step.instruction, 1.1);
    } else {
      // 课程完成
      const phrase = getLevelUpPhrase();
      playLevelUpSound();
      speak(phrase);
      const newCompleted = new Set([...completedLessons, activeLesson]);
      setCompletedLessons(newCompleted);
      saveCompletedLessons(newCompleted);
      setActiveLesson(null);
      stopSpeak();
    }
  };

  const prevStep = () => {
    if (!activeLesson || currentStep <= 0) return;
    stopSpeak();
    const lesson = lessons.find(l => l.id === activeLesson)!;
    const prevIndex = currentStep - 1;
    setCurrentStep(prevIndex);
    setStepCompleted(false);

    const step = lesson.steps[prevIndex];
    const e = new GoEngine(step.boardSize || 9);
    if (step.position) {
      e.loadPosition(step.position);
    }
    setLessonEngine(e);
    speak(step.instruction, 1.1);
  };

  const backToList = () => {
    stopSpeak();
    setActiveLesson(null);
    setCurrentStep(0);
    setStepCompleted(false);
    setLessonEngine(null);
  };

  // 活跃课程视图
  if (activeLesson !== null) {
    const lesson = lessons.find(l => l.id === activeLesson)!;
    const step = lesson.steps[currentStep];
    const progress = ((currentStep + 1) / lesson.steps.length) * 100;

    return (
      <MainLayout>
        <div className="container px-4 py-6 max-w-4xl mx-auto">
          <Button variant="ghost" onClick={backToList} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回课程列表
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">{lesson.icon}</span>
              第{lesson.id}课：{lesson.title}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Progress value={progress} className="flex-1" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {currentStep + 1}/{lesson.steps.length}
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* 教学内容 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  步骤 {currentStep + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base leading-relaxed">{step.instruction}</p>
                {step.highlight && (
                  <div className="bg-primary/10 text-primary p-3 rounded-lg text-sm font-medium">
                    💡 {step.highlight}
                  </div>
                )}
                {stepCompleted && step.successMessage && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-3 rounded-2xl flex items-start gap-2 celebrate">
                    <span className="text-2xl bounce-in">🎉</span>
                    <div>
                      <p className="font-bold">{step.successMessage}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {currentStep > 0 && (
                    <Button variant="outline" onClick={prevStep}>
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      上一步
                    </Button>
                  )}
                  <Button onClick={nextStep} className="flex-1">
                    {currentStep < lesson.steps.length - 1 ? (
                      <>下一步<ArrowRight className="ml-1 h-4 w-4" /></>
                    ) : (
                      <>完成课程<CheckCircle2 className="ml-1 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 互动棋盘 */}
            <div className="flex justify-center">
              {lessonEngine && (
                <GoBoard
                  size={step.boardSize || 9}
                  engine={lessonEngine}
                  onMove={handleBoardMove}
                  disabled={stepCompleted || (!step.expectedMove && !step.acceptAnyMove)}
                  highlightLastMove
                />
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // 课程列表视图
  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">基础入门</h1>
          <p className="text-muted-foreground">AI引导式教学，学习围棋基础规则</p>
          <div className="mt-3">
            <Progress value={(completedLessons.size / lessons.length) * 100} className="max-w-xs" />
            <p className="text-sm text-muted-foreground mt-1">
              已完成 {completedLessons.size}/{lessons.length} 课
            </p>
          </div>
        </div>

        <div className="grid gap-4 max-w-2xl mx-auto">
          {lessons.map((lesson, index) => {
            const isCompleted = completedLessons.has(lesson.id);
            const isUnlocked = index === 0 || completedLessons.has(lessons[index - 1].id);

            return (
              <Card
                key={lesson.id}
                className={`transition-all ${isUnlocked ? 'hover:shadow-lg cursor-pointer' : 'opacity-50'}`}
                onClick={() => isUnlocked && startLesson(lesson.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{lesson.icon}</span>
                      <div>
                        <CardTitle className="text-lg">
                          第{lesson.id}课：{lesson.title}
                          {isCompleted && <CheckCircle2 className="inline h-5 w-5 text-primary ml-2" />}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                      </div>
                    </div>
                    {isUnlocked ? (
                      <Button size="sm">
                        {isCompleted ? '再学一遍' : '开始学习'}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">🔒 完成上一课解锁</span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
