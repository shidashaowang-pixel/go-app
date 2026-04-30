import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, HelpCircle, Target, BookOpen, Globe, GlobeLock, Database, Skull, BookMarked, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getTeacherProblems, deleteProblem, getCheckpointProblems, getPracticeProblems } from '@/db/api';
import { CHECKPOINT_LEVELS, VERIFIED_PRACTICE_PROBLEMS } from '@/data/problems';
import ProblemImport from '@/components/ProblemImport';
import type { Problem } from '@/types';

function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const stars = '⭐'.repeat(Math.min(difficulty, 5));
  const labels = ['', '入门', '简单', '基础', '进阶', '困难'];
  return (
    <Badge variant="outline" className="text-xs">
      {stars} {labels[difficulty]}
    </Badge>
  );
}

function TypeBadge({ type, level, title }: { type: string; level: number | null; title?: string }) {
  if (type === 'checkpoint') {
    return (
      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
        <Target className="h-3 w-3 mr-1" />
        第{level}关
      </Badge>
    );
  }
  if (title?.includes('死活') || title?.includes('死') || title?.includes('活')) {
    return (
      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
        <Skull className="h-3 w-3 mr-1" />
        死活题
      </Badge>
    );
  }
  if (title?.includes('规则') || title?.includes('讲解')) {
    return (
      <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
        <BookMarked className="h-3 w-3 mr-1" />
        规则讲解
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <BookOpen className="h-3 w-3 mr-1" />
      练习题
    </Badge>
  );
}

export default function TeacherProblems() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [localProblems, setLocalProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedProblems, setImportedProblems] = useState<Partial<Problem>[]>([]);

  // 加载题目列表 - 监听 location.key 变化（从编辑页返回时会变化）
  useEffect(() => {
    loadProblems();
  }, [user, location.key]);

  const loadProblems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. 加载云端所有题目（不限制 teacher_id，显示所有题目）
      const { getAllProblems } = await import('@/db/api');
      const allCloudProblems = await getAllProblems();
      
      // 2. 加载自定义题目（从 localStorage）
      const { getCustomProblems } = await import('@/data/custom-problems');
      const customProblems = await getCustomProblems();
      
      // 3. 合并自定义题目和云端题目（去重）
      const cloudProblemIds = new Set(allCloudProblems.map(p => p.id));
      const customOnlyProblems = customProblems.filter(cp => !cloudProblemIds.has(cp.id));
      const allUserProblems = [...allCloudProblems, ...customOnlyProblems];
      
      // 4. 收集云端的 systemId 列表（用于判断本地题目是否已同步）
      const cloudSystemIds = new Set<string>();
      allCloudProblems.forEach(p => {
        if (p.systemId) cloudSystemIds.add(p.systemId);
        if (p.id.startsWith('system-')) cloudSystemIds.add(p.id);
      });
      
      // 5. 构建本地题目列表（闯关题 + 练习题 + 死活题）
      const local: Problem[] = [];
      
      // 闯关题
      for (let level = 1; level <= CHECKPOINT_LEVELS.length; level++) {
        const levelIndex = level - 1;
        CHECKPOINT_LEVELS[levelIndex].forEach((p, i) => {
          const systemId = p.systemId || `system-level-${level}-${i}`;
          const cloudVersion = allCloudProblems.find(cp => 
            cp.systemId === systemId || cp.id === systemId
          );
          local.push({
            ...(cloudVersion || p),
            id: systemId,
            type: 'checkpoint',
            checkpoint_level: level,
            created_at: new Date().toISOString(),
          });
        });
      }
      
      // 练习题（包括死活题）
      VERIFIED_PRACTICE_PROBLEMS.forEach((p, i) => {
        const systemId = p.systemId || `system-practice-${i}`;
        const cloudVersion = allCloudProblems.find(cp => 
          cp.systemId === systemId || cp.id === systemId
        );
        local.push({
          ...(cloudVersion || p),
          id: systemId,
          type: cloudVersion?.type || p.type || 'practice',
          created_at: new Date().toISOString(),
        });
      });
      
      setProblems(allUserProblems);
      setLocalProblems(local);
      
      console.log(`[题库] 加载完成：云端 ${allCloudProblems.length} 个，自定义 ${customOnlyProblems.length} 个，系统 ${local.length} 个`);
      
    } catch (error) {
      console.error('加载题目失败:', error);
      toast.error('加载题目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这道题目吗？')) return;

    try {
      await deleteProblem(id);
      setProblems(problems.filter(p => p.id !== id));
      setLocalProblems(localProblems.filter(p => p.id !== id));
      toast.success('删除成功');
    } catch {
      toast.error('删除失败');
    }
  };

  const handleImportComplete = (imported: Partial<Problem>[]) => {
    setImportedProblems(imported);
    setShowImportModal(false);
    // 跳转到题目创建页面，传入导入的题目数据
    if (imported.length > 0) {
      // 存储导入的题目到sessionStorage，跳转后使用
      sessionStorage.setItem('importedProblems', JSON.stringify(imported));
      navigate('/teacher/problems/new');
    }
  };

  // 统计数字（合并云端和本地题目）
  const totalCount = localProblems.length;
  const publishedCount = [...problems, ...localProblems.filter(p => !problems.find(cp => cp.id === p.id))].filter(p => p.published).length;
  const practiceCount = localProblems.filter(p => p.type === 'practice').length;
  const checkpointCount = localProblems.filter(p => p.type === 'checkpoint').length;
  const wrongAnswerCount = localProblems.reduce((sum, p) => sum + (p.wrong_answers?.length || 0), 0);

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <HelpCircle className="h-8 w-8 text-purple-500" />
              题库管理
            </h1>
            <p className="text-muted-foreground">创建和管理围棋练习题目，支持正解和错误解答标注</p>
          </div>
          <div className="flex gap-3">
            <Button size="lg" variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="mr-2 h-5 w-5" />
              导入SGF
            </Button>
            <Link to="/teacher/problems/new">
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                创建题目
              </Button>
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{totalCount}</div>
              <p className="text-sm text-muted-foreground">总题目数</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{practiceCount}</div>
              <p className="text-sm text-muted-foreground">练习题</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-600">{checkpointCount}</div>
              <p className="text-sm text-muted-foreground">关卡题</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{publishedCount}</div>
              <p className="text-sm text-muted-foreground">已发布</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">加载中...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 本地题目（系统题目） */}
            {localProblems.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  系统题目（可编辑并同步到云端）
                </h2>
                <div className="grid gap-4">
                  {localProblems.map((problem) => (
                    <Card key={problem.id} className="hover:shadow-md transition-shadow border-blue-200 bg-blue-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* 题目信息 */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <TypeBadge type={problem.type} level={problem.checkpoint_level} title={problem.title} />
                              <DifficultyBadge difficulty={problem.difficulty} />
                              {/* 标记为系统题目 */}
                              <Badge variant="outline" className="text-blue-600 border-blue-200">
                                <Database className="h-3 w-3 mr-1" />本地题目
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-lg">{problem.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {problem.description || '暂无描述'}
                              {problem.wrong_answers && problem.wrong_answers.length > 0 && (
                                <span className="ml-2 text-orange-500">
                                  • {problem.wrong_answers.length}个误答
                                </span>
                              )}
                            </p>
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex gap-2">
                            <Link to={`/teacher/problems/${problem.id}?from=local`}>
                              <Button variant="outline" size="sm" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                                <Edit className="h-4 w-4 mr-1" />
                                编辑（同步到云端）
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 云端题目（用户创建的） */}
            {problems.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-500" />
                  我的题目
                </h2>
                <div className="grid gap-4">
                  {problems.map((problem) => (
                    <Card key={problem.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* 题目信息 */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <TypeBadge type={problem.type} level={problem.checkpoint_level} title={problem.title} />
                              <DifficultyBadge difficulty={problem.difficulty} />
                              {/* 发布状态 */}
                              {problem.published ? (
                                <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                                  <Globe className="h-3 w-3 mr-1" />已发布
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  <GlobeLock className="h-3 w-3 mr-1" />未发布
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg">{problem.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {problem.description || '暂无描述'}
                              {problem.wrong_answers && problem.wrong_answers.length > 0 && (
                                <span className="ml-2 text-orange-500">
                                  • {problem.wrong_answers.length}个误答
                                </span>
                              )}
                            </p>
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex gap-2">
                            <Link to={`/teacher/problems/${problem.id}`} state={{ editProblem: problem }}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                编辑
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(problem.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {problems.length === 0 && localProblems.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center">
                  <HelpCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">暂无题目</h3>
                  <p className="text-muted-foreground mb-6">
                    创建你的第一道围棋练习题目，支持设置正解和常见错误解答
                  </p>
                  <Link to="/teacher/problems/new">
                    <Button size="lg">创建第一道题目</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* 题目导入模态框 */}
      {showImportModal && (
        <ProblemImport
          modal
          onImportComplete={handleImportComplete}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </MainLayout>
  );
}
