-- 创建存储桶
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('course-videos', 'course-videos', true),
  ('course-images', 'course-images', true);

-- 设置存储策略
CREATE POLICY "用户可以上传自己的头像" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "所有人可以查看头像" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'avatars');

CREATE POLICY "教师可以上传课程视频" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'course-videos' AND has_role(auth.uid(), 'teacher'));

CREATE POLICY "所有人可以查看课程视频" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'course-videos');

CREATE POLICY "教师可以上传课程图片" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'course-images' AND has_role(auth.uid(), 'teacher'));

CREATE POLICY "所有人可以查看课程图片" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'course-images');