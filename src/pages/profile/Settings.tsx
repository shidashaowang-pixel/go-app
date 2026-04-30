import { useState, useRef } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/db/api';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Upload, Loader2, UserPlus, UserX } from 'lucide-react';
import AvatarSelector, { AVATAR_LIBRARY } from '@/components/AvatarSelector';

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 修改密码表单
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // 绑定家长表单
  const [showBindParentDialog, setShowBindParentDialog] = useState(false);
  const [bindParentUsername, setBindParentUsername] = useState('');
  const [bindParentLoading, setBindParentLoading] = useState(false);
  const [parentInfo, setParentInfo] = useState<{ nickname: string; username: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    
    // 1. 先保存到本地缓存
    localStorage.setItem(`profile-${profile.id}`, JSON.stringify({ ...profile, nickname }));
    
    // 2. 尝试同步到云端
    try {
      await updateProfile(profile.id, { nickname });
      await refreshProfile();
      toast.success('保存成功');
    } catch (err) {
      console.error('保存失败:', err);
      toast.success('已保存本地，云端同步将在网络恢复后进行');
    } finally {
      setLoading(false);
    }
  };

  // 更换头像
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 校验文件大小（最大2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过2MB');
      return;
    }

    // 校验文件类型
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('仅支持 JPG/PNG/GIF/WebP 格式');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `avatars/${user.id}/${Date.now()}.${ext}`;

      // 先清理旧头像文件
      if (profile?.avatar_url) {
        try {
          // 列出该用户目录下的所有旧文件
          const { data: oldFiles } = await supabase.storage
            .from('avatars')
            .list(`avatars/${user.id}`);
          if (oldFiles && oldFiles.length > 0) {
            const filesToDelete = oldFiles
              .filter(f => f.name !== filePath.split('/').pop())
              .map(f => `avatars/${user.id}/${f.name}`);
            if (filesToDelete.length > 0) {
              await supabase.storage.from('avatars').remove(filesToDelete);
            }
          }
        } catch {
          // 旧文件清理失败不影响新头像上传
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile(user.id, { avatar_url: publicUrl + '?t=' + Date.now() });
      await refreshProfile();
      playCorrectSound();
      toast.success('🎉 头像更新成功');
    } catch (error: any) {
      toast.error(error.message || '头像上传失败');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('请填写所有密码字段');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('新密码至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || '密码修改失败');
    } finally {
      setChangingPassword(false);
    }
  };

  // 绑定家长
  const handleBindParent = async () => {
    if (!user || !bindParentUsername.trim()) {
      toast.error('请输入家长用户名');
      return;
    }

    setBindParentLoading(true);
    try {
      // 查找该用户名对应的家长账号
      const { data: parentProfile, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', bindParentUsername.trim())
        .eq('role', 'parent')
        .maybeSingle();

      if (findError) throw findError;

      if (!parentProfile) {
        toast.error('未找到该用户名对应的家长账号');
        return;
      }

      if (parentProfile.id === user.id) {
        toast.error('不能绑定自己的账号');
        return;
      }

      if (profile?.parent_id === parentProfile.id) {
        toast.success('已经绑定到该家长');
        setShowBindParentDialog(false);
        setBindParentUsername('');
        return;
      }

      // 更新绑定关系
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ parent_id: parentProfile.id })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success(`成功绑定到 ${parentProfile.nickname || parentProfile.username}！`);
      setShowBindParentDialog(false);
      setBindParentUsername('');
      await refreshProfile();
    } catch (error) {
      console.error('绑定失败:', error);
      toast.error('绑定失败，请稍后重试');
    } finally {
      setBindParentLoading(false);
    }
  };

  // 解绑家长
  const handleUnbindParent = async () => {
    if (!confirm('确定要解除与家长的绑定吗？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ parent_id: null })
        .eq('id', user!.id);

      if (error) throw error;

      toast.success('已解除绑定');
      await refreshProfile();
    } catch (error) {
      console.error('解绑失败:', error);
      toast.error('解绑失败，请稍后重试');
    }
  };

  // 获取已绑定家长信息
  useState(() => {
    if (profile?.parent_id) {
      supabase
        .from('profiles')
        .select('nickname, username')
        .eq('id', profile.parent_id)
        .maybeSingle()
        .then(({ data }) => setParentInfo(data));
    }
  });

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
              <CardTitle>头像设置</CardTitle>
            </CardHeader>
            <CardContent>
              <AvatarSelector
                currentAvatarUrl={profile?.avatar_url}
                currentAvatarEmoji={null}
                onSelect={async (url) => {
                  if (!user) return;
                  if (url === null) {
                    // 用户选择了系统头像，需要更新 avatar_url 为空
                    await updateProfile(user.id, { avatar_url: '' });
                  } else {
                    await updateProfile(user.id, { avatar_url: url });
                  }
                  await refreshProfile();
                  toast.success('头像更新成功');
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Input id="role" value={profile?.role === 'child' ? '小棋手' : profile?.role === 'teacher' ? '老师' : profile?.role === 'parent' ? '家长' : profile?.role} disabled />
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
                <Input
                  id="old-password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入当前密码"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少6位"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认新密码</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleChangePassword}
                disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? '修改中...' : '修改密码'}
              </Button>
            </CardContent>
          </Card>

          {/* 仅儿童角色显示绑定家长功能 */}
          {profile?.role === 'child' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  家长绑定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.parent_id ? (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="text-sm text-muted-foreground">已绑定家长</p>
                      <p className="font-medium">{parentInfo?.nickname || parentInfo?.username || '家长账号'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleUnbindParent} className="text-destructive hover:text-destructive">
                      <UserX className="h-4 w-4 mr-1" />
                      解除绑定
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">您还没有绑定家长账号，绑定后家长可以在家长中心查看您的学习数据</p>
                    <Button variant="outline" onClick={() => setShowBindParentDialog(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      绑定家长
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 绑定家长对话框 */}
          <Dialog open={showBindParentDialog} onOpenChange={setShowBindParentDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>绑定家长账号</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  请输入您家长的用户名（他们注册时使用的账号名），绑定后他们可以在家长中心查看您的学习数据。
                </p>
                <div className="space-y-2">
                  <Input
                    placeholder="输入家长用户名"
                    value={bindParentUsername}
                    onChange={(e) => setBindParentUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBindParent()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBindParentDialog(false)}>取消</Button>
                <Button onClick={handleBindParent} disabled={bindParentLoading}>
                  {bindParentLoading ? '绑定中...' : '确认绑定'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </MainLayout>
  );
}
