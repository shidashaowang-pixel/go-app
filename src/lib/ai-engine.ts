/**
 * 围棋AI引擎
 * 三档难度：初级（随机）、中级（启发式）、高级（Flask API / 强化启发式）
 */

import { GoEngine, type StoneColor, type PointState } from './go-engine';

export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced';

// AI 后端地址
// 本地开发：http://localhost:5000/ai
// 云端部署：替换为你的服务器地址，如 https://api.yourdomain.com/ai
const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const aiUrlFromBase = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/ai` : '';
const AI_API_URL = ((import.meta.env.VITE_AI_API_URL as string | undefined) ?? aiUrlFromBase) || 'http://localhost:5000/ai';

// 智能启动器地址
const LAUNCHER_URL = import.meta.env.VITE_LAUNCHER_URL ?? 'http://localhost:4999';

type AdvancedAIStatus = {
  ok: boolean;
  url: string;
  error?: string;
  at: number;
};

let lastAdvancedAIStatus: AdvancedAIStatus = { ok: false, url: AI_API_URL, at: 0 };
let autoStartAttempted = { beginner: false, intermediate: false, advanced: false };

export function getAdvancedAILastStatus(): AdvancedAIStatus {
  return lastAdvancedAIStatus;
}

function setAdvancedAIStatus(next: Omit<AdvancedAIStatus, 'url' | 'at'> & Partial<Pick<AdvancedAIStatus, 'url' | 'at'>>) {
  lastAdvancedAIStatus = {
    ok: next.ok,
    error: next.error,
    url: next.url ?? AI_API_URL,
    at: next.at ?? Date.now(),
  };
}

/**
 * 检测服务是否运行
 */
async function checkServiceHealth(url: string): Promise<boolean> {
  try {
    const healthUrl = url.includes('/ai') ? url.replace('/ai', '/health') : url + '/health';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch { return false; }
}

/**
 * 尝试自动启动AI服务
 */
async function tryAutoStart(service: 'beginner' | 'intermediate' | 'advanced'): Promise<boolean> {
  if (autoStartAttempted[service]) return false;
  autoStartAttempted[service] = true;
  console.log('[AutoStart] ' + service + ' service unavailable, attempting to start...');
  try {
    const endpoint = service === 'beginner' ? '/start-beginner' : 
                     service === 'intermediate' ? '/start-intermediate' : '/start-katago';
    const response = await Promise.race([
      fetch(LAUNCHER_URL + endpoint, { method: 'GET' }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]).catch(() => null);
    if (response && response.ok) {
      console.log('[AutoStart] ' + service + ' service start triggered');
      await new Promise(r => setTimeout(r, 4000));
      return true;
    }
  } catch {}
  console.warn('[AutoStart] Please run: backend/后台启动.bat');
  return false;
}

/**
 * 辅助函数：查找连通棋子群
 */
function findGroup(board: PointState[][], row: number, col: number, color: StoneColor): [number, number][] {
  const group: [number, number][] = [];
  const visited = new Set<string>();
  const stack: [number, number][] = [[row, col]];
  
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) continue;
    if (board[r][c] !== color) continue;
    
    visited.add(key);
    group.push([r, c]);
    
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  
  return group;
}

/**
 * 辅助函数：计算棋群的气
 */
function countLiberties(board: PointState[][], group: [number, number][]): number {
  const liberties = new Set<string>();
  for (const [r, c] of group) {
    const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length && board[nr][nc] === null) {
        liberties.add(`${nr},${nc}`);
      }
    }
  }
  return liberties.size;
}

// AI API 地址配置
const INTERMEDIATE_AI_API_URL = import.meta.env.VITE_INTERMEDIATE_API_URL ?? 'http://localhost:5001/ai';
const BEGINNER_AI_API_URL = import.meta.env.VITE_BEGINNER_API_URL ?? 'http://localhost:5002/ai';

/**
 * 初级AI：调用本地训练的神经网络模型（更弱配置）
 * 如果 API 不可用，尝试自动启动或回退到随机落子
 */
async function beginnerNeuralMove(engine: GoEngine, color: StoneColor): Promise<[number, number] | null> {
  // 尝试1：直接调用API
  try {
    const board = engine.board.map(row => row.map(cell => {
      if (cell === 'black') return 1;
      if (cell === 'white') return 2;
      return 0;
    }));

    const response = await Promise.race([
      fetch(BEGINNER_AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, current_player: color === 'black' ? 1 : 2, size: engine.size }),
      }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]) as Response;

    if (response?.ok) {
      const data = await response.json();
      if (data.x !== undefined && data.y !== undefined && data.x >= 0 && data.y >= 0) {
        console.log(`[Beginner NN] Move: (${data.x}, ${data.y})`);
        return [data.y, data.x];
      }
      if (data.pass) return null;
    }
  } catch {
    console.log(`[Beginner NN] API unavailable, trying auto-start...`);
    await tryAutoStart('beginner');
  }
  
  // 尝试2：自动启动后再试一次
  try {
    const board = engine.board.map(row => row.map(cell => {
      if (cell === 'black') return 1;
      if (cell === 'white') return 2;
      return 0;
    }));

    const response = await Promise.race([
      fetch(BEGINNER_AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, current_player: color === 'black' ? 1 : 2, size: engine.size }),
      }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]) as Response;

    if (response?.ok) {
      const data = await response.json();
      if (data.x !== undefined && data.y !== undefined && data.x >= 0 && data.y >= 0) {
        console.log(`[Beginner NN] Retry SUCCESS: (${data.x}, ${data.y})`);
        return [data.y, data.x];
      }
      if (data.pass) return null;
    }
  } catch {}
  
  // 最终后备：使用简化启发式算法
  console.log('[Beginner NN] Using local heuristic fallback');
  return beginnerHeuristicMove(engine, color);
}

/**
 * 初级AI后备：简化启发式（比纯随机好）
 */
function beginnerHeuristicMove(engine: GoEngine, color: StoneColor): [number, number] | null {
  const validMoves = engine.getValidMoves();
  if (validMoves.length === 0) return null;

  const opponent: StoneColor = color === 'black' ? 'white' : 'black';
  const size = engine.size;
  
  let bestMoves: [number, number][] = [];
  let bestPriority = -1;
  
  for (const [row, col] of validMoves) {
    const testBoard = engine.board.map(r => [...r]);
    testBoard[row][col] = color;
    
    let priority = 0;
    
    // 优先级1：能吃子就吃
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (testBoard[nr][nc] === opponent) {
        const group = findGroup(testBoard, nr, nc, opponent);
        if (group.length > 0 && countLiberties(testBoard, group) === 0) {
          priority = Math.max(priority, 100 + group.length * 10);
        }
      }
    }
    
    // 优先级2：救自己的弱棋
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (engine.board[nr][nc] === color) {
        const group = findGroup(engine.board, nr, nc, color);
        if (countLiberties(engine.board, group) <= 2) {
          priority = Math.max(priority, 50 + group.length * 5);
        }
      }
    }
    
    // 优先级3：占据中心和星位
    const center = Math.floor(size / 2);
    const starPoints = size === 19 ? [3, 9, 15] : size === 13 ? [3, 6, 9] : [2, 4, 6];
    if (row === center && col === center) {
      priority = Math.max(priority, 30);
    }
    if (starPoints.includes(row) && starPoints.includes(col)) {
      priority = Math.max(priority, 25);
    }
    
    // 优先级4：连接自己的棋子
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (engine.board[nr][nc] === color) {
        priority = Math.max(priority, 10);
        break;
      }
    }
    
    // 优先级5：远离对方棋子（减少被吃的风险）
    let nearOpponent = false;
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (engine.board[nr][nc] === opponent) {
        nearOpponent = true;
        break;
      }
    }
    if (!nearOpponent && engine.getMoveCount() < 10) {
      priority = Math.max(priority, 5);
    }
    
    if (priority > bestPriority) {
      bestPriority = priority;
      bestMoves = [[row, col]];
    } else if (priority === bestPriority) {
      bestMoves.push([row, col]);
    }
  }

  // 避免填眼
  for (const move of bestMoves) {
    const [row, col] = move;
    let friendCount = 0;
    let emptyCount = 0;
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (engine.board[nr][nc] === color) friendCount++;
      if (engine.board[nr][nc] === null) emptyCount++;
    }
    if (friendCount >= 3 && emptyCount <= 1) {
      bestMoves = bestMoves.filter(m => m !== move);
    }
  }
  
  if (bestMoves.length === 0) return validMoves[Math.floor(Math.random() * validMoves.length)];
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

/**
 * 中级AI：调用本地训练的神经网络模型
 * 如果 API 不可用，尝试自动启动或回退到启发式算法
 */
async function intermediateNeuralMove(engine: GoEngine, color: StoneColor): Promise<[number, number] | null> {
  // 尝试1：直接调用API
  try {
    const board = engine.board.map(row => row.map(cell => {
      if (cell === 'black') return 1;
      if (cell === 'white') return 2;
      return 0;
    }));

    const response = await Promise.race([
      fetch(INTERMEDIATE_AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, current_player: color === 'black' ? 1 : 2, size: engine.size }),
      }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]) as Response;

    if (response?.ok) {
      const data = await response.json();
      if (data.x !== undefined && data.y !== undefined && data.x >= 0 && data.y >= 0) {
        console.log(`[Intermediate NN] Move: (${data.x}, ${data.y})`);
        return [data.y, data.x];
      }
      if (data.pass) return null;
    }
  } catch {
    console.log(`[Intermediate NN] API unavailable, trying auto-start...`);
    await tryAutoStart('intermediate');
  }
  
  // 尝试2：自动启动后再试一次
  try {
    const board = engine.board.map(row => row.map(cell => {
      if (cell === 'black') return 1;
      if (cell === 'white') return 2;
      return 0;
    }));

    const response = await Promise.race([
      fetch(INTERMEDIATE_AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, current_player: color === 'black' ? 1 : 2, size: engine.size }),
      }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]) as Response;

    if (response?.ok) {
      const data = await response.json();
      if (data.x !== undefined && data.y !== undefined && data.x >= 0 && data.y >= 0) {
        console.log(`[Intermediate NN] Retry SUCCESS: (${data.x}, ${data.y})`);
        return [data.y, data.x];
      }
      if (data.pass) return null;
    }
  } catch {}
  
  // 最终后备：使用完整启发式算法
  console.log('[Intermediate NN] Using local heuristic fallback');
  return heuristicMove(engine, color);
}

/**
 * 初级AI：随机选择合法落子点
 */
function randomMove(engine: GoEngine): [number, number] | null {
  const validMoves = engine.getValidMoves();
  if (validMoves.length === 0) return null;
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}

/**
 * 中级AI：启发式评估（改进版）
 * 综合考虑：吃子、逃跑、扩大领地、占据关键位置、连接、做眼
 * 优化：添加早期退出和剪枝，提高性能
 */
function heuristicMove(engine: GoEngine, color: StoneColor): [number, number] | null {
  const validMoves = engine.getValidMoves();
  if (validMoves.length === 0) return null;

  const opponent: StoneColor = color === 'black' ? 'white' : 'black';
  const size = engine.size;
  const moveCount = engine.getMoveCount();

  // 优化1：先快速检查是否有必吃的着法，有则直接返回
  for (const [row, col] of validMoves) {
    const testBoard = engine.board.map(r => [...r]);
    testBoard[row][col] = color;
    
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (testBoard[nr][nc] === opponent) {
        const group = findGroup(testBoard, nr, nc, opponent);
        if (group.length > 0 && countLiberties(testBoard, group) === 0) {
          // 发现必吃的着法，直接返回（吃大龙优先）
          if (group.length >= 3) return [row, col];
        }
      }
    }
  }

  let bestScore = -Infinity;
  let bestMoves: [number, number][] = [];

  // 优化2：限制评估数量，超过一定手数后减少计算
  const maxMovesToEvaluate = moveCount < 50 ? validMoves.length : Math.min(validMoves.length, 80);
  const movesToEvaluate = moveCount < 50 ? validMoves : validMoves.slice(0, maxMovesToEvaluate);

  for (const [row, col] of movesToEvaluate) {
    let score = 0;

    // 深拷贝当前棋盘状态（重要！防止修改原棋盘）
    const originalBoard = engine.board.map(r => [...r]);
    const testBoard = originalBoard.map(r => [...r]);
    testBoard[row][col] = color;

    // 获取邻居位置的辅助函数
    const getNeighbors = (r: number, c: number): [number, number][] => {
      const neighbors: [number, number][] = [];
      if (r > 0) neighbors.push([r - 1, c]);
      if (r < size - 1) neighbors.push([r + 1, c]);
      if (c > 0) neighbors.push([r, c - 1]);
      if (c < size - 1) neighbors.push([r, c + 1]);
      return neighbors;
    };

    // 1. 评估吃子价值（每提一子+35分，提高吃子权重）
    let captureCount = 0;
    let capturedGroupSizes: number[] = [];
    for (const [nr, nc] of getNeighbors(row, col)) {
      if (testBoard[nr][nc] === opponent) {
        const group = findGroup(testBoard, nr, nc, opponent);
        if (group.length > 0 && countLiberties(testBoard, group) === 0) {
          captureCount += group.length;
          capturedGroupSizes.push(group.length);
        }
      }
    }
    score += captureCount * 35;
    // 吃大龙额外加分
    if (capturedGroupSizes.some(s => s >= 3)) {
      score += 50;
    }

    // 2. 评估自己的气数（气多更安全）
    const myGroup = findGroup(testBoard, row, col, color);
    const myLiberties = countLiberties(testBoard, myGroup);
    score += myLiberties * 5;
    // 大棋安全加分
    if (myGroup.length >= 4 && myLiberties >= 3) {
      score += 8;
    }

    // 3. 评估是否减少对方气（更激进）
    for (const [nr, nc] of getNeighbors(row, col)) {
      // 关键修复：检查原始棋盘上该位置是否是对方棋子
      if (originalBoard[nr][nc] === opponent) {
        // 使用原始棋盘计算对方落子前的气
        const oppBeforeGroup = findGroup(originalBoard, nr, nc, opponent);
        const oppBeforeLib = countLiberties(originalBoard, oppBeforeGroup);
        // 使用测试棋盘计算落子后的气
        const oppAfterGroup = findGroup(testBoard, nr, nc, opponent);
        const oppAfterLib = countLiberties(testBoard, oppAfterGroup);

        if (oppAfterLib < oppBeforeLib) {
          score += (oppBeforeLib - oppAfterLib) * 10;
        }
        if (oppAfterLib === 1) {
          score += 25; // 叫吃对方加分
        }
        if (oppAfterLib === 2) {
          score += 10; // 威胁加分
        }
      }
    }

    // 4. 逃跑/救活弱子（更积极）
    for (const [nr, nc] of getNeighbors(row, col)) {
      if (originalBoard[nr][nc] === color) {
        const friendGroup = findGroup(originalBoard, nr, nc, color);
        const friendBeforeLib = countLiberties(originalBoard, friendGroup);
        // 使用测试棋盘计算逃跑后的气
        const friendAfterGroup = findGroup(testBoard, nr, nc, color);
        const friendAfterLib = countLiberties(testBoard, friendAfterGroup);
        if (friendBeforeLib <= 2 && friendAfterLib > friendBeforeLib) {
          // 逃跑加分：救活弱子
          score += (friendAfterLib - friendBeforeLib) * 18 + friendAfterGroup.length * 4;
        }
        // 连接两块弱棋加分
        if (friendBeforeLib <= 3 && friendAfterGroup.length >= 2) {
          score += 6;
        }
      }
    }

    // 5. 位置评估（开局定式感）
    const center = Math.floor(size / 2);
    const starPoints = size === 19 ? [3, 9, 15] : size === 13 ? [3, 6, 9] : [2, 4, 6];

    if (starPoints.includes(row) && starPoints.includes(col)) {
      score += 12;
    }
    if (row === center && col === center) {
      score += 10;
    }

    // 6. 距离中心加分（开局倾向于中间）
    if (moveCount < size * 2) {
      // 开局阶段更注重位置
      const distToCenter = Math.abs(row - center) + Math.abs(col - center);
      score += Math.max(0, (size - distToCenter)) * 0.6;
    }

    // 7. 边角评估
    if (moveCount < size) {
      if (row === 0 || row === size - 1 || col === 0 || col === size - 1) {
        score -= 10;
      } else if (row === 1 || row === size - 2 || col === 1 || col === size - 2) {
        score -= 4;
      }
    }

    // 8. 与己方棋子连接加分
    let friendCount = 0;
    let emptyNeighborCount = 0;
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (originalBoard[nr][nc] === color) friendCount++;
      if (originalBoard[nr][nc] === null) emptyNeighborCount++;
    }
    score += friendCount * 4;
    // 避免填自己的眼
    if (friendCount >= 3 && emptyNeighborCount <= 1) {
      score -= 60;
    }
    // 连接形成更大的棋
    if (friendCount >= 2) {
      score += 5;
    }

    // 9. 扩张领地评估（影响范围）- 优化：减少搜索半径
    let influence = 0;
    const influenceRange = moveCount < 30 ? 2 : 1; // 开局范围大，后期缩小
    for (let dr = -influenceRange; dr <= influenceRange; dr++) {
      for (let dc = -influenceRange; dc <= influenceRange; dc++) {
        const r2 = row + dr, c2 = col + dc;
        if (r2 < 0 || r2 >= size || c2 < 0 || c2 >= size) continue;
        if (dr === 0 && dc === 0) continue;
        const dist = Math.abs(dr) + Math.abs(dc);
        if (originalBoard[r2][c2] === color) influence += (influenceRange + 1 - dist) * 0.6;
        if (originalBoard[r2][c2] === opponent) influence -= (influenceRange + 1 - dist) * 0.4;
      }
    }
    score += influence;

    // 10. 切断对方连接
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (originalBoard[nr][nc] === opponent) {
        // 检查是否可以切断
        score += 5;
      }
    }

    // 随机扰动（减少可预测性）
    score += Math.random() * 2;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [[row, col]];
    } else if (Math.abs(score - bestScore) < 0.01) {
      bestMoves.push([row, col]);
    }
  }

  if (bestMoves.length === 0) return null;
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

/**
 * 高级AI：强化启发式（不依赖外部API时的回退策略）
 * 比中级更注重全局、连接、做眼和深度评估
 * 优化：添加早期退出和剪枝，提高性能
 */
function advancedHeuristicMove(engine: GoEngine, color: StoneColor): [number, number] | null {
  const validMoves = engine.getValidMoves();
  if (validMoves.length === 0) return null;

  const opponent: StoneColor = color === 'black' ? 'white' : 'black';
  const size = engine.size;
  const moveCount = engine.getMoveCount();

  // 优化1：先快速检查是否有必吃的着法，有则直接返回
  for (const [row, col] of validMoves) {
    const testBoard = engine.board.map(r => [...r]);
    testBoard[row][col] = color;
    
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (testBoard[nr][nc] === opponent) {
        const group = findGroup(testBoard, nr, nc, opponent);
        if (group.length > 0 && countLiberties(testBoard, group) === 0) {
          // 发现必吃的着法，直接返回（吃大龙优先）
          if (group.length >= 4) return [row, col];
        }
      }
    }
  }

  let bestScore = -Infinity;
  let bestMoves: [number, number][] = [];

  // 优化2：限制评估数量，超过一定手数后减少计算
  const maxMovesToEvaluate = moveCount < 60 ? validMoves.length : Math.min(validMoves.length, 60);
  const movesToEvaluate = moveCount < 60 ? validMoves : validMoves.slice(0, maxMovesToEvaluate);

  for (const [row, col] of movesToEvaluate) {
    let score = 0;

    // 关键修复：使用深拷贝创建测试棋盘，避免修改原棋盘
    const testBoard = engine.board.map(r => [...r]);
    testBoard[row][col] = color;

    // 1. 吃子评估（最高权重）
    let captureCount = 0;
    let capturedGroupSizes: number[] = [];
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (testBoard[nr][nc] === opponent) {
        const group = findGroup(testBoard, nr, nc, opponent);
        if (group.length > 0 && countLiberties(testBoard, group) === 0) {
          captureCount += group.length;
          capturedGroupSizes.push(group.length);
        }
      }
    }
    score += captureCount * 45;
    // 吃大龙超级加分
    if (capturedGroupSizes.some(s => s >= 4)) {
      score += 80;
    } else if (capturedGroupSizes.some(s => s >= 3)) {
      score += 50;
    }

    // 2. 自己的气数评估
    const myGroup = findGroup(testBoard, row, col, color);
    const myLiberties = countLiberties(testBoard, myGroup);
    score += myLiberties * 6;
    // 大棋组安全加分
    if (myGroup.length >= 5 && myLiberties >= 3) {
      score += 15;
    }
    // 避免自己只有1气（危险）
    if (myLiberties === 1) {
      score -= 30;
    }

    // 3. 减少对方气（更激进）
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      // 关键修复：检查原始棋盘上该位置是否是对方棋子
      if (engine.board[nr][nc] === opponent) {
        // 使用原始棋盘计算对方落子前的气
        const originalOppGroup = findGroup(engine.board, nr, nc, opponent);
        const oppBeforeLib = countLiberties(engine.board, originalOppGroup);
        // 使用测试棋盘计算落子后的气
        const oppAfterGroup = findGroup(testBoard, nr, nc, opponent);
        const oppAfterLib = countLiberties(testBoard, oppAfterGroup);

        const libDiff = oppBeforeLib - oppAfterLib;
        if (libDiff > 0) {
          score += libDiff * 12;
          // 攻击大棋组更值得
          if (oppAfterGroup.length >= 3) score += oppAfterGroup.length * 5;
        }
        if (oppAfterLib === 1) {
          score += 30; // 叫吃加分
        }
        if (oppAfterLib === 2) {
          score += 12; // 威胁加分
        }
      }
    }

    // 4. 逃跑/救活弱子（非常积极）
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (engine.board[nr][nc] === color) {
        // 使用原始棋盘计算邻居棋子的气
        const friendGroup = findGroup(engine.board, nr, nc, color);
        const friendBeforeLib = countLiberties(engine.board, friendGroup);
        // 使用测试棋盘计算落子后邻居棋子的气
        const friendAfterGroup = findGroup(testBoard, nr, nc, color);
        const friendAfterLib = countLiberties(testBoard, friendAfterGroup);

        if (friendBeforeLib <= 2) {
          const libGain = friendAfterLib - friendBeforeLib;
          if (libGain > 0) {
            // 救活大棋组更重要
            score += libGain * 25 + friendGroup.length * 6;
          }
        }
        // 连接两块弱棋
        if (friendBeforeLib <= 3 && friendGroup.length >= 2) {
          score += 8;
        }
      }
    }

    // 5. 做眼意识（高级AI不会填自己的眼）
    let friendCount = 0;
    let emptyNeighborCount = 0;
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (engine.board[nr][nc] === color) friendCount++;
      if (engine.board[nr][nc] === null) emptyNeighborCount++;
    }
    // 填自己的眼严重惩罚
    if (friendCount >= 3 && emptyNeighborCount <= 1) {
      score -= 80;
    }
    if (friendCount === 4) {
      score -= 150; // 绝对不填真眼
    }
    // 避免填自己的眼（3个邻居+1个空格）
    if (friendCount >= 3) {
      score -= 50;
    }

    // 6. 位置评估
    const center = Math.floor(size / 2);
    const starPoints = size === 19 ? [3, 9, 15] : size === 13 ? [3, 6, 9] : [2, 4, 6];

    if (starPoints.includes(row) && starPoints.includes(col)) {
      score += 15;
    }
    // 中心点
    if (row === center && col === center) {
      score += 12;
    }

    // 开局：抢占关键位置
    if (moveCount < size * 2) {
      const distToCenter = Math.abs(row - center) + Math.abs(col - center);
      score += Math.max(0, (size - distToCenter)) * 0.7;
      // 一线（边缘）惩罚
      if (row === 0 || row === size - 1 || col === 0 || col === size - 1) {
        score -= 15;
      }
      // 二线惩罚
      if (row === 1 || row === size - 2 || col === 1 || col === size - 2) {
        score -= 5;
      }
    }
    
    // 中盘：偏好星位和小目的扩张
    if (moveCount >= size && moveCount < size * 4) {
      // 检查是否是星位附近的开局点
      for (const sp of starPoints) {
        for (const spc of starPoints) {
          if (Math.abs(row - sp) <= 1 && Math.abs(col - spc) <= 1) {
            score += 5;
          }
        }
      }
    }

    // 7. 大局观：领地影响 - 优化：动态调整搜索范围
    let influence = 0;
    const influenceRange = moveCount < 30 ? 3 : moveCount < 80 ? 2 : 1;
    for (let dr = -influenceRange; dr <= influenceRange; dr++) {
      for (let dc = -influenceRange; dc <= influenceRange; dc++) {
        const r2 = row + dr, c2 = col + dc;
        if (r2 < 0 || r2 >= size || c2 < 0 || c2 >= size) continue;
        if (dr === 0 && dc === 0) continue;
        const dist = Math.abs(dr) + Math.abs(dc);
        const maxDist = influenceRange + 1;
        if (dist > maxDist) continue;
        const weight = (maxDist - dist) * 0.5;
        if (engine.board[r2][c2] === color) influence += weight;
        if (engine.board[r2][c2] === opponent) influence -= weight * 0.6;
        if (engine.board[r2][c2] === null) influence += weight * 0.2; // 空位加分
      }
    }
    score += influence;

    // 8. 切断对方连接
    for (const [nr, nc] of engine.getNeighbors(row, col)) {
      if (engine.board[nr][nc] === opponent) {
        // 检查是否在两块对方棋子之间形成切断
        for (const [nr2, nc2] of engine.getNeighbors(row, col)) {
          if (nr2 === nr && nc2 === nc) continue;
          if (engine.board[nr2][nc2] === opponent) {
            // 在横/纵方向切断加分
            if ((nr === nr2 && Math.abs(nc - nc2) === 2) || 
                (nc === nc2 && Math.abs(nr - nr2) === 2)) {
              score += 8;
            }
          }
        }
      }
    }
    
    // 9. 连接己方棋子
    score += friendCount * 5;
    if (friendCount >= 2) {
      score += 8; // 连接形成更大的棋
    }

    // 10. 避免填在对手棋子旁边（被叫吃的风险）
    const opponentNeighborCount = (() => {
      let count = 0;
      for (const [nr, nc] of engine.getNeighbors(row, col)) {
        if (engine.board[nr][nc] === opponent) count++;
      }
      return count;
    })();
    if (opponentNeighborCount >= 3) {
      score -= 10;
    }

    // 较小的随机扰动（高级AI更稳定）
    score += Math.random() * 1.5;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [[row, col]];
    } else if (Math.abs(score - bestScore) < 0.01) {
      bestMoves.push([row, col]);
    }
  }

  if (bestMoves.length === 0) return null;
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

/**
 * 高级AI：调用 KataGo 后端 API
 * 如果 API 不可用，回退到强化启发式算法
 */
async function advancedMove(engine: GoEngine, color: StoneColor, difficulty: AIDifficulty = 'advanced'): Promise<[number, number] | null> {
  let apiSuccess = false;
  
  // 尝试调用 KataGo API（3秒超时）
  try {
    const board = engine.board.map(row => row.map(cell => {
      if (cell === 'black') return 1;
      if (cell === 'white') return 2;
      return 0;
    }));

    const moveHistory = engine
      .getMoveHistory()
      .filter(m => m.row >= 0 && m.col >= 0)
      .map(m => ({
        x: m.col,
        y: m.row,
        color: m.color === 'black' ? 1 : 2,
      }));

    console.log(`[KataGo] Requesting move: color=${color}, size=${engine.size}, moves=${moveHistory.length}`);

    const response = await Promise.race([
      fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board,
          current_player: color === 'black' ? 1 : 2,
          size: engine.size,
          difficulty: 'advanced',
          move_history: moveHistory,
        }),
      }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]) as Response;

    if (response?.ok) {
      const data = await response.json();
      if (data.x !== undefined && data.y !== undefined && data.x >= 0 && data.y >= 0) {
        console.log(`[KataGo] SUCCESS: (${data.x}, ${data.y})`);
        setAdvancedAIStatus({ ok: true });
        return [data.y, data.x];
      }
      if (data.pass) {
        setAdvancedAIStatus({ ok: true });
        return null;
      }
    } else {
      console.log(`[KataGo] API returned status: ${response?.status || 'no response'}`);
    }
  } catch (error) {
    console.log(`[KataGo] API unavailable: ${error}`);
    
    // 尝试自动启动
    console.log('[KataGo] Trying auto-start...');
    await tryAutoStart('advanced');
    
    // 等待一下再重试
    await new Promise(r => setTimeout(r, 2000));
    
    // 再尝试一次API
    try {
      const board = engine.board.map(row => row.map(cell => {
        if (cell === 'black') return 1;
        if (cell === 'white') return 2;
        return 0;
      }));

      const response = await Promise.race([
        fetch(AI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            board,
            current_player: color === 'black' ? 1 : 2,
            size: engine.size,
            difficulty: 'advanced',
            move_history: engine.getMoveHistory().filter(m => m.row >= 0 && m.col >= 0).map(m => ({
              x: m.col, y: m.row, color: m.color === 'black' ? 1 : 2
            })),
          }),
        }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]) as Response;

      if (response?.ok) {
        const data = await response.json();
        if (data.x !== undefined && data.y !== undefined && data.x >= 0 && data.y >= 0) {
          console.log(`[KataGo] Retry SUCCESS: (${data.x}, ${data.y})`);
          setAdvancedAIStatus({ ok: true });
          return [data.y, data.x];
        }
        if (data.pass) {
          setAdvancedAIStatus({ ok: true });
          return null;
        }
      }
    } catch {}
  }

  // 最终后备：使用强化启发式算法（保证能运行）
  console.log('[KataGo] Using local heuristic AI (fallback)');
  return advancedHeuristicMove(engine, color);
}

/**
 * AI 落子入口
 */
export async function getAIMove(engine: GoEngine, difficulty: AIDifficulty, color: StoneColor): Promise<[number, number] | null> {
  // 延迟模拟思考时间
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

  switch (difficulty) {
    case 'beginner':
      // 初级AI使用你训练的模型（更弱配置）
      return beginnerNeuralMove(engine, color);
    case 'intermediate':
      // 中级AI使用你训练的模型
      return intermediateNeuralMove(engine, color);
    case 'advanced':
      // 高级AI使用 KataGo
      return advancedMove(engine, color);
    default:
      return randomMove(engine);
  }
}
