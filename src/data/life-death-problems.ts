/**
 * 死活题练习数据
 * 
 * 功能：
 * - 加载系统原始题目
 * - 应用用户对系统题目的修改（覆盖版本）
 * - 添加用户自定义题目（从云端或本地获取）
 * 
 * 格式: 9x9 棋盘，2D数组
 * - 0 = 空点
 * - 1 = 黑子
 * - 2 = 白子
 */

import type { LifeDeathProblem } from '@/types/life-death';
import type { Problem } from '@/types';
import { PRACTICE_PROBLEMS } from './problems';
import { getProblemOverrides, getCustomProblems } from './custom-problems';

/** 从 PRACTICE_PROBLEMS 中提取所有题目 */
const ALL_SYSTEM_PROBLEMS = PRACTICE_PROBLEMS;

/** 创建棋盘数组 */
function createBoard(
  boardSize: number,
  position: { black: number[][]; white: number[][] }
): number[][] {
  const board: number[][] = Array(boardSize).fill(null).map(() => Array(boardSize).fill(0));
  for (const [row, col] of position.black) {
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      board[row][col] = 1;
    }
  }
  for (const [row, col] of position.white) {
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      board[row][col] = 2;
    }
  }
  return board;
}

/** 将 problems.ts 的格式转换为 LifeDeathProblem 格式 */
function convertFromProblems(
  problem: {
    title: string;
    description: string;
    board_size: number;
    difficulty: number;
    initial_position: { black: number[][]; white: number[][] };
    solution: { moves: number[][]; explanation: string; win_condition?: string };
  },
  index: number,
  prefix: string
): LifeDeathProblem {
  const boardSize = problem.board_size || 9;
  const problemType = problem.solution.win_condition === 'kill' ? 'kill' : 'life';
  
  return {
    id: `${prefix}-${String(index + 1).padStart(3, '0')}`,
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty || 1,
    category: '死活',
    boardSize,
    toPlay: 'black',
    problemType,
    initialPosition: createBoard(boardSize, problem.initial_position),
    solutionBranches: [
      {
        id: 'b1',
        name: '正解',
        moves: problem.solution.moves,
        explanation: problem.solution.explanation,
      },
    ],
    wrongAnswers: [],
    tags: ['死活', problemType === 'kill' ? '杀棋' : '做活'],
  };
}

/**
 * 获取系统题目（应用覆盖版本）
 */
function getSystemProblems(overrides: Map<string, Problem>): LifeDeathProblem[] {
  return ALL_SYSTEM_PROBLEMS.map((p, i) => {
    const overrideKey = p.systemId || `sys-${i.toString().padStart(3, '0')}`;
    const override = overrides.get(overrideKey);
    const finalProblem = override || p;
    return convertFromProblems(finalProblem, i, 'sys');
  });
}

/** 
 * 获取所有死活题（异步）
 * 系统题目 + 覆盖版本 + 自定义题目
 */
export async function getLifeDeathProblems(): Promise<LifeDeathProblem[]> {
  // 获取覆盖版本（异步）
  const overrides = await getProblemOverrides();
  
  // 应用覆盖版本到系统题目
  const SYSTEM_PROBLEMS = getSystemProblems(overrides);
  
  // 获取自定义题目（异步）
  const customRaw = await getCustomProblems();
  const CUSTOM_PROBLEMS: LifeDeathProblem[] = customRaw.map((p, i) => ({
    id: `custom-${i}`,
    title: p.title,
    description: p.description || '',
    difficulty: p.difficulty || 1,
    category: '自定义',
    boardSize: p.board_size || 9,
    toPlay: (p.solution as any)?.to_play || 'black',
    problemType: (p.solution as any)?.problem_type || 'life',
    initialPosition: createBoard(p.board_size || 9, p.initial_position),
    solutionBranches: [{
      id: 'b1',
      name: '正解',
      moves: p.solution.moves,
      explanation: p.solution.explanation || '',
    }],
    wrongAnswers: [],
    tags: ['自定义'],
  }));
  
  // 合并系统题目和自定义题目
  return [...SYSTEM_PROBLEMS, ...CUSTOM_PROBLEMS];
}

/** 
 * 同步获取系统题目（不包含自定义题目）
 * 用于需要立即获取的场景
 */
export function getSystemLifeDeathProblems(): LifeDeathProblem[] {
  const overrides = getProblemOverridesSync();
  return getSystemProblems(overrides);
}
