import { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Users, Plus, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  code: string;
  teacher_id: string;
  created_at: string;
  expires_at?: string;
  max_uses?: number;
  used_count: number;
  is_active: boolean;
}

export default function InviteStudents() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [classCode, setClassCode] = useState('');

  // 生成邀请码
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 创建邀请码
  const createInvitation = async (type: 'single' | 'class') => {
    if (!user) return;
    setLoading(true);
    
    try {
      const code = generateInviteCode();
      
      // 由于数据库表可能不存在，先使用本地存储模拟
      const newInvitation: Invitation = {
        id: Math.random().toString(36).substr(2, 9),
        code,
        teacher_id: user.id,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天有效期
        max_uses: type === 'single' ? 1 : 10,
        used_count: 0,
        is_active: true
      };
      
      setInvitations(prev => [newInvitation, ...prev]);
      toast.success('邀请码创建成功', {
        description: `邀请码: ${code}`,
      });
    } catch (error) {
      console.error('创建邀请码失败:', error);
      toast.error('创建失败', {
        description: '请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  // 复制邀请码
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('已复制到剪贴板', {
      description: `邀请码: ${code}`,
    });
  };

  // 加入班级
  const joinClass = async () => {
    if (!user || !classCode.trim()) return;
    
    try {
      // 模拟加入班级操作（实际实现需要数据库表）
      toast.success('加入成功', {
        description: '已成功加入班级（模拟操作）',
      });
      setClassCode('');
    } catch (error) {
      console.error('加入班级失败:', error);
      toast.error('加入失败', {
        description: '请检查班级代码是否正确',
      });
    }
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">邀请学生</h1>
          <p className="text-muted-foreground">通过邀请码或班级代码邀请学生加入你的教学班级</p>
        </div>

        <Tabs defaultValue="invite" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">邀请学生</TabsTrigger>
            <TabsTrigger value="class">班级管理</TabsTrigger>
          </TabsList>

          {/* 邀请学生标签页 */}
          <TabsContent value="invite" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>创建邀请</CardTitle>
                <CardDescription>生成邀请码分享给学生，学生输入邀请码即可加入</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="font-semibold mb-2">单次邀请</h3>
                      <p className="text-sm text-muted-foreground mb-4">只能使用一次的邀请码</p>
                      <Button 
                        onClick={() => createInvitation('single')} 
                        disabled={loading}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        创建单次邀请
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Share2 className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                      <h3 className="font-semibold mb-2">班级邀请</h3>
                      <p className="text-sm text-muted-foreground mb-4">可多次使用的班级邀请码</p>
                      <Button 
                        onClick={() => createInvitation('class')} 
                        disabled={loading}
                        className="w-full"
                        variant="outline"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        创建班级邀请
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* 邀请链接示例 */}
                <Card>
                  <CardHeader>
                    <CardTitle>邀请链接示例</CardTitle>
                    <CardDescription>分享以下格式的链接给学生</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4 text-sm">
                      <p className="font-mono">https://goapp.com/join?code=ABCD1234</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      学生访问此链接并输入邀请码即可加入你的班级
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* 现有邀请列表 */}
            <Card>
              <CardHeader>
                <CardTitle>我的邀请码</CardTitle>
                <CardDescription>已创建的邀请码列表</CardDescription>
              </CardHeader>
              <CardContent>
                {invitations.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">还没有创建邀请码</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invitations.map(invite => (
                      <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="font-mono font-bold text-lg">{invite.code}</div>
                          <Badge variant={invite.is_active ? 'default' : 'secondary'}>
                            {invite.is_active ? '有效' : '已失效'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            已使用 {invite.used_count}/{invite.max_uses || '无限'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(invite.code)}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          复制
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 班级管理标签页 */}
          <TabsContent value="class" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>加入班级</CardTitle>
                <CardDescription>输入班级代码加入其他教师的班级（仅限教师身份）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="请输入班级代码"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Button onClick={joinClass} disabled={!classCode.trim()}>
                    加入班级
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>创建新班级</CardTitle>
                <CardDescription>创建独立的班级来更好地管理学生</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">班级名称</label>
                      <Input placeholder="例如：围棋入门班" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">班级代码（可选）</label>
                      <Input placeholder="自动生成或自定义" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">班级描述</label>
                    <textarea 
                      placeholder="描述班级的教学目标和内容" 
                      className="mt-1 w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    创建班级
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}