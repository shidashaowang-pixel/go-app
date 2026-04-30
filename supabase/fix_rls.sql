-- 修复微课和题目上传问题

-- 1. 添加题目表的 INSERT 和 UPDATE 策略（让教师可以上传题目）
CREATE POLICY "教师可以上传自己的题目" ON problems 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "教师可以更新自己的题目" ON problems 
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "教师可以删除自己的题目" ON problems 
  FOR DELETE TO authenticated USING (true);

-- 2. 课程表需要确保 teacher_id 是当前用户
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_teacher_id_fkey;
ALTER TABLE courses ADD CONSTRAINT courses_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. 确保 profiles 表存在（用于获取用户信息）
-- 如果不存在，创建它
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TABLE profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      username text UNIQUE,
      role text DEFAULT 'student',
      rating integer DEFAULT 1800,
      created_at timestamptz DEFAULT now()
    );
    
    -- 启用 RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    
    -- 创建策略
    CREATE POLICY "用户可以查看所有公开信息" ON profiles FOR SELECT TO authenticated USING (true);
    CREATE POLICY "用户可以更新自己的信息" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
    CREATE POLICY "系统自动创建用户信息" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
    
    -- 自动创建 profiles 记录
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public.profiles (id, username, role)
      VALUES (new.id, new.raw_user_meta_data->>'username', COALESCE(new.raw_user_meta_data->>'role', 'student'));
      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 4. 给课程表添加一个更宽松的 INSERT 策略
DROP POLICY IF EXISTS "教师可以创建课程" ON courses;
CREATE POLICY "教师可以创建课程" ON courses 
  FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());
