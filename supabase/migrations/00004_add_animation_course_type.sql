-- 添加 animation 到课程类型枚举
ALTER TYPE course_type ADD VALUE IF NOT EXISTS 'animation';

-- 添加动画步骤数据列
ALTER TABLE courses ADD COLUMN IF NOT EXISTS animation_steps jsonb DEFAULT NULL;

COMMENT ON COLUMN courses.animation_steps IS '动画微课步骤数据，仅 type=animation 时使用';
