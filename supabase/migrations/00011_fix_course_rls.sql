-- 添加 animation 枚举值（如果不存在）
DO $$
BEGIN
  -- 检查是否需要添加 'animation' 到 course_type 枚举
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_type') THEN
    -- 检查枚举中是否已包含 'animation'
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'course_type' AND e.enumlabel = 'animation'
    ) THEN
      ALTER TYPE course_type ADD VALUE IF NOT EXISTS 'animation';
    END IF;
  ELSE
    -- 如果类型不存在，创建它
    CREATE TYPE course_type AS ENUM ('video', 'article', 'animation');
  END IF;
END $$;

-- 添加 RLS 策略（如果不存在）
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- 删除旧策略
DROP POLICY IF EXISTS "所有人可以查看课程" ON courses;
DROP POLICY IF EXISTS "教师可以管理自己的课程" ON courses;

-- 创建新课程策略
-- 所有人都可以查看已发布的课程
CREATE POLICY "所有人可以查看课程" ON courses 
  FOR SELECT TO authenticated 
  USING (published = true OR teacher_id = auth.uid());

-- 教师可以创建自己的课程
CREATE POLICY "教师可以创建课程" ON courses 
  FOR INSERT TO authenticated 
  WITH CHECK (teacher_id = auth.uid());

-- 教师可以更新自己的课程
CREATE POLICY "教师可以更新课程" ON courses 
  FOR UPDATE TO authenticated 
  USING (teacher_id = auth.uid());

-- 教师可以删除自己的课程
CREATE POLICY "教师可以删除课程" ON courses 
  FOR DELETE TO authenticated 
  USING (teacher_id = auth.uid());

-- 允许匿名用户查看已发布课程（可选，用于公开课程）
DROP POLICY IF EXISTS "匿名用户查看已发布课程" ON courses;
CREATE POLICY "匿名用户查看已发布课程" ON courses 
  FOR SELECT TO anon 
  USING (published = true);
