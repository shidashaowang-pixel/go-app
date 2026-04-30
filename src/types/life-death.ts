/**
 * 死活题编辑器专用类型定义
 * 支持多分支正解、多步正解、错误解答
 */

import type { BoardPosition } from './index';

// ========== 正解分支 ==========
/**
 * 单个正解分支（可以是多步）
 * 例如：正解分支1 = [[2,3], [3,4]]（两步正解）
 */
export interface SolutionBranch {
  /** 分支唯一ID */
  id: string;
  /** 分支中的落子序列（每步 [row, col]） */
  moves: number[][];
  /** 本分支的解说（可选） */
  explanation?: string;
}

// ========== 死活题练习组件使用的类型 ==========
/**
 * 死活题练习使用的正解分支
 */
export interface LifeDeathSolutionBranch {
  id: string;
  name: string;
  moves: number[][];
  explanation: string;
}

/**
 * 死活题练习使用的错误解答
 * 支持两种格式：
 * 1. { move: [row, col] } - 单步误答
 * 2. { moves: [[row, col], ...], id: string } - 多步误答（符合WrongAnswer接口）
 */
export interface LifeDeathWrongAnswer {
  id?: string;
  /** 单步误答格式 */
  move?: number[];
  /** 多步误答格式（符合WrongAnswer接口） */
  moves?: number[][];
  explanation: string;
}

// ========== 错误解答 ==========
/**
 * 错误解答（误答示例）
 * 展示常见但错误的落子及其解释
 */
export interface WrongAnswer {
  /** 错误解答唯一ID */
  id: string;
  /** 错误落子序列 */
  moves: number[][];
  /** 为什么会错 */
  explanation: string;
}

/**
 * 死活题题目类型
 */
export type ProblemType = 
  | 'life'      // 做活（让己方棋活）
  | 'kill'      // 杀棋（吃掉对方棋）
  | 'capture'   // 吃子（提掉对方棋子）
  | 'escape'    // 出逃（让己方棋逃出）
  | 'connect'   // 连接（连接己方棋）
  | 'cut'       // 切断（切断对方连接）
  | 'sacrifice' // 弃子（故意送吃）
  | 'other';    // 其他

/**
 * 先手方（谁先下）
 */
export type TurnToPlay = 'black' | 'white';

// ========== 死活题（增强版） ==========
/**
 * 死活题数据结构
 * 包含初始局面、多分支正解、错误解答
 */
export interface LifeDeathProblem {
  id?: string;
  title: string;
  description?: string;
  boardSize: 9 | 13 | 19;
  /** 先手方 - 黑先还是白先 */
  toPlay: TurnToPlay;
  /** 题目类型 - 做活还是杀棋等 */
  problemType: ProblemType;
  /** 初始局面 */
  initialPosition: BoardPosition;
  /** 正解分支列表（支持多分支正解） */
  solutionBranches: SolutionBranch[];
  /** 错误解答列表 */
  wrongAnswers: WrongAnswer[];
  /** 难度（1-5） */
  difficulty: number;
  /** 标签 */
  tags?: string[];
}

// ========== 编辑器模式 ==========
export type EditorMode = 
  | 'view'          // 查看初始局面
  | 'setup'         // 编辑初始局面（摆子）
  | 'correct-edit'; // 编辑正解

// ========== 编辑状态 ==========
export interface EditorState {
  mode: EditorMode;
  boardSize: 9 | 13 | 19;
  /** 当前棋盘上的落子（用于编辑初始局面或正解） */
  stones: BoardPosition;
  /** 当前正在编辑的正解分支索引 */
  currentBranchIndex: number;
  /** 当前正解分支中的步骤索引 */
  currentStepIndex: number;
  /** 正解分支列表 */
  solutionBranches: SolutionBranch[];
  /** 错误解答列表 */
  wrongAnswers: WrongAnswer[];
}

// ========== 验证结果 ==========
export interface ValidationResult {
  /** 是否正确 */
  isCorrect: boolean;
  /** 匹配的分支索引（如果正确） */
  matchedBranchIndex?: number;
  /** 匹配到第几步 */
  matchedStepIndex?: number;
  /** 提示信息 */
  message: string;
}

// ========== 工具函数 ==========

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * 创建空白的死活题
 */
export function createEmptyProblem(boardSize: 9 | 13 | 19 = 9): LifeDeathProblem {
  return {
    title: '',
    description: '',
    boardSize,
    toPlay: 'black',  // 默认黑先下（围棋惯例）
    problemType: 'life',  // 默认做活题
    initialPosition: { black: [], white: [] },
    solutionBranches: [createEmptyBranch()],  // 默认一个空分支
    wrongAnswers: [],
    difficulty: 1,
    tags: [],
  };
}

/**
 * 创建新的正解分支
 */
export function createEmptyBranch(): SolutionBranch {
  return {
    id: generateId(),
    moves: [],
    explanation: '',
  };
}

/**
 * 创建新的错误解答
 */
export function createEmptyWrongAnswer(): WrongAnswer {
  return {
    id: generateId(),
    moves: [],
    explanation: '',
  };
}

/**
 * 验证用户落子是否匹配正解
 * 
 * @param userMove 用户落子位置 [row, col]
 * @param solutionBranches 正解分支列表
 * @param currentBranchIndex 当前分支索引
 * @param currentStepIndex 当前步骤索引
 * @param initialPosition 初始局面
 * @returns 验证结果
 */
export function validateMove(
  userMove: number[],
  solutionBranches: SolutionBranch[],
  currentBranchIndex: number,
  currentStepIndex: number,
  initialPosition: BoardPosition
): ValidationResult {
  // 检查当前分支是否存在
  if (currentBranchIndex < 0 || currentBranchIndex >= solutionBranches.length) {
    return {
      isCorrect: false,
      message: '没有可验证的正解分支',
    };
  }

  const branch = solutionBranches[currentBranchIndex];
  
  // 检查当前步骤是否存在
  if (currentStepIndex < 0 || currentStepIndex >= branch.moves.length) {
    return {
      isCorrect: false,
      message: '当前正解分支已完成所有步骤',
    };
  }

  // 获取当前应该下的位置
  const expectedMove = branch.moves[currentStepIndex];

  // 检查是否匹配
  if (userMove[0] === expectedMove[0] && userMove[1] === expectedMove[1]) {
    // 匹配成功
    if (currentStepIndex === branch.moves.length - 1) {
      // 这是最后一步，该分支完成
      return {
        isCorrect: true,
        matchedBranchIndex: currentBranchIndex,
        matchedStepIndex: currentStepIndex,
        message: `正解！第 ${currentStepIndex + 1}/${branch.moves.length} 步完成`,
      };
    } else {
      return {
        isCorrect: true,
        matchedBranchIndex: currentBranchIndex,
        matchedStepIndex: currentStepIndex,
        message: `正确！继续第 ${currentStepIndex + 2}/${branch.moves.length} 步`,
      };
    }
  }

  // 不匹配 - 检查是否是其他分支的起始步骤
  for (let i = 0; i < solutionBranches.length; i++) {
    if (i === currentBranchIndex) continue;
    const otherBranch = solutionBranches[i];
    if (otherBranch.moves.length > 0) {
      const firstMove = otherBranch.moves[0];
      if (userMove[0] === firstMove[0] && userMove[1] === firstMove[1]) {
        return {
          isCorrect: false,
          message: `这不是最佳走法！最佳走法在另一个分支。`,
        };
      }
    }
  }

  // 确实错误
  return {
    isCorrect: false,
    message: `错误！正确答案应在 [${expectedMove[0]}, ${expectedMove[1]}]`,
  };
}

/**
 * 死活题练习专用的落子验证（兼容旧版调用方式）
 */
export function validateLifeDeathMove(
  problem: { solutionBranches: LifeDeathSolutionBranch[] },
  userMoves: number[][],
  branchId: string
): { isCorrect: boolean; message: string } {
  const branch = problem.solutionBranches.find(b => b.id === branchId);
  if (!branch) {
    return { isCorrect: false, message: '未找到分支' };
  }
  
  const expectedMoves = branch.moves;
  const currentStep = userMoves.length - 1;
  
  if (currentStep < 0 || currentStep >= expectedMoves.length) {
    return { isCorrect: false, message: '步骤超出范围' };
  }
  
  const expected = expectedMoves[currentStep];
  const actual = userMoves[userMoves.length - 1];
  
  if (expected[0] === actual[0] && expected[1] === actual[1]) {
    if (currentStep === expectedMoves.length - 1) {
      return { isCorrect: true, message: '正解！题目完成！' };
    }
    return { isCorrect: true, message: '正确！继续下一步' };
  }
  
  return { isCorrect: false, message: '错误！这不是最佳走法' };
}

/**
 * 检查是否还有未探索的正解分支
 */
export function hasUnfinishedBranches(
  solutionBranches: SolutionBranch[],
  currentBranchIndex: number,
  currentStepIndex: number
): boolean {
  const currentBranch = solutionBranches[currentBranchIndex];
  if (!currentBranch) return solutionBranches.length > 0;
  
  // 当前分支还有后续步骤
  if (currentStepIndex < currentBranch.moves.length - 1) {
    return true;
  }

  // 检查是否有其他未探索的分支
  for (let i = 0; i < solutionBranches.length; i++) {
    if (i !== currentBranchIndex && solutionBranches[i].moves.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * 检查分支是否完成（用于死活题练习）
 */
export function checkBranchComplete(
  branch: LifeDeathSolutionBranch,
  userMoves: number[][]
): boolean {
  if (!branch || !branch.moves) return false;
  return userMoves.length >= branch.moves.length;
}

/**
 * 获取当前步骤的提示
 */
export function getHintForCurrentStep(
  branch: LifeDeathSolutionBranch,
  currentStepIndex: number
): string {
  if (!branch || !branch.moves || currentStepIndex >= branch.moves.length) {
    return '没有更多提示';
  }
  const [row, col] = branch.moves[currentStepIndex];
  return `下一步应该在 (${row + 1}, ${col + 1}) 附近`;
}

/**
 * 预览正解路径（在棋盘上显示）
 */
export interface MovePreview {
  /** 位置 [row, col] */
  position: number[];
  /** 是否是当前步骤 */
  isCurrent: boolean;
  /** 步骤序号（1-based） */
  stepNumber: number;
  /** 所属分支索引 */
  branchIndex: number;
  /** 是否是分支分叉点 */
  isBranchPoint: boolean;
}

/**
 * 生成正解路径预览
 */
export function generateMovePreviews(
  solutionBranches: SolutionBranch[],
  currentBranchIndex: number,
  currentStepIndex: number,
  initialPosition: BoardPosition
): MovePreview[] {
  const previews: MovePreview[] = [];
  
  // 模拟棋盘状态，计算每步后的局面
  // 只显示当前分支的路径
  if (currentBranchIndex < 0 || currentBranchIndex >= solutionBranches.length) {
    return previews;
  }

  const branch = solutionBranches[currentBranchIndex];
  
  // 从初始局面开始，逐步添加正解落子
  // 注意：死活题通常是黑先走（题目要求黑棋做活或吃掉白棋）
  let isBlackTurn = true;
  
  for (let step = 0; step < branch.moves.length; step++) {
    const move = branch.moves[step];
    previews.push({
      position: move,
      isCurrent: step === currentStepIndex,
      stepNumber: step + 1,
      branchIndex: currentBranchIndex,
      isBranchPoint: false,
    });
    isBlackTurn = !isBlackTurn;
  }

  // 标记分叉点（如果有多个分支在同一步有落子）
  const stepCountAtEachStep: Map<number, number> = new Map();
  for (const branch of solutionBranches) {
    for (let step = 0; step < branch.moves.length; step++) {
      const count = stepCountAtEachStep.get(step) || 0;
      stepCountAtEachStep.set(step, count + 1);
    }
  }

  for (const preview of previews) {
    const count = stepCountAtEachStep.get(preview.stepNumber - 1) || 0;
    if (count > 1) {
      preview.isBranchPoint = true;
    }
  }

  return previews;
}
