import { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { searchUsers, addFriend } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/types';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function Friends() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const results = await searchUsers(searchQuery);
    setSearchResults(results);
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user) return;
    try {
      await addFriend(user.id, friendId);
      toast.success('好友请求已发送');
    } catch (error) {
      toast.error('添加好友失败');
    }
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">好友列表</h1>
          <p className="text-muted-foreground">搜索并添加好友</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
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
                      <Button size="sm" onClick={() => handleAddFriend(profile.id)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        添加好友
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>我的好友</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">暂无好友</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
