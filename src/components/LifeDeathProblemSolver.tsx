/**
 * 死活题求解器组件
 * 学生可以在这上面做题，验证落子是否正确
 * 
 * 功能：
 * - 显示初始局面
 * - 学生落子
 * - 验证正解（精确匹配）
 * - 支持多分支正解
 * - 显示下一步提示
 * - 展示错误解答
 */

import { useState, useCallback, useMemo } from 'react';
import EditableBoard from './EditableBoard';
import { cn } from '@/lib/utils';
import {
  type LifeDeathProblem,
  type SolutionBranch,
  type WrongAnswer,
  validateMove,
  generateMovePreviews,
} from '@/types/life-death';
import type { StoneColor } from '@/lib/go-engine';
import type { BoardPosition } from '@/types';

interface LifeDeathProblemSolverProps {
  /** 题目数据 */
  problem: LifeDeathProblem;
  /** 完成回调 */
  onComplete?: (correct: boolean, attempts: number) => void;
  /** 关闭回调 */
  onClose?: () => void;
}

export type SolveState = 'solving' | 'correct' | 'wrong' | 'hint' | 'completed';

export default function LifeDeathProblemSolver({
  problem,
  onComplete,
  onClose,
}: LifeDeathProblemSolverProps) {
  // ========== 状态 ==========

  // 当前棋盘状态（模拟落子过程）
  const [currentStones, setCurrentStones] = useState<BoardPosition>(() => {
    // 从初始局面开始
    return {
      black: [...problem.initialPosition.black],
      white: [...problem.initialPosition.white],
    };
  });

  // 当前正在进行的分支索引
  const [activeBranchIndex, setActiveBranchIndex] = useState<number>(0);
  
  // 当前步骤索引（在该分支中的第几步）
  const [stepIndex, setStepIndex] = useState<number>(0);

  // 做题状态
  const [solveState, setSolveState] = useState<SolveState>('solving');

  // 尝试次数
  const [attempts, setAttempts] = useState(0);

  // 显示提示
  const [showHint, setShowHint] = useState(false);

  // 历史记录（用于回退）
  const [history, setHistory] = useState<BoardPosition[]>([]);

  // 当前选中的误答
  const [selectedWrongAnswer, setSelectedWrongAnswer] = useState<number | null>(null);

  // ========== 计算属性 ==========

  // 当前分支
  const currentBranch = problem.solutionBranches[activeBranchIndex];

  // 剩余未完成的分支
  const remainingBranches = useMemo(() => {
    return problem.solutionBranches.map((branch, index) => ({
      index,
      isActive: index === activeBranchIndex,
      isCompleted: index < activeBranchIndex,
      remainingSteps: branch.moves.length,
    }));
  }, [problem.solutionBranches, activeBranchIndex]);

  // 提示信息
  const hintMessage = useMemo(() => {
    if (!showHint || !currentBranch) return null;
    
    const nextMove = currentBranch.moves[stepIndex];
    if (!nextMove) return '所有正解分支已完成！';
    
    return `下一步提示：黑棋应下在 [${nextMove[0]}, ${nextMove[1]}]`;
  }, [showHint, currentBranch, stepIndex]);

  // 正确答案预览
  const correctPreview = useMemo(() => {
    return generateMovePreviews(
      problem.solutionBranches,
      activeBranchIndex,
      stepIndex,
      problem.initialPosition
    );
  }, [problem.solutionBranches, activeBranchIndex, stepIndex, problem.initialPosition]);

  // ========== 落子处理 ==========

  const handleMove = useCallback((row: number, col: number, color: StoneColor) => {
    if (solveState === 'completed') return;
    
    // 保存历史
    setHistory([...history, { ...currentStones }]);
    
    // 验证落子
    const result = validateMove(
      [row, col],
      problem.solutionBranches,
      activeBranchIndex,
      stepIndex,
      problem.initialPosition
    );

    if (result.isCorrect) {
      // 正确：添加棋子到棋盘
      const newStones = { ...currentStones };
      const colorList = color === 'black' ? newStones.black : newStones.white;
      colorList.push([row, col]);
      setCurrentStones(newStones);

      // 更新步骤
      if (result.matchedStepIndex !== undefined) {
        setStepIndex(result.matchedStepIndex + 1);
      }

      // 检查是否完成当前分支
      const branch = problem.solutionBranches[activeBranchIndex];
      if (stepIndex + 1 >= branch.moves.length) {
        // 完成当前分支
        if (activeBranchIndex < problem.solutionBranches.length - 1) {
          // 还有其他分支
          setActiveBranchIndex(activeBranchIndex + 1);
          setStepIndex(0);
          setSolveState('correct');
        } else {
          // 所有分支完成
          setSolveState('completed');
          onComplete?.(true, attempts + 1);
        }
      } else {
        setSolveState('correct');
      }

      setAttempts(prev => prev + 1);
    } else {
      // 错误
      setAttempts(prev => prev + 1);
      setSolveState('wrong');
      
      // 显示一个随机错误解答（如果有）
      if (problem.wrongAnswers.length > 0 && selectedWrongAnswer === null) {
        const randomIndex = Math.floor(Math.random() * problem.wrongAnswers.length);
        setSelectedWrongAnswer(randomIndex);
      }

      // 自动回退（可选）
      // setTimeout(() => {
      //   if (history.length > 0) {
      //     setCurrentStones(history[history.length - 1]);
      //     setHistory(history.slice(0, -1));
      //   }
      //   setSolveState('solving');
      // }, 1500);
    }
  }, [solveState, currentStones, history, problem, activeBranchIndex, stepIndex, attempts, selectedWrongAnswer, onComplete]);

  // 回退一步
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    
    const lastState = history[history.length - 1];
    setCurrentStones(lastState);
    setHistory(history.slice(0, -1));
    
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
    
    setSolveState('solving');
    setShowHint(false);
  }, [history, stepIndex]);

  // 重置
  const handleReset = useCallback(() => {
    setCurrentStones({
      black: [...problem.initialPosition.black],
      white: [...problem.initialPosition.white],
    });
    setActiveBranchIndex(0);
    setStepIndex(0);
    setSolveState('solving');
    setAttempts(0);
    setHistory([]);
    setShowHint(false);
  }, [problem.initialPosition]);

  // 切换到其他分支
  const handleSwitchBranch = useCallback((index: number) => {
    setActiveBranchIndex(index);
    setStepIndex(0);
    setSolveState('solving');
  }, []);

  // ========== 渲染 ==========

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 标题和状态 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{problem.title}</h2>
          {problem.description && (
            <p className="text-muted-foreground mt-1">{problem.description}</p>
          )}
        </div>
        
        {/* 状态指示 */}
        <div className={cn(
          "px-4 py-2 rounded-lg font-medium",
          solveState === 'completed' && "bg-green-100 text-green-700",
          solveState === 'correct' && "bg-blue-100 text-blue-700",
          solveState === 'wrong' && "bg-red-100 text-red-700",
          solveState === 'solving' && "bg-muted",
        )}>
          {solveState === 'completed' && '🎉 完成！'}
          {solveState === 'correct' && '✓ 正确！继续！'}
          {solveState === 'wrong' && '✗ 错误，请重试'}
          {solveState === 'solving' && `第 ${attempts + 1} 次尝试`}
        </div>
      </div>

      {/* 分支进度 */}
      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">正解分支</h3>
          <span className="text-sm text-muted-foreground">
            共 {problem.solutionBranches.length} 个分支
          </span>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {remainingBranches.map((branch) => (
            <button
              key={branch.index}
              onClick={() => handleSwitchBranch(branch.index)}
              disabled={solveState === 'completed'}
              className={cn(
                "px-3 py-1 rounded-full text-sm transition-colors",
                branch.isCompleted && "bg-green-500 text-white",
                branch.isActive && !branch.isCompleted && "bg-primary text-primary-foreground",
                !branch.isActive && !branch.isCompleted && "bg-muted hover:bg-muted-foreground/20",
              )}
            >
              {branch.isCompleted && '✓ '}
              分支 {branch.index + 1} 
              {!branch.isCompleted && ` (${branch.remainingSteps - stepIndex}步)`}
            </button>
          ))}
        </div>

        {/* 当前分支进度 */}
        {currentBranch && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm">当前进度：</span>
            <div className="flex gap-1">
              {currentBranch.moves.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-3 h-3 rounded-full",
                    index < stepIndex ? "bg-green-500" :
                    index === stepIndex ? "bg-primary animate-pulse" :
                    "bg-muted"
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {stepIndex}/{currentBranch.moves.length}
            </span>
          </div>
        )}
      </div>

      {/* 棋盘 */}
      <div className="flex justify-center">
        <div className="relative">
          <EditableBoard
            size={problem.boardSize}
            stones={currentStones}
            onStonePlace={handleMove}
            disabled={solveState === 'completed'}
            correctMovePreview={showHint ? correctPreview.map(p => ({
              row: p.position[0],
              col: p.position[1],
              step: p.stepNumber,
            })) : []}
            hintText={solveState === 'wrong' ? '错误！请重新尝试' : undefined}
          />

          {/* 状态覆盖层 */}
          {solveState === 'completed' && (
            <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-xl font-bold text-green-600">恭喜完成！</div>
                <div className="text-sm text-muted-foreground mt-1">
                  共尝试 {attempts} 次
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handleUndo}
          disabled={history.length === 0 || solveState === 'completed'}
          className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
        >
          ↩️ 撤销
        </button>
        
        <button
          onClick={handleReset}
          disabled={solveState === 'completed'}
          className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
        >
          🔄 重置
        </button>
        
        <button
          onClick={() => setShowHint(!showHint)}
          disabled={solveState === 'completed'}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            showHint 
              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" 
              : "bg-muted hover:bg-muted-foreground/20",
            solveState === 'completed' && "disabled:opacity-50"
          )}
        >
          💡 {showHint ? '隐藏提示' : '显示提示'}
        </button>
      </div>

      {/* 提示信息 */}
      {hintMessage && showHint && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-800">{hintMessage}</p>
        </div>
      )}

      {/* 错误解答展示 */}
      {problem.wrongAnswers.length > 0 && (
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">常见错误</h3>
            <span className="text-sm text-muted-foreground">
              点击查看
            </span>
          </div>

          <div className="space-y-2">
            {problem.wrongAnswers.map((wrong, index) => (
              <details
                key={wrong.id}
                className={cn(
                  "bg-red-50 rounded-lg",
                  selectedWrongAnswer === index && "ring-2 ring-red-300"
                )}
              >
                <summary 
                  className="px-4 py-2 cursor-pointer font-medium text-red-700"
                  onClick={() => setSelectedWrongAnswer(index)}
                >
                  误答 {index + 1}：{wrong.moves.length}步
                </summary>
                {wrong.explanation && (
                  <div className="px-4 py-2 text-sm text-red-600 border-t border-red-200">
                    💭 {wrong.explanation}
                  </div>
                )}
              </details>
            ))}
          </div>
        </div>
      )}

      {/* 关闭按钮 */}
      {onClose && (
        <div className="flex justify-center pt-4 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            返回
          </button>
        </div>
      )}
    </div>
  );
}
