-- =============================================
-- 修复段位显示和排行榜问题
-- 执行方式：在 Supabase Dashboard > SQL Editor 中运行
-- =============================================

-- 1. 修改 profiles 表的 rating 默认值为 0（18K 起点）
ALTER TABLE public.profiles ALTER COLUMN rating SET DEFAULT 0;

-- 2. 修改触发器，在用户创建时就创建 profile（而不是等邮箱验证）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 检查是否已存在 profile
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, username, nickname, role, rating)
    VALUES (
      NEW.id,
      split_part(NEW.email, '@', 1),
      split_part(NEW.email, '@', 1),
      'child'::public.user_role,
      0
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3. 修改触发器：在用户创建时就触发（而不是等邮箱验证）
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 4. 确保排行榜查询的 RLS 策略正确
DROP POLICY IF EXISTS "用户可以查看所有profiles" ON public.profiles;
CREATE POLICY "用户可以查看所有profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 5. 添加匿名用户也可查看公开 profiles 的策略（用于排行榜）
DROP POLICY IF EXISTS "公开profiles查询" ON public.profiles;
CREATE POLICY "公开profiles查询" ON public.profiles
  FOR SELECT TO anon USING (true);

-- =============================================
-- 修复已存在用户的段位问题
-- 根据 email 中的用户名匹配 profiles 并设置 rating 为 0（18K）
-- =============================================
UPDATE public.profiles 
SET rating = 0, role = 'child'
WHERE username LIKE '%@%' OR rating = 1000;
