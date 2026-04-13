import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function TeacherStudents() {
  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">学员管理</h1>
          <p className="text-muted-foreground">查看学员学习进度</p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>学员列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>学{i}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">学员{i}</p>
                        <p className="text-sm text-muted-foreground">积分: 1000</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge>闯关: 0/3</Badge>
                      <Badge variant="secondary">课程: 0</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
