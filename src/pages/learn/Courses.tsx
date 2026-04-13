import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCourses } from '@/db/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import type { Course } from '@/types/types';
import { Video, FileText } from 'lucide-react';

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const data = await getCourses();
    setCourses(data);
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">真人教学课程</h1>
          <p className="text-muted-foreground">观看教师发布的视频和图文课程</p>
        </div>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">暂无课程，敬请期待</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} to={`/learn/courses/${course.id}`}>
                <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
                  {course.cover_image_url && (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      {course.type === 'video' ? (
                        <Badge variant="default"><Video className="h-3 w-3 mr-1" />视频</Badge>
                      ) : (
                        <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />图文</Badge>
                      )}
                      {course.duration && (
                        <span className="text-sm text-muted-foreground">{course.duration}分钟</span>
                      )}
                    </div>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">开始学习</Button>
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
