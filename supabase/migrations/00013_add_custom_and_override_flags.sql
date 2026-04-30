-- 添加 is_custom 和 is_overridden 字段用于区分题目类型
ALTER TABLE problems ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;
ALTER TABLE problems ADD COLUMN IF NOT EXISTS is_overridden boolean DEFAULT false;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_problems_is_custom ON problems(is_custom);
CREATE INDEX IF NOT EXISTS idx_problems_is_overridden ON problems(is_overridden);

COMMENT ON COLUMN problems.is_custom IS '是否为自定义题目';
COMMENT ON COLUMN problems.is_overridden IS '是否为系统题目的覆盖版本';
