import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGames, updateProfile } from '@/db/api';
import type { Game } from '@/types';
import { getRankInfo } from '@/pages/Home';
import {
  Trophy,
  Star,
  Shield,
  Zap,
  Target,
  Medal,
  Crown,
  ChevronRight,
  Award,
  CheckCircle2,
  Lock,
} from 'lucide-react';

// 段位定义
interface Rank {
  id: string;
  name: string;
  level: number;
  icon: string;
  color: string;
  requirements: {
    winAgainstLevel: number; // 击败对应难度
    winCount: number;
  };
  description: string;
}

const RANKS: Rank[] = [
  {
    id: 'kyu-30',
    name: '30级',
    level: -30,
    icon: '🌱',
    color: 'text-green-500',
    requirements: { winAgainstLevel: 1, winCount: 1 },
    description: '围棋初学者',
  },
  {
    id: 'kyu-25',
    name: '25级',
    level: -25,
    icon: '🌿',
    color: 'text-green-600',
    requirements: { winAgainstLevel: 1, winCount: 5 },
    description: '刚刚入门',
  },
  {
    id: 'kyu-20',
    name: '20级',
    level: -20,
    icon: '🍀',
    color: 'text-emerald-500',
    requirements: { winAgainstLevel: 1, winCount: 15 },
    description: '了解基本规则',
  },
  {
    id: 'kyu-15',
    name: '15级',
    level: -15,
    icon: '⚡',
    color: 'text-blue-500',
    requirements: { winAgainstLevel: 2, winCount: 10 },
    description: '开始学习定式',
  },
  {
    id: 'kyu-10',
    name: '10级',
    level: -10,
    icon: '🎯',
    color: 'text-indigo-500',
    requirements: { winAgainstLevel: 2, winCount: 20 },
    description: '能够进行完整对局',
  },
  {
    id: 'kyu-5',
    name: '5级',
    level: -5,
    icon: '🔥',
    color: 'text-orange-500',
    requirements: { winAgainstLevel: 3, winCount: 10 },
    description: '掌握基本手筋',
  },
  {
    id: 'kyu-1',
    name: '1级',
    level: -1,
    icon: '💫',
    color: 'text-amber-500',
    requirements: { winAgainstLevel: 3, winCount: 25 },
    description: '接近段位水平',
  },
  {
    id: 'dan-1',
    name: '一段',
    level: 1,
    icon: '⭐',
    color: 'text-yellow-500',
    requirements: { winAgainstLevel: 3, winCount: 40 },
    description: '正式段位',
  },
  {
    id: 'dan-3',
    name: '三段',
    level: 3,
    icon: '🌟',
    color: 'text-amber-400',
    requirements: { winAgainstLevel: 3, winCount: 60 },
    description: '中级水平',
  },
  {
    id: 'dan-5',
    name: '五段',
    level: 5,
    icon: '✨',
    color: 'text-purple-500',
    requirements: { winAgainstLevel: 3, winCount: 80 },
    description: '高级水平',
  },
  {
    id: 'dan-7',
    name: '七段',
    level: 7,
    icon: '💎',
    color: 'text-cyan-500',
    requirements: { winAgainstLevel: 3, winCount: 100 },
    description: '高手水平',
  },
  {
    id: 'dan-9',
    name: '九段',
    level: 9,
    icon: '👑',
    color: 'text-red-500',
    requirements: { winAgainstLevel: 3, winCount: 150 },
    description: '顶尖水平',
  },
];

interface RankProgress {
  rank: Rank;
  currentWins: number;
  progress: number;
  achieved: boolean;
}

export default function RankCertificationPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [rankProgress, setRankProgress] = useState<RankProgress[]>([]);
  const [currentRank, setCurrentRank] = useState<Rank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const userGames = await getUserGames(user.id, 200);
    setGames(userGames);

    // 计算各段位进度
    const progress = calculateRankProgress(userGames);
    setRankProgress(progress);

    // 确定当前段位
    const achieved = progress.find((p) => p.achieved);
    if (achieved) {
      setCurrentRank(achieved.rank);
    }

    setLoading(false);
  };

  const calculateRankProgress = (userGames: Game[]): RankProgress[] => {
    // 统计不同难度的胜利
    const winsByLevel: Record<string, number> = {
      '1': 0, // 初级AI
      '2': 0, // 中级AI
      '3': 0, // 高级AI
    };

    userGames.forEach((game) => {
      if (game.type === 'ai' && game.status === 'finished' && game.result) {
        const isUserBlack = game.black_player_id === user?.id;
        const userWon =
          (isUserBlack && game.result === 'black_win') ||
          (!isUserBlack && game.result === 'white_win');

        if (userWon) {
          const diff = game.ai_difficulty?.toLowerCase() || '';
          if (diff.includes('beginner') || diff.includes('初级') || diff.includes('入门')) {
            winsByLevel['1']++;
          } else if (
            diff.includes('intermediate') ||
            diff.includes('中级') ||
            diff.includes('进阶')
          ) {
            winsByLevel['2']++;
          } else if (diff.includes('advanced') || diff.includes('高级') || diff.includes('困难')) {
            winsByLevel['3']++;
          }
        }
      }
    });

    // 计算每个段位的进度
    return RANKS.map((rank) => {
      const requiredWins = rank.requirements.winCount;
      let currentWins = 0;

      if (rank.requirements.winAgainstLevel >= 1) {
        currentWins += winsByLevel['1'] || 0;
      }
      if (rank.requirements.winAgainstLevel >= 2) {
        currentWins += winsByLevel['2'] || 0;
      }
      if (rank.requirements.winAgainstLevel >= 3) {
        currentWins += winsByLevel['3'] || 0;
      }

      const achieved = currentWins >= requiredWins;
      const progress = Math.min((currentWins / requiredWins) * 100, 100);

      return { rank, currentWins, progress, achieved };
    });
  };

  // 获取用户已获得的最高段位
  const highestRank = rankProgress
    .filter((p) => p.achieved)
    .sort((a, b) => b.rank.level - a.rank.level)[0];

  // 获取下一个目标段位
  const nextRank = rankProgress
    .filter((p) => !p.achieved)
    .sort((a, b) => b.rank.level - a.rank.level)[0];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">段位认证</h1>
          <p className="text-sm text-muted-foreground">通过AI对弈获得段位证书</p>
        </div>

        {/* 当前段位卡片 */}
        <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="text-7xl">{highestRank?.rank.icon || '🌱'}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-3xl font-bold">
                    {highestRank?.rank.name || '未获得段位'}
                  </h2>
                  {highestRank && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500">
                      <Award className="w-4 h-4 mr-1" />
                      已认证
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mb-3">
                  {highestRank?.rank.description || '开始你的围棋之旅吧！'}
                </p>

                {nextRank && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>距离 {nextRank.rank.name}：还需 {nextRank.rank.requirements.winCount - nextRank.currentWins} 胜</span>
                      <span>{Math.round(nextRank.progress)}%</span>
                    </div>
                    <Progress value={nextRank.progress} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快速开始 */}
        <div className="flex gap-3 mb-6">
          <Button className="flex-1" onClick={() => navigate('/game/ai')}>
            <Zap className="w-4 h-4 mr-2" />
            开始对弈
          </Button>
          <Button variant="outline" onClick={() => navigate('/profile/history')}>
            查看战绩
          </Button>
        </div>

        {/* 段位进度列表 */}
        <div className="space-y-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            段位进度
          </h3>

          {rankProgress
            .sort((a, b) => b.rank.level - a.rank.level)
            .map((item) => (
              <Card
                key={item.rank.id}
                className={`transition-all ${
                  item.achieved
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200'
                    : item.progress > 0
                    ? 'bg-primary/5'
                    : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* 图标 */}
                    <div
                      className={`text-3xl ${
                        item.achieved ? '' : 'grayscale opacity-50'
                      }`}
                    >
                      {item.achieved ? (
                        item.rank.icon
                      ) : (
                        <Lock className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            item.achieved ? item.rank.color : 'text-muted-foreground'
                          }`}
                        >
                          {item.rank.name}
                        </span>
                        {item.achieved && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.rank.description}
                      </p>
                    </div>

                    {/* 进度 */}
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {item.currentWins} / {item.rank.requirements.winCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.rank.requirements.winAgainstLevel === 3
                          ? '击败高级AI'
                          : item.rank.requirements.winAgainstLevel === 2
                          ? '击败中级AI'
                          : '击败初级AI'}
                      </p>
                    </div>
                  </div>

                  {!item.achieved && (
                    <Progress value={item.progress} className="h-1 mt-3" />
                  )}
                </CardContent>
              </Card>
            ))}
        </div>

        {/* 说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              段位认证规则
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• 段位通过击败AI对弈获得，每胜一局计入进度</p>
            <p>• 更高段位需要击败更强难度的AI</p>
            <p>• 段位从30级（初学者）到九段（顶尖高手）</p>
            <p>• 段位认证仅基于AI对弈战绩，真实人人对弈不受影响</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
