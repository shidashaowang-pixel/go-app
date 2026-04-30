import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCourses } from '@/db/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import type { Course, CourseType } from '@/types/types';
import { Video, FileText, Sparkles } from 'lucide-react';
import { playHintSound } from '@/lib/sounds';
import { builtinCourses } from '@/data/builtin-courses';

function CourseTypeBadge({ type }: { type: CourseType }) {
  if (type === 'animation') {
    return (
      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
        🎬 动画微课
      </Badge>
    );
  }
  if (type === 'video') {
    return <Badge variant="default">📹 视频</Badge>;
  }
  return <Badge variant="secondary">📄 图文</Badge>;
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const data = await getCourses();
    // 合并云端课程和内置动画课程
    // 先显示内置课程，再显示云端课程
    setCourses([...builtinCourses, ...data]);
  };

  const animationCount = courses.filter(c => c.type === 'animation').length;
  const videoCount = courses.filter(c => c.type === 'video').length;
  const articleCount = courses.filter(c => c.type === 'article').length;

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl float-gentle">🎬</span> 真人教学课程
          </h1>
          <p className="text-muted-foreground">观看教师发布的动画微课、视频和图文课程 📚</p>
          {courses.length > 0 && (
            <div className="flex gap-3 mt-3">
              {animationCount > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  <Sparkles className="h-3 w-3 inline mr-1" />{animationCount} 个动画微课
                </span>
              )}
              {videoCount > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {videoCount} 个视频课程
                </span>
              )}
              {articleCount > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {articleCount} 个图文课程
                </span>
              )}
            </div>
          )}
        </div>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">🐼 暂无课程，敬请期待哦~</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} to={`/learn/courses/${course.id}`}>
                <Card className="h-full transition-all hover:shadow-lg hover:scale-105 card-kid">
                  {course.type === 'animation' && !course.cover_image_url ? (
                    <div className="w-full h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center rounded-t-lg">
                      <Sparkles className="h-12 w-12 text-purple-500" />
                    </div>
                  ) : course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : null}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <CourseTypeBadge type={course.type} />
                      {course.duration && (
                        <span className="text-sm text-muted-foreground">{course.duration}分钟</span>
                      )}
                      {course.type === 'animation' && course.animation_steps && (
                        <span className="text-sm text-muted-foreground">
                          {course.animation_steps.length}步
                        </span>
                      )}
                    </div>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 font-bold">
                      🚀 开始学习
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
