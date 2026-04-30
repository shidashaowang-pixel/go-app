import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import { Menu, Home, BookOpen, Swords, Users, User, GraduationCap, Eye, MessageCircle, UsersRound, Building2, Wallet } from 'lucide-react';
import { getTotalUnreadCount, getUserCoins } from '@/db/api';

interface LayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);

  // 加载未读消息数和金币数
  useEffect(() => {
    if (user) {
      getTotalUnreadCount(user.id).then(setUnreadCount);
      getUserCoins(user.id).then(data => setCoinBalance(data?.balance || 0));
      // 每30秒刷新一次
      const interval = setInterval(() => {
        getTotalUnreadCount(user.id).then(setUnreadCount);
        getUserCoins(user.id).then(data => setCoinBalance(data?.balance || 0));
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const navItems = [
    { path: '/', label: '首页', icon: Home, emoji: '🏠', roles: ['child', 'parent', 'teacher'] },
    { path: '/parent', label: '家长中心', icon: Eye, emoji: '👨‍👩‍👧', roles: ['parent'] },
    { path: '/learn', label: '学习中心', icon: BookOpen, emoji: '📚', roles: ['child', 'parent'] },
    { path: '/game', label: '对弈中心', icon: Swords, emoji: '⚔️', roles: ['child', 'parent'] },
    { path: '/social', label: '社交中心', icon: Users, emoji: '👫', roles: ['child', 'parent'] },
    { path: '/profile', label: '个人中心', icon: User, emoji: '👤', roles: ['child', 'parent', 'teacher'] },
    { path: '/teacher', label: '教学管理', icon: GraduationCap, emoji: '🎓', roles: ['teacher'] },
  ];

  // 新功能快捷入口 - 显示在顶部导航
  const quickLinks = [
    { path: '/social/lobby', label: '大厅', icon: UsersRound, emoji: '🌐' },
    { path: '/social/clubs', label: '棋社', icon: Building2, emoji: '🏛️' },
    { path: '/social/messages', label: '私信', icon: MessageCircle, emoji: '💬', badge: unreadCount > 0 ? unreadCount : undefined },
    { path: '/social/community', label: '社区', icon: Users, emoji: '📝' },
    { path: '/social/wallet', label: `${coinBalance.toLocaleString()} 💰`, icon: Wallet, emoji: '💰', isCoin: true },
  ];

  const filteredNavItems = navItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <nav className="flex flex-col gap-2 mt-8">
                  {filteredNavItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path}>
                        <Button
                          variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                          className="w-full justify-start"
                        >
                          <span className="mr-2">{item.emoji}</span>
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                  <div className="border-t my-2" />
                  <p className="text-xs text-muted-foreground px-3 mb-1">快捷入口</p>
                  {quickLinks.map(item => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path}>
                        <Button
                          variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                          className="w-full justify-start"
                        >
                          <span className="mr-2">{item.emoji}</span>
                          {item.label}
                          {item.badge && (
                            <Badge variant="destructive" className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl kid-bounce">🐼</span>
              <span className="text-xl font-bold gradient-text">少儿围棋</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {filteredNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                      size="sm"
                    >
                      <span className="mr-1.5">{item.emoji}</span>
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* 新功能快捷入口 - 始终显示 */}
            <nav className="hidden md:flex items-center gap-1">
              {quickLinks.map(item => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={item.isCoin ? 'secondary' : location.pathname === item.path ? 'secondary' : 'outline'}
                      size="sm"
                      className={item.isCoin ? 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/50 text-yellow-700' : 'border-primary/50'}
                    >
                      <Icon className={`h-4 w-4 ${item.isCoin ? 'text-yellow-600' : ''}`} />
                      <span className="ml-1.5">{item.label}</span>
                      {item.badge && !item.isCoin && (
                        <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {profile && (
              <>
                <span className="text-sm text-muted-foreground hidden md:inline">
                  {profile.nickname || profile.username}
                </span>
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  退出
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1">
        {children}
      </main>

      {/* 底部 */}
      <footer className="border-t border-border bg-card py-6">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          © 2026 少儿围棋学习平台. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
