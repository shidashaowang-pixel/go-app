import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getClub, getClubMembers, getClubAnnouncements, getClubPosts, createClubAnnouncement, createClubPost, leaveClub, getClubLeaderboard, type Club, type ClubMember, type ClubAnnouncement, type ClubPost } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Users, Megaphone, FileText, Trophy, ArrowLeft, LogOut, Loader2, Pin } from 'lucide-react';
import { toast } from 'sonner';

export default function ClubDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id, user]);

  const loadData = async () => {
    if (!user || !id) return;
    try {
      const [clubData, membersData, announcementsData, postsData, leaderboardData] = await Promise.all([
        getClub(id),
        getClubMembers(id),
        getClubAnnouncements(id),
        getClubPosts(id),
        getClubLeaderboard(id),
      ]);
      setClub(clubData);
      setMembers(membersData);
      setAnnouncements(announcementsData);
      setPosts(postsData);
      setLeaderboard(leaderboardData);

      // 检查是否是管理员
      const myMembership = membersData.find(m => m.user_id === user.id);
      setIsAdmin(myMembership?.role === 'owner' || myMembership?.role === 'admin');
    } catch (error) {
      console.error('加载棋社数据失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveClub = async () => {
    if (!user || !id || !confirm('确定要退出该棋社吗？')) return;
    const success = await leaveClub(user.id, id);
    if (success) {
      toast.success('已退出棋社');
      navigate('/social/clubs');
    } else {
      toast.error('退出失败，社长需要先转让棋社');
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!user || !id || !announcementTitle.trim() || !announcementContent.trim()) return;
    const result = await createClubAnnouncement(id, user.id, announcementTitle, announcementContent);
    if (result) {
      toast.success('公告发布成功');
      setShowAnnouncementModal(false);
      setAnnouncementTitle('');
      setAnnouncementContent('');
      loadData();
    } else {
      toast.error('发布失败');
    }
  };

  const handleCreatePost = async () => {
    if (!user || !id || !postContent.trim()) return;
    const result = await createClubPost(id, user.id, postContent, postTitle || undefined);
    if (result) {
      toast.success('发布成功');
      setShowPostModal(false);
      setPostTitle('');
      setPostContent('');
      loadData();
    } else {
      toast.error('发布失败');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!club) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">棋社不存在或你还没有加入</p>
          <Button className="mt-4" onClick={() => navigate('/social/clubs')}>
            返回棋社列表
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        {/* 返回按钮 */}
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/social/clubs')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回棋社列表
        </Button>

        {/* 棋社信息头 */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500" />
          <CardContent className="relative -mt-12">
            <div className="flex items-end gap-4">
              <Avatar className="w-24 h-24 border-4 border-background bg-gradient-to-br from-blue-500 to-purple-500">
                <AvatarFallback className="text-3xl text-white">{club.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-2">
                <h1 className="text-2xl font-bold">{club.name}</h1>
                <p className="text-muted-foreground">{club.description || '暂无简介'}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="secondary">
                    <Users className="w-3 h-3 mr-1" />
                    {club.member_count} 名成员
                  </Badge>
                  <Badge variant="outline">
                    <Trophy className="w-3 h-3 mr-1" />
                    {club.total_games} 局对弈
                  </Badge>
                </div>
              </div>
              <div className="pb-2">
                <Button variant="outline" onClick={handleLeaveClub}>
                  <LogOut className="w-4 h-4 mr-2" />
                  退出棋社
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 标签页 */}
        <Tabs defaultValue="announcements" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="announcements" className="flex items-center gap-1">
              <Megaphone className="w-4 h-4" />
              公告
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              动态
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              成员
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              排行榜
            </TabsTrigger>
          </TabsList>

          {/* 公告 */}
          <TabsContent value="announcements">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>公告</CardTitle>
                {isAdmin && (
                  <Button size="sm" onClick={() => setShowAnnouncementModal(true)}>
                    发布公告
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {announcements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无公告</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((ann) => (
                      <div key={ann.id} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          {ann.is_pinned && <Pin className="w-4 h-4 text-primary mt-1" />}
                          <div className="flex-1">
                            <h4 className="font-medium">{ann.title}</h4>
                            <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{ann.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <span>{ann.author?.nickname || ann.author?.username}</span>
                              <span>·</span>
                              <span>{formatDate(ann.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 动态 */}
          <TabsContent value="posts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>社内动态</CardTitle>
                <Button size="sm" onClick={() => setShowPostModal(true)}>
                  发布动态
                </Button>
              </CardHeader>
              <CardContent>
                {posts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无动态</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div key={post.id} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarImage src={post.author?.avatar_url} />
                            <AvatarFallback>{post.author?.nickname?.[0] || post.author?.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            {post.title && <h4 className="font-medium">{post.title}</h4>}
                            <p className="mt-1 whitespace-pre-wrap">{post.content}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>{post.author?.nickname || post.author?.username}</span>
                              <span>·</span>
                              <span>{formatDate(post.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 成员 */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>成员列表 ({members.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Avatar>
                        <AvatarImage src={member.profile?.avatar_url} />
                        <AvatarFallback>
                          {member.profile?.nickname?.[0] || member.profile?.username?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {member.profile?.nickname || member.profile?.username}
                          </span>
                          {member.role === 'owner' && (
                            <Badge className="bg-yellow-500">
                              <Crown className="w-3 h-3 mr-1" />
                              社长
                            </Badge>
                          )}
                          {member.role === 'admin' && (
                            <Badge variant="secondary">管理员</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          参与 {member.join_games} 局对弈 · 加入于 {formatDate(member.joined_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 排行榜 */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle>社内排行榜</CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无排行数据</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((entry, index) => (
                      <div key={entry.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-muted'
                        }`}>
                          {index + 1}
                        </div>
                        <Avatar>
                          <AvatarImage src={entry.profile?.avatar_url} />
                          <AvatarFallback>
                            {entry.profile?.nickname?.[0] || entry.profile?.username?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <span className="font-medium">
                            {entry.profile?.nickname || entry.profile?.username}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{entry.rating}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.wins}胜 {entry.losses}负 ({entry.win_rate?.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 发布公告弹窗 */}
        {showAnnouncementModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAnnouncementModal(false)}>
            <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>发布公告</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">标题</label>
                  <Input
                    placeholder="公告标题"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">内容</label>
                  <textarea
                    className="w-full p-3 border rounded-lg bg-background min-h-[150px] resize-none"
                    placeholder="公告内容..."
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAnnouncementModal(false)}>取消</Button>
                  <Button onClick={handleCreateAnnouncement} disabled={!announcementTitle.trim() || !announcementContent.trim()}>
                    发布
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 发布动态弹窗 */}
        {showPostModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPostModal(false)}>
            <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>发布动态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">标题（可选）</label>
                  <Input
                    placeholder="动态标题"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">内容</label>
                  <textarea
                    className="w-full p-3 border rounded-lg bg-background min-h-[150px] resize-none"
                    placeholder="分享你的想法..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowPostModal(false)}>取消</Button>
                  <Button onClick={handleCreatePost} disabled={!postContent.trim()}>
                    发布
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
