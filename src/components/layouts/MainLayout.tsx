import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Home, BookOpen, Swords, Users, User, GraduationCap } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: '首页', icon: Home, roles: ['child', 'parent', 'teacher'] },
    { path: '/learn', label: '学习中心', icon: BookOpen, roles: ['child', 'parent'] },
    { path: '/game', label: '对弈中心', icon: Swords, roles: ['child', 'parent'] },
    { path: '/social', label: '社交排行', icon: Users, roles: ['child', 'parent'] },
    { path: '/profile', label: '个人中心', icon: User, roles: ['child', 'parent', 'teacher'] },
    { path: '/teacher', label: '教学管理', icon: GraduationCap, roles: ['teacher'] },
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
                          <Icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold gradient-text">少儿围棋</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {filteredNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                      size="sm"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
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
