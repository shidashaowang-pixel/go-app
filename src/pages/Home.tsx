import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserGames, getFriendCount } from '@/db/api';
import type { Game } from '@/types/types';
import {
  Target, Eye,
  Flame, TrendingUp, Medal,
  ChevronRight, Gamepad2, Brain, Loader2,
  Sparkles, Play, Trophy as TrophyIcon, Users as UsersIcon, BookOpen as BookOpenIcon,
  Swords, Users, BookOpen, Star, Zap, Crown, Gift, Clock
} from 'lucide-react';
import MainLayout from '@/components/layouts/MainLayout';
import Mascot from '@/components/Mascot';
import { LevelBadge, ExperienceBar, WinStreakBadge } from '@/components/GameElements';

// ========== 段位系统 ==========
const RANK_STEPS = [
  { label: '18K', minRating: 0, icon: '🌱' },
  { label: '17K', minRating: 50, icon: '🌱' },
  { label: '16K', minRating: 100, icon: '🌿' },
  { label: '15K', minRating: 150, icon: '🌿' },
  { label: '14K', minRating: 200, icon: '🌿' },
  { label: '13K', minRating: 250, icon: '🍃' },
  { label: '12K', minRating: 300, icon: '🍃' },
  { label: '11K', minRating: 360, icon: '🍃' },
  { label: '10K', minRating: 420, icon: '⚡' },
  { label: '9K',  minRating: 480, icon: '⚡' },
  { label: '8K',  minRating: 540, icon: '⚡' },
  { label: '7K',  minRating: 600, icon: '💧' },
  { label: '6K',  minRating: 660, icon: '💧' },
  { label: '5K',  minRating: 720, icon: '💎' },
  { label: '4K',  minRating: 780, icon: '💎' },
  { label: '3K',  minRating: 820, icon: '💎' },
  { label: '2K',  minRating: 860, icon: '💠' },
  { label: '1K',  minRating: 900, icon: '💠' },
  { label: '1D',  minRating: 950, icon: '🎖️' },
  { label: '2D',  minRating: 1050, icon: '🏅' },
  { label: '3D',  minRating: 1150, icon: '👑' },
  { label: '4D',  minRating: 1250, icon: '🔥' },
  { label: '5D',  minRating: 1350, icon: '🔥' },
  { label: '6D',  minRating: 1450, icon: '🌟' },
  { label: '7D',  minRating: 1550, icon: '🌟' },
  { label: '8D',  minRating: 1700, icon: '✨' },
  { label: '9D',  minRating: 1900, icon: '✨' },
];

export function getRankInfo(rating: number) {
  let result = RANK_STEPS[0];
  for (const step of RANK_STEPS) {
    if (rating >= step.minRating) result = step;
    else break;
  }
  return result;
}

function calcGameStats(userId: string, games: Game[]) {
  let wins = 0, losses = 0;
  for (const game of games) {
    const isBlack = game.black_player_id === userId;
    let won = false;
    if (game.result === 'black_win') won = isBlack;
    else if (game.result === 'white_win') won = !isBlack;
    else if (game.result === 'draw') continue;
    else continue;
    if (won) wins++; else losses++;
  }
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  return { total, wins, losses, winRate };
}

// ========== 每日任务数据 ==========
const DAILY_QUESTS = [
  { id: 1, icon: '🎮', title: '完成1局对弈', progress: 0, total: 1, color: 'from-blue-400 to-blue-500' },
  { id: 2, icon: '📚', title: '学习1个知识点', progress: 0, total: 1, color: 'from-green-400 to-green-500' },
  { id: 3, icon: '🏆', title: '取得1场胜利', progress: 0, total: 1, color: 'from-yellow-400 to-orange-500' },
];

// ========== 快捷入口数据 ==========
const QUICK_ACTIONS = [
  { id: 1, icon: '🎯', title: '闯关练习', desc: '边玩边学', color: 'bg-gradient-to-br from-teal-400 to-cyan-500', link: '/learn/checkpoint' },
  { id: 2, icon: '👥', title: '好友对战', desc: '和朋友来一局', color: 'bg-gradient-to-br from-purple-400 to-pink-500', link: '/social/friends' },
  { id: 3, icon: '📖', title: '围棋百科', desc: '了解围棋文化', color: 'bg-gradient-to-br from-amber-400 to-orange-500', link: '/learn' },
  { id: 4, icon: '🏅', title: '排行榜', desc: '查看段位排名', color: 'bg-gradient-to-br from-rose-400 to-red-500', link: '/social/leaderboard' },
];

export default function Home() {
  const { user, profile } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [friendCount, setFriendCount] = useState({ following: 0, followers: 0 });
  const [loading, setLoading] = useState(true);

  const rating = profile?.rating ?? 0;
  const rankInfo = getRankInfo(rating);
  const stats = games.length > 0 && user ? calcGameStats(user.id, games) : { total: 0, wins: 0, losses: 0, winRate: 0 };

  useEffect(() => {
    async function loadData() {
      if (!user) { setLoading(false); return; }
      try {
        const [gamesData, count] = await Promise.all([
          getUserGames(user.id),
          getFriendCount(user.id),
        ]);
        setGames(gamesData);
        setFriendCount(count);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* 顶部背景装饰 */}
      <div className="fixed top-0 left-0 right-0 h-48 bg-gradient-to-b from-blue-100 via-blue-50 to-transparent pointer-events-none -z-10" />
      
      <div className="container px-4 pb-8 mx-auto
        sm:max-w-lg
        md:max-w-2xl
        lg:max-w-4xl
        xl:max-w-5xl">
        {/* ===== 用户信息卡片 ===== */}
        <div className="flex items-center gap-4 mb-6 pt-4">
          {/* 头像 */}
          <div className="relative">
            <Avatar className="w-16 h-16 border-4 border-white shadow-xl">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} />
              ) : null}
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-200 to-purple-200">
                {profile?.nickname?.[0] || profile?.username?.[0] || '😊'}
              </AvatarFallback>
            </Avatar>
            {/* 在线状态 */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>

          {/* 用户信息 */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {profile?.nickname || profile?.username || '棋友'}
              </h1>
              <WinStreakBadge streak={3} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm px-2 py-0.5">
                {rankInfo.icon} {rankInfo.label}
              </Badge>
              <span className="text-xs text-muted-foreground">胜率 {stats.winRate}%</span>
            </div>
          </div>

          {/* 设置入口 */}
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="rounded-full">
              <span className="text-xl">⚙️</span>
            </Button>
          </Link>
        </div>

        {/* ===== 经验值进度条 ===== */}
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                <span className="font-bold">当前段位</span>
              </div>
              <Link to="/profile" className="text-xs text-white/80 hover:text-white">
                查看详情 →
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                {rankInfo.icon}
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold">{rankInfo.label}</div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (rating % 50) * 2)}%` }}
                  />
                </div>
                <div className="text-xs text-white/80 mt-1">
                  距下一段位还需 {50 - (rating % 50)} 积分
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== 快速开始按钮 ===== */}
        <Card className="mb-6 border-0 shadow-xl overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl animate-pulse">
                ⚫
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">开始对弈！</h2>
                <p className="text-white/80 text-sm">与AI或好友来一局围棋</p>
              </div>
              <Link to="/game">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90 rounded-full px-6 font-bold shadow-lg">
                  <Play className="w-5 h-5 mr-2" />
                  开始
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* ===== 快捷入口网格 ===== */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.id} to={action.link}>
              <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                <CardContent className="p-4">
                  <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center text-2xl mb-3 shadow-lg`}>
                    {action.icon}
                  </div>
                  <h3 className="font-bold text-base mb-1">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* ===== 今日任务 ===== */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold">今日任务</h3>
              </div>
              <Badge className="bg-amber-100 text-amber-600 border-0">
                0/{DAILY_QUESTS.length} 完成
              </Badge>
            </div>
            <div className="space-y-3">
              {DAILY_QUESTS.map((quest) => {
                const progress = Math.min(100, (quest.progress / quest.total) * 100);
                return (
                  <div key={quest.id} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${quest.color} flex items-center justify-center text-lg shadow`}>
                      {quest.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{quest.title}</span>
                        <span className="text-xs text-muted-foreground">{quest.progress}/{quest.total}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${quest.color}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ===== 底部吉祥物 ===== */}
        <div className="flex justify-center py-4">
          <Mascot />
        </div>

        {/* ===== 底部数据统计 ===== */}
        <Card className="border-0 shadow-md bg-gradient-to-r from-gray-50 to-gray-100">
          <CardContent className="p-4">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{stats.total}</div>
                <div className="text-xs text-muted-foreground">总对局</div>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <div className="text-2xl font-bold text-emerald-500">{stats.wins}</div>
                <div className="text-xs text-muted-foreground">胜利</div>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <div className="text-2xl font-bold text-red-400">{stats.losses}</div>
                <div className="text-xs text-muted-foreground">失败</div>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <div className="text-2xl font-bold text-blue-500">{friendCount.following + friendCount.followers}</div>
                <div className="text-xs text-muted-foreground">好友</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
