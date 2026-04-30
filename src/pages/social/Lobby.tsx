import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { getOnlineUsers, getOrCreateConversation } from '@/db/api';
import type { Profile } from '@/types/types';
import {
  ArrowLeft,
  Users,
  Search,
  Swords,
  MessageCircle,
  RefreshCw,
  Circle,
  Trophy,
  Loader2,
  Crown,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { getRankInfo } from '@/pages/Home';

export default function Lobby() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    // 每30秒刷新一次
    const interval = setInterval(loadUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const online = await getOnlineUsers();
    setOnlineUsers(online.filter(u => u.id !== user?.id));
    // 也加载所有用户用于搜索
    const { data } = await import('@/db/supabase').then(m => m.supabase
      .from('profiles')
      .select('*')
      .order('rating', { ascending: false })
      .limit(100)
    );
    setAllUsers((data || []).filter(u => u.id !== user?.id));
    setLoading(false);
  };

  const handleInviteGame = (targetUserId: string) => {
    navigate(`/game/human?invite=${targetUserId}`);
  };

  const handleSendMessage = async (targetUserId: string) => {
    if (!user) return;
    setMessagingId(targetUserId);
    const conv = await getOrCreateConversation(user.id, targetUserId);
    if (conv) {
      navigate('/social/messages');
    } else {
      toast.error('创建会话失败');
    }
    setMessagingId(null);
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!user) return;
    setAddingFriendId(targetUserId);
    const { addFriend } = await import('@/db/api');
    try {
      await addFriend(user.id, targetUserId);
      toast.success('好友请求已发送！');
    } catch {
      toast.error('添加好友失败');
    }
    setAddingFriendId(null);
  };

  const filteredOnlineUsers = onlineUsers.filter(u =>
    u.nickname?.includes(searchQuery) || u.username.includes(searchQuery)
  );

  const filteredAllUsers = allUsers.filter(u =>
    u.nickname?.includes(searchQuery) || u.username.includes(searchQuery)
  );

  const isOnline = (u: Profile) =>
    new Date(u.updated_at).getTime() > Date.now() - 5 * 60 * 1000;

  const renderUserCard = (u: Profile, online: boolean) => {
    const rankInfo = getRankInfo(u.rating);
    return (
      <Card key={u.id} className="border-0 shadow-md hover:shadow-lg transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-14 w-14">
                <AvatarImage src={u.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {u.nickname?.[0] || u.username[0]}
                </AvatarFallback>
              </Avatar>
              <Circle
                className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 ${
                  online ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {u.nickname || u.username}
                </p>
                {u.role === 'teacher' && (
                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                    <Crown className="h-3 w-3 mr-1" />
                    老师
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {rankInfo.icon} {rankInfo.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {u.rating}积分
                </span>
              </div>
              <p className={`text-xs mt-1 ${online ? 'text-green-600' : 'text-muted-foreground'}`}>
                {online ? '在线' : '离线'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {online && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                  onClick={() => handleInviteGame(u.id)}
                  disabled={invitingId === u.id}
                >
                  {invitingId === u.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Swords className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSendMessage(u.id)}
                disabled={messagingId === u.id}
              >
                {messagingId === u.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="hover:bg-blue-50 hover:text-blue-600"
                onClick={() => handleAddFriend(u.id)}
                disabled={addingFriendId === u.id}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                大厅
              </h1>
              <p className="text-sm text-muted-foreground">
                找到棋友，一起对弈讨论
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户名..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-4 text-center">
              <Circle className="h-6 w-6 mx-auto mb-2 fill-current" />
              <p className="text-2xl font-bold">{filteredOnlineUsers.length}</p>
              <p className="text-sm opacity-80">当前在线</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{filteredAllUsers.length}</p>
              <p className="text-sm opacity-80">棋手总数</p>
            </CardContent>
          </Card>
        </div>

        {/* 用户列表 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="online">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="online" className="flex-1">
                <Circle className="h-3 w-3 fill-green-500 text-green-500 mr-2" />
                在线 ({filteredOnlineUsers.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                全部棋手
              </TabsTrigger>
            </TabsList>

            <TabsContent value="online">
              {filteredOnlineUsers.length === 0 ? (
                <Card className="border-0 shadow-md">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Circle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>当前没有在线的棋手</p>
                    <p className="text-sm mt-1">邀请好友一起来吧！</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredOnlineUsers.map(u => renderUserCard(u, true))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all">
              {filteredAllUsers.length === 0 ? (
                <Card className="border-0 shadow-md">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>没有找到棋手</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredAllUsers.map(u => renderUserCard(u, isOnline(u)))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
