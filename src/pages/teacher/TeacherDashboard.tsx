import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Users } from 'lucide-react';

export default function TeacherDashboard() {
  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">教学管理</h1>
          <p className="text-muted-foreground">管理课程和学员</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <Link to="/teacher/courses">
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105">
              <CardHeader>
                <BookOpen className="h-16 w-16 mb-4 text-primary" />
                <CardTitle>课程管理</CardTitle>
                <CardDescription>发布和管理教学课程</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">管理课程</Button>
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
      </div>
    </MainLayout>
  );
}
