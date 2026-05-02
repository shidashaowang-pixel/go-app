-- 创建绑定孩子的 RPC 函数
-- 使用 SECURITY DEFINER 绕过 RLS 限制

CREATE OR REPLACE FUNCTION bind_child_to_parent(
  child_username text,
  parent_uuid uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  child_record profiles%ROWTYPE;
BEGIN
  -- 查找孩子账号
  SELECT * INTO child_record
  FROM profiles
  WHERE username = child_username
    AND role = 'child';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', '未找到该用户名对应的儿童账号'
    );
  END IF;

  -- 检查是否已绑定
  IF child_record.parent_id = parent_uuid THEN
    RETURN json_build_object(
      'success', true,
      'message', '该孩子已经绑定到您的账号'
    );
  END IF;

  -- 检查是否已绑定到其他家长
  IF child_record.parent_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', '该账号已经绑定到其他家长'
    );
  END IF;

  -- 更新绑定关系
  UPDATE profiles
  SET parent_id = parent_uuid
  WHERE id = child_record.id;

  RETURN json_build_object(
    'success', true,
    'message', '绑定成功',
    'child', json_build_object(
      'id', child_record.id,
      'username', child_record.username,
      'nickname', child_record.nickname
    )
  );
END;
$$;