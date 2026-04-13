import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUserAchievements } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Achievement } from '@/types/types';
import { Award, Trophy, Target, BookOpen } from 'lucide-react';

export default function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (user) {
      loadAchievements();
    }
  }, [user]);

  const loadAchievements = async () => {
    if (!user) return;
    const data = await getUserAchievements(user.id);
    setAchievements(data);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'checkpoint': return Target;
      case 'practice': return BookOpen;
      case 'game': return Trophy;
      case 'course': return Award;
      default: return Award;
    }
  };

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">成就徽章</h1>
          <p className="text-muted-foreground">查看已获得的成就</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {achievements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">暂无成就，继续努力吧！</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => {
                const Icon = getIcon(achievement.type);
                return (
                  <Card key={achievement.id}>
                    <CardHeader>
                      <Icon className="h-12 w-12 mb-4 text-primary" />
                      <CardTitle className="flex items-center gap-2">
                        {achievement.title}
                        <Badge variant="secondary">{achievement.type}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
