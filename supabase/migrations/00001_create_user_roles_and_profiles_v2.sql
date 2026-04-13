-- 创建用户角色枚举
CREATE TYPE public.user_role AS ENUM ('child', 'parent', 'teacher');

-- 创建profiles表
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  nickname text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'child',
  parent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating integer DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建触发器函数：用户确认后自动同步到profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, role)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    split_part(NEW.email, '@', 1),
    'child'::public.user_role
  );
  RETURN NEW;
END;
$$;

-- 创建触发器
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- 创建辅助函数检查角色
CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = uid AND p.role = role_name::user_role
  );
$$;

-- 设置profiles表的RLS策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看所有profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "用户可以更新自己的profile" ON profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "教师可以查看所有profiles" ON profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'teacher'));

-- 创建公开视图
CREATE VIEW public_profiles AS
  SELECT id, username, nickname, avatar_url, role, rating
  FROM profiles;

-- 创建索引
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_parent_id ON profiles(parent_id);
CREATE INDEX idx_profiles_rating ON profiles(rating DESC);