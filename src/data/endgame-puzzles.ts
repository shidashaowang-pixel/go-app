/**
 * 残局挑战题目库
 * 包含各种收官、死活、定式后续等挑战
 */

export interface EndgamePuzzle {
  id: string;
  title: string;
  description: string;
  boardSize: number;
  initialPosition: {
    black: number[][];
    white: number[][];
  };
  // 正确答案（黑方视角）
  correctMove: { row: number; col: number };
  alternativeMoves?: { row: number; col: number }[];
  // 提示（按顺序显示）
  hints: string[];
  // 价值（目数）
  value: number;
  // 难度
  difficulty: 1 | 2 | 3 | 4 | 5;
  // 类型
  type: 'saving' | 'killing' | 'territory' | 'sente' | 'connection';
  // 当前局面轮到哪方
  toPlay: 'black' | 'white';
}

export const ENDGAME_PUZZLES: EndgamePuzzle[] = [
  // ========== 入门级 (1) ==========
  {
    id: 'eg-1-1',
    title: '简单的收官',
    description: '黑先，在棋盘边缘收完最后一个官子。',
    boardSize: 9,
    initialPosition: {
      black: [[0, 2], [1, 2], [2, 2], [2, 1], [2, 0]],
      white: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0]],
    },
    correctMove: { row: 3, col: 3 },
    hints: ['找到两块棋中间的空隙', '下在[3,3]可以围住更多地盘'],
    value: 1,
    difficulty: 1,
    type: 'territory',
    toPlay: 'black',
  },
  {
    id: 'eg-1-2',
    title: '先手利',
    description: '黑先，瞄准白棋的断点，逼对方补棋。',
    boardSize: 9,
    initialPosition: {
      black: [[3, 3], [3, 4], [4, 3]],
      white: [[2, 4], [2, 5], [3, 6], [4, 5], [4, 4]],
    },
    correctMove: { row: 3, col: 5 },
    hints: ['瞄准白棋[3,6]和[4,5]、[2,5]之间的连接处', '这叫"觑"'],
    value: 2,
    difficulty: 1,
    type: 'sente',
    toPlay: 'black',
  },
  {
    id: 'eg-1-3',
    title: '连接断点',
    description: '黑先，发现自己的棋形有断点，快连接起来。',
    boardSize: 9,
    initialPosition: {
      black: [[4, 4], [4, 6], [5, 5]],
      white: [[3, 5], [5, 4]],
    },
    correctMove: { row: 4, col: 5 },
    hints: ['连接被白棋切断的黑子', '下在[4,5]使黑棋连成一片'],
    value: 1,
    difficulty: 1,
    type: 'connection',
    toPlay: 'black',
  },

  // ========== 初级 (2) ==========
  {
    id: 'eg-2-1',
    title: '扳了再挡',
    description: '黑先，在边上收官的常用手段。',
    boardSize: 9,
    initialPosition: {
      black: [[2, 1], [2, 2], [2, 3]],
      white: [[4, 1], [4, 2], [4, 3]],
    },
    correctMove: { row: 3, col: 1 },
    hints: ['先往对方家里走一步', '下在[3,1]缩小对方地盘'],
    value: 3,
    difficulty: 2,
    type: 'territory',
    toPlay: 'black',
  },
  {
    id: 'eg-2-2',
    title: '二路爬',
    description: '白先，利用二路爬破掉黑棋的地盘。',
    boardSize: 9,
    initialPosition: {
      black: [[2, 2], [2, 3], [2, 4], [2, 5]],
      white: [[1, 2], [1, 3], [1, 4]],
    },
    correctMove: { row: 1, col: 5 },
    hints: ['继续在二路向黑棋阵地渗透', '这叫"爬"'],
    value: 2,
    difficulty: 2,
    type: 'territory',
    toPlay: 'white',
  },
  {
    id: 'eg-2-3',
    title: '点杀',
    description: '黑先，在收官时也要注意对方的死活。',
    boardSize: 9,
    initialPosition: {
      black: [[1, 2], [1, 3], [1, 4], [2, 1], [3, 1], [4, 1], [5, 2], [5, 3], [5, 4], [2, 5], [3, 5], [4, 5]],
      white: [[2, 2], [2, 3], [2, 4], [3, 2], [3, 4], [4, 2], [4, 3], [4, 4]],
    },
    correctMove: { row: 3, col: 3 },
    hints: ['白棋这一块棋只剩一个“眼位”作为最后的气', '点在[3,3]，白棋整块被提掉'],
    value: 4,
    difficulty: 2,
    type: 'killing',
    toPlay: 'black',
  },
];

// 按难度分组
export const PUZZLES_BY_DIFFICULTY = ENDGAME_PUZZLES.reduce((acc, puzzle) => {
  if (!acc[puzzle.difficulty]) acc[puzzle.difficulty] = [];
  acc[puzzle.difficulty].push(puzzle);
  return acc;
}, {} as Record<number, EndgamePuzzle[]>);

// 难度名称
export const DIFFICULTY_NAMES: Record<number, string> = {
  1: '入门',
  2: '初级',
  3: '中级',
  4: '高级',
  5: '专家',
};

// 获取随机题目
export function getRandomPuzzle(maxDifficulty: number = 5): EndgamePuzzle {
  const available = ENDGAME_PUZZLES.filter(p => p.difficulty <= maxDifficulty);
  return available[Math.floor(Math.random() * available.length)];
}

// 获取指定难度的题目
export function getPuzzleByDifficulty(difficulty: number): EndgamePuzzle[] {
  return PUZZLES_BY_DIFFICULTY[difficulty] || [];
}
