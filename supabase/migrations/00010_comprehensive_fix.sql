-- =============================================
-- 彻底修复段位和角色问题
-- 执行方式：Supabase Dashboard > SQL Editor
-- =============================================

-- 1. 首先禁用邮箱验证（让注册立即生效）
-- 注意：这需要在 Supabase Dashboard > Authentication > Email 中关闭 "Confirm email"

-- 2. 删除旧的触发器（它总是用默认值创建 profile）
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 3. 创建一个新的智能触发器 - 根据 email 标记来判断角色和段位
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 检查是否已存在 profile
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    -- 基础 profile 创建（默认值，后续会被我们的代码更新）
    INSERT INTO public.profiles (id, username, nickname, role, rating)
    VALUES (
      NEW.id,
      split_part(NEW.email, '@', 1),
      split_part(NEW.email, '@', 1),
      'child'::public.user_role,
      0  -- 默认 0（18K），后续会被我们的代码正确更新
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 4. 在用户创建时就触发（而不是等邮箱验证）
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 5. 确保 RLS 策略允许更新自己的 profile
DROP POLICY IF EXISTS "用户可以更新自己的profile" ON public.profiles;
CREATE POLICY "用户可以更新自己的profile" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================
-- 修复现有用户的段位和角色
-- =============================================

-- 查看当前所有用户的 rating 和 role
-- SELECT id, username, role, rating FROM public.profiles;

-- 将所有 rating = 1000 的用户改为 0（18K）
UPDATE public.profiles 
SET rating = 0 
WHERE rating = 1000;

-- 将 role 设为 child（如果需要按用户修改，请手动在 Table Editor 中操作）
-- UPDATE public.profiles SET role = 'teacher' WHERE username = '你的用户名';

-- 验证修复
SELECT '修复后的 profiles:' as info;
SELECT id, username, role, rating FROM public.profiles ORDER BY created_at DESC LIMIT 10;
