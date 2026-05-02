-- 创建教师邀请表
CREATE TABLE IF NOT EXISTS teacher_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    max_uses integer DEFAULT 1,
    used_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    class_name text,
    class_description text
);

-- 创建教师学生关系表
CREATE TABLE IF NOT EXISTS teacher_students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_code text,
    joined_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    UNIQUE(teacher_id, student_id)
);

-- 创建教师班级表
CREATE TABLE IF NOT EXISTS teacher_classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_code text NOT NULL UNIQUE,
    class_name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true
);

-- 为 teacher_invitations 表添加索引
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_code ON teacher_invitations(code);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_teacher_id ON teacher_invitations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_expires_at ON teacher_invitations(expires_at) WHERE expires_at IS NOT NULL;

-- 为 teacher_students 表添加索引
CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher_id ON teacher_students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_student_id ON teacher_students(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_class_code ON teacher_students(class_code);

-- 为 teacher_classes 表添加索引
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class_code ON teacher_classes(class_code);

-- 添加行级安全策略
ALTER TABLE teacher_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;

-- 教师邀请表策略：教师只能查看自己的邀请
CREATE POLICY "教师可以管理自己的邀请" ON teacher_invitations
    FOR ALL USING (teacher_id = auth.uid());

-- 学生可以查看有效的邀请码
CREATE POLICY "学生可以查看有效邀请码" ON teacher_invitations
    FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 教师学生关系表策略：教师只能查看自己的学生
CREATE POLICY "教师可以管理自己的学生" ON teacher_students
    FOR ALL USING (teacher_id = auth.uid());

-- 学生只能查看自己与教师的关系
CREATE POLICY "学生可以查看自己的教师关系" ON teacher_students
    FOR SELECT USING (student_id = auth.uid());

-- 教师班级表策略：教师可以管理自己的班级
CREATE POLICY "教师可以管理自己的班级" ON teacher_classes
    FOR ALL USING (teacher_id = auth.uid());

-- 所有人可以查看班级信息
CREATE POLICY "所有人可以查看班级信息" ON teacher_classes
    FOR SELECT USING (is_active = true);