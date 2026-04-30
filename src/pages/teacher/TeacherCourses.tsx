import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTeacherCourses, deleteCourse } from '@/db/api';
import { deleteCourseFromIndexedDB } from '@/db/indexeddb';
import { useAuth } from '@/contexts/AuthContext';
import type { Course } from '@/types/types';
import { Plus, Edit, Trash2, Video, FileText, Sparkles, Globe, GlobeLock, CloudOff, CloudCheck } from 'lucide-react';
import { toast } from 'sonner';

/** 扩展的课程类型，包含本地同步状态 */
interface CourseWithSync extends Course {
  synced?: boolean;
  local_only?: boolean;
}

function CourseTypeBadge({ type }: { type: Course['type'] }) {
  if (type === 'animation') {
    return (
      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
        <Sparkles className="h-3 w-3 mr-1" />动画微课
      </Badge>
    );
  }
  if (type === 'video') {
    return <Badge variant="default"><Video className="h-3 w-3 mr-1" />视频</Badge>;
  }
  return <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />图文</Badge>;
}

export default function TeacherCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseWithSync[]>([]);

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    if (!user) return;
    const data = await getTeacherCourses(user.id);
    setCourses(data as CourseWithSync[]);
  };

  const handleDelete = async (id: string, course: CourseWithSync) => {
    if (!confirm('确定要删除这门课程吗？')) return;
    
    try {
      // 如果是本地未同步的课程，只删除本地
      if (course.local_only || !course.synced) {
        await deleteCourseFromIndexedDB(id);
        toast.success('已删除本地课程');
      } else {
        // 云端课程
        await deleteCourse(id);
        toast.success('删除成功');
      }
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
            <p className="text-muted-foreground">发布和管理教学课程（动画微课 / 视频 / 图文）</p>
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
              <p className="text-muted-foreground mb-2">暂无课程</p>
              <p className="text-xs text-muted-foreground mb-4">推荐创建动画微课：无需录视频，通过棋盘动画+解说旁白即可制作课程</p>
              <Link to="/teacher/courses/new">
                <Button>创建第一门课程</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id}>
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CourseTypeBadge type={course.type} />
                      {course.type === 'animation' && course.animation_steps && (
                        <span className="text-xs text-muted-foreground">{course.animation_steps.length}步</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 同步状态 */}
                      {(course as CourseWithSync).synced === false ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-200">
                          <CloudOff className="h-3 w-3 mr-1" />待同步
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 border-gray-200">
                          <CloudCheck className="h-3 w-3 mr-1" />已同步
                        </Badge>
                      )}
                      {/* 发布状态 */}
                      {course.published ? (
                        <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                          <Globe className="h-3 w-3 mr-1" />已发布
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          <GlobeLock className="h-3 w-3 mr-1" />未发布
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle>{course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Link to={`/teacher/courses/${course.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="mr-2 h-4 w-4" />
                        编辑
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(course.id, course)}
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
