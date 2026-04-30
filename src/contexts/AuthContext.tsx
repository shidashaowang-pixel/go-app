import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types/types';
import { toast } from 'sonner';

/** 更新用户在线状态（更新 updated_at） */
export async function updateOnlineStatus(userId: string) {
  try {
    await supabase
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    console.warn('更新在线状态失败:', error);
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
  return data;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string, role: UserRole, initialRating?: number, parentUsername?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  // 用户登录后定期更新在线状态
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    if (user) {
      // 立即更新一次
      updateOnlineStatus(user.id);
      // 每2分钟更新一次在线状态
      intervalId = setInterval(() => {
        updateOnlineStatus(user.id);
      }, 2 * 60 * 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    supabase
      .auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          getProfile(session.user.id).then(setProfile);
          // 登录时立即更新在线状态
          updateOnlineStatus(session.user.id);
        }
      })
      .catch(error => {
        toast.error(`获取用户信息失败: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
        // 登录时立即更新在线状态
        updateOnlineStatus(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      // 将用户名转换为有效的邮箱格式（Base64编码）
      const email = `${btoa(unescape(encodeURIComponent(username)))}@miaoda.com`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (username: string, password: string, role: UserRole, initialRating: number = 0, parentUsername?: string) => {
    try {
      // 将用户名转换为有效的邮箱格式（Base64编码）
      const email = `${btoa(unescape(encodeURIComponent(username)))}@miaoda.com`;
      
      // 添加超时控制，防止网络慢时一直等待
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('注册超时，请检查网络连接')), 15000);
      });

      // 注册用户
      const signupPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        },
      });

      const { data, error } = await Promise.race([signupPromise, timeoutPromise]);

      if (error) throw error;

      // 确保 profile 被创建并包含正确的 rating 和 role
      if (data.user) {
        console.log('注册成功，用户ID:', data.user.id, '选择的段位:', initialRating, '角色:', role);
        
        // 等待一小段时间确保触发器完成
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 查找家长ID（如果提供了家长用户名）
        let parentId: string | null = null;
        if (role === 'child' && parentUsername) {
          const { data: parentProfile, error: parentError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', parentUsername)
            .eq('role', 'parent')
            .maybeSingle();
          
          if (!parentError && parentProfile) {
            parentId = parentProfile.id;
            console.log('找到家长ID:', parentId);
          } else {
            console.warn('未找到家长账号:', parentUsername);
          }
        }
        
        // 直接更新 profile（触发器应该已经创建了基础 profile）
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            username: username,
            nickname: username,
            role,
            rating: initialRating,
            parent_id: parentId,
          })
          .eq('id', data.user.id);

        if (updateError) {
          console.error('Profile更新失败:', updateError);
          // 如果更新失败，尝试删除后重新插入
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', data.user.id);
          
          if (!deleteError) {
            // 重新插入正确的 profile
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                username: username,
                nickname: username,
                role,
                rating: initialRating,
                parent_id: parentId,
              });
            
            if (insertError) {
              console.error('Profile重新插入失败:', insertError);
            } else {
              console.log('Profile重新插入成功!');
            }
          }
        } else {
          console.log('Profile更新成功! rating:', initialRating, 'role:', role, 'parent_id:', parentId);
        }
        
        // 刷新 profile
        await refreshProfile();
      }

      return { error: null };
    } catch (error) {
      console.error('注册错误:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithUsername, signUpWithUsername, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
