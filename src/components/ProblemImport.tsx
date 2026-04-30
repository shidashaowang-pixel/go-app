/**
 * 围棋题目批量导入组件
 * 支持从SGF文件批量导入题目
 */
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, File, X, CheckCircle, AlertCircle, HelpCircle, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseMultipleProblemFiles, type ProblemImportResult } from '@/lib/sgf';
import type { Problem } from '@/types';

interface ProblemImportProps {
  /** 导入成功回调 */
  onImportComplete: (problems: Partial<Problem>[]) => void;
  /** 是否显示为模态框模式 */
  modal?: boolean;
  /** 关闭回调（模态框模式） */
  onClose?: () => void;
}

export default function ProblemImport({ onImportComplete, modal = false, onClose }: ProblemImportProps) {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importResult, setImportResult] = useState<ProblemImportResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expandedProblems, setExpandedProblems] = useState<Set<number>>(new Set());
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set());

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.sgf') || f.name.endsWith('.txt')
    );
    
    if (files.length === 0) {
      toast.error('请上传 .sgf 或 .txt 格式的文件');
      return;
    }
    
    await processFiles(files);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      f => f.name.endsWith('.sgf') || f.name.endsWith('.txt')
    );
    
    if (files.length === 0) {
      toast.error('请上传 .sgf 或 .txt 格式的文件');
      return;
    }
    
    await processFiles(files);
    e.target.value = '';
  };

  const processFiles = async (files: File[]) => {
    setParsing(true);
    setSelectedFiles(prev => [...prev, ...files]);
    
    try {
      const result = await parseMultipleProblemFiles(files);
      setImportResult(result);
      
      // 默认选中所有题目
      const allIndices = new Set(result.problems.map((_, i) => i));
      setSelectedForImport(allIndices);
      
      if (result.problems.length > 0) {
        toast.success(`成功解析 ${result.problems.length} 道题目`);
      } else {
        toast.error('未能从文件中解析出有效题目');
      }
    } catch (error: any) {
      toast.error(`解析失败: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  const toggleProblem = (index: number) => {
    setExpandedProblems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleSelection = (index: number) => {
    setSelectedForImport(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!importResult) return;
    setSelectedForImport(new Set(importResult.problems.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedForImport(new Set());
  };

  const handleImport = () => {
    if (!importResult) return;
    
    const problemsToImport = importResult.problems.filter((_, i) => selectedForImport.has(i));
    
    if (problemsToImport.length === 0) {
      toast.error('请选择要导入的题目');
      return;
    }
    
    onImportComplete(problemsToImport);
    toast.success(`已选择 ${problemsToImport.length} 道题目，将跳转至编辑页面`);
    
    if (modal && onClose) {
      onClose();
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    // 重新解析剩余文件
    if (selectedFiles.length > 1) {
      const remaining = selectedFiles.filter((_, i) => i !== index);
      processFiles(remaining);
    } else {
      setImportResult(null);
      setSelectedForImport(new Set());
    }
  };

  const content = (
    <div className="space-y-4">
      {/* 文件上传区域 */}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          dragOver
            ? 'border-primary bg-primary/10'
            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('problem-file-input')?.click()}
      >
        <input
          id="problem-file-input"
          type="file"
          accept=".sgf,.txt"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {parsing ? (
          <>
            <Loader2 className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
            <p className="text-sm font-medium">正在解析题目...</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">拖拽 SGF 文件到此处，或点击选择</p>
            <p className="text-xs text-muted-foreground">
              支持 .sgf 格式，可一次选择多个文件批量导入
            </p>
          </>
        )}
      </div>

      {/* 已选择的文件列表 */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">已选择 {selectedFiles.length} 个文件</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, i) => (
              <Badge key={i} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <File className="h-3 w-3" />
                {file.name}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 解析结果 */}
      {importResult && (
        <div className="space-y-3">
          {/* 结果摘要 */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {importResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  共解析 {importResult.problems.length} 道题目
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>全选</Button>
                <Button size="sm" variant="outline" onClick={deselectAll}>取消全选</Button>
              </div>
            </div>
            <Button onClick={handleImport} disabled={selectedForImport.size === 0}>
              导入已选题目 ({selectedForImport.size})
            </Button>
          </div>

          {/* 错误信息 */}
          {importResult.errors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-400">
                  {importResult.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 题目列表 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {importResult.problems.map((problem, index) => (
              <Card key={index} className={cn(
                'transition-colors',
                selectedForImport.has(index) ? 'border-primary bg-primary/5' : 'opacity-60'
              )}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* 选择框 */}
                    <input
                      type="checkbox"
                      checked={selectedForImport.has(index)}
                      onChange={() => toggleSelection(index)}
                      className="mt-1 w-4 h-4 accent-primary"
                    />
                    
                    {/* 题目信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <HelpCircle className="h-4 w-4 text-purple-500" />
                        <span className="font-medium truncate">{problem.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {problem.board_size}x{problem.board_size}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          难度 {problem.difficulty}
                        </Badge>
                      </div>
                      
                      {problem.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {problem.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>黑子: {problem.initial_position?.black?.length || 0}</span>
                        <span>白子: {problem.initial_position?.white?.length || 0}</span>
                        <span>正解: {problem.solution?.moves?.length || 0} 手</span>
                      </div>
                    </div>
                    
                    {/* 展开/收起 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleProblem(index)}
                    >
                      {expandedProblems.has(index) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* 展开详情 */}
                  {expandedProblems.has(index) && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">初始黑子位置:</span>
                          <code className="ml-1">
                            {problem.initial_position?.black?.slice(0, 5).map(([r, c]) => `[${r},${c}]`).join(', ')}
                            {(problem.initial_position?.black?.length || 0) > 5 && '...'}
                          </code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">初始白子位置:</span>
                          <code className="ml-1">
                            {problem.initial_position?.white?.slice(0, 5).map(([r, c]) => `[${r},${c}]`).join(', ')}
                            {(problem.initial_position?.white?.length || 0) > 5 && '...'}
                          </code>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">正解步骤:</span>
                          <code className="ml-1">
                            {problem.solution?.moves?.map(([r, c]) => `[${r},${c}]`).join(' → ')}
                          </code>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 帮助提示 */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">SGF 题目格式说明</h4>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>• <strong>AB[...]</strong> - 初始黑子位置 (Add Black)</li>
          <li>• <strong>AW[...]</strong> - 初始白子位置 (Add White)</li>
          <li>• <strong>B[...] W[...]</strong> - 正解步骤（第一手作为正解）</li>
          <li>• <strong>SZ[n]</strong> - 棋盘大小（如 SZ[9] 表示9路棋盘）</li>
          <li>• <strong>C[...]</strong> - 题目描述</li>
        </ul>
        <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
          你可以从网上下载围棋题库SGF文件，或从101围棋等平台导出题目进行批量导入。
        </p>
      </div>
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              批量导入题目
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 pt-4">
            {content}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          批量导入题目
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
