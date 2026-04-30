import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
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
import { getProblemOverrides, getProblemOverridesSync, getCustomProblems, removeCustomProblem, restoreSystemProblem } from '@/data/custom-problems';
import type { Problem } from '@/types';
import { AlertCircle, CheckCircle, XCircle, Search, Filter, Eye, Edit3, Shield, Sparkles, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

type ProblemCategory = 'all' | 'checkpoint' | 'practice' | 'custom';

// 验证结果类型
interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export default function ProblemManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<ProblemCategory>('all');
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [verifyResults, setVerifyResults] = useState<Map<string, VerificationResult>>(new Map());
  const [customProblems, setCustomProblems] = useState<Problem[]>([]);

  // 加载自定义题目和覆盖版本（从云端或本地）
  useEffect(() => {
    Promise.all([
      getCustomProblems(),
      getProblemOverrides(),
    ]).then(([custom, overrides]) => {
      setCustomProblems(custom);
      setOverrideCount(overrides.size);
    });
  }, []);
  
  const [overrideCount, setOverrideCount] = useState(0);

  // 编辑题目
  const handleEditProblem = (problem: Problem) => {
    navigate('/teacher/problem-editor', { state: { editProblem: problem } });
  };

  // 新建题目
  const handleCreateProblem = () => {
    navigate('/teacher/problem-editor/new');
  };

  // 收集所有题目（使用 state 中的异步数据）
  const allProblems = useMemo(() => {
    const problems: (Problem & { level?: number; isOverridden?: boolean; isCustom?: boolean })[] = [];
    const overrides = getProblemOverridesSync();
    
    // 用于跟踪已覆盖的题目
    const overriddenIds = new Set<string>();

    // 收集系统题目并应用覆盖版本
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
        const systemId = p.systemId || `level-${level}-${i}`;
        const override = overrides.get(systemId);
        const finalProblem = override || p;
        const isOverridden = !!override;
        
        if (isOverridden) {
          overriddenIds.add(systemId);
        }
        
        problems.push({
          ...finalProblem,
          id: systemId,
          systemId,
          created_at: '',
          level,
          isOverridden,
        });
      });
    });

    // 练习题
    PRACTICE_PROBLEMS.forEach((p, i) => {
      const systemId = p.systemId || `practice-${i}`;
      const override = overrides.get(systemId);
      const finalProblem = override || p;
      const isOverridden = !!override;
      
      if (isOverridden) {
        overriddenIds.add(systemId);
      }
      
      problems.push({
        ...finalProblem,
        id: systemId,
        systemId,
        created_at: '',
        isOverridden,
      });
    });

    // 添加自定义题目（使用 state 中的值）
    customProblems.forEach((p, i) => {
      problems.push({
        ...p,
        id: p.systemId || `custom-${i}`,
        systemId: p.systemId,
        created_at: '',
        isCustom: true,
      });
    });

    return problems;
  }, [customProblems]);
  
  // 删除自定义题目
  const handleDeleteCustom = async (problem: Problem) => {
    if (!problem.systemId) return;
    if (!window.confirm('确定要删除这道自定义题目吗？')) return;
    await removeCustomProblem(problem.systemId);
    toast.success('自定义题目已删除');
    // 重新加载
    const updated = await getCustomProblems();
    setCustomProblems(updated);
  };
  
  // 刷新列表
  const handleRefresh = async () => {
    const [custom, overrides] = await Promise.all([
      getCustomProblems(),
      getProblemOverrides(),
    ]);
    setCustomProblems(custom);
    setOverrideCount(overrides.size);
    toast.success('已刷新');
  };

  // 验证单道题
  const verifyProblem = (problem: Problem): VerificationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const size = problem.board_size;

    // 1. 验证棋盘大小
    if (![9, 13, 19].includes(size)) {
      errors.push(`无效棋盘大小: ${size}`);
    }

    // 2. 验证初始位置坐标
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

    // 3. 验证答案坐标
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

    // 4. 引擎测试：验证答案是否能合法落子
    try {
      const engine = new GoEngine(size);
      if (problem.initial_position) {
        engine.loadPosition(problem.initial_position);
      }

      // 尝试按顺序落子
      for (const move of problem.solution?.moves || []) {
        const success = engine.placeStone(move[0], move[1], 1); // 黑方
        if (!success) {
          warnings.push(`第${engine.moveCount}手可能无法落子`);
          break;
        }
      }
    } catch (e) {
      errors.push(`引擎测试失败: ${e}`);
    }

    // 5. 检查落子点是否有子
    const winCondition = problem.solution?.win_condition;
    if (winCondition === 'capture') {
      if (problem.solution?.moves?.[0]) {
        const [r, c] = problem.solution.moves[0];
        if (problem.initial_position?.black?.some(([br, bc]) => br === r && bc === c)) {
          errors.push('答案位置已有黑子');
        }
        if (problem.initial_position?.white?.some(([wr, wc]) => wr === r && wc === c)) {
          errors.push('答案位置已有白子');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  };

  // 批量验证所有题目
  const verifyAllProblems = () => {
    const results = new Map<string, VerificationResult>();
    allProblems.forEach((p) => {
      results.set(p.id, verifyProblem(p as Problem));
    });
    setVerifyResults(results);
  };

  // 过滤题目
  const filteredProblems = useMemo(() => {
    return allProblems.filter((p) => {
      if (category === 'checkpoint') return p.type === 'checkpoint';
      if (category === 'practice') return p.type === 'practice';
      if (category === 'custom') return (p as any).isCustom;
      if (levelFilter !== 'all' && p.level !== levelFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          p.title?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [allProblems, category, levelFilter, searchTerm]);

  // 统计信息
  const stats = useMemo(() => {
    const total = allProblems.length;
    const checkpointCount = allProblems.filter((p) => p.type === 'checkpoint').length;
    const practiceCount = allProblems.filter((p) => p.type === 'practice').length;
    const customCount = allProblems.filter((p) => (p as any).isCustom).length;
    const verified = verifyResults.size;
    const validCount = Array.from(verifyResults.values()).filter((r) => r.valid).length;
    const errorCount = verified - validCount;

    return { total, checkpointCount, practiceCount, customCount, verified, validCount, errorCount };
  }, [allProblems, verifyResults]);

  // 格式化坐标
  const formatCoord = (move: number[]): string => {
    if (!move || move.length !== 2) return '?';
    const col = String.fromCharCode(65 + move[1]);
    return `${col}${move[0] + 1}`;
  };

  return (
    <MainLayout>
      <div className="container px-4 py-6">
        {/* 标题区 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">📚</span> 死活题管理后台
          </h1>
          <p className="text-muted-foreground mt-1">
            统一管理所有题目，检查和修正错误
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-5 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">题目总数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.checkpointCount}</div>
              <p className="text-sm text-muted-foreground">闯关题目</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.practiceCount}</div>
              <p className="text-sm text-muted-foreground">练习题目</p>
            </CardContent>
          </Card>
          <Card className={stats.customCount > 0 ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : ''}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-2 text-blue-600">
                <Sparkles className="h-5 w-5" />
                {stats.customCount}
              </div>
              <p className="text-sm text-muted-foreground">自定义题目</p>
            </CardContent>
          </Card>
          <Card className={stats.errorCount > 0 ? 'border-red-500' : ''}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-2">
                {stats.errorCount > 0 ? (
                  <XCircle className="text-red-500" />
                ) : (
                  <CheckCircle className="text-green-500" />
                )}
                {stats.errorCount}
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.verified > 0 ? '验证发现问题' : '等待验证'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 操作栏 */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索题目..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProblemCategory)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">全部类型</option>
              <option value="checkpoint">闯关题目</option>
              <option value="practice">练习题目</option>
              <option value="custom">自定义题目</option>
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">全部关卡</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((l) => (
                <option key={l} value={l}>第{l}关</option>
              ))}
            </select>

            <Button onClick={handleCreateProblem} variant="default">
              <Plus className="h-4 w-4 mr-2" />
              新建题目
            </Button>
            <Button onClick={handleRefresh} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              刷新同步
            </Button>
            <Button onClick={verifyAllProblems} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              验证全部
            </Button>
          </div>
        </div>

        {/* 题目列表 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>题目</TableHead>
                  <TableHead className="w-[100px]">类型</TableHead>
                  <TableHead className="w-[80px]">关卡</TableHead>
                  <TableHead className="w-[80px]">难度</TableHead>
                  <TableHead className="w-[200px]">验证状态</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProblems.map((problem) => {
                  const result = verifyResults.get(problem.id);
                  return (
                    <TableRow
                      key={problem.id}
                      className={result && !result.valid ? 'bg-red-50 dark:bg-red-950/20' : ''}
                    >
                      <TableCell className="font-mono text-xs">
                        {problem.id.slice(0, 20)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          {problem.title}
                          {(problem as any).isOverridden && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                              <Shield className="h-3 w-3 mr-1" />
                              已修改
                            </Badge>
                          )}
                          {(problem as any).isCustom && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                              <Sparkles className="h-3 w-3 mr-1" />
                              自定义
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {problem.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={problem.type === 'checkpoint' ? 'default' : 'secondary'}>
                          {problem.type === 'checkpoint' ? '闯关' : '练习'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {problem.level ? `第${problem.level}关` : '-'}
                      </TableCell>
                      <TableCell>{problem.difficulty || '-'}</TableCell>
                      <TableCell>
                        {result ? (
                          result.valid ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs">通过</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                <span className="text-xs">{result.errors.length}个错误</span>
                              </div>
                              {result.warnings.length > 0 && (
                                <div className="flex items-center gap-1 text-yellow-600">
                                  <AlertCircle className="h-3 w-3" />
                                  <span className="text-xs">{result.warnings.length}个警告</span>
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">未验证</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditProblem(problem as Problem)}
                            title="编辑题目"
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedProblem(problem as Problem)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                          {(problem as any).isCustom && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCustom(problem as Problem)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="删除自定义题目"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 问题汇总 */}
        {stats.errorCount > 0 && (
          <Card className="mt-4 border-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                需要修正的题目
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {Array.from(verifyResults.entries())
                  .filter(([_, r]) => !r.valid)
                  .map(([id, result]) => {
                    const problem = allProblems.find((p) => p.id === id);
                    return (
                      <div key={id} className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                        <div className="font-medium">{problem?.title}</div>
                        <div className="text-sm text-muted-foreground">{id}</div>
                        <ul className="mt-2 space-y-1">
                          {result.errors.map((err, i) => (
                            <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                              <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                              {err}
                            </li>
                          ))}
                          {result.warnings.map((warn, i) => (
                            <li key={i} className="text-sm text-yellow-600 flex items-start gap-2">
                              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                              {warn}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 题目详情弹窗 */}
      <Dialog open={!!selectedProblem} onOpenChange={() => setSelectedProblem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProblem?.title}
              <Badge variant={selectedProblem?.type === 'checkpoint' ? 'default' : 'secondary'}>
                {selectedProblem?.type === 'checkpoint' ? '闯关' : '练习'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedProblem && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* 棋盘预览 */}
              <div>
                <h3 className="font-medium mb-2">初始局面</h3>
                <div className="flex justify-center">
                  <ProblemPreview problem={selectedProblem} />
                </div>
              </div>

              {/* 题目详情 */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">题目描述</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProblem.description}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-1">正确答案</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProblem.solution?.moves?.map((move, i) => (
                      <Badge key={i} variant="outline" className="text-base px-3 py-1">
                        第{i + 1}手：{formatCoord(move)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedProblem.solution?.alternative_moves && (
                  <div>
                    <h3 className="font-medium mb-1">变着（其他正解）</h3>
                    <div className="space-y-2">
                      {selectedProblem.solution.alternative_moves.map((alt, i) => (
                        <div key={i} className="flex flex-wrap gap-2">
                          {alt.map((move, j) => (
                            <Badge key={j} variant="secondary" className="text-sm">
                              {formatCoord(move)}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-medium mb-1">判定方式</h3>
                  <Badge>
                    {selectedProblem.solution?.win_condition === 'capture'
                      ? `提子判定（提${selectedProblem.solution?.capture_min || 1}颗以上）`
                      : '精确落点'}
                  </Badge>
                </div>

                {selectedProblem.solution?.explanation && (
                  <div>
                    <h3 className="font-medium mb-1">解题思路</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedProblem.solution.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// 题目预览组件
function ProblemPreview({ problem }: { problem: Problem }) {
  const [engine] = useState(() => {
    const e = new GoEngine(problem.board_size);
    if (problem.initial_position) {
      e.loadPosition(problem.initial_position);
    }
    return e;
  });

  return (
    <GoBoard
      size={problem.board_size}
      engine={engine}
      disabled
      coordinates
    />
  );
}
