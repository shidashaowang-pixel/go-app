import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getOnlineUserCount } from '@/db/api';
import {
  Bot, Users, Timer, BookOpen, Heart,
  ChevronRight, Zap, Brain, Gamepad2, Flame,
  Clock, Shield, Trophy, Loader2
} from 'lucide-react';

export default function GameCenter() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    getOnlineUserCount().then(setOnlineCount);
    // 每30秒刷新在线人数
    const interval = setInterval(() => getOnlineUserCount().then(setOnlineCount), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-lg mx-auto pb-20">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-md">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              对弈中心 <span className="text-xl mascot-wiggle">⚔️</span>
            </h1>
            <p className="text-xs text-muted-foreground">选择模式，开始对局 🎮</p>
          </div>
        </div>

        {/* ===== 对弈模式卡片 ===== */}
        <div className="space-y-4 mb-6">
          {/* 人机对弈 */}
          <Link to="/game/ai">
            <Card className="overflow-hidden border-0 shadow-md card-kid hover:shadow-xl transition-all active:scale-[0.98]">
              <CardContent className="p-0">
                {/* 头部渐变条 */}
                <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* AI头像 */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-lg ring-4 ring-slate-100">
                      <Bot className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="text-lg font-bold">人机对弈</h2>
                        <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px] px-1.5 py-0 gap-0.5">
                          <Zap className="w-2.5 h-2.5" /> 推荐
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">与AI对弈，从入门到高手</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">9路</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">13路</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-medium">19路</span>
                      </div>
                      {/* 难度指示 */}
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="w-20 shrink-0">🌱 初级 ~18K</span>
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full w-[25%] rounded-full bg-green-400" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-20 shrink-0">⚡ 中级 ~10K</span>
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full w-[55%] rounded-full bg-yellow-400" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-20 shrink-0">🤖 高级 ~1K+</span>
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full w-[85%] rounded-full bg-red-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 self-center">
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                  {/* 底部按钮 */}
                  <Button className="w-full mt-4 py-5 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md">
                    开始人机对弈
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 真人对弈 */}
          <Link to="/game/human">
            <Card className="overflow-hidden border-0 shadow-md card-kid hover:shadow-xl transition-all active:scale-[0.98]">
              <CardContent className="p-0">
                <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500" />
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* 玩家头像 */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0 shadow-lg ring-4 ring-violet-100">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="text-lg font-bold">真人对弈</h2>
                        <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">热门</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">与好友或棋友在线对弈</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">👥 好友对战</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">🎲 随机匹配</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-muted-foreground">
                            {onlineCount !== null ? `${onlineCount} 人在线` : '加载中...'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 self-center">
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                  <Button className="w-full mt-4 py-5 text-base font-semibold bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-md">
                    开始真人对弈
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* ===== 功能亮点 ===== */}
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" /> 特色功能
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            {
              icon: TimerIcon2,
              label: '对局计时',
              desc: '多档时间',
              color: 'from-blue-400 to-indigo-500',
            },
            {
              icon: BookOpenIcon2,
              label: '对局研究',
              desc: '棋谱回放',
              color: 'from-purple-400 to-pink-500',
            },
            {
              icon: HealthIcon2,
              label: '健康提醒',
              desc: '护眼休息',
              color: 'from-rose-400 to-red-500',
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Card key={i} className="overflow-hidden border-0 shadow-sm card-kid">
                <CardContent className="p-3.5 text-center">
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}

function TimerIcon2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M9 2h6" />
    </svg>
  );
}
function BookOpenIcon2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}
function HealthIcon2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}
