/**
 * 围棋死活题和吃子题数据（101围棋风格）
 * 主要针对9路棋盘的简单题目
 *
 * 题型分类：
 * - capture: 吃子题（提掉对方棋子算赢）
 * - life_death: 死活题（做活或杀棋）
 * - tesuji: 手筋题（发现巧妙的着手）
 *
 * 胜利判定：
 * - capture: 提子数 >= capture_min 算赢
 * - life_death: 精确匹配正解路径
 * - tesuji: 精确匹配或提子判定
 */

/** 题目分类 */
export type TsumegoCategory = 'capture' | 'life_death' | 'tesuji';

/** 难度等级 */
export type TsumegoDifficulty = 1 | 2 | 3 | 4 | 5;

/** 判定方式 */
export type TsumegoWinCondition = 'exact_move' | 'capture' | 'live';

export interface TsumegoProblem {
  id: string;
  title: string;
  description: string;
  category: TsumegoCategory;
  difficulty: TsumegoDifficulty;
  boardSize: number;
  /** 初始棋盘位置 */
  initialPosition: {
    black: number[][];
    white: number[][];
  };
  /** 正解 */
  solution: {
    /** 主解法：每步坐标 [row, col] */
    moves: number[][];
    /** 替代正确答案 */
    alternative_moves?: number[][][];
    /** 解说 */
    explanation: string;
    /** 胜利判定方式 */
    win_condition: TsumegoWinCondition;
    /** capture 模式下需提掉的最少白子数 */
    capture_min?: number;
  };
  /** 标签 */
  tags: string[];
  /** 提示（逐步给出） */
  hints: string[];
}

// ============================================================
// 吃子题（入门）
// ============================================================
const CAPTURE_PROBLEMS: TsumegoProblem[] = [
  // ---- 1颗子提子 ----
  {
    id: 'cap-001',
    title: '提掉单子',
    description: '白子只剩1口气了！找到最后一口气，提掉白子。',
    category: 'capture',
    difficulty: 1,
    boardSize: 9,
    initialPosition: {
      black: [[2, 1], [3, 2], [2, 3]],
      white: [[2, 2]],
    },
    solution: {
      moves: [[1, 2]],
      explanation: '白子被黑子从左、下、右三面围住，只剩上方1口气。堵住最后一口气就能提掉它！',
      win_condition: 'capture',
      capture_min: 1,
    },
    tags: ['吃子', '入门', '1口气'],
    hints: ['看看白子还有哪个方向是空的？', '白子上方是空的，下在那里！'],
  },
  {
    id: 'cap-002',
    title: '角上提子',
    description: '角上的白子只有1口气了！角上棋子气最少，最容易吃。',
    category: 'capture',
    difficulty: 1,
    boardSize: 9,
    initialPosition: {
      black: [[0, 1]],
      white: [[0, 0]],
    },
    solution: {
      moves: [[1, 0]],
      explanation: '角上的棋子只有2口气，是最容易被吃的地方。堵住最后一口气就能提掉！',
      win_condition: 'capture',
      capture_min: 1,
    },
    tags: ['吃子', '入门', '角'],
    hints: ['角上的子气最少', '白子下方的空位就是最后一口气'],
  },
  {
    id: 'cap-003',
    title: '边上提子',
    description: '边上的白子只有1口气了！提掉它。',
    category: 'capture',
    difficulty: 1,
    boardSize: 9,
    initialPosition: {
      // 白[4,1]邻居[3,1]黑 [5,1]黑 [4,0]黑 [4,2]空 → 1气[4,2] ✓
      black: [[3, 1], [5, 1], [4, 0]],
      white: [[4, 1]],
    },
    solution: {
      moves: [[4, 2]],
      explanation: '边上的子只有3口气，比中间的4口气少。堵住最后一口气就能提掉！',
      win_condition: 'capture',
      capture_min: 1,
    },
    tags: ['吃子', '入门', '边'],
    hints: ['边上的子只有3口气', '找找白子还有什么方向没被堵住'],
  },
  {
    id: 'cap-004',
    title: '中间提子',
    description: '中间的白子被三面围住，只剩1口气！提掉它。',
    category: 'capture',
    difficulty: 1,
    boardSize: 9,
    initialPosition: {
      // 白[4,4]邻居[3,4]黑 [5,4]黑 [4,3]黑 [4,5]空 → 1气[4,5] ✓
      black: [[3, 4], [5, 4], [4, 3]],
      white: [[4, 4]],
    },
    solution: {
      moves: [[4, 5]],
      explanation: '中间的棋子有4口气，需要堵住全部4口气才能提掉。堵住最后一口气就能提！',
      win_condition: 'capture',
      capture_min: 1,
    },
    tags: ['吃子', '入门'],
    hints: ['数一数白子有几口气', '找到唯一的空位下子'],
  },
  // ---- 2颗子提子 ----
  {
    id: 'cap-005',
    title: '连子提子',
    description: '两颗白子连在一起，共享气，只剩1口气了！提掉它们！',
    category: 'capture',
    difficulty: 2,
    boardSize: 9,
    initialPosition: {
      // 白[3,3][3,4]水平相连
      // [2,3]黑 [4,3]黑 [3,2]黑 → [3,5]气
      // [2,4]黑 [4,4]黑 [3,5]空 → [3,5]气
      // 共享气: [3,5] = 1气 ✓
      black: [[2, 3], [4, 3], [3, 2], [2, 4], [4, 4]],
      white: [[3, 3], [3, 4]],
    },
    solution: {
      moves: [[3, 5]],
      explanation: '相连的棋子共享气，堵住共享的气可以同时威胁多颗子。一气提两子！',
      win_condition: 'capture',
      capture_min: 2,
    },
    tags: ['吃子', '连子', '入门'],
    hints: ['两颗白子共享气', '找到它们共享的那口气'],
  },
  {
    id: 'cap-006',
    title: '一气提三子',
    description: '三颗白子连在一起，只剩1口气了！提掉它们！',
    category: 'capture',
    difficulty: 2,
    boardSize: 9,
    initialPosition: {
      // 白[3,3][3,4][3,5]水平三连
      // [2,3]黑 [4,3]黑 [3,2]空 → [3,2]气
      // [2,4]黑 [4,4]黑 → 无贡献气
      // [2,5]黑 [4,5]黑 [3,6]黑 → 无贡献气
      // 共享气: [3,2] = 1气 ✓
      black: [[2, 3], [4, 3], [2, 4], [4, 4], [2, 5], [4, 5], [3, 6]],
      white: [[3, 3], [3, 4], [3, 5]],
    },
    solution: {
      moves: [[3, 2]],
      explanation: '连接的棋子越多，一旦被围住，整串都会被提！一下提三子，太爽了！',
      win_condition: 'capture',
      capture_min: 3,
    },
    tags: ['吃子', '连子'],
    hints: ['三颗白子共享气', '它们只剩1口气了，堵住它！'],
  },
  // ---- 叫吃后提子 ----
  {
    id: 'cap-007',
    title: '简单叫吃提子',
    description: '白子只剩1口气了！堵住最后一口气提掉它！',
    category: 'capture',
    difficulty: 1,
    boardSize: 9,
    initialPosition: {
      // 白[3,4]邻居[2,4]空 [4,4]黑 [3,3]黑 [3,5]黑 → 1气[2,4] ✓
      black: [[4, 4], [3, 3], [3, 5]],
      white: [[3, 4]],
    },
    solution: {
      moves: [[2, 4]],
      explanation: '叫吃就是让对方只剩1口气。堵住最后一口气就能提掉它！',
      win_condition: 'capture',
      capture_min: 1,
    },
    tags: ['叫吃', '入门'],
    hints: ['白子还剩哪口气？', '从上方堵住最后一口气'],
  },
  {
    id: 'cap-008',
    title: '抱吃',
    description: '白子被黑子从两侧"抱"住，只剩1口气了！提掉它！',
    category: 'capture',
    difficulty: 2,
    boardSize: 9,
    initialPosition: {
      // 白[3,1]邻居[2,1]空 [4,1]黑 [3,0]黑(边) [3,2]黑
      // 实际白[3,1]邻居[2,1]空 [4,1]黑 [3,0]空 [3,2]黑 → 2气
      // 加黑[3,0]: 白只剩[2,1]这1气 ✓
      black: [[4, 1], [3, 2], [3, 0]],
      white: [[3, 1]],
    },
    solution: {
      moves: [[2, 1]],
      explanation: '抱吃：用两颗子从两侧夹住对方，对方不管怎么走都会被吃。',
      win_condition: 'capture',
      capture_min: 1,
    },
    tags: ['抱吃', '手筋'],
    hints: ['从白子上方包抄', '让白子无处可逃'],
  },
  {
    id: 'cap-009',
    title: '门吃',
    description: '白子被围住，只剩1口气了！像关门一样提掉它！',
    category: 'capture',
    difficulty: 2,
    boardSize: 9,
    initialPosition: {
      // 白[2,2]邻居[1,2]空 [3,2]黑 [2,1]空 [2,3]黑 → 2气
      // 加黑[2,1]: 白只剩[1,2]这1气 ✓
      black: [[3, 2], [2, 3], [2, 1]],
      white: [[2, 2]],
    },
    solution: {
      moves: [[1, 2]],
      explanation: '门吃：像关上门一样堵住对方的逃跑路线，让对方只能束手就擒。',
      win_condition: 'capture',
      capture_min: 1,
    },
    tags: ['门吃', '手筋'],
    hints: ['白子想往哪个方向逃？', '堵住它逃跑的"门"'],
  },
  {
    id: 'cap-010',
    title: '双叫吃提子',
    description: '一步棋同时叫吃两块白棋！对方只能救一块，另一块就被提掉。',
    category: 'capture',
    difficulty: 3,
    boardSize: 9,
    initialPosition: {
      // 白[2,4]邻居[1,4]黑 [3,4]空 [2,3]空 [2,5]黑 → 2气
      // 白[4,4]邻居[3,4]空 [5,4]黑 [4,3]空 [4,5]黑 → 2气
      // 加黑[2,3][4,3]:
      // 白[2,4]邻居[1,4]黑 [3,4]空 [2,3]黑 [2,5]黑 → 1气[3,4] ✓
      // 白[4,4]邻居[3,4]空 [5,4]黑 [4,3]黑 [4,5]黑 → 1气[3,4] ✓
      // 黑下[3,4]同时提两块！
      black: [[1, 4], [2, 3], [2, 5], [5, 4], [4, 3], [4, 5]],
      white: [[2, 4], [4, 4]],
    },
    solution: {
      moves: [[3, 4]],
      explanation: '双叫吃：找到两块棋共享的关键点，一步棋同时提掉两块棋！',
      win_condition: 'capture',
      capture_min: 2,
    },
    tags: ['双叫吃', '手筋'],
    hints: ['有没有一步棋能同时提掉两块白棋？', '找两块白棋中间的关键位置'],
  },
];

// ============================================================
// 死活题（基本）
// ============================================================
const LIFE_DEATH_PROBLEMS: TsumegoProblem[] = [
  {
    id: 'ld-001',
    title: '做一只眼',
    description: '黑棋被包围了！在内部做一个"眼"，让这块棋更有生机。',
    category: 'life_death',
    difficulty: 2,
    boardSize: 9,
    initialPosition: {
      black: [[2, 2], [2, 3], [3, 2]],
      white: [[1, 2], [1, 3], [2, 1], [3, 1]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '眼：被己方棋子围住的空点。有眼的棋比没眼的棋在对杀中更有优势。下在[3,3]做眼，形成L形结构。',
      win_condition: 'exact_move',
    },
    tags: ['做眼', '入门'],
    hints: ['你需要在自己的棋子中间做一个空点', '下在[3,3]形成眼'],
  },
  {
    id: 'ld-002',
    title: '真眼与假眼',
    description: '白棋准备占据眼角，把你的眼变成假眼！快守住关键的眼角。',
    category: 'life_death',
    difficulty: 3,
    boardSize: 9,
    initialPosition: {
      // [2,2]是眼位，周围黑子[1,2][2,1][3,2][2,3]
      // 眼角是[1,1][1,3][3,1][3,3]
      // 白棋已占[1,1]，黑棋需占[3,3]确保至少3个角是黑的（中心眼）
      black: [[1, 2], [2, 1], [3, 2], [2, 3], [1, 3], [3, 1]],
      white: [[1, 1], [0, 2], [2, 0], [4, 2], [2, 4]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '真眼与假眼：中心眼位需要占据至少3个对角点才是真眼。白棋已经占了一个角，黑棋必须抢占另一个角！',
      win_condition: 'exact_move',
    },
    tags: ['真眼', '假眼'],
    hints: ['注意眼位的四个角', '占据[3,3]防止白棋破眼'],
  },
  {
    id: 'ld-003',
    title: '做两只眼活棋',
    description: '黑棋内部空间很大，找到做活的关键点，确保两只眼。',
    category: 'life_death',
    difficulty: 3,
    boardSize: 9,
    initialPosition: {
      // 直四形状：[2,2][2,3][2,4][2,5]是空点，占据中间任一点可活
      black: [[1, 2], [1, 3], [1, 4], [1, 5], [2, 1], [2, 6], [3, 2], [3, 3], [3, 4], [3, 5]],
      white: [[0, 2], [0, 3], [0, 4], [0, 5], [1, 1], [1, 6], [2, 0], [2, 7], [3, 1], [3, 6], [4, 2], [4, 3], [4, 4], [4, 5]],
    },
    solution: {
      moves: [[2, 3]],
      alternative_moves: [[[2, 4]]],
      explanation: '直四做活：内部有四个连续空点时，占据中间的任意一个位置都可以将其分为两部分，从而形成两只眼。',
      win_condition: 'exact_move',
    },
    tags: ['两眼活棋', '活棋'],
    hints: ['直四的要点在中间', '占据[2,3]或[2,4]都可以活棋'],
  },
  {
    id: 'ld-004',
    title: '破眼杀棋',
    description: '白棋想做眼活棋！你要在对方眼位上落子，破坏它的眼。',
    category: 'life_death',
    difficulty: 3,
    boardSize: 9,
    initialPosition: {
      black: [[0, 2], [0, 3], [1, 1], [2, 1], [3, 1], [4, 2], [4, 3], [4, 4]],
      white: [[1, 2], [1, 3], [1, 4], [2, 2], [2, 4], [3, 2], [3, 4]],
    },
    solution: {
      moves: [[2, 3]],
      explanation: '破眼：在对方想做眼的关键位置落子，使其无法做出真眼，整块棋就危险了！',
      win_condition: 'exact_move',
    },
    tags: ['破眼', '杀棋'],
    hints: ['白棋内部有空点想做眼', '抢在白棋前面占据那个关键空点'],
  },
  {
    id: 'ld-005',
    title: '直三做活',
    description: '黑棋内部有3个空点排成一直线。找到做活的要点——下在中间！',
    category: 'life_death',
    difficulty: 4,
    boardSize: 9,
    initialPosition: {
      // 直三：内部空点[3,2][3,3][3,4]
      black: [[2, 2], [2, 3], [2, 4], [3, 1], [3, 5], [4, 2], [4, 3], [4, 4]],
      white: [[1, 2], [1, 3], [1, 4], [2, 1], [2, 5], [3, 0], [3, 6], [4, 1], [4, 5], [5, 2], [5, 3], [5, 4]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '直三的中间是做活要点！占据中间后，左右两边各成一只眼，整块棋就活了。',
      win_condition: 'exact_move',
    },
    tags: ['直三', '死活', '做活要点'],
    hints: ['直三的要点在中间', '下在[3,3]试试看'],
  },
  {
    id: 'ld-006',
    title: '弯三做活',
    description: '黑棋内部有3个空点排成弯形（L形）。找到做活的要点！',
    category: 'life_death',
    difficulty: 4,
    boardSize: 9,
    initialPosition: {
      // 弯三：内部空点[2,2], [3,2], [3,3]
      black: [[1, 2], [2, 1], [2, 3], [3, 1], [3, 4], [4, 2], [4, 3]],
      white: [[0, 2], [1, 1], [1, 3], [2, 0], [2, 4], [3, 0], [3, 5], [4, 1], [4, 4], [5, 2], [5, 3]],
    },
    solution: {
      moves: [[3, 2]],
      explanation: '弯三的要点是拐角处！下在[3,2]后，内部空间被分割成两个独立的部分，形成两只眼。',
      win_condition: 'exact_move',
    },
    tags: ['弯三', '死活', '做活要点'],
    hints: ['弯三的要点在拐角处', '下在[3,2]试试看'],
  },
  {
    id: 'ld-007',
    title: '直三破眼',
    description: '白棋内部有3个空点排成一直线（直三）。你要破坏它的眼！下在哪里？',
    category: 'life_death',
    difficulty: 4,
    boardSize: 9,
    initialPosition: {
      // 白棋直三，黑先杀。白棋占据[3,2][3,3][3,4]周围
      white: [[2, 2], [2, 3], [2, 4], [3, 1], [3, 5], [4, 2], [4, 3], [4, 4]],
      black: [[1, 2], [1, 3], [1, 4], [2, 1], [2, 5], [3, 0], [3, 6], [4, 1], [4, 5], [5, 2], [5, 3], [5, 4]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '直三的中间是杀棋要点！抢先占据中间点，白棋就无法做出两只眼，整块棋就死了。',
      win_condition: 'exact_move',
    },
    tags: ['直三', '破眼', '杀棋'],
    hints: ['直三的杀棋要点和做活要点相同', '抢占中间位置[3,3]！'],
  },
];

// ============================================================
// 手筋题
// ============================================================
const TESUJI_PROBLEMS: TsumegoProblem[] = [
  {
    id: 'tsj-001',
    title: '枷吃',
    description: '不需要紧贴白子，从远处就能把它罩住！这叫"枷吃"。',
    category: 'tesuji',
    difficulty: 3,
    boardSize: 9,
    initialPosition: {
      black: [[3, 3], [3, 5], [5, 3], [5, 5], [4, 2]],
      white: [[4, 4], [4, 3]],
    },
    solution: {
      moves: [[4, 5]],
      explanation: '枷吃：不直接紧气，而是从远处[4,5]形成包围圈，封住对方所有逃跑方向！',
      win_condition: 'capture',
      capture_min: 1,
    },
    tags: ['枷吃', '手筋'],
    hints: ['不需要紧贴白子', '从远处"罩"住它，封住最后一口气'],
  },
  {
    id: 'tsj-002',
    title: '扑',
    description: '在对方眼位或虎口中强行投子，破坏对方的形状！找到"扑"的位置。',
    category: 'tesuji',
    difficulty: 3,
    boardSize: 9,
    initialPosition: {
      // 经典的扑的形状：白棋在边上形成一个虎口，黑棋扑进去
      black: [[3, 0], [4, 1], [5, 0]],
      white: [[3, 1], [5, 1], [4, 2]],
    },
    solution: {
      moves: [[4, 0]],
      explanation: '扑：下在对方的虎口[4,0]处，虽然会被对方提掉，但能成功破坏对方的眼位，是杀棋或提子的重要手段。',
      win_condition: 'exact_move',
    },
    tags: ['扑', '手筋', '破坏眼位'],
    hints: ['白棋在边上有一个虎口', '勇敢地投子进去！'],
  },
  {
    id: 'tsj-003',
    title: '接不归',
    description: '白子正在逃跑，但怎么跑都逃不掉——这就是"接不归"！',
    category: 'tesuji',
    difficulty: 3,
    boardSize: 9,
    initialPosition: {
      black: [[2, 2], [2, 3], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2]],
      white: [[3, 2], [3, 3], [2, 1], [4, 1]],
    },
    solution: {
      moves: [[3, 1]],
      explanation: '接不归：白棋[3,2][3,3]两子虽然想连回[2,1]或[4,1]，但被黑棋在[3,1]一断，白棋就接不回去了。',
      win_condition: 'capture',
      capture_min: 2,
    },
    tags: ['接不归', '手筋'],
    hints: ['白子想往哪里逃？', '堵住它唯一的逃跑方向'],
  },
  {
    id: 'tsj-004',
    title: '征子',
    description: '像赶羊一样，一步步把白子赶到棋盘边上去！这叫"征子"或"扭羊头"。',
    category: 'tesuji',
    difficulty: 4,
    boardSize: 9,
    initialPosition: {
      black: [[3, 4], [4, 3]],
      white: [[4, 4]],
    },
    solution: {
      moves: [[5, 4]],
      explanation: '征子：从侧面[5,4]叫吃，将白棋往棋盘边缘赶，使其气数始终无法增加。',
      win_condition: 'capture',
      capture_min: 1,
    },
    tags: ['征子', '手筋'],
    hints: ['从正确方向开始叫吃', '让白子只能往边角方向逃'],
  },
  {
    id: 'tsj-005',
    title: '乌龟不出头',
    description: '白子被围在狭小空间，想出头逃跑，用手筋封住它！',
    category: 'tesuji',
    difficulty: 4,
    boardSize: 9,
    initialPosition: {
      // 乌龟不出头：白[3,3][3,4]被围，黑[4,3]封头
      black: [[2, 2], [2, 3], [2, 4], [3, 2], [3, 5], [4, 4], [4, 5], [5, 3]],
      white: [[3, 3], [3, 4], [4, 3]],
    },
    solution: {
      moves: [[4, 2]],
      explanation: '乌龟不出头：白棋[4,3]想向外冲，黑棋[4,2]一挡，白棋由于气紧无法逃脱。',
      win_condition: 'capture',
      capture_min: 3,
    },
    tags: ['乌龟不出头', '手筋'],
    hints: ['堵住白棋向外冲的路线', '利用白棋气紧的弱点'],
  },
  {
    id: 'tsj-006',
    title: '倒扑',
    description: '故意送一子给对方吃，反而能把对方全部提掉！找到"倒扑"的位置。',
    category: 'tesuji',
    difficulty: 4,
    boardSize: 9,
    initialPosition: {
      // 经典的倒扑形状
      black: [[1, 2], [2, 1], [3, 1], [4, 2], [4, 3], [3, 4], [2, 4], [1, 3]],
      white: [[2, 2], [3, 2], [2, 3]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '倒扑：下在[3,3]故意送吃，由于白棋只有这一口气，黑棋落子后可以立即提掉白棋三子！',
      win_condition: 'capture',
      capture_min: 3,
    },
    tags: ['倒扑', '对杀', '手筋'],
    hints: ['有时候送一子给对方吃反而有利', '下在[3,3]试试看'],
  },
  {
    id: 'tsj-007',
    title: '挖',
    description: '在对方两子之间的空位"挖"进去！可以切断对方的连接。',
    category: 'tesuji',
    difficulty: 3,
    boardSize: 9,
    initialPosition: {
      // 两个白子[3,2]和[3,4]中间是空的
      black: [[2, 2], [2, 3], [2, 4], [4, 2], [4, 3], [4, 4]],
      white: [[3, 2], [3, 4]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '挖：在对方两颗间距一格的棋子中间下子，直接切断它们的联系！',
      win_condition: 'exact_move',
    },
    tags: ['挖', '手筋', '切断'],
    hints: ['白子之间有空隙', '找到切断它们的位置'],
  },
  {
    id: 'tsj-008',
    title: '尖',
    description: '用"尖"的手法，巧妙地吃掉白子！尖就是斜着下一步。',
    category: 'tesuji',
    difficulty: 3,
    boardSize: 9,
    initialPosition: {
      black: [[4, 4], [2, 5]],
      white: [[3, 4], [4, 5]],
    },
    solution: {
      moves: [[3, 5]],
      explanation: '尖：斜着下一子[3,5]，既攻击了白棋的连接点，又保持了自己的连接。',
      win_condition: 'exact_move',
    },
    tags: ['尖', '手筋'],
    hints: ['斜着下试试', '找到能同时威胁两颗白子的位置'],
  },
];

// ============================================================
// 导出全部题目
// ============================================================
export const ALL_TSUMEGO_PROBLEMS: TsumegoProblem[] = [
  ...CAPTURE_PROBLEMS,
  ...LIFE_DEATH_PROBLEMS,
  ...TESUJI_PROBLEMS,
];

/** 按分类获取题目 */
export function getProblemsByCategory(category: TsumegoCategory): TsumegoProblem[] {
  return ALL_TSUMEGO_PROBLEMS.filter(p => p.category === category);
}

/** 按难度获取题目 */
export function getProblemsByDifficulty(difficulty: TsumegoDifficulty): TsumegoProblem[] {
  return ALL_TSUMEGO_PROBLEMS.filter(p => p.difficulty <= difficulty);
}

/** 获取题目分类信息 */
export const TSUMEGO_CATEGORIES: { key: TsumegoCategory; label: string; icon: string; description: string; color: string }[] = [
  { key: 'capture', label: '吃子题', icon: '🤏', description: '学习如何提掉对方的棋子', color: 'emerald' },
  { key: 'life_death', label: '死活题', icon: '⚔️', description: '学习做眼活棋和破眼杀棋', color: 'red' },
  { key: 'tesuji', label: '手筋题', icon: '✨', description: '学习巧妙的着手和战术', color: 'purple' },
];

/** 难度标签 */
export const DIFFICULTY_LABELS: Record<TsumegoDifficulty, string> = {
  1: '入门',
  2: '初级',
  3: '中级',
  4: '高级',
  5: '专家',
};
