import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { searchUsers, addFriend, getFriends, removeFriend, createGame, getPendingFriendRequests, acceptFriendRequest, rejectFriendRequest, getOrCreateConversation } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/types';
import { Search, UserPlus, UserMinus, Swords, Circle, Loader2, Bell, Check, X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { playHintSound } from '@/lib/sounds';

export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadFriends();
      loadPendingRequests();
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    try {
      const data = await getFriends(user.id);
      setFriends(data);
    } catch (error) {
      console.error('加载好友列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    if (!user) return;
    try {
      const data = await getPendingFriendRequests(user.id);
      setPendingRequests(data);
    } catch (error) {
      console.error('加载待处理请求失败:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const results = await searchUsers(searchQuery);
    setSearchResults(results.filter(p => p.id !== user?.id));
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user) return;
    try {
      await addFriend(user.id, friendId);
      playHintSound();
      toast.success('🎉 好友请求已发送');
      // 重新加载好友请求列表
      loadPendingRequests();
    } catch (error: any) {
      const message = error?.message || '';
      if (message.includes('已经是好友了')) {
        toast.error('你们已经是好友了');
      } else if (message.includes('已发送过好友请求')) {
        toast.error('已发送过好友请求，请等待对方确认');
      } else if (message.includes('already exists') || message.includes('duplicate')) {
        toast.error('该用户已是好友或请求已存在');
      } else {
        toast.error('添加好友失败');
      }
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    try {
      await removeFriend(user.id, friendId);
      setFriends(prev => prev.filter(f => f.id !== friendId));
      toast.success('已移除好友');
    } catch (error) {
      toast.error('移除好友失败');
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    if (!user) return;
    setProcessingId(requesterId);
    try {
      await acceptFriendRequest(user.id, requesterId);
      playHintSound();
      toast.success('已接受好友请求！');
      // 从待处理列表移到好友列表
      const accepted = pendingRequests.find(p => p.id === requesterId);
      if (accepted) {
        setPendingRequests(prev => prev.filter(p => p.id !== requesterId));
        setFriends(prev => [...prev, accepted]);
      } else {
        loadPendingRequests();
        loadFriends();
      }
    } catch (error) {
      toast.error('接受请求失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requesterId: string) => {
    if (!user) return;
    setProcessingId(requesterId);
    try {
      await rejectFriendRequest(user.id, requesterId);
      toast.success('已拒绝好友请求');
      setPendingRequests(prev => prev.filter(p => p.id !== requesterId));
    } catch (error) {
      toast.error('拒绝请求失败');
    } finally {
      setProcessingId(null);
    }
  };

  // 发私信：创建会话并跳转到私信页面
  const handleSendMessage = async (friendId: string) => {
    if (!user) return;
    try {
      const conv = await getOrCreateConversation(user.id, friendId);
      navigate(`/social/messages?conv=${conv.id}`);
    } catch (error) {
      toast.error('发起私信失败');
    }
  };

  // 对弈邀请：创建一局游戏并导航到对弈页面
  const handleInviteGame = async (friendId: string) => {
    if (!user) return;
    setInvitingId(friendId);
    try {
      const game = await createGame({
        type: 'human',
        status: 'ongoing',
        result: null,
        black_player_id: user.id,
        white_player_id: friendId,
        ai_difficulty: null,
        board_size: 9,
        moves: [],
        end_type: null,
        score_detail: null,
        black_captures: 0,
        white_captures: 0,
        move_count: 0,
        duration_seconds: null,
      });
      toast.success('对弈邀请已发送！进入对弈...');
      navigate('/game/human');
    } catch (error) {
      toast.error('邀请对弈失败');
    } finally {
      setInvitingId(null);
    }
  };

  const isAlreadyFriend = (profileId: string) => {
    return friends.some(f => f.id === profileId);
  };

  // 判断在线状态：5分钟内更新过视为在线
  const isOnline = (profile: Profile) => {
    if (!profile.updated_at) return false;
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    return new Date(profile.updated_at).getTime() > fiveMinAgo;
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl float-gentle">👫</span> 好友列表
          </h1>
          <p className="text-muted-foreground">搜索并添加好友，发起对弈 🎮</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* 搜索用户 */}
          <Card>
            <CardHeader>
              <CardTitle>搜索用户</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="输入用户名搜索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{profile.nickname?.[0] || profile.username[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile.nickname || profile.username}</p>
                          <p className="text-sm text-muted-foreground">积分: {profile.rating}</p>
                        </div>
                      </div>
                      {isAlreadyFriend(profile.id) ? (
                        <Badge variant="secondary">已是好友</Badge>
                      ) : (
                        <Button size="sm" onClick={() => handleAddFriend(profile.id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          添加好友
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 好友管理标签页 */}
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="requests" className="relative">
                <Bell className="h-4 w-4 mr-2" />
                好友请求
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="friends">
                <span className="mr-2">👥</span>
                我的好友
                <Badge variant="secondary" className="ml-2">{friends.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* 待处理好友请求 */}
            <TabsContent value="requests" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-500" />
                    好友请求
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">暂无待处理的好友请求</p>
                      <p className="text-sm text-muted-foreground mt-1">搜索用户并添加好友吧！</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests.map((requester) => (
                        <div key={requester.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={requester.avatar_url || undefined} alt={requester.nickname || requester.username} />
                              <AvatarFallback>{requester.nickname?.[0] || requester.username[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{requester.nickname || requester.username}</p>
                              <p className="text-sm text-muted-foreground">想加你为好友</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAcceptRequest(requester.id)}
                              disabled={processingId === requester.id}
                            >
                              {processingId === requester.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  接受
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectRequest(requester.id)}
                              disabled={processingId === requester.id}
                            >
                              <X className="h-4 w-4 mr-1" />
                              拒绝
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 我的好友 */}
            <TabsContent value="friends" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    我的好友
                    <Badge variant="secondary">{friends.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">暂无好友</p>
                  <p className="text-sm text-muted-foreground">搜索用户名来添加好友吧！</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => {
                    const online = isOnline(friend);
                    return (
                      <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar>
                              <AvatarImage src={friend.avatar_url || undefined} alt={friend.nickname || friend.username} />
                              <AvatarFallback>{friend.nickname?.[0] || friend.username[0]}</AvatarFallback>
                            </Avatar>
                            <Circle
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${
                                online ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-medium">{friend.nickname || friend.username}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {friend.role === 'child' ? '小棋手' : friend.role === 'teacher' ? '老师' : '家长'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">积分: {friend.rating}</span>
                              <span className={`text-xs ${online ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {online ? '在线' : '离线'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendMessage(friend.id)}
                          >
                            <MessageCircle className="mr-1 h-3 w-3" />
                            私信
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInviteGame(friend.id)}
                            disabled={invitingId === friend.id || !online}
                          >
                            {invitingId === friend.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Swords className="mr-1 h-3 w-3" />
                            )}
                            对弈
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemoveFriend(friend.id)}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
