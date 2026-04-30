import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, GraduationCap, Trophy, Loader2, Plus, Sparkles, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCourses } from '@/db/api';
import type { Course } from '@/types/types';

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const courseData = await getCourses();
      // 只统计自己创建的课程
      const myCourses = courseData.filter(c => c.teacher_id === user?.id);
      setCourses(myCourses);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const videoCourses = courses.filter(c => c.type === 'video').length;
  const articleCourses = courses.filter(c => c.type === 'article').length;
  const animationCourses = courses.filter(c => c.type === 'animation').length;

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">教学管理</h1>
          <p className="text-muted-foreground">管理课程和学员</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-4 mb-8 max-w-3xl">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{courses.length}</p>
                  <p className="text-xs text-muted-foreground">我的课程</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold">{animationCourses}</p>
                  <p className="text-xs text-muted-foreground">动画微课</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 text-teal-600" />
                  <p className="text-2xl font-bold">{videoCourses}</p>
                  <p className="text-xs text-muted-foreground">视频课程</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                  <p className="text-2xl font-bold">{articleCourses}</p>
                  <p className="text-xs text-muted-foreground">图文课程</p>
                </CardContent>
              </Card>
            </div>

            {/* 功能入口 */}
            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              <Link to="/teacher/courses">
                <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
                  <CardHeader>
                    <BookOpen className="h-16 w-16 mb-4 text-primary" />
                    <CardTitle>课程管理</CardTitle>
                    <CardDescription>发布和管理教学课程（支持动画微课、视频、图文）</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">管理课程</Button>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/teacher/problems">
                <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
                  <CardHeader>
                    <HelpCircle className="h-16 w-16 mb-4 text-purple-500" />
                    <CardTitle>题库管理</CardTitle>
                    <CardDescription>创建围棋练习题目，支持正解和错误解答标注</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">管理题目</Button>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/teacher/students">
                <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
                  <CardHeader>
                    <Users className="h-16 w-16 mb-4 text-chart-2" />
                    <CardTitle>学员管理</CardTitle>
                    <CardDescription>查看学员学习进度</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">查看学员</Button>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* 最近课程列表 */}
            {courses.length > 0 && (
              <div className="mt-8 max-w-4xl mx-auto">
                <h3 className="font-bold text-lg mb-4">最近课程</h3>
                <div className="space-y-3">
                  {courses.slice(0, 5).map(course => (
                    <Link key={course.id} to={`/teacher/courses/${course.id}`}>
                      <Card className="hover:shadow-md transition-all">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            course.type === 'animation' ? 'bg-purple-50 text-purple-600' :
                            course.type === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                          }`}>
                            {course.type === 'animation' ? '🎬' : course.type === 'video' ? '📹' : '📄'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{course.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {course.type === 'animation' ? '动画微课' : course.type === 'video' ? '视频课程' : '图文课程'}
                              {course.duration ? ` · ${course.duration}分钟` : ''}
                              {course.type === 'animation' && course.animation_steps ? ` · ${course.animation_steps.length}步` : ''}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0">{course.type}</Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {courses.length === 0 && (
              <div className="mt-8 text-center max-w-4xl mx-auto">
                <Card>
                  <CardContent className="py-12">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">还没有课程</p>
                    <p className="text-sm text-muted-foreground mb-4">创建你的第一个课程，开始教学吧！</p>
                    <Link to="/teacher/courses/new">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" /> 创建课程
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
