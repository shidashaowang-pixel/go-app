import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trophy, Award, Users, Loader2, MessageCircle, UsersRound, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getFriends, getUserAchievements, getLeaderboard, getOnlineUserCount, getTotalUnreadCount } from '@/db/api';
import type { Profile, Achievement } from '@/types/types';
import { getRankInfo } from '@/pages/Home';

export default function Social() {
  const { user, profile } = useAuth();
  const [friendCount, setFriendCount] = useState(0);
  const [achievementCount, setAchievementCount] = useState(0);
  const [topPlayers, setTopPlayers] = useState<Profile[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
    else setLoading(false);
  }, [user]);

  const loadData = async () => {
    try {
      const [friends, achievements, leaderboard, online, unread] = await Promise.all([
        getFriends(user!.id),
        getUserAchievements(user!.id),
        getLeaderboard(3),
        getOnlineUserCount(),
        getTotalUnreadCount(user!.id),
      ]);
      setFriendCount(friends.length);
      setAchievementCount(achievements.length);
      setTopPlayers(leaderboard);
      setOnlineCount(online);
      setUnreadCount(unread);
    } catch (error) {
      console.error('加载社交数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl float-gentle">👫</span> 社交与排行
          </h1>
          <p className="text-muted-foreground">添加好友、查看排行榜、分享成就 🌟</p>
        </div>

        {/* 快速统计 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Link to="/social/friends">
            <Card className="text-center hover:shadow-md transition-all cursor-pointer card-kid">
              <CardContent className="pt-6">
                <span className="text-2xl">👫</span>
                <p className="text-xl font-bold">{friendCount}</p>
                <p className="text-xs text-muted-foreground">好友</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/social/leaderboard">
            <Card className="text-center hover:shadow-md transition-all cursor-pointer card-kid">
              <CardContent className="pt-6">
                <span className="text-2xl">🏆</span>
                <p className="text-xl font-bold">{getRankInfo(profile?.rating ?? 0).label}</p>
                <p className="text-xs text-muted-foreground">我的段位</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/social/achievements">
            <Card className="text-center hover:shadow-md transition-all cursor-pointer card-kid">
              <CardContent className="pt-6">
                <span className="text-2xl">🏅</span>
                <p className="text-xl font-bold">{achievementCount}</p>
                <p className="text-xs text-muted-foreground">已获成就</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 功能入口 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Link to="/social/lobby">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105 card-kid bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-200">
              <CardHeader>
                <span className="text-4xl mb-3 kid-bounce">🌐</span>
                <CardTitle>大厅</CardTitle>
                <CardDescription>查看在线用户</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                    {onlineCount}人在线
                  </Badge>
                  <Button size="sm" className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500">进入</Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/social/messages">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105 card-kid bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-200">
              <CardHeader>
                <span className="text-4xl mb-3 kid-bounce">💬</span>
                <CardTitle>私信</CardTitle>
                <CardDescription>与好友聊天</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {unreadCount > 0 ? (
                    <Badge variant="destructive">{unreadCount}条未读</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">暂无未读</Badge>
                  )}
                  <Button size="sm" className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500">查看</Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/social/community">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105 card-kid bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200">
              <CardHeader>
                <span className="text-4xl mb-3 kid-bounce">📝</span>
                <CardTitle>社区</CardTitle>
                <CardDescription>交流围棋心得</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <BookOpen className="w-3 h-3 mr-1" />
                    帖子广场
                  </Badge>
                  <Button size="sm" className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">发帖</Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/social/friends">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105 card-kid">
              <CardHeader>
                <span className="text-4xl mb-3 kid-bounce">👫</span>
                <CardTitle>好友</CardTitle>
                <CardDescription>管理好友列表</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {friendCount}位好友
                  </Badge>
                  <Button size="sm" variant="outline">管理</Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 排行榜入口 */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Link to="/social/leaderboard">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105 card-kid">
              <CardHeader>
                <span className="text-4xl mb-3 kid-bounce">🏆</span>
                <CardTitle>排行榜</CardTitle>
                <CardDescription>查看积分排名</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500">🥇 查看排行</Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/social/achievements">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105 card-kid">
              <CardHeader>
                <span className="text-4xl mb-3 kid-bounce">⭐</span>
                <CardTitle>成就徽章</CardTitle>
                <CardDescription>查看已获得的成就</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-500">🎖️ 查看成就</Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 排行榜预览 */}
        {topPlayers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> 排行榜 TOP3
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPlayers.map((player, i) => {
                  const rankInfo = getRankInfo(player.rating);
                  return (
                    <div key={player.id} className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{player.nickname || player.username}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {rankInfo.icon} {rankInfo.label}
                      </Badge>
                      <span className="text-sm font-bold text-primary">{player.rating}</span>
                    </div>
                  );
                })}
              </div>
              <Link to="/social/leaderboard">
                <Button variant="outline" className="w-full mt-4">查看完整排行榜</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
