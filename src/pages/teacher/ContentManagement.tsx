import { useState, useMemo } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GoBoard from '@/components/GoBoard';
import { GoEngine } from '@/lib/go-engine';
import {
  LEVEL_1_PROBLEMS,
  LEVEL_2_PROBLEMS,
  LEVEL_3_PROBLEMS,
  LEVEL_4_PROBLEMS,
  LEVEL_5_PROBLEMS,
  LEVEL_6_PROBLEMS,
  LEVEL_7_PROBLEMS,
  LEVEL_8_PROBLEMS,
  PRACTICE_PROBLEMS,
} from '@/data/problems';
import type { Problem } from '@/types';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  Gamepad2,
  GraduationCap,
  StickyNote,
  Copy,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// 内容类型
type ContentType = 'problems' | 'checkpoints' | 'rules' | 'courses';

interface ContentStats {
  total: number;
  valid: number;
  errors: number;
}

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState<ContentType>('problems');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // 收集所有题目
  const allProblems = useMemo(() => {
    const problems: (Problem & { level?: number })[] = [];
    const sources = [
      { data: LEVEL_1_PROBLEMS, level: 1 },
      { data: LEVEL_2_PROBLEMS, level: 2 },
      { data: LEVEL_3_PROBLEMS, level: 3 },
      { data: LEVEL_4_PROBLEMS, level: 4 },
      { data: LEVEL_5_PROBLEMS, level: 5 },
      { data: LEVEL_6_PROBLEMS, level: 6 },
      { data: LEVEL_7_PROBLEMS, level: 7 },
      { data: LEVEL_8_PROBLEMS, level: 8 },
    ];

    sources.forEach(({ data, level }) => {
      data.forEach((p, i) => {
        problems.push({
          ...p,
          id: `level-${level}-p${i}`,
          created_at: '',
          level,
        });
      });
    });

    return problems;
  }, []);

  // 验证题目
  const verifyProblem = (problem: Problem) => {
    const errors: string[] = [];
    const size = problem.board_size;

    if (![9, 13, 19].includes(size)) {
      errors.push(`无效棋盘大小: ${size}`);
    }

    if (problem.initial_position) {
      for (const [r, c] of problem.initial_position.black || []) {
        if (r < 0 || r >= size || c < 0 || c >= size) {
          errors.push(`黑子坐标越界: [${r},${c}]`);
        }
      }
      for (const [r, c] of problem.initial_position.white || []) {
        if (r < 0 || r >= size || c < 0 || c >= size) {
          errors.push(`白子坐标越界: [${r},${c}]`);
        }
      }
    }

    if (problem.solution?.moves) {
      for (let i = 0; i < problem.solution.moves.length; i++) {
        const move = problem.solution.moves[i];
        if (!move || move.length !== 2) {
          errors.push(`答案格式错误: 第${i + 1}手`);
        } else if (move[0] < 0 || move[0] >= size || move[1] < 0 || move[1] >= size) {
          errors.push(`答案坐标越界: [${move}]`);
        }
      }
    }

    // 引擎测试
    try {
      const engine = new GoEngine(size);
      if (problem.initial_position) {
        engine.loadPosition(problem.initial_position);
      }
      for (const move of problem.solution?.moves || []) {
        const success = engine.placeStone(move[0], move[1], 1);
        if (!success) {
          errors.push(`第${engine.moveCount}手无法落子`);
          break;
        }
      }
    } catch (e) {
      errors.push(`引擎测试失败`);
    }

    return { valid: errors.length === 0, errors };
  };

  // 统计
  const stats: Record<ContentType, ContentStats> = useMemo(() => ({
    problems: {
      total: PRACTICE_PROBLEMS.length,
      valid: allProblems.filter(p => verifyProblem(p as Problem).valid).length,
      errors: PRACTICE_PROBLEMS.length - allProblems.filter(p => verifyProblem(p as Problem).valid).length,
    },
    checkpoints: { total: 8, valid: 8, errors: 0 },
    rules: { total: 10, valid: 10, errors: 0 },
    courses: { total: 5, valid: 5, errors: 0 },
  }), [allProblems]);

  // 过滤题目
  const filteredProblems = useMemo(() => {
    if (!searchTerm) return allProblems.slice(0, 50);
    const term = searchTerm.toLowerCase();
    return allProblems.filter(p =>
      p.title?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [allProblems, searchTerm]);

  // 格式化坐标
  const formatCoord = (move: number[]): string => {
    if (!move || move.length !== 2) return '?';
    return `${String.fromCharCode(65 + move[1])}${move[0] + 1}`;
  };

  // 打开预览
  const openPreview = (item: any) => {
    setPreviewData(item);
    setIsPreviewOpen(true);
  };

  return (
    <MainLayout>
      <div className="container px-4 py-6">
        {/* 标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">🎛️</span> 内容管理后台
          </h1>
          <p className="text-muted-foreground mt-1">
            统一管理所有学习内容：题目、关卡、规则、微课
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'problems' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('problems')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <StickyNote className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.problems.total}</div>
                  <p className="text-sm text-muted-foreground">死活题目</p>
                </div>
              </div>
              {stats.problems.errors > 0 && (
                <Badge variant="destructive" className="mt-2">
                  {stats.problems.errors} 个问题
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'checkpoints' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('checkpoints')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Gamepad2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.checkpoints.total}</div>
                  <p className="text-sm text-muted-foreground">闯关关卡</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'rules' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.rules.total}</div>
                  <p className="text-sm text-muted-foreground">规则介绍</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'courses' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.courses.total}</div>
                  <p className="text-sm text-muted-foreground">微课内容</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 内容区域 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
          <TabsList className="mb-4">
            <TabsTrigger value="problems" className="gap-2">
              <StickyNote className="h-4 w-4" /> 死活题目
            </TabsTrigger>
            <TabsTrigger value="checkpoints" className="gap-2">
              <Gamepad2 className="h-4 w-4" /> 闯关关卡
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <BookOpen className="h-4 w-4" /> 规则介绍
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <GraduationCap className="h-4 w-4" /> 微课内容
            </TabsTrigger>
          </TabsList>

          {/* 死活题目 */}
          <TabsContent value="problems">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">死活题目管理</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索题目..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-[200px]"
                      />
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      新增题目
                    </Button>
                    <Button variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      批量导入
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">关卡</TableHead>
                      <TableHead>题目</TableHead>
                      <TableHead className="w-[100px]">难度</TableHead>
                      <TableHead className="w-[150px]">判定方式</TableHead>
                      <TableHead className="w-[100px]">状态</TableHead>
                      <TableHead className="w-[150px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProblems.map((problem) => {
                      const { valid, errors } = verifyProblem(problem as Problem);
                      return (
                        <TableRow key={problem.id} className={!valid ? 'bg-red-50' : ''}>
                          <TableCell>
                            <Badge variant="outline">第{problem.level}关</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{problem.title}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {problem.description}
                            </div>
                          </TableCell>
                          <TableCell>{problem.difficulty || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {problem.solution?.win_condition === 'capture'
                                ? `提子(${problem.solution.capture_min || 1})`
                                : '精确落点'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {valid ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" /> 正常
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" /> {errors[0]}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openPreview(problem)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filteredProblems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    没有找到匹配的题目
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 闯关关卡 */}
          <TabsContent value="checkpoints">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">闯关关卡管理</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新增关卡
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">关卡</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead>题目数量</TableHead>
                      <TableHead>难度</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="w-[150px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => {
                      const levelProblems = allProblems.filter(p => p.level === level);
                      return (
                        <TableRow key={level}>
                          <TableCell>
                            <Badge>第{level}关</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">基础闯关 {level}</div>
                            <div className="text-xs text-muted-foreground">
                              {level === 1 && '吃子基础'}
                              {level === 2 && '连接与分断'}
                              {level === 3 && '逃子与追吃'}
                              {level === 4 && '征吃与引征'}
                              {level === 5 && '枷吃'}
                              {level === 6 && '倒扑'}
                              {level === 7 && '滚打包收'}
                              {level === 8 && '综合练习'}
                            </div>
                          </TableCell>
                          <TableCell>{levelProblems.length} 题</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${
                                    i < level ? 'bg-yellow-400' : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" /> 正常
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 规则介绍 */}
          <TabsContent value="rules">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">规则介绍管理</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新增规则
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { id: 1, title: '围棋入门', desc: '围棋的历史、棋盘、棋子介绍', status: '正常' },
                    { id: 2, title: '落子规则', desc: '如何落子、气的概念', status: '正常' },
                    { id: 3, title: '吃子规则', desc: '如何提掉对方的棋子', status: '正常' },
                    { id: 4, title: '禁入点与劫', desc: '禁止落子的位置 + 劫的规则（已更新）', status: '✅ 已完善' },
                    { id: 5, title: '计算胜负', desc: '数子法与数目法', status: '正常' },
                    { id: 6, title: '棋子的连接', desc: '连接与断点概念', status: '正常' },
                    { id: 7, title: '眼的概念', desc: '什么是眼？如何做眼', status: '正常' },
                  ].map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{rule.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{rule.desc}</p>
                          <Badge
                            variant={rule.status === '正常' ? 'default' : 'secondary'}
                            className="mt-2"
                          >
                            {rule.status}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 微课内容 */}
          <TabsContent value="courses">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">微课内容管理</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新增微课
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">序号</TableHead>
                      <TableHead>微课标题</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>时长</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="w-[150px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { id: 1, title: '第一课：认识棋盘', type: '视频', duration: '5分钟', status: '已发布' },
                      { id: 2, title: '第二课：落子方法', type: '图文', duration: '3分钟', status: '已发布' },
                      { id: 3, title: '第三课：气的计算', type: '动画', duration: '8分钟', status: '已发布' },
                      { id: 4, title: '第四课：吃子技巧', type: '视频', duration: '10分钟', status: '草稿' },
                      { id: 5, title: '第五课：禁入点详解', type: '动画', duration: '7分钟', status: '待完善' },
                    ].map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>{course.id}</TableCell>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{course.type}</Badge>
                        </TableCell>
                        <TableCell>{course.duration}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              course.status === '已发布'
                                ? 'default'
                                : course.status === '草稿'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {course.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 预览弹窗 */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewData?.title}
                <Badge>{previewData?.level ? `第${previewData.level}关` : '练习题'}</Badge>
              </DialogTitle>
            </DialogHeader>

            {previewData && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">初始局面</h3>
                  <div className="flex justify-center">
                    <ProblemPreview problem={previewData} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">题目描述</h3>
                    <p className="text-sm text-muted-foreground">{previewData.description}</p>
                  </div>

                  <div>
                    <h3 className="font-medium">正确答案</h3>
                    <div className="flex flex-wrap gap-2">
                      {previewData.solution?.moves?.map((move: number[], i: number) => (
                        <Badge key={i} variant="outline">
                          第{i + 1}手：{formatCoord(move)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {previewData.solution?.alternative_moves && (
                    <div>
                      <h3 className="font-medium">变着</h3>
                      {previewData.solution.alternative_moves.map((alt: number[][], i: number) => (
                        <div key={i} className="flex flex-wrap gap-2 mt-1">
                          {alt.map((move, j) => (
                            <Badge key={j} variant="secondary" className="text-sm">
                              {formatCoord(move)}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {previewData.solution?.explanation && (
                    <div>
                      <h3 className="font-medium">解题思路</h3>
                      <p className="text-sm text-muted-foreground">
                        {previewData.solution.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// 题目预览组件
function ProblemPreview({ problem }: { problem: Problem }) {
  const engine = new GoEngine(problem.board_size);
  if (problem.initial_position) {
    engine.loadPosition(problem.initial_position);
  }

  return (
    <GoBoard
      size={problem.board_size}
      engine={engine}
      disabled
      coordinates
    />
  );
}
