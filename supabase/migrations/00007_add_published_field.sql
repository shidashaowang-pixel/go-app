-- 添加发布字段到courses表
ALTER TABLE courses ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

-- 添加发布字段到problems表
ALTER TABLE problems ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published);
CREATE INDEX IF NOT EXISTS idx_problems_published ON problems(published);
