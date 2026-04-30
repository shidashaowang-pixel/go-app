import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getCourse, createCourse, updateCourse, setCoursePublished } from '@/db/api';
import { getCourseFromIndexedDB } from '@/db/indexeddb';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Plus, Trash2, Play, ChevronDown, ChevronUp, Globe, GlobeLock, Upload, Link, CloudOff, CloudCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { AnimationStep, CourseType } from '@/types/types';
import CourseFileUploader from '@/components/CourseFileUploader';

/** 动画微课步骤编辑器 */
function StepEditor({
  step,
  index,
  boardSize,
  onChange,
  onRemove,
}: {
  step: AnimationStep;
  index: number;
  boardSize: number;
  onChange: (step: AnimationStep) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [placingColor, setPlacingColor] = useState<'black' | 'white'>('black');
  const [previewBoard, setPreviewBoard] = useState<(string | null)[][]>([]);

  // 初始化预览棋盘
  useEffect(() => {
    const b = Array.from({ length: boardSize }, () =>
      Array.from({ length: boardSize }, () => null as string | null)
    );
    for (const m of step.moves) {
      if (m.y < boardSize && m.x < boardSize) {
        b[m.y][m.x] = m.color;
      }
    }
    setPreviewBoard(b);
  }, [step.moves, boardSize]);

  const cellSize = boardSize <= 9 ? 28 : 20;
  const svgSize = cellSize * (boardSize - 1);
  const stoneR = cellSize * 0.42;

  const addMove = (x: number, y: number) => {
    if (previewBoard[y]?.[x]) return; // 已有棋子
    const newMoves = [...step.moves, { x, y, color: placingColor }];
    const newBoard = previewBoard.map(r => [...r]);
    newBoard[y][x] = placingColor;
    setPreviewBoard(newBoard);
    setPlacingColor(placingColor === 'black' ? 'white' : 'black');
    onChange({ ...step, moves: newMoves });
  };

  const removeMove = (idx: number) => {
    const newMoves = step.moves.filter((_, i) => i !== idx);
    onChange({ ...step, moves: newMoves });
  };

  const addHighlight = (x: number, y: number) => {
    const existing = step.highlights?.find(h => h.x === x && h.y === y);
    let newHighlights: AnimationStep['highlights'];
    if (existing) {
      // 循环切换: circle -> square -> cross -> 移除
      const types: Array<'circle' | 'square' | 'cross'> = ['circle', 'square', 'cross'];
      const currentIdx = types.indexOf(existing.type);
      if (currentIdx >= 2) {
        newHighlights = step.highlights?.filter(h => !(h.x === x && h.y === y));
      } else {
        newHighlights = step.highlights?.map(h =>
          h.x === x && h.y === y ? { ...h, type: types[currentIdx + 1] } : h
        );
      }
    } else {
      newHighlights = [...(step.highlights || []), { x, y, type: 'circle' }];
    }
    onChange({ ...step, highlights: newHighlights });
  };

  const highlightMap = new Map(step.highlights?.map(h => [`${h.y},${h.x}`, h.type]));

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {index + 1}
            </span>
            第 {index + 1} 步
            {step.narration && <span className="text-xs font-normal text-muted-foreground ml-2 line-clamp-1">- {step.narration.slice(0, 20)}</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* 迷你棋盘编辑器 */}
          <div>
            <label className="text-sm font-medium mb-2 block">点击棋盘放置棋子，右键添加标注</label>
            <div className="inline-block">
              <div
                className="relative border-2 border-amber-700 rounded p-3"
                style={{ background: 'linear-gradient(135deg, #deb887, #d2a86e)' }}
              >
                <svg width={svgSize} height={svgSize} className="select-none">
                  {Array.from({ length: boardSize }).map((_, i) => (
                    <g key={`l-${i}`}>
                      <line x1={0} y1={i * cellSize} x2={(boardSize - 1) * cellSize} y2={i * cellSize}
                        stroke="#8B6914" strokeWidth="0.5" />
                      <line x1={i * cellSize} y1={0} x2={i * cellSize} y2={(boardSize - 1) * cellSize}
                        stroke="#8B6914" strokeWidth="0.5" />
                    </g>
                  ))}
                  {/* 棋子 */}
                  {previewBoard.map((row, r) =>
                    row.map((cell, c) => cell ? (
                      <circle key={`${r}-${c}`} cx={c * cellSize} cy={r * cellSize}
                        r={stoneR} fill={cell === 'black' ? '#1a1a1a' : '#f5f5f0'}
                        stroke={cell === 'white' ? '#bbb' : 'none'} strokeWidth="0.5" />
                    ) : null)
                  )}
                  {/* 高亮标注 */}
                  {step.highlights?.map((h, i) => {
                    if (h.type === 'circle') return (
                      <circle key={`hl-${i}`} cx={h.x * cellSize} cy={h.y * cellSize}
                        r={stoneR + 3} fill="none" stroke="#ef4444" strokeWidth="2" />
                    );
                    if (h.type === 'square') return (
                      <rect key={`hl-${i}`} x={h.x * cellSize - stoneR - 3} y={h.y * cellSize - stoneR - 3}
                        width={(stoneR + 3) * 2} height={(stoneR + 3) * 2}
                        fill="none" stroke="#3b82f6" strokeWidth="2" rx={1} />
                    );
                    if (h.type === 'cross') {
                      const s = stoneR * 0.5;
                      return (
                        <g key={`hl-${i}`}>
                          <line x1={h.x * cellSize - s} y1={h.y * cellSize - s}
                            x2={h.x * cellSize + s} y2={h.y * cellSize + s} stroke="#ef4444" strokeWidth="2" />
                          <line x1={h.x * cellSize + s} y1={h.y * cellSize - s}
                            x2={h.x * cellSize - s} y2={h.y * cellSize + s} stroke="#ef4444" strokeWidth="2" />
                        </g>
                      );
                    }
                    return null;
                  })}
                  {/* 交互层 */}
                  {Array.from({ length: boardSize }).map((_, r) =>
                    Array.from({ length: boardSize }).map((_, c) => (
                      <rect key={`click-${r}-${c}`}
                        x={c * cellSize - cellSize / 2} y={r * cellSize - cellSize / 2}
                        width={cellSize} height={cellSize} fill="transparent"
                        className="cursor-pointer"
                        onClick={() => addMove(c, r)}
                        onContextMenu={(e) => { e.preventDefault(); addHighlight(c, r); }}
                      />
                    ))
                  )}
                </svg>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">左键放置棋子 | 右键添加/切换标注（红圈/蓝框/叉）</p>
          </div>

          {/* 已添加的落子列表 */}
          {step.moves.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">落子列表</label>
              <div className="flex flex-wrap gap-1.5">
                {step.moves.map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary">
                    <span className={m.color === 'black' ? 'w-3 h-3 rounded-full bg-gray-800' : 'w-3 h-3 rounded-full bg-white border'} />
                    {String.fromCharCode(65 + (m.x >= 8 ? m.x + 1 : m.x))}{boardSize - m.y}
                    <button onClick={() => removeMove(i)} className="ml-0.5 hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 旁白 */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">解说旁白</label>
            <Textarea
              value={step.narration}
              onChange={(e) => onChange({ ...step, narration: e.target.value })}
              placeholder="描述这一步要讲解的内容..."
              rows={3}
            />
          </div>

          {/* 持续时间 */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">停留时间</label>
            <Input
              type="number"
              value={step.duration || 0}
              onChange={(e) => onChange({ ...step, duration: parseInt(e.target.value) || 0 })}
              min={0}
              max={60}
              className="w-20"
            />
            <span className="text-xs text-muted-foreground">秒（0 = 手动翻页）</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function CourseEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id || id === 'new';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CourseType>('video');
  const [contentUrl, setContentUrl] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'link'>('upload');
  const [coverUrl, setCoverUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [boardSize, setBoardSize] = useState(9);
  const [animationSteps, setAnimationSteps] = useState<AnimationStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [localSynced, setLocalSynced] = useState(true); // 标记课程是否已同步到云端

  useEffect(() => {
    if (!isNew && id) loadCourse();
  }, [id]);

  const loadCourse = async () => {
    if (!id) return;
    
    // 检查本地是否有未同步的版本
    const localCourse = await getCourseFromIndexedDB(id);
    
    const data = await getCourse(id);
    if (data) {
      setTitle(data.title);
      setDescription(data.description || '');
      setType(data.type);
      setContentUrl(data.content_url || '');
      setCoverUrl(data.cover_image_url || '');
      setDuration(data.duration?.toString() || '');
      setPublished(data.published || false);
      if (data.animation_steps) {
        setAnimationSteps(data.animation_steps);
      }
      // 如果本地有未同步的版本，显示提示
      if (localCourse && !localCourse.synced) {
        setLocalSynced(false);
        toast.info('检测到本地有未同步的版本，将使用本地数据', { duration: 3000 });
        // 使用本地数据覆盖
        if (localCourse.title) setTitle(localCourse.title);
        if (localCourse.description !== undefined) setDescription(localCourse.description || '');
        if (localCourse.type) setType(localCourse.type);
        if (localCourse.content_url !== undefined) setContentUrl(localCourse.content_url || '');
        if (localCourse.cover_image_url !== undefined) setCoverUrl(localCourse.cover_image_url || '');
        if (localCourse.duration !== undefined) setDuration(localCourse.duration?.toString() || '');
        if (localCourse.published !== undefined) setPublished(localCourse.published);
        if (localCourse.animation_steps) setAnimationSteps(localCourse.animation_steps);
      } else {
        setLocalSynced(true);
      }
    } else if (localCourse) {
      // 云端没有，但本地有（离线创建的课程）
      toast.warning('此课程尚未同步到云端，将在网络恢复后同步', { duration: 5000 });
      setLocalSynced(false);
      setTitle(localCourse.title);
      setDescription(localCourse.description || '');
      setType(localCourse.type);
      setContentUrl(localCourse.content_url || '');
      setCoverUrl(localCourse.cover_image_url || '');
      setDuration(localCourse.duration?.toString() || '');
      setPublished(localCourse.published || false);
      if (localCourse.animation_steps) {
        setAnimationSteps(localCourse.animation_steps);
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error('请输入课程标题');
      return;
    }
    if (type === 'animation' && animationSteps.length === 0) {
      toast.error('动画微课至少需要1个步骤');
      return;
    }

    setSaving(true);
    try {
      const courseData: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        content_url: contentUrl.trim() || null,
        cover_image_url: coverUrl.trim() || null,
        duration: duration ? parseInt(duration) : null,
        teacher_id: user.id,
        published, // 保存发布状态
      };

      if (type === 'animation') {
        courseData.animation_steps = animationSteps;
        courseData.content_url = null;
        // 自动计算时长
        const totalSec = animationSteps.reduce((sum, s) => sum + (s.duration || 3), 0);
        courseData.duration = Math.ceil(totalSec / 60) || 1;
      } else {
        courseData.animation_steps = null;
      }

      if (isNew) {
        const created = await createCourse(courseData as Parameters<typeof createCourse>[0]);
        const synced = (created as any).__synced !== false && !created.id.startsWith('local-course-');
        if (synced) {
          toast.success('课程创建成功！');
        } else {
          setLocalSynced(false);
          toast.warning('课程已保存到本地，云端同步失败（请检查网络/权限/配置）。', { duration: 5000 });
        }
      } else {
        const updated = await updateCourse(id!, courseData as Parameters<typeof updateCourse>[1]);
        const synced = (updated as any).__synced !== false;
        if (synced) {
          toast.success('课程保存成功！');
          setLocalSynced(true);
        } else {
          setLocalSynced(false);
          toast.warning('课程已保存到本地，云端同步失败（请检查网络/权限/配置）。', { duration: 5000 });
        }
      }
      if (!isNew) {
        navigate('/teacher/courses');
      }
    } catch (err) {
      console.error('保存课程失败:', err);
      // 检查是否是本地保存成功的错误
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('本地') || errorMsg.includes('云端同步失败')) {
        setLocalSynced(false); // 本地保存成功但云端失败
        toast.warning('课程已保存到本地！网络恢复后会在课程列表中显示，可以再次尝试同步。', {
          duration: 5000,
        });
      } else {
        toast.error('保存失败，请重试');
      }
    } finally {
      setSaving(false);
    }
  };

  // 发布/取消发布课程
  const handleTogglePublish = async () => {
    if (!id) {
      toast.error('请先保存课程后再发布');
      return;
    }

    setPublishing(true);
    try {
      const newPublished = !published;
      await setCoursePublished(id, newPublished);
      setPublished(newPublished);
      toast.success(newPublished ? '课程已发布，所有用户可见！' : '课程已取消发布');
    } catch (err) {
      console.error('发布操作失败:', err);
      toast.warning('发布状态更新失败，可稍后重试');
    } finally {
      setPublishing(false);
    }
  };

  const addStep = () => {
    setAnimationSteps([...animationSteps, { moves: [], narration: '', duration: 3 }]);
  };

  const updateStep = (index: number, step: AnimationStep) => {
    const newSteps = [...animationSteps];
    newSteps[index] = step;
    setAnimationSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setAnimationSteps(animationSteps.filter((_, i) => i !== index));
  };

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/teacher/courses')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回课程管理
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isNew ? <Plus className="h-5 w-5" /> : <Save className="h-5 w-5" />}
              {isNew ? '新建课程' : '编辑课程'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">课程标题 *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：围棋入门第1课——认识棋盘"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">课程类型</label>
              <Select value={type} onValueChange={(v) => setType(v as CourseType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="animation">🎬 动画微课</SelectItem>
                  <SelectItem value="video">📹 视频课程</SelectItem>
                  <SelectItem value="article">📄 图文课程</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">课程描述</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述课程内容和学习目标..."
                rows={4}
              />
            </div>

            {/* 动画微课编辑区 */}
            {type === 'animation' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">动画步骤</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-muted-foreground">棋盘:</label>
                      <Select value={boardSize.toString()} onValueChange={(v) => setBoardSize(parseInt(v))}>
                        <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9">9×9</SelectItem>
                          <SelectItem value="13">13×13</SelectItem>
                          <SelectItem value="19">19×19</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" onClick={addStep}>
                      <Plus className="h-4 w-4 mr-1" /> 添加步骤
                    </Button>
                  </div>
                </div>

                {animationSteps.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-xl">
                    <Play className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-2">还没有动画步骤</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      动画微课通过步骤式棋盘动画 + 解说旁白呈现，<br />
                      无需录制视频，适合制作面向学生的微课
                    </p>
                    <Button variant="outline" onClick={addStep}>
                      <Plus className="h-4 w-4 mr-1" /> 添加第一步
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {animationSteps.map((step, idx) => (
                      <StepEditor
                        key={idx}
                        step={step}
                        index={idx}
                        boardSize={boardSize}
                        onChange={(s) => updateStep(idx, s)}
                        onRemove={() => removeStep(idx)}
                      />
                    ))}
                    <Button variant="outline" className="w-full" onClick={addStep}>
                      <Plus className="h-4 w-4 mr-1" /> 继续添加步骤
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 视频/图文内容URL */}
            {type !== 'animation' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {type === 'video' ? '视频内容' : '文档内容'}
                  </label>
                                    {/* 内容输入模式：上传文件 / 粘贴链接 */}
                  <div className="flex gap-2 mb-3">
                    <Button
                      type="button"
                      variant={inputMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setInputMode('upload'); if (inputMode === 'link') setContentUrl(''); }}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-1" /> 上传文件
                    </Button>
                    <Button
                      type="button"
                      variant={inputMode === 'link' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInputMode('link')}
                      className="flex-1"
                    >
                      <Link className="h-4 w-4 mr-1" /> 粘贴链接
                    </Button>
                  </div>
                  
                  {inputMode === 'upload' ? (
                    <CourseFileUploader
                      currentUrl={contentUrl}
                      onUploadComplete={(url) => setContentUrl(url)}
                      fileType={type === 'video' ? 'video' : 'document'}
                      label=""
                      helpText="上传后文件将存储到云端，所有用户都可以下载观看"
                    />
                  ) : (
                    <div className="space-y-2">
                      <Input
                        value={contentUrl}
                        onChange={(e) => setContentUrl(e.target.value)}
                        placeholder={type === 'video' ? '输入视频URL（mp4格式）' : '输入文档链接'}
                      />
                      <p className="text-xs text-muted-foreground">
                        {type === 'video'
                          ? '支持 mp4、webm 等格式的视频链接'
                          : '支持 PDF、网页等文档链接'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">课程时长（分钟）</label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="例如：15"
                    min="1"
                    max="300"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">封面图片链接</label>
              <Input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="输入封面图片URL（可选）"
              />
            </div>

            <div className="pt-2 space-y-3">
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? '保存中...' : isNew ? '创建课程' : '保存修改'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/teacher/courses')}>
                  取消
                </Button>
              </div>
              
              {/* 发布按钮（仅编辑模式显示） */}
              {!isNew && (
                <div className="space-y-3">
                  {/* 同步状态提示 */}
                  {!localSynced && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <CloudOff className="h-5 w-5 text-amber-600" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-amber-700">本地保存待同步</span>
                        <p className="text-xs text-amber-600">此课程尚未同步到云端，网络恢复后将自动显示</p>
                      </div>
                    </div>
                  )}
                  {localSynced && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <CloudCheck className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-700">已同步到云端</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {published ? (
                        <>
                          <Globe className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-700">已发布</span>
                          <span className="text-xs text-muted-foreground">所有用户可见</span>
                        </>
                      ) : (
                        <>
                          <GlobeLock className="h-5 w-5 text-orange-600" />
                          <span className="text-sm font-medium text-orange-700">未发布</span>
                          <span className="text-xs text-muted-foreground">仅你可见</span>
                        </>
                      )}
                    </div>
                    <Button
                      variant={published ? 'destructive' : 'default'}
                      size="sm"
                      onClick={handleTogglePublish}
                      disabled={publishing}
                    >
                      {publishing ? '处理中...' : published ? '取消发布' : '立即发布'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
