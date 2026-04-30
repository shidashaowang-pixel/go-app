ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "教师可以管理自己的课程" ON courses;
DROP POLICY IF EXISTS "所有人可以查看课程" ON courses;
DROP POLICY IF EXISTS "匿名用户查看已发布课程" ON courses;
DROP POLICY IF EXISTS "教师可以创建课程" ON courses;
DROP POLICY IF EXISTS "教师可以更新课程" ON courses;
DROP POLICY IF EXISTS "教师可以删除课程" ON courses;

CREATE POLICY "所有人可以查看课程" ON courses
  FOR SELECT TO authenticated
  USING (published = true OR teacher_id = auth.uid());

CREATE POLICY "教师可以创建课程" ON courses
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "教师可以更新课程" ON courses
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "教师可以删除课程" ON courses
  FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "匿名用户查看已发布课程" ON courses
  FOR SELECT TO anon
  USING (published = true);

ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "所有人可以查看题目" ON problems;
CREATE POLICY "所有人可以查看题目" ON problems
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "教师可以创建题目" ON problems;
CREATE POLICY "教师可以创建题目" ON problems
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "教师可以更新题目" ON problems;
CREATE POLICY "教师可以更新题目" ON problems
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "教师可以删除题目" ON problems;
CREATE POLICY "教师可以删除题目" ON problems
  FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "用户可以查看自己的学习进度" ON learning_progress;
DROP POLICY IF EXISTS "用户可以更新自己的学习进度" ON learning_progress;

CREATE POLICY "用户可以查看自己的学习进度" ON learning_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "用户可以写入自己的学习进度" ON learning_progress;
CREATE POLICY "用户可以写入自己的学习进度" ON learning_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以更新自己的学习进度" ON learning_progress
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "用户可以删除自己的学习进度" ON learning_progress;
CREATE POLICY "用户可以删除自己的学习进度" ON learning_progress
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
