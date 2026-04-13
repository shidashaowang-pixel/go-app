import { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/db/api';
import { toast } from 'sonner';

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      await updateProfile(profile.id, { nickname });
      await refreshProfile();
      toast.success('保存成功');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">账号设置</h1>
          <p className="text-muted-foreground">修改个人信息</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl">
                    {profile?.nickname?.[0] || profile?.username[0]}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" onClick={() => {}}>更换头像</Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input id="username" value={profile?.username} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname">昵称</Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="请输入昵称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">角色</Label>
                <Input id="role" value={profile?.role} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating">积分</Label>
                <Input id="rating" value={profile?.rating} disabled />
              </div>

              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? '保存中...' : '保存修改'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>修改密码</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old-password">当前密码</Label>
                <Input id="old-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input id="new-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认新密码</Label>
                <Input id="confirm-password" type="password" />
              </div>

              <Button className="w-full" onClick={() => {}}>修改密码</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
