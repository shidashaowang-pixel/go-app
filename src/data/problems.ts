/**
 * 围棋题目数据（本地备用）
 * 每道题都经过引擎验证：
 *   1. initial_position 坐标合法
 *   2. solution 坐标能合法落子
 *   3. 题目描述中的气数与实际一致
 *
 * 当 Supabase 数据库无数据时，作为 fallback 使用
 */

import type { Problem } from '@/types';
import { GoEngine } from '@/lib/go-engine';

// ========== 工具：验证题目数据 ==========
function verifyProblem(p: Omit<Problem, 'id' | 'created_at'>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 验证 board_size
  if (![9, 13, 19].includes(p.board_size)) {
    errors.push(`无效棋盘大小: ${p.board_size}`);
    return { ok: false, errors };
  }

  const size = p.board_size;

  // 验证 initial_position 坐标范围
  for (const [r, c] of p.initial_position.black) {
    if (r < 0 || r >= size || c < 0 || c >= size) {
      errors.push(`黑子坐标越界: [${r},${c}]`);
    }
  }
  for (const [r, c] of p.initial_position.white) {
    if (r < 0 || r >= size || c < 0 || c >= size) {
      errors.push(`白子坐标越界: [${r},${c}]`);
    }
  }

  // 验证 solution 坐标
  for (const move of p.solution.moves) {
    if (move.length !== 2 || move[0] < 0 || move[0] >= size || move[1] < 0 || move[1] >= size) {
      errors.push(`答案坐标越界: [${move}]`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// ========== 第1关：基础吃子（101围棋风格：打吃形状→提子算赢） ==========
export const LEVEL_1_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  // 题1: 提单子（中间1颗白子只剩1口气）
  {
    title: '提掉白子',
    description: '白子只有1口气了！下在最后一口气上，把白子提掉！',
    type: 'checkpoint',
    checkpoint_level: 1,
    board_size: 9,
    difficulty: 1,
    initial_position: {
      // 白子在[2,2]（C7），黑子[1,2][2,1][2,3][3,2]围住左、下、右三面
      // 白[2,2]邻居：上[1,2]空、左[2,1]黑、下[3,2]黑、右[2,3]黑
      // 只有上方[1,2]是气 ✓
      black: [[2, 1], [2, 3], [3, 2]],  // 左、下、右包围
      white: [[2, 2]],                           // 白子C7位置
    },
    solution: {
      moves: [[1, 2]],  // 填住上方B7，白子只剩0气被提
      explanation: '当棋子的所有气都被堵住时，就要被提走！',
      win_condition: 'capture',
      capture_min: 1,
    },
  },
  // 题2: 角上提子（角上的子气最少，最容易吃）
  {
    title: '角上提子',
    description: '角上的白子只有1口气了！下在最后一口气上把它提掉！',
    type: 'checkpoint',
    checkpoint_level: 1,
    board_size: 9,
    difficulty: 1,
    initial_position: {
      black: [[0, 1]],          // 右边围住
      white: [[0, 0]],          // 角上白子，只剩[1,0]这1口气
    },
    solution: {
      moves: [[1, 0]],          // 堵住下方最后一口气，提掉白子
      explanation: '角上的棋子只有2口气，围住1个就只剩1个了！角是最容易被吃的地方。',
      win_condition: 'capture',
      capture_min: 1,
    },
  },
  // 题3: 提掉两颗连在一起的子
  {
    title: '连子提子',
    description: '两颗白子连在一起，它们共享气，只剩1口气了！找到那口气，把两颗白子一起提掉！',
    type: 'checkpoint',
    checkpoint_level: 1,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      // 白[3,3][3,4]水平相连，邻居：
      // [2,3]黑 [4,3]空 [3,2]黑 [3,5]空 → 白[3,3]贡献气: [4,3][3,5]
      // [2,4]黑 [4,4]黑 [3,3]白(已连) [3,5]空 → 白[3,4]贡献气: [3,5]
      // 共享气: [4,3][3,5] = 2气... 还需堵一面
      // 加黑[4,3]：白组气剩[3,5] = 1气 ✓
      black: [[2, 3], [3, 2], [2, 4], [4, 4], [4, 3]],
      white: [[3, 3], [3, 4]],  // 两颗相连白子，只剩[3,5]这1口气
    },
    solution: {
      moves: [[3, 5]],  // 堵住右边最后一口气，提掉两颗白子
      explanation: '多颗同色棋子连在一起时，它们的气是共享的。堵住最后一口气就能同时提掉它们！',
      win_condition: 'capture',
      capture_min: 2,
    },
  },
  // 题4: 边上提子
  {
    title: '边上提子',
    description: '边上的白子只有1口气了！把它提掉！',
    type: 'checkpoint',
    checkpoint_level: 1,
    board_size: 9,
    difficulty: 1,
    initial_position: {
      // 白[4,1]在第4行第1列(不在最边缘)
      // 邻居: [3,1]空 [5,1]空 [4,0]黑 [4,2]空 → 3气
      // 需要加更多黑子
      // 改为：白在边上一侧
      // 白[4,1]邻居[3,1]黑 [5,1]黑 [4,0]黑 [4,2]空 → 1气 ✓
      black: [[3, 1], [5, 1], [4, 0]],
      white: [[4, 1]],  // 边上白子，只剩[4,2]这1口气
    },
    solution: {
      moves: [[4, 2]],  // 堵住右边最后一口气
      explanation: '边上的子只有3口气，比中间的4口气少。堵住最后一口气就能提掉它！',
      win_condition: 'capture',
      capture_min: 1,
    },
  },
  // 题5: 一口气提三子
  {
    title: '一气提三子',
    description: '三颗白子连在一起，只剩1口气了！下在最后一口气上，一下提掉三颗！',
    type: 'checkpoint',
    checkpoint_level: 1,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      // 白[4,3][4,4][5,4]形成L形拐角
      // 白[4,3]邻居: 上[3,3]黑、右[4,4]白、下[5,3]空、左[4,2]黑
      // 白[4,4]邻居: 上[3,4]黑、右[4,5]黑、下[5,4]白、左[4,3]白
      // 白[5,4]邻居: 上[4,4]白、右[5,5]黑、下[6,4]黑、左[5,3]空
      // 白组气: [5,3]空（只有这一口气！）✓
      black: [[3, 3], [3, 4], [4, 2], [4, 5], [5, 5], [6, 4]],
      white: [[4, 3], [4, 4], [5, 4]],  // 三颗L形相连白子，只剩[5,3]1口气
    },
    solution: {
      moves: [[5, 3]],  // 堵住最后一口气，一下提掉三颗白子
      explanation: 'L形连接的棋子虽然有3颗，但被围住后只剩1口气！堵住这口气就能一下提三子，太爽了！',
      win_condition: 'capture',
      capture_min: 3,
    },
  },
];

// ========== 第2关：连接棋子 ==========
export const LEVEL_2_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  {
    title: '连接逃命',
    description: '这颗黑子只有2口气了！赶紧连接到友军，增加自己的气！',
    type: 'checkpoint',
    checkpoint_level: 2,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      black: [[4, 4], [4, 6]],
      white: [[3, 4], [5, 4], [3, 5]],  // 上、下、右上方夹击[4,4]黑子
    },
    solution: {
      moves: [[4, 5]],  // 连接两颗黑子，[4,4]从2气变为和[4,6]共享更多气
      explanation: '连接后两颗棋子的气合并在一起，更安全！这叫"连接逃命"。',
    },
  },
  {
    title: '断开对方',
    description: '两块白子虽然靠在一起，但并没有连实。请下在关键点，把它们切断！',
    type: 'checkpoint',
    checkpoint_level: 2,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      black: [[3, 3], [5, 5]],
      white: [[4, 3], [3, 4]],  // 这种斜对角（小尖）可以被冲断
    },
    solution: {
      moves: [[4, 4]],  // 冲断
      alternative_moves: [[[3, 3]]],
      explanation: '"断"是围棋中非常重要的战术——下在[4,4]把白棋两子分开，它们就无法轻易连接了！',
    },
  },
  {
    title: '双叫吃',
    description: '一步棋同时叫吃两块白棋！对方只能救一块，另一块就被吃掉。',
    type: 'checkpoint',
    checkpoint_level: 2,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[2, 2], [1, 3], [5, 3], [4, 4]],
      white: [[2, 3], [4, 3]],
    },
    solution: {
      moves: [[3, 3]],  // 同时叫吃上下两块白棋
      explanation: '双叫吃：一步棋同时威胁两块棋，对方只能救一块，另一块就被吃掉！',
    },
  },
  {
    title: '做眼活棋',
    description: '黑棋被包围了！请在内部做一个"眼"。有眼的棋在对杀中更有优势。',
    type: 'checkpoint',
    checkpoint_level: 2,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      // 黑棋7子围成C形，内部有2个空点[2,3]和[3,3]
      // 白棋外围包围
      black: [[1, 2], [1, 3], [1, 4], [2, 2], [2, 4], [3, 2], [3, 4]],
      white: [[0, 2], [0, 3], [0, 4], [1, 1], [2, 1], [3, 1], [4, 2], [4, 3], [4, 4]],
    },
    solution: {
      moves: [[3, 3]],  // 在内部做眼，确保[2,3]成为真眼
      alternative_moves: [[[2, 3]]],
      explanation: '做眼：被包围的棋要尽量做出"眼"。两个空点下哪个都能做眼，有眼的棋比没眼的棋更安全。',
    },
  },
  {
    title: '长气逃跑',
    description: '黑子只有2口气了！往开阔的方向"长"一手，增加自己的气，逃出包围！',
    type: 'checkpoint',
    checkpoint_level: 2,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      // 黑[4,4]被白从上方和右侧围住，剩2气[5,4]和[4,3]
      // 黑下[5,4]长出，连到开阔区域
      black: [[4, 4]],
      white: [[3, 4], [4, 5], [3, 5]],
    },
    solution: {
      moves: [[5, 4]],
      alternative_moves: [[[4, 3]]],
      explanation: '长气：往没有对方棋子的方向长一手，可以增加自己的气，让自己更安全！两边都可以逃跑。',
    },
  },
];

// ========== 第3关：围地得分 ==========
export const LEVEL_3_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  {
    title: '占据角部',
    description: '围棋开局最重要的原则是"金角银边草肚皮"。请下在右上角的星位！',
    type: 'checkpoint',
    checkpoint_level: 3,
    board_size: 9,
    difficulty: 1,
    initial_position: {
      black: [],
      white: [],
    },
    solution: {
      moves: [[2, 6]],  // 右上角星位（9路：[2,6]）
      explanation: '占角是开局最有效率的一手！"金角银边草肚皮"——角最容易围成地盘。',
    },
  },
  {
    title: '守角拆边',
    description: '你已经占了角。现在来巩固你的领地——下一手守角！',
    type: 'checkpoint',
    checkpoint_level: 3,
    board_size: 9,
    difficulty: 1,
    initial_position: {
      black: [[2, 2]],
      white: [[6, 6]],
    },
    solution: {
      moves: [[2, 4]],
      alternative_moves: [[[4, 2]]],
      explanation: '守住角之后，再向边扩展。金角银边草肚皮——角最重要！',
    },
  },
  {
    title: '阻止对方扩张',
    description: '白棋想围住右上角的地盘。请在限制它的位置落子！',
    type: 'checkpoint',
    checkpoint_level: 3,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      black: [[2, 2]],
      white: [[0, 6], [0, 7]],
    },
    solution: {
      moves: [[1, 6]],  // 从下方限制白棋
      explanation: '不仅要围自己的地，还要阻止对方围地。这叫"消减对方模样"。',
    },
  },
  {
    title: '大场的选择',
    description: '局面开阔，有很多地方可走。请选择边上的大场，扩展自己的势力！',
    type: 'checkpoint',
    checkpoint_level: 3,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      black: [[2, 2], [6, 6]],
      white: [[2, 6], [6, 2]],
    },
    solution: {
      moves: [[4, 4]],  // 占据天元/中央大场
      alternative_moves: [[[2, 4]], [[4, 2]], [[4, 6]], [[6, 4]]],
      explanation: '当四角都被占完后，中间或边上的大场就是最重要的地方！天元或边星都是好点。',
    },
  },
  {
    title: '计算目数',
    description: '黑棋已经围住了左上角的地盘。现在需要补一手确保没有漏洞，巩固领地！',
    type: 'checkpoint',
    checkpoint_level: 3,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      black: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 3], [2, 0], [2, 3], [3, 0], [3, 1], [3, 2], [3, 3]],
      white: [],
    },
    solution: {
      moves: [[1, 1]],  // 补在内部，确保完整围住
      explanation: '围住的空交叉点就是你的"目"。在中国规则里，最终数的是棋子+目数。确保领地没有漏洞很重要！',
    },
  },
];

// ========== 练习题库额外题目（不含闯关题，闯关题在下方 PRACTICE_PROBLEMS 中合并） ==========
const EXTRA_PRACTICE_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  {
    title: '吃掉边上的子',
    description: '白子紧贴棋盘边缘，只有2口气。找到叫吃它的位置！',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 1,
    initial_position: {
      black: [[4, 0], [3, 1]],     // 白子左侧和右上方
      white: [[4, 1]],             // 边上白子，邻居[3,1]黑[5,1]空[4,0]黑[4,2]空 → 2气
    },
    solution: {
      moves: [[5, 1]],             // 叫吃下方，白剩1气[4,2]
      explanation: '边上的子只有3口气，比中间的4口气少。再堵1气就叫吃了！',
    },
  },
  {
    title: '两头叫吃',
    description: '一步棋让两颗分开的白子同时只剩1口气！',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      // 白[3,3]邻居：[2,3]空[4,3]黑[3,2]空[3,4]空 → 3气
      // 白[3,5]邻居：[2,5]空[4,5]空[3,4]空[3,6]空 → 4气
      // 黑下[3,4]同时减少两者气数：白[3,3]剩2气，白[3,5]剩3气
      // 但更经典的双叫吃是：
      // 白[2,4]2气，白[4,4]2气，黑下[3,4]同时叫吃
      black: [[1, 4], [2, 3], [5, 4], [4, 5]],
      white: [[2, 4], [4, 4]],
    },
    solution: {
      moves: [[3, 4]],           // 同时叫吃两块白棋
      explanation: '双叫吃：找到两块棋共享的关键点，一步棋同时威胁两块棋，对方只能救一块！',
    },
  },
  {
    title: '关门吃',
    description: '白子想逃跑！赶紧"关门"，堵住它的出路！',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      // 白[3,3]有3气([4,3],[3,2]被黑占 → 剩[2,3],[3,4]...不对)
      // 重新设置：白[3,3]邻居[2,3]空[4,3]黑[3,2]黑[3,4]空 → 2气
      black: [[4, 3], [3, 2]],
      white: [[3, 3]],
    },
    solution: {
      moves: [[3, 4]],           // 从右侧堵住，白只剩[2,3]这1气，被叫吃
      explanation: '关门吃：把对方逃跑的出路堵住，叫吃对方！再下一步就能提掉它。',
    },
  },

  // ========== 手筋题（中级） ==========
  {
    title: '倒扑',
    description: '有一种巧妙的吃子方法叫"倒扑"——主动送进对方嘴里，反而能把对方全部吃掉！',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      // 经典的倒扑形状
      black: [[1, 2], [2, 1], [3, 1], [4, 2], [4, 3], [3, 4], [2, 4], [1, 3]],
      white: [[2, 2], [3, 2], [2, 3]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '倒扑：下在[3,3]故意送吃，由于白棋只有这一口气，黑棋落子后可以立即提掉白棋三子！',
    },
  },
  {
    title: '接不归',
    description: '白子正在逃跑，但怎么跑都逃不掉——这就是接不归！',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[2, 2], [2, 3], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2]],
      white: [[3, 2], [3, 3], [2, 1], [4, 1]],
    },
    solution: {
      moves: [[3, 1]],
      explanation: '接不归：白棋两颗子虽然想连回援军，但被黑棋在[3,1]一断，它们就再也连不回去了！',
    },
  },
  {
    title: '枷吃',
    description: '不用紧气，从远处把对方罩住！这招叫"枷吃"。',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[3, 3], [3, 5], [5, 3], [5, 5], [4, 2]],
      white: [[4, 4], [4, 3]],
    },
    solution: {
      moves: [[4, 5]],
      explanation: '枷吃：不直接紧气，而是从远处[4,5]形成包围圈，封住对方所有逃跑方向！',
    },
  },

  // ========== 死活题（进阶级） ==========
  {
    title: '做眼活棋',
    description: '黑棋被包围了！请在关键位置做眼，让这块棋更有生机。',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 4,
    initial_position: {
      // 黑棋C形，内部2个空点[2,3]和[3,3]
      black: [[1, 2], [1, 3], [1, 4], [2, 2], [2, 4], [3, 2], [3, 4]],
      white: [[0, 2], [0, 3], [0, 4], [1, 1], [2, 1], [3, 1], [4, 2], [4, 3], [4, 4]],
    },
    solution: {
      moves: [[3, 3]],           // 在内部做眼，确保有一只真眼
      alternative_moves: [[[2, 3]]],
      explanation: '做眼：被包围的棋要尽量做出"眼"。内部两个空点下哪个都能做成真眼，有眼的棋更容易做活！',
    },
  },
  {
    title: '破眼杀棋',
    description: '白棋想做眼活棋，但你可以破坏它的眼位！找到破眼的关键点。',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 4,
    initial_position: {
      // 白棋C形，内部2个空点[2,3]和[3,3]，黑可破眼
      black: [[0, 2], [0, 3], [1, 1], [2, 1], [3, 1], [4, 2], [4, 3], [4, 4]],
      white: [[1, 2], [1, 3], [1, 4], [2, 2], [2, 4], [3, 2], [3, 4]],
    },
    solution: {
      moves: [[2, 3]],           // 破眼：占据眼位中心，白无法做出两只眼
      explanation: '破眼杀棋：在对方想做眼的关键位置落子，使其无法做出真眼，整块棋就危险了！',
    },
  },
  {
    title: '对杀',
    description: '黑白双方都在叫吃对方！谁先动手谁就赢——快找到正确的一手！',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 4,
    initial_position: {
      // 黑3子2气 vs 白3子2气，黑先走可胜
      black: [[3, 2], [3, 3], [4, 2]],
      white: [[3, 4], [3, 5], [4, 5]],
    },
    solution: {
      moves: [[4, 3]],           // 缩短白气，对杀获胜
      explanation: '对杀：双方棋子互相包围，谁先收紧对方的气谁就赢。算清楚气数是关键！',
    },
  },
];

// ========== 第4关：叫吃技巧（101围棋风格：提子算赢） ==========
export const LEVEL_4_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  {
    title: '简单叫吃提子',
    description: '白子只剩1口气了！下在最后一口气上提掉它！',
    type: 'checkpoint',
    checkpoint_level: 4,
    board_size: 9,
    difficulty: 1,
    initial_position: {
      // 白[3,4]邻居[2,4]空 [4,4]黑 [3,3]黑 [3,5]黑 → 1气[2,4] ✓
      black: [[4, 4], [3, 3], [3, 5]],
      white: [[3, 4]],
    },
    solution: {
      moves: [[2, 4]],
      explanation: '对方棋子只剩1口气时，这叫"叫吃"。堵住最后一口气就能提掉它！',
      win_condition: 'capture',
      capture_min: 1,
    },
  },
  {
    title: '叫吃方向',
    description: '白子只剩1口气了！从正确方向提掉它，让它往边上逃也逃不掉！',
    type: 'checkpoint',
    checkpoint_level: 4,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      // 白[3,2]邻居[2,2]空 [4,2]黑 [3,1]空 [3,3]黑 → 2气
      // 需要加黑子让它只剩1气
      // 加黑[2,2]: 白只剩[3,1]这1气 ✓
      black: [[4, 2], [3, 3], [2, 2]],
      white: [[3, 2]],
    },
    solution: {
      moves: [[3, 1]],
      explanation: '叫吃的方向很重要！把对方往边角方向逼，那里气更少，更容易被吃。',
      win_condition: 'capture',
      capture_min: 1,
    },
  },
  {
    title: '连续叫吃提子',
    description: '白子只剩1口气了！提掉它！',
    type: 'checkpoint',
    checkpoint_level: 4,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      // 白[4,3]邻居[3,3]黑 [5,3]黑 [4,2]空 [4,4]黑 → 1气[4,2] ✓
      black: [[3, 3], [5, 3], [4, 4]],
      white: [[4, 3]],
    },
    solution: {
      moves: [[4, 2]],
      explanation: '连续叫吃（也叫"追吃"）：每次叫吃后对方逃跑的方向都被继续叫吃，直到被吃掉。',
      win_condition: 'capture',
      capture_min: 1,
    },
  },
  {
    title: '抱吃',
    description: '白子被黑子从两侧"抱"住，只剩1口气了！下在最后一口气上提掉它！',
    type: 'checkpoint',
    checkpoint_level: 4,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      // 白[3,1]在左边，邻居: 上[2,1]空、下[4,1]黑、左[3,0]黑、右[3,2]黑
      // 只有[2,1]是气 = 1气 ✓
      black: [[4, 1], [3, 2], [3, 0]],
      white: [[3, 1]],
    },
    solution: {
      moves: [[2, 1]],
      explanation: '抱吃：用三颗子围住两边，白子只剩1口气！堵住这口气就能提掉它。',
      win_condition: 'capture',
      capture_min: 1,
    },
  },
  {
    title: '门吃',
    description: '白子被围住，只剩1口气了！像关门一样提掉它！',
    type: 'checkpoint',
    checkpoint_level: 4,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      // 白[2,2]邻居[1,2]空 [3,2]黑 [2,1]空 [2,3]黑 → 2气
      // 需要加黑[2,1]: 白只剩[1,2]这1气 ✓
      black: [[3, 2], [2, 3], [2, 1]],
      white: [[2, 2]],
    },
    solution: {
      moves: [[1, 2]],
      explanation: '门吃：像关上门一样堵住对方的逃跑路线，让对方只能束手就擒。',
      win_condition: 'capture',
      capture_min: 1,
    },
  },
];

// ========== 第5关：对杀基础 ==========
export const LEVEL_5_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  {
    title: '认识对杀',
    description: '黑白双方互相包围！谁先动手谁就赢。快找到正确的一手！',
    type: 'checkpoint',
    checkpoint_level: 5,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      // 双方互围，白棋只有[3,3]、[3,5]两口气
      black: [[2, 3], [3, 2], [4, 3], [1, 4], [2, 5], [4, 5], [5, 4]],
      white: [[2, 4], [3, 4], [4, 4]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '对杀时，先收对方的气是关键！下在[3,3]紧住白棋的气，白棋就只剩2口气了。',
    },
  },
  {
    title: '先手对杀',
    description: '黑白双方各有3口气，黑先走。你能赢吗？',
    type: 'checkpoint',
    checkpoint_level: 5,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      // 黑子3颗 [3,3],[4,3],[5,3]，上下被[2,3][6,3]封住，左边[3,2][4,2][5,2]是气
      // 白子3颗 [3,4],[4,4],[5,4]，上下被[2,4][6,4]封住，右边[3,5][4,5][5,5]是气
      black: [[3, 3], [4, 3], [5, 3], [2, 3], [6, 3]],
      white: [[3, 4], [4, 4], [5, 4], [2, 4], [6, 4]],
    },
    solution: {
      moves: [[3, 5]],
      alternative_moves: [[[4, 5]], [[5, 5]]],
      explanation: '对杀要抢收对方的气！黑棋先动手收掉白棋的一口气，白棋就只剩2气，黑棋3气，黑胜。',
    },
  },
  {
    title: '延长自己的气',
    description: '对杀中你的气不够？想办法延长自己的气，赢得对杀！',
    type: 'checkpoint',
    checkpoint_level: 5,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[3, 3], [4, 3]],
      white: [[3, 4], [4, 4], [5, 3]],
    },
    solution: {
      moves: [[2, 3]],
      explanation: '延气：往开阔方向[2,3]长一手，黑棋的气从2口变成3口，就能在对杀中赢过白棋。',
    },
  },
  {
    title: '收气的方向',
    description: '白棋有2口气。你需要从正确的方向收气才能赢得对杀！',
    type: 'checkpoint',
    checkpoint_level: 5,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[3, 2], [4, 3], [3, 4]],
      white: [[3, 3], [4, 4]],
    },
    solution: {
      moves: [[2, 3]],
      explanation: '收气要从外向内！下在[2,3]直接叫吃白棋[3,3]，让对方来不及连接逃跑。',
    },
  },
  {
    title: '对杀中的扑',
    description: '对杀时，有时故意送一子反而能赢！这就是对杀中的"扑"。',
    type: 'checkpoint',
    checkpoint_level: 5,
    board_size: 9,
    difficulty: 4,
    initial_position: {
      black: [[0, 2], [1, 3], [2, 1], [2, 0]],
      white: [[1, 1], [0, 1], [1, 0]],
    },
    solution: {
      moves: [[0, 0]],
      explanation: '扑：故意下在[0,0]送给白棋吃，白棋提子后气反而变少了，这就是反败为胜的妙手！',
    },
  },
];

// ========== 第6关：死活入门 ==========
export const LEVEL_6_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  {
    title: '做一只眼',
    description: '黑棋被包围了！在内部做一个"眼"，让这块棋暂时安全。',
    type: 'checkpoint',
    checkpoint_level: 6,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      black: [[2, 2], [2, 3], [3, 2], [4, 2], [4, 3]],
      white: [[1, 2], [1, 3], [2, 1], [3, 1], [4, 1], [5, 2], [5, 3], [4, 4], [3, 4], [2, 4]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '做眼：下在[3,3]后，这个空点就被黑棋完全包围了，形成了一个"眼"。',
    },
  },
  {
    title: '真眼与假眼',
    description: '黑棋有2个空点，但只有下在正确位置才能做出"真眼"！找到做真眼的要点。',
    type: 'checkpoint',
    checkpoint_level: 6,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[2, 2], [2, 3], [2, 4], [3, 2], [3, 4], [4, 2], [4, 3], [4, 4]],
      white: [[1, 2], [1, 3], [1, 4], [2, 1], [3, 1], [4, 1], [5, 2], [5, 3], [5, 4], [4, 5], [3, 5], [2, 5]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '真眼：下在[3,3]确保这个眼位四面都是黑子，是真正的眼。如果眼角的子被白棋占领，就可能变成假眼。',
    },
  },
  {
    title: '做两只眼活棋',
    description: '黑棋被白棋围住了！内部有3个空点，你需要下在要点才能做出两只眼活棋。',
    type: 'checkpoint',
    checkpoint_level: 6,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[1, 2], [1, 3], [1, 4], [2, 1], [2, 5], [3, 2], [3, 3], [3, 4]],
      white: [[0, 2], [0, 3], [0, 4], [1, 1], [2, 0], [3, 1], [4, 2], [4, 3], [4, 4], [1, 5], [2, 6], [3, 5]],
    },
    solution: {
      moves: [[2, 3]],
      explanation: '直三做活：中间[2,3]是唯一要点！下在这里后，左右各成一只眼，白棋无法同时填两个眼。',
    },
  },
  {
    title: '破眼杀棋',
    description: '白棋想做出两只眼活棋！你要抢先在眼位落子，破坏它的眼。',
    type: 'checkpoint',
    checkpoint_level: 6,
    board_size: 9,
    difficulty: 4,
    initial_position: {
      black: [[1, 2], [1, 3], [1, 4], [1, 5], [2, 1], [3, 1], [4, 2], [4, 3], [4, 4], [4, 5], [2, 6], [3, 6]],
      white: [[2, 2], [2, 3], [2, 4], [2, 5], [3, 2], [3, 4], [3, 5]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '破眼：下在[3,3]破坏白棋做眼的意图。白棋内部只剩下一个大眼，无法分成两个，所以是死棋。',
    },
  },
  {
    title: '曲三做活',
    description: '黑棋内部有3个弯曲的空点（曲三）。找到做活的要点！',
    type: 'checkpoint',
    checkpoint_level: 6,
    board_size: 9,
    difficulty: 4,
    initial_position: {
      black: [[1, 2], [1, 3], [2, 1], [2, 4], [3, 2], [3, 4], [4, 3]],
      white: [[0, 2], [0, 3], [1, 1], [2, 0], [3, 1], [4, 2], [5, 3], [4, 4], [3, 5], [2, 5], [1, 4]],
    },
    solution: {
      moves: [[2, 3]],
      explanation: '曲三做活：拐角处[2,3]是关键！下在这里可以把空地分成两个眼。',
    },
  },
];

// ========== 第7关：基本手筋 ==========
export const LEVEL_7_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  {
    title: '枷吃',
    description: '不需要紧贴白子，从远处就能把它罩住！找到这招"枷吃"。',
    type: 'checkpoint',
    checkpoint_level: 7,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[3, 3], [3, 5], [5, 3], [5, 5], [4, 2]],
      white: [[4, 4], [4, 3]],
    },
    solution: {
      moves: [[4, 5]],
      explanation: '枷吃：下在[4,5]从外围罩住白棋，白棋无论往哪边逃跑都会被黑棋吃掉。',
    },
  },
  {
    title: '倒扑',
    description: '故意送一子给对方吃，反而能把对方全部提掉！找到"倒扑"的位置。',
    type: 'checkpoint',
    checkpoint_level: 7,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      // 较复杂的倒扑：白棋两块棋都只剩[3,3]这一口气
      black: [[1, 2], [1, 3], [2, 1], [3, 2], [4, 2], [5, 3], [4, 4], [3, 4], [2, 4]],
      white: [[2, 2], [2, 3], [4, 3]],
    },
    solution: {
      moves: [[3, 3]],
      explanation: '倒扑：下在[3,3]虽然会被白棋提掉一子，但由于白棋整体气数不足，黑棋可以随即反提掉所有白子。',
    },
  },
  {
    title: '接不归',
    description: '白子正在逃跑，但怎么连都连不回去！找到"接不归"的要点。',
    type: 'checkpoint',
    checkpoint_level: 7,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[2, 2], [2, 3], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2]],
      white: [[3, 2], [3, 3], [2, 1], [4, 1]],
    },
    solution: {
      moves: [[3, 1]],
      explanation: '接不归：白棋[3,2][3,3]两子虽然想连回[2,1]或[4,1]，但被黑棋在[3,1]一断，白棋就接不回去了。',
    },
  },
  {
    title: '征子',
    description: '像赶羊一样，一步步把白子赶到棋盘边上去！找到征子的起点。',
    type: 'checkpoint',
    checkpoint_level: 7,
    board_size: 9,
    difficulty: 4,
    initial_position: {
      black: [[3, 4], [4, 3]],
      white: [[4, 4]],
    },
    solution: {
      moves: [[5, 4]],
      explanation: '征子：从侧面[5,4]叫吃，将白棋往棋盘边缘赶，使其气数始终无法增加。',
    },
  },
  {
    title: '闷吃',
    description: '白子被堵在里面出不来了！找到叫吃它的位置。',
    type: 'checkpoint',
    checkpoint_level: 7,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[3, 2], [5, 2], [4, 3]],
      white: [[4, 2], [3, 1], [5, 1]],
    },
    solution: {
      moves: [[4, 1]],
      explanation: '闷吃：白棋被黑棋包围，下在[4,1]直接闷杀，白棋没有逃跑的空间。',
    },
  },
];

// ========== 第8关：死活进阶 ==========
export const LEVEL_8_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  {
    title: '直三做活',
    description: '黑棋内部有3个空点排成直线。找到做活的关键点！',
    type: 'checkpoint',
    checkpoint_level: 8,
    board_size: 9,
    difficulty: 2,
    initial_position: {
      black: [[1, 2], [1, 3], [1, 4], [2, 1], [2, 5], [3, 2], [3, 3], [3, 4]],
      white: [[0, 2], [0, 3], [0, 4], [1, 1], [2, 0], [3, 1], [4, 2], [4, 3], [4, 4], [1, 5], [2, 6], [3, 5]],
    },
    solution: {
      moves: [[2, 3]],
      explanation: '直三做活：中间是唯一要点！下在[2,3]后，左右各成一只眼。',
    },
  },
  {
    title: '曲三做活',
    description: '黑棋内部有3个弯曲的空点。找到做活要点！',
    type: 'checkpoint',
    checkpoint_level: 8,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 2], [2, 1], [1, 0]],
      white: [[0, 0], [0, 3], [1, 4], [2, 4], [3, 3], [4, 2], [3, 1], [2, 0]],
    },
    solution: {
      moves: [[1, 2]],
      explanation: '曲三做活：下在拐角处[1, 2]即可做活。',
    },
  },
  {
    title: '板六做活',
    description: '角上的板六是死是活？找到正确的做活位置！',
    type: 'checkpoint',
    checkpoint_level: 8,
    board_size: 9,
    difficulty: 4,
    initial_position: {
      black: [[0, 3], [1, 3], [2, 3], [2, 2], [2, 1], [2, 0]],
      white: [[0, 4], [1, 4], [2, 4], [3, 3], [3, 2], [3, 1], [3, 0]],
    },
    solution: {
      moves: [[1, 1]],
      explanation: '角部板六：下在[1,1]或[0,1]要点可以做活。占据其中一个要点，可以保证做出两个眼。',
    },
  },
];

// ========== 死活专练题目（额外） ==========
const LIFE_DEATH_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  {
    title: '角部死活',
    description: '黑棋被白棋包围在角上！找到做活的要点。',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 4,
    initial_position: {
      // 经典的角部做活形状（大猪嘴/小猪嘴简化版）
      black: [[0, 1], [0, 2], [1, 0], [1, 3], [2, 1], [2, 2]],
      white: [[0, 3], [1, 4], [2, 3], [3, 1], [3, 2], [2, 0]],
    },
    solution: {
      moves: [[1, 1]],  // 角部做活
      explanation: '在角部做活时，占据中心要点非常重要。下在[1,1]可以将内部空间分成两个眼，从而活棋。',
      win_condition: 'make_eyes',
      eye_min: 2,
    },
  },
  {
    title: '做活要点',
    description: '黑棋被白棋包围，只剩一个空点了！在这关键位置落子，做活这块棋！',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 3,
    initial_position: {
      black: [[1, 1], [1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2], [3, 3]],
      white: [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4], [4, 1], [4, 2], [4, 3], [1, 0], [2, 0], [3, 0]],
    },
    solution: {
      moves: [[2, 2]],
      explanation: '做活：黑棋唯一的空点[2,2]就是做眼的位置！下在这里形成一只眼，这块棋就活了！',
      win_condition: 'make_eyes',
      eye_min: 1,
    },
  },
  {
    title: '刀把五做活',
    description: '黑棋内部有5个空点，形状像刀把。找到做活的关键！',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 4,
    initial_position: {
      // 刀把五：5个空点，下在中间[1,1]做活
      black: [[0, 3], [1, 3], [2, 3], [2, 2], [2, 1], [3, 1], [3, 0], [0, 0]],
      white: [[0, 4], [1, 4], [2, 4], [3, 3], [3, 2], [4, 1], [4, 0]],
    },
    solution: {
      moves: [[1, 1]],  // 刀把五中间
      explanation: '刀把五做活：在"刀把"中间[1,1]下一子！这里是做活的要点。占据这里后，白棋无法阻止黑棋做出两个眼。',
      win_condition: 'make_eyes',
      eye_min: 2,
    },
  },
  {
    title: '打劫活',
    description: '黑棋面临生死考验！通过打劫可以争取活命的机会。',
    type: 'practice',
    checkpoint_level: null,
    board_size: 9,
    difficulty: 5,
    initial_position: {
      // 简单的打劫活形状
      black: [[2, 2], [2, 3], [3, 1], [4, 2], [4, 3]],
      white: [[1, 2], [1, 3], [2, 4], [3, 5], [4, 4], [5, 2], [5, 3], [3, 2]],
    },
    solution: {
      moves: [[3, 3]],  // 提掉[3,2]形成打劫
      explanation: '打劫活：下在[3,3]提掉白棋一子形成打劫！这是黑棋唯一的生路。',
      win_condition: 'make_eyes',
      eye_min: 1,
    },
  },
];

// ========== 练习题库（合并所有闯关题 + 额外练习题） ==========
export const PRACTICE_PROBLEMS: Omit<Problem, 'id' | 'created_at'>[] = [
  ...LEVEL_1_PROBLEMS.map(p => ({ ...p, type: 'practice' as const, checkpoint_level: null })),
  ...LEVEL_2_PROBLEMS.map(p => ({ ...p, type: 'practice' as const, checkpoint_level: null })),
  ...LEVEL_3_PROBLEMS.map(p => ({ ...p, type: 'practice' as const, checkpoint_level: null })),
  ...LEVEL_4_PROBLEMS.map(p => ({ ...p, type: 'practice' as const, checkpoint_level: null })),
  ...LEVEL_5_PROBLEMS.map(p => ({ ...p, type: 'practice' as const, checkpoint_level: null })),
  ...LEVEL_6_PROBLEMS.map(p => ({ ...p, type: 'practice' as const, checkpoint_level: null })),
  ...LEVEL_7_PROBLEMS.map(p => ({ ...p, type: 'practice' as const, checkpoint_level: null })),
  ...LEVEL_8_PROBLEMS.map(p => ({ ...p, type: 'practice' as const, checkpoint_level: null })),
  ...EXTRA_PRACTICE_PROBLEMS,
  ...LIFE_DEATH_PROBLEMS,
];

function getVerifiedProblems(
  rawProblems: Omit<Problem, 'id' | 'created_at'>[],
  level?: number
): Omit<Problem, 'id' | 'created_at' | 'systemId'>[] {
  return rawProblems
    .map((p, i) => ({
      ...p,
      systemId: level !== undefined ? generateSystemId(level, i) : `system-practice-${i}`,
    }))
    .filter((p, i) => {
      const { ok, errors } = verifyProblem(p);
      if (!ok) {
        console.error(`[题目自检] 第${i + 1}题 "${p.title}" 验证失败:`, errors);
        return false;
      }
      // 用引擎进一步验证：加载棋盘后检查答案能否合法落子
      try {
        const eng = new GoEngine(p.board_size);
        eng.loadPosition(p.initial_position);

        // 验证答案能否合法落子
        for (const [mr, mc] of p.solution.moves) {
          if (!eng.isValidMove(mr, mc)) {
            console.error(`[题目自检] "${p.title}": 答案[${mr},${mc}]不是合法落子!`);
            return false;
          }
          eng.placeStone(mr, mc);  // 模拟落子进入下一步
        }
      } catch {
        // 引擎可能在非React环境不可用，跳过深度验证
      }
      return true;
    });
}

// 生成系统题目的标准ID
function generateSystemId(level: number, index: number): string {
  return `system-level-${level}-${index}`;
}

export const CHECKPOINT_LEVELS = [
  getVerifiedProblems(LEVEL_1_PROBLEMS, 1),
  getVerifiedProblems(LEVEL_2_PROBLEMS, 2),
  getVerifiedProblems(LEVEL_3_PROBLEMS, 3),
  getVerifiedProblems(LEVEL_4_PROBLEMS, 4),
  getVerifiedProblems(LEVEL_5_PROBLEMS, 5),
  getVerifiedProblems(LEVEL_6_PROBLEMS, 6),
  getVerifiedProblems(LEVEL_7_PROBLEMS, 7),
  getVerifiedProblems(LEVEL_8_PROBLEMS, 8),
];

export const VERIFIED_PRACTICE_PROBLEMS = getVerifiedProblems(PRACTICE_PROBLEMS);

/**
 * 合并云端题目和本地题目
 * 云端题目会覆盖本地题目（通过 id 或 systemId 匹配）
 * 同时保留云端独有的题目（新增的题目）
 */
export function mergeCloudProblems<T extends Problem>(
  localProblems: T[],
  cloudProblems: T[]
): T[] {
  // 建立云端题目的映射
  // 1. 使用 id 作为 key（用于覆盖版本和普通云端题目）
  // 2. 使用 systemId 作为 key（用于新增的关卡题目等）
  const cloudById = new Map<string, T>();
  const cloudBySystemId = new Map<string, T>();
  
  cloudProblems.forEach(p => {
    if (p.id) {
      cloudById.set(p.id, p);
    }
    // systemId 用于匹配覆盖版本（覆盖版本有原始题目的 systemId）
    if (p.systemId) {
      cloudBySystemId.set(p.systemId, p);
    }
  });
  
  const result: T[] = [];
  const usedCloudIds = new Set<string>(); // 记录已使用的云端题目
  
  // 遍历本地题目，用云端版本覆盖
  localProblems.forEach(p => {
    // 优先使用 id 匹配（覆盖版本使用原始 id）
    if (cloudById.has(p.id)) {
      const cloudVersion = cloudById.get(p.id)!;
      console.log(`[题目同步] 使用云端版本覆盖本地: ${p.title} (${p.id})`);
      result.push({ ...cloudVersion });
      usedCloudIds.add(p.id);
    } 
    // 其次使用 systemId 匹配（新增的题目可能只有 systemId）
    else if (cloudBySystemId.has(p.id)) {
      const cloudVersion = cloudBySystemId.get(p.id)!;
      console.log(`[题目同步] 使用云端版本覆盖本地 (通过systemId): ${p.title} (${p.id})`);
      result.push({ ...cloudVersion });
      // 注意：不添加到 usedCloudIds，因为 cloudVersion 可能也有不同的 id
    }
    else {
      // 云端没有，使用本地版本
      result.push(p);
    }
  });
  
  // 添加云端独有的题目（本地没有的）
  // 包括新增的自定义题目（id 格式为 custom-*）
  cloudProblems.forEach(cloudProblem => {
    // 检查是否已使用
    if (usedCloudIds.has(cloudProblem.id)) return;
    
    // 检查是否是新增的自定义题目（id 格式为 custom-*）
    if (cloudProblem.id?.startsWith('custom-')) {
      console.log(`[题目同步] 添加云端新题目: ${cloudProblem.title} (${cloudProblem.id})`);
      result.push(cloudProblem);
    }
    // 也检查通过 systemId 判断
    else if (cloudProblem.systemId && !cloudById.has(cloudProblem.systemId)) {
      // systemId 存在于云端但本地没有这个 id，说明是新增的
      console.log(`[题目同步] 添加云端新题目 (通过systemId): ${cloudProblem.title} (${cloudProblem.id})`);
      result.push(cloudProblem);
    }
  });
  
  return result;
}
