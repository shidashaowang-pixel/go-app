import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, CheckCircle2, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProgress, getCheckpointProblems } from '@/db/api';
import { CHECKPOINT_LEVELS, mergeCloudProblems } from '@/data/problems';
import { getCustomProblems } from '@/data/custom-problems';
import type { LearningProgress, Problem } from '@/types/types';
import { playHintSound } from '@/lib/sounds';

// 每关的吉祥物emoji和主题色
const LEVEL_MASCOTS = [
  { emoji: '🐣', bg: 'from-green-400/10 to-emerald-400/10', border: 'border-green-200' },
  { emoji: '🐥', bg: 'from-teal-400/10 to-cyan-400/10', border: 'border-teal-200' },
  { emoji: '🦊', bg: 'from-amber-400/10 to-orange-400/10', border: 'border-amber-200' },
  { emoji: '🐺', bg: 'from-blue-400/10 to-indigo-400/10', border: 'border-blue-200' },
  { emoji: '🦁', bg: 'from-violet-400/10 to-purple-400/10', border: 'border-violet-200' },
  { emoji: '🐉', bg: 'from-rose-400/10 to-pink-400/10', border: 'border-rose-200' },
  { emoji: '🦅', bg: 'from-yellow-400/10 to-red-400/10', border: 'border-yellow-200' },
  { emoji: '🔮', bg: 'from-indigo-400/10 to-blue-400/10', border: 'border-indigo-200' },
];

interface CheckpointLevel {
  level: number;
  title: string;
  description: string;
  totalProblems: number;
  stars: number; // 0-3
  completedCount: number;
}

const checkpointLevelDefs = [
  { level: 1, title: '第1关：基础吃子', description: '学习如何吃掉对方的棋子' },
  { level: 2, title: '第2关：连接棋子', description: '学习如何连接自己的棋子' },
  { level: 3, title: '第3关：围地得分', description: '学习如何围出自己的地盘' },
  { level: 4, title: '第4关：叫吃技巧', description: '学习叫吃、门吃、抱吃等技巧' },
  { level: 5, title: '第5关：对杀基础', description: '学习对杀中如何收气和延气' },
  { level: 6, title: '第6关：死活入门', description: '学习做眼活棋和破眼杀棋' },
  { level: 7, title: '第7关：基本手筋', description: '学习枷吃、倒扑、征子等手筋' },
  { level: 8, title: '第8关：死活进阶', description: '做活专练：直三、曲三、板六等经典死活' },
];

export default function Checkpoint() {
  const { user } = useAuth();
  const location = useLocation();
  const [levels, setLevels] = useState<CheckpointLevel[]>(
    checkpointLevelDefs.map(d => ({ ...d, totalProblems: 5, stars: 0, completedCount: 0 }))
  );
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // 页面加载或从子页面返回时刷新进度
  useEffect(() => {
    if (user) loadProgress();
    else setLoading(false);
  }, [user]);

  // 监听页面返回（从闯关详情页返回时刷新）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        loadProgress();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;
    try {
      // 获取所有学习进度
      const progress = await getUserProgress(user.id);
      const completedRecords = progress.filter(p => p.problem_id && p.completed);

      // 获取每关的题目列表（云端+本地合并）
      const levelData: CheckpointLevel[] = [];

      // 获取所有自定义题目
      const allCustomProblems = await getCustomProblems();

      for (const def of checkpointLevelDefs) {
        // 获取本地题目（使用与 CheckpointLevel.tsx 一致的 id 格式）
        const levelIndex = Math.max(0, Math.min(def.level - 1, CHECKPOINT_LEVELS.length - 1));
        const localProblems: Problem[] = CHECKPOINT_LEVELS[levelIndex].map((p, i) => ({
          ...p,
          id: p.systemId || `local-cp${def.level}-${i}`,
          created_at: new Date().toISOString(),
        })) as Problem[];

        // 获取云端题目
        const cloudProblems: Problem[] = await getCheckpointProblems(def.level);

        // 合并：云端题目覆盖本地题目
        let problems = mergeCloudProblems(localProblems, cloudProblems);

        // 添加自定义关卡题目
        const customCheckpointProblems = allCustomProblems.filter(p =>
          p.type === 'checkpoint' && p.checkpoint_level === def.level
        );
        if (customCheckpointProblems.length > 0) {
          console.log(`[关卡总览] 第${def.level}关发现 ${customCheckpointProblems.length} 道自定义题目`);
          problems = [...problems, ...customCheckpointProblems];
        }

        const problemIds = new Set(problems.map(p => p.id));
        // 统计本关已完成的题目数
        const completedInLevel = completedRecords.filter(r => problemIds.has(r.problem_id!)).length;
        const totalProblems = problems.length;

        // 星级计算：
        // 3星：全部完成
        // 2星：完成 2/3 以上
        // 1星：完成 1/3 以上
        // 0星：未完成或完成不到1/3
        let stars = 0;
        if (totalProblems > 0) {
          const ratio = completedInLevel / totalProblems;
          if (ratio >= 1) stars = 3;
          else if (ratio >= 2 / 3) stars = 2;
          else if (ratio >= 1 / 3) stars = 1;
        }

        levelData.push({
          level: def.level,
          title: def.title,
          description: def.description,
          totalProblems,
          stars,
          completedCount: completedInLevel,
        });
      }

      // 判断已通关的关卡（至少1星）
      const completed = new Set<number>();
      for (const lv of levelData) {
        if (lv.stars >= 1) completed.add(lv.level);
      }

      setLevels(levelData);
      setCompletedLevels(completed);
    } catch (error) {
      console.error('加载进度失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (level: number) => {
    if (level === 1) return true;
    return completedLevels.has(level - 1);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 flex justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl float-gentle">🏯</span> 基础定式闯关
            <span className="text-2xl mascot-wiggle">⚔️</span>
          </h1>
          <p className="text-muted-foreground">闯过7关，成为围棋小英雄！🦸</p>
          <div className="flex items-center gap-3 mt-3">
            <Progress value={(completedLevels.size / checkpointLevelDefs.length) * 100} className="max-w-xs" />
            <span className="text-sm text-muted-foreground">
              {completedLevels.size}/{checkpointLevelDefs.length} 关
            </span>
          </div>
        </div>

        <div className="grid gap-6 max-w-2xl mx-auto">
          {levels.map((level) => {
            const unlocked = isUnlocked(level.level);
            const mascot = LEVEL_MASCOTS[level.level - 1] || LEVEL_MASCOTS[0];
            const completed = completedLevels.has(level.level);
            const progressPercent = level.totalProblems > 0
              ? (level.completedCount / level.totalProblems) * 100
              : 0;

            return (
              <Card
                key={level.level}
                className={`card-kid transition-all overflow-hidden ${unlocked ? 'hover:shadow-lg cursor-pointer' : 'opacity-60'} ${unlocked ? `bg-gradient-to-br ${mascot.bg}` : ''}`}
                onClick={() => { if (unlocked) playHintSound(); }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{mascot.emoji}</span>
                      {level.title}
                      {completed && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      {!unlocked && <Lock className="h-5 w-5 text-muted-foreground" />}
                    </CardTitle>
                    {completed ? (
                      <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 border-0">🏆 已完成</Badge>
                    ) : !unlocked ? (
                      <Badge variant="secondary">🔒 未解锁</Badge>
                    ) : (
                      <Badge variant="outline" className="border-primary text-primary">🎮 进行中</Badge>
                    )}
                  </div>
                  <CardDescription>{level.description}</CardDescription>

                  {/* 星级评价 */}
                  {(completed || level.stars > 0) && (
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3].map(s => (
                        <Star
                          key={s}
                          className={`h-5 w-5 ${s <= level.stars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-2">
                        {level.completedCount}/{level.totalProblems} 题
                      </span>
                    </div>
                  )}

                  {/* 进度条 */}
                  {unlocked && !completed && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>进度</span>
                        <span>{level.completedCount}/{level.totalProblems} ({Math.round(progressPercent)}%)</span>
                      </div>
                      <Progress value={progressPercent} />
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {unlocked ? (
                    <Link to={`/learn/checkpoint/${level.level}`}>
                      <Button className="w-full">
                        {completed ? '重新挑战' : '开始闯关'}
                      </Button>
                    </Link>
                  ) : (
                    <Button className="w-full" disabled>
                      完成上一关解锁
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
