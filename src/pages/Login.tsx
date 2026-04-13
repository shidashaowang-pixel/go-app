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

  // 登录表单
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // 注册表单
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'child' as UserRole
  });

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

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    if (!agreed) {
      toast.error('请阅读并同意用户协议和隐私政策');
      return;
    }

    setLoading(true);
    const { error } = await signUpWithUsername(
      registerForm.username,
      registerForm.password,
      registerForm.role
    );
    setLoading(false);

    if (error) {
      toast.error('注册失败：' + error.message);
    } else {
      toast.success('注册成功，请登录');
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl gradient-text">少儿围棋学习平台</CardTitle>
          <CardDescription>开启围棋学习之旅</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '登录中...' : '登录'}
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
                      <SelectItem value="child">儿童</SelectItem>
                      <SelectItem value="parent">家长</SelectItem>
                      <SelectItem value="teacher">围棋教学者</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    我已阅读并同意<span className="text-primary">用户协议</span>和<span className="text-primary">隐私政策</span>
                  </label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '注册中...' : '注册'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
