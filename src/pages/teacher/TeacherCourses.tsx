import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCourses, deleteCourse } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Course } from '@/types/types';
import { Plus, Edit, Trash2, Video, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const data = await getCourses();
    setCourses(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这门课程吗？')) return;
    
    try {
      await deleteCourse(id);
      toast.success('删除成功');
      loadCourses();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">课程管理</h1>
            <p className="text-muted-foreground">发布和管理教学课程</p>
          </div>
          <Link to="/teacher/courses/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新建课程
            </Button>
          </Link>
        </div>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">暂无课程</p>
              <Link to="/teacher/courses/new">
                <Button>创建第一门课程</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id}>
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
                  </div>
                  <CardTitle>{course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Link to={`/teacher/courses/edit/${course.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="mr-2 h-4 w-4" />
                        编辑
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(course.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
