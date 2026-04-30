-- 添加 systemId 列用于匹配本地题目
ALTER TABLE problems ADD COLUMN IF NOT EXISTS systemId text UNIQUE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_problems_systemId ON problems(systemId);

-- 添加注释
COMMENT ON COLUMN problems.systemId IS '本地题目的标准ID，用于匹配和覆盖本地题目，如 system-level-1-0';
