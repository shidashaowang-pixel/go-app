import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Flame, Trophy, Target, BookOpen, Swords } from 'lucide-react';

// ========== 段位系统：18K ~ 9D，基于积分动态计算 ==========
const RANK_STEPS = [
  { label: '18K', minRating: 0,    icon: '🌱', color: 'text-gray-400', bg: 'bg-gray-50' },
  { label: '17K', minRating: 50,   icon: '🌱', color: 'text-gray-500', bg: 'bg-gray-100' },
  { label: '16K', minRating: 100,  icon: '🌿', color: 'text-gray-500', bg: 'bg-gray-100' },
  { label: '15K', minRating: 150,  icon: '🌿', color: 'text-gray-600', bg: 'bg-gray-100' },
  { label: '14K', minRating: 200,  icon: '🌿', color: 'text-green-600', bg: 'bg-green-50' },
  { label: '13K', minRating: 250,  icon: '🍃', color: 'text-green-600', bg: 'bg-green-50' },
  { label: '12K', minRating: 300,  icon: '🍃', color: 'text-green-700', bg: 'bg-green-100' },
  { label: '11K', minRating: 360,  icon: '🍃', color: 'text-teal-600', bg: 'bg-teal-50' },
  { label: '10K', minRating: 420,  icon: '⚡', color: 'text-teal-600', bg: 'bg-teal-50' },
  { label: '9K',  minRating: 480,  icon: '⚡', color: 'text-teal-700', bg: 'bg-teal-100' },
  { label: '8K',  minRating: 540,  icon: '⚡', color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: '7K',  minRating: 600,  icon: '💧', color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: '6K',  minRating: 660,  icon: '💧', color: 'text-blue-600', bg: 'bg-blue-100' },
  { label: '5K',  minRating: 720,  icon: '💎', color: 'text-blue-700', bg: 'bg-blue-100' },
  { label: '4K',  minRating: 780,  icon: '💎', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: '3K',  minRating: 820,  icon: '💎', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: '2K',  minRating: 860,  icon: '💎', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  { label: '1K',  minRating: 900,  icon: '💠', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  { label: '1D',  minRating: 950,  icon: '🎖️', color: 'text-orange-600', bg: 'bg-orange-50' },
  { label: '2D',  minRating: 1050, icon: '🏅', color: 'text-orange-600', bg: 'bg-orange-100' },
  { label: '3D',  minRating: 1150, icon: '👑', color: 'text-red-600', bg: 'bg-red-50' },
  { label: '4D',  minRating: 1250, icon: '🔥', color: 'text-red-600', bg: 'bg-red-50' },
  { label: '5D',  minRating: 1350, icon: '🔥', color: 'text-red-700', bg: 'bg-red-100' },
  { label: '6D',  minRating: 1450, icon: '🌟', color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: '7D',  minRating: 1550, icon: '🌟', color: 'text-amber-700', bg: 'bg-amber-100' },
  { label: '8D',  minRating: 1700, icon: '✨', color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: '9D',  minRating: 1900, icon: '✨', color: 'text-purple-700', bg: 'bg-purple-100' },
];

/** 根据 rating 积分获取段位信息 */
function getRankInfo(rating: number) {
  let result = RANK_STEPS[0];
  for (const step of RANK_STEPS) {
    if (rating >= step.minRating) result = step;
    else break;
  }
  return result;
}

interface LevelBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 等级徽章组件
 */
export function LevelBadge({ rating, size = 'md' }: LevelBadgeProps) {
  const rankInfo = getRankInfo(rating);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-sm px-2 py-1 gap-1',
    lg: 'text-base px-3 py-1.5 gap-1.5',
  };

  return (
    <Badge className={`${rankInfo.bg} ${rankInfo.color} border-0 font-bold ${sizeClasses[size]}`}>
      <span>{rankInfo.icon}</span>
      <span>{rankInfo.label}</span>
    </Badge>
  );
}

/**
 * 经验条组件
 */
export function ExperienceBar({ rating, className = '' }: { rating: number; className?: string }) {
  const rankInfo = getRankInfo(rating);
  const rankSteps = getRankSteps();
  const currentIdx = rankSteps.findIndex(s => s.label === rankInfo.label);
  const next = rankSteps[currentIdx + 1];

  if (!next) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <LevelBadge rating={rating} size="sm" />
        <span className="text-xs text-muted-foreground font-medium">最高段位！</span>
      </div>
    );
  }

  const range = next.minRating - rankInfo.minRating;
  const progress = Math.min(100, Math.round(((rating - rankInfo.minRating) / range) * 100));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LevelBadge rating={rating} size="sm" />
      <div className="flex-1">
        <Progress value={progress} className="h-2" />
      </div>
      <LevelBadge rating={next.minRating} size="sm" />
    </div>
  );
}

/**
 * 每日任务卡片
 */
export function DailyQuestCard({
  title,
  description,
  progress,
  total,
  reward,
  link,
  gradient = 'from-amber-400 to-orange-500',
}: {
  title: string;
  description: string;
  progress: number;
  total: number;
  reward: string;
  link?: string;
  gradient?: string;
}) {
  const isComplete = progress >= total;
  const percentage = Math.min(100, Math.round((progress / total) * 100));

  const content = (
    <Card className={`overflow-hidden border-0 shadow-md transition-all ${link ? 'hover:shadow-lg cursor-pointer' : ''} ${isComplete ? 'ring-2 ring-emerald-400' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* 奖励图标 */}
          <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            {isComplete ? (
              <Trophy className="w-6 h-6 text-white" />
            ) : (
              <Sparkles className="w-6 h-6 text-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm">{title}</h4>
              {isComplete && <Badge className="bg-emerald-100 text-emerald-600 border-0 text-[10px]">已完成</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>

            {/* 进度条 */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{progress}/{total}</span>
                <span className="font-medium">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-1.5" />
            </div>
          </div>

          {/* 奖励 */}
          <div className="shrink-0 text-center">
            <div className={`text-lg font-bold ${isComplete ? 'text-emerald-500' : 'text-amber-500'}`}>
              +{reward}
            </div>
            <div className="text-[10px] text-muted-foreground">经验</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 快速任务快捷入口
 */
export function QuickQuestItem({
  icon: Icon,
  label,
  progress,
  total,
  link,
  gradient,
}: {
  icon: typeof BookOpen;
  label: string;
  progress: number;
  total: number;
  link: string;
  gradient: string;
}) {
  const isComplete = progress >= total;

  return (
    <Link to={link} className="block">
      <div className={`relative p-3 rounded-xl bg-white/80 backdrop-blur shadow-sm transition-all hover:shadow-md hover:scale-105 ${isComplete ? 'ring-2 ring-emerald-400' : ''}`}>
        <div className={`w-10 h-10 mx-auto rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-2`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs font-medium text-center">{label}</p>
        <p className="text-[10px] text-center text-muted-foreground">{progress}/{total}</p>
        {isComplete && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * 连胜徽章
 */
export function WinStreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null;

  return (
    <Badge className="bg-gradient-to-r from-teal-100 to-emerald-100 text-teal-600 border-0 font-bold gap-1">
      <Flame className="w-3 h-3" />
      <span>{streak}连胜</span>
    </Badge>
  );
}

/**
 * 段位进度详情
 */
export function RankProgress({ rating }: { rating: number }) {
  const rankInfo = getRankInfo(rating);
  const rankSteps = getRankSteps();
  const currentIdx = rankSteps.findIndex(s => s.label === rankInfo.label);

  // 显示周围3个段位
  const visibleRanks = rankSteps.slice(
    Math.max(0, currentIdx - 1),
    Math.min(rankSteps.length, currentIdx + 3)
  );

  return (
    <div className="flex items-center gap-1">
      {visibleRanks.map((rank, i) => {
        const isCurrent = rank.label === rankInfo.label;
        const isPassed = i < visibleRanks.length - 1 || (isCurrent && rating >= rank.minRating);

        return (
          <div key={rank.label} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                isCurrent
                  ? 'bg-primary text-primary-foreground scale-110 shadow-lg'
                  : isPassed
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
              title={rank.label}
            >
              {rank.icon}
            </div>
            {i < visibleRanks.length - 1 && (
              <div className={`w-4 h-0.5 ${isPassed ? 'bg-emerald-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// 辅助函数：从 Home.tsx 复制过来
function getRankSteps() {
  return [
    { label: '18K', minRating: 0, icon: '🌱' },
    { label: '17K', minRating: 50, icon: '🌱' },
    { label: '16K', minRating: 100, icon: '🌿' },
    { label: '15K', minRating: 150, icon: '🌿' },
    { label: '14K', minRating: 200, icon: '🌿' },
    { label: '13K', minRating: 250, icon: '🍃' },
    { label: '12K', minRating: 300, icon: '🍃' },
    { label: '11K', minRating: 360, icon: '🍃' },
    { label: '10K', minRating: 420, icon: '⚡' },
    { label: '9K', minRating: 480, icon: '⚡' },
    { label: '8K', minRating: 540, icon: '⚡' },
    { label: '7K', minRating: 600, icon: '💧' },
    { label: '6K', minRating: 660, icon: '💧' },
    { label: '5K', minRating: 720, icon: '💎' },
    { label: '4K', minRating: 780, icon: '💎' },
    { label: '3K', minRating: 820, icon: '💎' },
    { label: '2K', minRating: 860, icon: '💎' },
    { label: '1K', minRating: 900, icon: '💠' },
    { label: '1D', minRating: 950, icon: '🎖️' },
    { label: '2D', minRating: 1050, icon: '🏅' },
    { label: '3D', minRating: 1150, icon: '👑' },
    { label: '4D', minRating: 1250, icon: '🔥' },
    { label: '5D', minRating: 1350, icon: '🔥' },
    { label: '6D', minRating: 1450, icon: '🌟' },
    { label: '7D', minRating: 1550, icon: '🌟' },
    { label: '8D', minRating: 1700, icon: '✨' },
    { label: '9D', minRating: 1900, icon: '✨' },
  ];
}
