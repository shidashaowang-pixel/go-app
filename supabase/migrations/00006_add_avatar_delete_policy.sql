-- 添加头像存储的 DELETE 策略，允许用户删除自己的旧头像
CREATE POLICY "用户可以删除自己的头像" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
