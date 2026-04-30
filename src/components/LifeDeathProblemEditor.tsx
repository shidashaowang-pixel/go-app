/**
 * 死活题编辑器主组件
 * 支持：
 * - 设置初始局面
 * - 编辑多分支正解
 * - 编辑错误解答
 * - 预览和测试题目
 */

import { useState, useCallback, useMemo } from 'react';
import EditableBoard from './EditableBoard';
import { cn } from '@/lib/utils';
import {
  type LifeDeathProblem,
  type SolutionBranch,
  type WrongAnswer,
  type EditorMode,
  createEmptyBranch,
  createEmptyWrongAnswer,
  generateMovePreviews,
} from '@/types/life-death';
import type { StoneColor } from '@/lib/go-engine';
import type { BoardPosition } from '@/types';

interface LifeDeathProblemEditorProps {
  /** 初始题目数据（用于编辑） */
  initialProblem?: LifeDeathProblem;
  /** 保存回调 */
  onSave?: (problem: LifeDeathProblem) => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 是否只读模式 */
  readOnly?: boolean;
}

export default function LifeDeathProblemEditor({
  initialProblem,
  onSave,
  onCancel,
  readOnly = false,
}: LifeDeathProblemEditorProps) {
  // ========== 状态 ==========
  
  // 题目基本信息
  const [title, setTitle] = useState(initialProblem?.title || '');
  const [description, setDescription] = useState(initialProblem?.description || '');
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(initialProblem?.boardSize || 9);
  const [difficulty, setDifficulty] = useState(initialProblem?.difficulty || 1);

  // 编辑器模式
  const [mode, setMode] = useState<EditorMode>('view');
  
  // 当前棋子颜色
  const [currentColor, setCurrentColor] = useState<StoneColor>('black');

  // 初始局面（用于编辑）
  const [initialStones, setInitialStones] = useState<BoardPosition>(
    initialProblem?.initialPosition || { black: [], white: [] }
  );

  // 正解分支列表
  const [solutionBranches, setSolutionBranches] = useState<SolutionBranch[]>(
    initialProblem?.solutionBranches.length 
      ? initialProblem.solutionBranches 
      : [createEmptyBranch()]
  );

  // 当前编辑的正解分支索引
  const [currentBranchIndex, setCurrentBranchIndex] = useState(0);

  // 错误解答列表
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>(
    initialProblem?.wrongAnswers || []
  );

  // 当前编辑的错误解答索引
  const [currentWrongIndex, setCurrentWrongIndex] = useState(-1);

  // 正解预览
  const [showCorrectPreview, setShowCorrectPreview] = useState(true);

  // ========== 辅助函数 ==========

  // 获取当前分支
  const currentBranch = solutionBranches[currentBranchIndex];

  // 生成正解预览
  const correctPreview = useMemo(() => {
    if (!showCorrectPreview || mode === 'setup') return [];
    return generateMovePreviews(solutionBranches, currentBranchIndex, 0, initialStones);
  }, [solutionBranches, currentBranchIndex, initialStones, showCorrectPreview, mode]);

  // ========== 初始局面编辑 ==========

  const handleInitialStonePlace = useCallback((row: number, col: number, color: StoneColor) => {
    const key = `${row},${col}`;
    const stones = { ...initialStones };
    
    // 检查是否已有该颜色的棋子
    const colorList = color === 'black' ? stones.black : stones.white;
    const otherColorList = color === 'black' ? stones.white : stones.black;
    
    // 如果另一颜色有这颗子，先移除
    const otherIdx = otherColorList.findIndex(([r, c]) => r === row && c === col);
    if (otherIdx !== -1) {
      otherColorList.splice(otherIdx, 1);
    }

    // 检查是否已存在
    const idx = colorList.findIndex(([r, c]) => r === row && c === col);
    if (idx !== -1) {
      // 已存在，移除
      colorList.splice(idx, 1);
    } else {
      // 不存在，添加
      colorList.push([row, col]);
    }

    setInitialStones({ ...stones });
  }, [initialStones]);

  const handleInitialStoneRemove = useCallback((row: number, col: number) => {
    const stones = { ...initialStones };
    
    // 移除黑子
    const blackIdx = stones.black.findIndex(([r, c]) => r === row && c === col);
    if (blackIdx !== -1) {
      stones.black.splice(blackIdx, 1);
    }

    // 移除白子
    const whiteIdx = stones.white.findIndex(([r, c]) => r === row && c === col);
    if (whiteIdx !== -1) {
      stones.white.splice(whiteIdx, 1);
    }

    setInitialStones({ ...stones });
  }, [initialStones]);

  // ========== 正解编辑 ==========

  const handleCorrectStonePlace = useCallback((row: number, col: number, color: StoneColor) => {
    const branches = [...solutionBranches];
    const branch = { ...branches[currentBranchIndex] };
    
    // 添加到当前分支的最后
    branch.moves = [...branch.moves, [row, col]];
    
    branches[currentBranchIndex] = branch;
    setSolutionBranches(branches);
  }, [solutionBranches, currentBranchIndex]);

  const handleCorrectStoneRemove = useCallback((row: number, col: number) => {
    const branches = [...solutionBranches];
    const branch = { ...branches[currentBranchIndex] };
    
    // 移除最后一步（如果匹配）
    if (branch.moves.length > 0) {
      const lastMove = branch.moves[branch.moves.length - 1];
      if (lastMove[0] === row && lastMove[1] === col) {
        branch.moves = branch.moves.slice(0, -1);
        branches[currentBranchIndex] = branch;
        setSolutionBranches(branches);
      }
    }
  }, [solutionBranches, currentBranchIndex]);

  // 添加新分支
  const handleAddBranch = useCallback(() => {
    const branches = [...solutionBranches, createEmptyBranch()];
    setSolutionBranches(branches);
    setCurrentBranchIndex(branches.length - 1);
  }, [solutionBranches]);

  // 删除分支
  const handleDeleteBranch = useCallback((index: number) => {
    if (solutionBranches.length <= 1) return; // 至少保留一个分支
    
    const branches = solutionBranches.filter((_, i) => i !== index);
    setSolutionBranches(branches);
    
    if (currentBranchIndex >= branches.length) {
      setCurrentBranchIndex(branches.length - 1);
    }
  }, [solutionBranches, currentBranchIndex]);

  // 更新分支解说
  const handleBranchExplanationChange = useCallback((index: number, explanation: string) => {
    const branches = [...solutionBranches];
    branches[index] = { ...branches[index], explanation };
    setSolutionBranches(branches);
  }, [solutionBranches]);

  // ========== 错误解答编辑 ==========

  const handleAddWrongAnswer = useCallback(() => {
    setWrongAnswers([...wrongAnswers, createEmptyWrongAnswer()]);
    setCurrentWrongIndex(wrongAnswers.length);
  }, [wrongAnswers]);

  const handleDeleteWrongAnswer = useCallback((index: number) => {
    const wrongs = wrongAnswers.filter((_, i) => i !== index);
    setWrongAnswers(wrongs);
    if (currentWrongIndex >= wrongs.length) {
      setCurrentWrongIndex(wrongs.length - 1);
    }
  }, [wrongAnswers, currentWrongIndex]);

  const handleWrongStonePlace = useCallback((row: number, col: number, color: StoneColor) => {
    if (currentWrongIndex < 0) return;
    
    const wrongs = [...wrongAnswers];
    const wrong = { ...wrongs[currentWrongIndex] };
    
    // 添加落子
    wrong.moves = [...wrong.moves, [row, col]];
    
    wrongs[currentWrongIndex] = wrong;
    setWrongAnswers(wrongs);
  }, [wrongAnswers, currentWrongIndex]);

  const handleWrongStoneRemove = useCallback((row: number, col: number) => {
    if (currentWrongIndex < 0) return;
    
    const wrongs = [...wrongAnswers];
    const wrong = { ...wrongs[currentWrongIndex] };
    
    // 移除最后一步
    if (wrong.moves.length > 0) {
      const lastMove = wrong.moves[wrong.moves.length - 1];
      if (lastMove[0] === row && lastMove[1] === col) {
        wrong.moves = wrong.moves.slice(0, -1);
        wrongs[currentWrongIndex] = wrong;
        setWrongAnswers(wrongs);
      }
    }
  }, [wrongAnswers, currentWrongIndex]);

  const handleWrongExplanationChange = useCallback((index: number, explanation: string) => {
    const wrongs = [...wrongAnswers];
    wrongs[index] = { ...wrongs[index], explanation };
    setWrongAnswers(wrongs);
  }, [wrongAnswers]);

  // ========== 保存 ==========

  const handleSave = useCallback(() => {
    const problem: LifeDeathProblem = {
      id: initialProblem?.id,
      title,
      description,
      boardSize,
      initialPosition: initialStones,
      solutionBranches: solutionBranches.filter(b => b.moves.length > 0),
      wrongAnswers: wrongAnswers.filter(w => w.moves.length > 0),
      difficulty,
    };

    if (!title.trim()) {
      alert('请输入题目标题');
      return;
    }

    if (problem.solutionBranches.length === 0) {
      alert('请至少添加一个正解分支');
      return;
    }

    onSave?.(problem);
  }, [initialProblem, title, description, boardSize, initialStones, solutionBranches, wrongAnswers, difficulty, onSave]);

  // ========== 渲染 ==========

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 标题 */}
      <div className="text-2xl font-bold">死活题编辑器</div>

      {/* 基本信息 */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <h3 className="font-semibold">题目信息</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 border rounded-lg disabled:opacity-50"
              placeholder="例如：角部做活"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">难度</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              disabled={readOnly}
              className="w-full px-3 py-2 border rounded-lg disabled:opacity-50"
            >
              <option value={1}>入门 (1)</option>
              <option value={2}>初级 (2)</option>
              <option value={3}>中级 (3)</option>
              <option value={4}>高级 (4)</option>
              <option value={5}>困难 (5)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">棋盘大小</label>
            <select
              value={boardSize}
              onChange={(e) => setBoardSize(Number(e.target.value) as 9 | 13 | 19)}
              disabled={readOnly}
              className="w-full px-3 py-2 border rounded-lg disabled:opacity-50"
            >
              <option value={9}>9路</option>
              <option value={13}>13路</option>
              <option value={19}>19路</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">题目描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg disabled:opacity-50"
            placeholder="描述这道题的要求，例如：黑先，杀掉白棋"
          />
        </div>
      </div>

      {/* 模式切换 */}
      <div className="flex gap-2 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setMode('view')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            mode === 'view' ? "bg-primary text-primary-foreground" : "hover:bg-muted-foreground/10"
          )}
        >
          查看初始局面
        </button>
        <button
          onClick={() => setMode('setup')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            mode === 'setup' ? "bg-primary text-primary-foreground" : "hover:bg-muted-foreground/10"
          )}
        >
          编辑初始局面
        </button>
        <button
          onClick={() => setMode('correct-edit')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            mode === 'correct-edit' ? "bg-primary text-primary-foreground" : "hover:bg-muted-foreground/10"
          )}
        >
          编辑正解
        </button>
      </div>

      {/* 棋盘区域 */}
      <div className="flex justify-center">
        <EditableBoard
          size={boardSize}
          stones={mode === 'setup' ? initialStones : initialStones}
          onStonePlace={
            mode === 'setup' ? handleInitialStonePlace :
            mode === 'correct-edit' ? handleCorrectStonePlace :
            undefined
          }
          onStoneRemove={
            mode === 'setup' ? handleInitialStoneRemove :
            mode === 'correct-edit' ? handleCorrectStoneRemove :
            undefined
          }
          currentColor={currentColor}
          disabled={mode === 'view' || readOnly}
          correctMovePreview={mode === 'correct-edit' && showCorrectPreview 
            ? currentBranch?.moves.map((m, i) => ({ row: m[0], col: m[1], step: i + 1 })) || []
            : []
          }
          hintText={
            mode === 'view' ? '初始局面预览，点击棋盘无反应（查看模式）' :
            mode === 'setup' ? '点击棋盘放置或移除棋子，设置初始局面' :
            '点击棋盘添加正解落子（按顺序）'
          }
        />
      </div>

      {/* 正解分支管理 */}
      {mode === 'correct-edit' && (
        <div className="bg-card rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">正解分支</h3>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showCorrectPreview}
                  onChange={(e) => setShowCorrectPreview(e.target.checked)}
                />
                显示预览
              </label>
              <button
                onClick={handleAddBranch}
                disabled={readOnly}
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
              >
                + 添加分支
              </button>
            </div>
          </div>

          {/* 分支列表 */}
          <div className="flex gap-2 flex-wrap">
            {solutionBranches.map((branch, index) => (
              <button
                key={branch.id}
                onClick={() => setCurrentBranchIndex(index)}
                className={cn(
                  "px-3 py-1 rounded-full text-sm transition-colors",
                  currentBranchIndex === index
                    ? "bg-green-500 text-white"
                    : "bg-muted hover:bg-muted-foreground/20"
                )}
              >
                分支 {index + 1} ({branch.moves.length}步)
              </button>
            ))}
          </div>

          {/* 当前分支详情 */}
          {currentBranch && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  当前分支 {currentBranchIndex + 1}：{currentBranch.moves.length}步
                </span>
                {solutionBranches.length > 1 && (
                  <button
                    onClick={() => handleDeleteBranch(currentBranchIndex)}
                    disabled={readOnly}
                    className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    删除此分支
                  </button>
                )}
              </div>

              {/* 步骤预览 */}
              {currentBranch.moves.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {currentBranch.moves.map((move, stepIndex) => (
                    <span
                      key={stepIndex}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                    >
                      {stepIndex + 1}. [{move[0]}, {move[1]}]
                    </span>
                  ))}
                </div>
              )}

              {/* 分支解说 */}
              <div>
                <label className="block text-sm font-medium mb-1">分支解说</label>
                <textarea
                  value={currentBranch.explanation || ''}
                  onChange={(e) => handleBranchExplanationChange(currentBranchIndex, e.target.value)}
                  disabled={readOnly}
                  rows={2}
                  className="w-full px-2 py-1 border rounded text-sm disabled:opacity-50"
                  placeholder="这道正解的走法解释..."
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 错误解答管理 */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">错误解答（误答示例）</h3>
          <button
            onClick={handleAddWrongAnswer}
            disabled={readOnly}
            className="px-3 py-1 bg-muted hover:bg-muted-foreground/20 rounded text-sm disabled:opacity-50"
          >
            + 添加错误解答
          </button>
        </div>

        {wrongAnswers.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无错误解答，点击上方按钮添加</p>
        ) : (
          <div className="space-y-3">
            {/* 错误解答选择 */}
            <div className="flex gap-2 flex-wrap">
              {wrongAnswers.map((wrong, index) => (
                <button
                  key={wrong.id}
                  onClick={() => setCurrentWrongIndex(index)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm transition-colors",
                    currentWrongIndex === index
                      ? "bg-red-500 text-white"
                      : "bg-muted hover:bg-muted-foreground/20"
                  )}
                >
                  误答 {index + 1} ({wrong.moves.length}步)
                </button>
              ))}
            </div>

            {/* 当前错误解答详情 */}
            {currentWrongIndex >= 0 && wrongAnswers[currentWrongIndex] && (
              <div className="bg-red-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    误答 {currentWrongIndex + 1}
                  </span>
                  <button
                    onClick={() => handleDeleteWrongAnswer(currentWrongIndex)}
                    disabled={readOnly}
                    className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    删除
                  </button>
                </div>

                {/* 步骤预览 */}
                {wrongAnswers[currentWrongIndex].moves.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {wrongAnswers[currentWrongIndex].moves.map((move, stepIndex) => (
                      <span
                        key={stepIndex}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                      >
                        {stepIndex + 1}. [{move[0]}, {move[1]}]
                      </span>
                    ))}
                  </div>
                )}

                {/* 错误解释 */}
                <div>
                  <label className="block text-sm font-medium mb-1">为什么会错？</label>
                  <textarea
                    value={wrongAnswers[currentWrongIndex].explanation}
                    onChange={(e) => handleWrongExplanationChange(currentWrongIndex, e.target.value)}
                    disabled={readOnly}
                    rows={2}
                    className="w-full px-2 py-1 border rounded text-sm disabled:opacity-0"
                    placeholder="为什么这样下是错的..."
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  在下方棋盘点击添加误答落子
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      {!readOnly && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onCancel}
            className="px-6 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            保存题目
          </button>
        </div>
      )}
    </div>
  );
}
