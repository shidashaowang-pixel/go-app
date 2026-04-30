import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { UserRole } from '@/types/types';

export default function Login() {
  const navigate = useNavigate();
  const { signInWithUsername, signUpWithUsername } = useAuth();
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  // 登录表单
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // 注册表单
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'child' as UserRole,
    initialRank: '18K' as string,
    parentUsername: '', // 家长用户名（可选）
  });

  // 段位列表：18K ~ 3D
  const RANK_OPTIONS = [
    { label: '18K', rating: 0, desc: '完全不会' },
    { label: '17K', rating: 50, desc: '刚入门' },
    { label: '16K', rating: 100, desc: '了解基本规则' },
    { label: '15K', rating: 150, desc: '会简单对弈' },
    { label: '14K', rating: 200, desc: '掌握吃子' },
    { label: '13K', rating: 250, desc: '会做活' },
    { label: '12K', rating: 300, desc: '理解死活' },
    { label: '11K', rating: 360, desc: '掌握基本手筋' },
    { label: '10K', rating: 420, desc: '会基本定式' },
    { label: '9K',  rating: 480, desc: '理解布局' },
    { label: '8K',  rating: 540, desc: '中盘有一定判断' },
    { label: '7K',  rating: 600, desc: '官子入门' },
    { label: '6K',  rating: 660, desc: '综合能力提升' },
    { label: '5K',  rating: 720, desc: '有比赛经验' },
    { label: '4K',  rating: 780, desc: '理解厚薄' },
    { label: '3K',  rating: 820, desc: '对杀判断准确' },
    { label: '2K',  rating: 860, desc: '接近初段' },
    { label: '1K',  rating: 900, desc: '准初段水平' },
    { label: '1D',  rating: 950, desc: '业余初段' },
    { label: '2D',  rating: 1050, desc: '业余2段' },
    { label: '3D',  rating: 1150, desc: '业余3段' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      toast.error('请填写用户名和密码');
      return;
    }

    setLoading(true);
    const { error } = await signInWithUsername(loginForm.username, loginForm.password);
    setLoading(false);

    if (error) {
      toast.error('登录失败：' + error.message);
    } else {
      toast.success('登录成功');
      navigate('/');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.username || !registerForm.password) {
      toast.error('请填写用户名和密码');
      return;
    }

    // 验证用户名格式（只能包含英文字母、数字和下划线）
    const username = registerForm.username.trim();
    if (username.includes('@')) {
      toast.error('用户名不能包含@符号');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error('用户名只能包含字母、数字和下划线（不支持中文）');
      return;
    }
    if (username.length < 2) {
      toast.error('用户名至少需要2个字符');
      return;
    }
    if (username.length > 20) {
      toast.error('用户名不能超过20个字符');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    if (!agreed) {
      toast.error('请阅读并同意用户协议和隐私政策');
      return;
    }

    setLoading(true);
    
    // 显示注册进度提示
    toast.loading('正在创建账户...', { id: 'register-toast' });
    
    const selectedRank = RANK_OPTIONS.find(r => r.label === registerForm.initialRank);
    const initialRating = selectedRank?.rating ?? 0;
    const { error } = await signUpWithUsername(
      username,
      registerForm.password,
      registerForm.role,
      initialRating,
      registerForm.parentUsername.trim() || undefined
    );
    setLoading(false);

    if (error) {
      // 关闭loading toast
      toast.dismiss('register-toast');
      
      // 提供更友好的错误提示
      let friendlyMessage = error.message;
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        friendlyMessage = '该用户名已注册，请直接登录或使用其他用户名';
      } else if (error.message.includes('Invalid email')) {
        friendlyMessage = '用户名格式不正确（不能包含@符号）';
      } else if (error.message.includes('Password should be at least')) {
        friendlyMessage = '密码太短，至少需要6个字符';
      } else if (error.message.includes('timeout') || error.message.includes('超时')) {
        friendlyMessage = '网络连接超时，请稍后重试';
      }
      toast.error('注册失败：' + friendlyMessage);
      console.error('注册错误详情:', error);
    } else {
      // 关闭loading toast
      toast.dismiss('register-toast');
      // 注册成功，提示用户
      toast.success('注册成功！即将自动登录...');
      // 自动切换到登录标签
      setTimeout(() => setActiveTab('login'), 500);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md card-kid shadow-xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-4xl kid-bounce">🐼</span>
            <span className="text-3xl float-gentle">⚫</span>
            <span className="text-3xl float-gentle" style={{ animationDelay: '0.5s' }}>⚪</span>
          </div>
          <CardTitle className="text-3xl gradient-text">少儿围棋学习平台</CardTitle>
          <CardDescription>🐼 开启围棋学习之旅 ✨</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">用户名</Label>
                  <Input
                    id="login-username"
                    placeholder="请输入用户名"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="请输入密码"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-700" disabled={loading}>
                  {loading ? '登录中...' : '🚀 登录'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">用户名</Label>
                  <Input
                    id="register-username"
                    placeholder="请输入用户名"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">密码</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="请输入密码"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">确认密码</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="请再次输入密码"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">角色</Label>
                  <Select
                    value={registerForm.role}
                    onValueChange={(value: UserRole) => setRegisterForm({ ...registerForm, role: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="child">👦 儿童</SelectItem>
                      <SelectItem value="parent">👨‍👩‍👧 家长</SelectItem>
                      <SelectItem value="teacher">🎓 围棋教学者</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial-rank">围棋水平（段位）</Label>
                  <Select
                    value={registerForm.initialRank}
                    onValueChange={(value) => setRegisterForm({ ...registerForm, initialRank: value })}
                  >
                    <SelectTrigger id="initial-rank">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {RANK_OPTIONS.map((rank) => (
                        <SelectItem key={rank.label} value={rank.label}>
                          {rank.label} — {rank.desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">选择你目前的围棋水平，后续会根据对弈自动调整</p>
                </div>

                {/* 选择儿童角色时显示家长用户名输入 */}
                {registerForm.role === 'child' && (
                  <div className="space-y-2">
                    <Label htmlFor="parent-username">家长用户名（选填）</Label>
                    <Input
                      id="parent-username"
                      placeholder="请输入已注册家长的用户名"
                      value={registerForm.parentUsername}
                      onChange={(e) => setRegisterForm({ ...registerForm, parentUsername: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">如果您的家长已注册账号，可以填写他们的用户名进行绑定</p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    我已阅读并同意<span className="text-primary">用户协议</span>和<span className="text-primary">隐私政策</span>
                  </label>
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700" disabled={loading}>
                  {loading ? '注册中...' : '🎮 注册'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
