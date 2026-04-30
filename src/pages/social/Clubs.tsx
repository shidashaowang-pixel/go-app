import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPublicClubs, getUserClubs, createClub, joinClub, type Club } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Crown, Loader2, LogIn, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Clubs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [publicClubs, setPublicClubs] = useState<Club[]>([]);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    loadClubs();
  }, [user]);

  const loadClubs = async () => {
    if (!user) return;
    try {
      const [publicData, myData] = await Promise.all([
        getPublicClubs(),
        getUserClubs(user.id),
      ]);
      setPublicClubs(publicData);
      setMyClubs(myData);
    } catch (error) {
      console.error('加载棋社列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async () => {
    if (!user || !newClubName.trim()) return;
    setCreating(true);
    try {
      const club = await createClub(user.id, newClubName.trim(), newClubDesc.trim());
      if (club) {
        toast.success('棋社创建成功！');
        setShowCreateModal(false);
        setNewClubName('');
        setNewClubDesc('');
        loadClubs();
        navigate(`/social/clubs/${club.id}`);
      }
    } catch (error) {
      toast.error('创建棋社失败');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinClub = async (clubId: string) => {
    if (!user) return;
    setJoiningId(clubId);
    try {
      const result = await joinClub(user.id, clubId);
      if (result.success) {
        toast.success(result.message);
        loadClubs();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('加入棋社失败');
    } finally {
      setJoiningId(null);
    }
  };

  const filteredPublicClubs = publicClubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isInClub = (clubId: string) => myClubs.some(c => c.id === clubId);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl float-gentle">🏛️</span> 棋社
            </h1>
            <p className="text-muted-foreground mt-1">加入或创建棋社，与志同道合的棋友交流</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建棋社
          </Button>
        </div>

        <Tabs defaultValue="my" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="my" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              我的棋社
              <Badge variant="secondary" className="ml-1">{myClubs.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="explore" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              发现棋社
            </TabsTrigger>
          </TabsList>

          {/* 我的棋社 */}
          <TabsContent value="my" className="space-y-4">
            {myClubs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-2">你还没有加入任何棋社</p>
                  <p className="text-sm text-muted-foreground mb-4">快去发现并加入感兴趣的棋社吧！</p>
                  <Button variant="outline" onClick={() => document.querySelector<HTMLElement>('[value="explore"]')?.click()}>
                    探索棋社
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myClubs.map((club) => (
                  <Card
                    key={club.id}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => navigate(`/social/clubs/${club.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={club.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {club.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{club.name}</h3>
                            <Crown className="w-4 h-4 text-yellow-500" />
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {club.description || '暂无描述'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              <Users className="w-3 h-3 mr-1" />
                              {club.member_count || 0} 人
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 发现棋社 */}
          <TabsContent value="explore" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索棋社..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredPublicClubs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">暂无棋社</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowCreateModal(true)}>
                    成为创始人
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPublicClubs.map((club) => (
                  <Card key={club.id} className="hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={club.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {club.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{club.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {club.description || '暂无描述'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              <Users className="w-3 h-3 mr-1" />
                              {club.member_count || 0} 人
                            </Badge>
                            {club.owner && (
                              <span className="text-xs text-muted-foreground">
                                社长: {club.owner.nickname || club.owner.username}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        {isInClub(club.id) ? (
                          <Button variant="outline" onClick={() => navigate(`/social/clubs/${club.id}`)}>
                            进入棋社
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleJoinClub(club.id)}
                            disabled={joiningId === club.id}
                          >
                            {joiningId === club.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <LogIn className="w-4 h-4 mr-1" />
                                加入
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 创建棋社弹窗 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>创建棋社</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">棋社名称</label>
                  <Input
                    placeholder="输入棋社名称"
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">棋社简介</label>
                  <textarea
                    className="w-full p-3 border rounded-lg bg-background min-h-[100px] resize-none"
                    placeholder="介绍一下你的棋社..."
                    value={newClubDesc}
                    onChange={(e) => setNewClubDesc(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateClub} disabled={creating || !newClubName.trim()}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : '创建'}
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
