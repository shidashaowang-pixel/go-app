/**
 * 围棋核心引擎
 * 实现：气计算、提子、禁入点（自杀手）、劫的判断、胜负判定（中国规则数子法）
 */

export type StoneColor = 'black' | 'white';
export type PointState = StoneColor | null; // null = 空

export interface GoMove {
  row: number;
  col: number;
  color: StoneColor;
  captured: PointState[][]; // 落子后的棋盘快照（用于悔棋）
  koPoint: { row: number; col: number } | null; // 之前的劫禁点
}

export interface GoGameResult {
  winner: StoneColor;
  blackScore: number;
  whiteScore: number;
  komi: number; // 贴目
  details: {
    blackStones: number;
    blackTerritory: number;
    whiteStones: number;
    whiteTerritory: number;
    whiteKomi: number;
  };
}

/** 形势判断结果 */
export interface PositionEstimate {
  /** 黑方胜率 0-100 */
  blackWinRate: number;
  /** 领先目数（正=黑领先，负=白领先） */
  leadBy: number;
  /** 判断阶段：'opening' | 'middlegame' | 'endgame' | 'finished' */
  phase: 'opening' | 'middlegame' | 'endgame' | 'finished';
  /** 置信度：前半盘低(0.3-0.6)，终局高(0.9+) */
  confidence: number;
}

/** 形势判断地盘信息 */
export interface TerritoryEstimate {
  /** 黑方地盘（包含死子区域） */
  black: Map<string, 'solid' | 'possible'>;
  /** 白方地盘（包含死子区域） */
  white: Map<string, 'solid' | 'possible'>;
  /** 中立/争议区域 */
  neutral: Set<string>;
  /** 死活判断为死子的位置 */
  deadStones: Map<string, StoneColor>;
}

/** 试下着法 */
export interface VariationMove {
  row: number;
  col: number;
  color: StoneColor;
}

/** 试下分支 */
export interface VariationBranch {
  id: number;
  moves: VariationMove[];
  parentMoveIndex: number; // 从正式棋局的第几手开始分支
}

/** 让子设置 */
export interface HandicapStones {
  stones: [number, number][]; // 位置列表
  placed: boolean; // 是否已放置
}

export class GoEngine {
  readonly size: number;
  board: PointState[][];
  currentPlayer: StoneColor;
  moveHistory: GoMove[];
  capturedStones: { black: number; white: number }; // 被提走的棋子数
  lastBoardState: string; // 用于劫的判断
  koPoint: { row: number; col: number } | null; // 劫禁点
  consecutivePasses: number;
  gameOver: boolean;
  komi: number; // 贴目，中国规则 7.5 目
  private deadStonesRemoved: boolean; // 是否已移除死子

  // ========== 试下模式 ==========
  isVariationMode: boolean; // 是否在试下模式
  variationMoves: VariationMove[]; // 当前试下着法列表
  variationBranches: VariationBranch[]; // 所有试下分支（用于分支覆盖）
  currentBranchId: number; // 当前分支ID

  // ========== 让子功能 ==========
  handicapStones: [number, number][]; // 让子位置
  handicapPlaced: boolean; // 让子是否已放置
  blackPlayerGoesFirst: boolean; // 黑棋是否先手（猜先时由外部决定）

  constructor(size: number = 19, komi: number = 7.5) {
    this.size = size;
    this.board = this.createEmptyBoard();
    this.currentPlayer = 'black';
    this.moveHistory = [];
    this.capturedStones = { black: 0, white: 0 };
    this.lastBoardState = this.boardToString();
    this.koPoint = null;
    this.consecutivePasses = 0;
    this.gameOver = false;
    this.komi = komi;
    this.deadStonesRemoved = false;

    // 试下模式初始化
    this.isVariationMode = false;
    this.variationMoves = [];
    this.variationBranches = [];
    this.currentBranchId = 0;

    // 让子功能初始化
    this.handicapStones = [];
    this.handicapPlaced = false;
    this.blackPlayerGoesFirst = true; // 默认黑先手
  }

  /** 创建空棋盘 */
  private createEmptyBoard(): PointState[][] {
    return Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () => null)
    );
  }

  /** 棋盘序列化为字符串（用于比较） */
  private boardToString(): string {
    return this.board
      .map(row =>
        row.map(cell => (cell === 'black' ? '1' : cell === 'white' ? '2' : '0')).join('')
      )
      .join('|');
  }

  /** 深拷贝棋盘 */
  private cloneBoard(): PointState[][] {
    return this.board.map(row => [...row]);
  }

  /** 获取相邻四个位置 */
  private getNeighbors(row: number, col: number): [number, number][] {
    const neighbors: [number, number][] = [];
    if (row > 0) neighbors.push([row - 1, col]);
    if (row < this.size - 1) neighbors.push([row + 1, col]);
    if (col > 0) neighbors.push([row, col - 1]);
    if (col < this.size - 1) neighbors.push([row, col + 1]);
    return neighbors;
  }

  /**
   * 计算一个棋子组的「气」
   * @returns { group: 连通的同色棋子集合, liberties: 空邻点集合 }
   */
  getGroup(row: number, col: number): { group: Set<string>; liberties: Set<string> } {
    const color = this.board[row][col];
    if (!color) return { group: new Set(), liberties: new Set() };

    const group = new Set<string>();
    const liberties = new Set<string>();
    const stack: [number, number][] = [[row, col]];

    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      const key = `${r},${c}`;
      if (group.has(key)) continue;
      group.add(key);

      for (const [nr, nc] of this.getNeighbors(r, c)) {
        const neighborKey = `${nr},${nc}`;
        const neighbor = this.board[nr][nc];
        if (neighbor === null) {
          liberties.add(neighborKey);
        } else if (neighbor === color && !group.has(neighborKey)) {
          stack.push([nr, nc]);
        }
      }
    }

    return { group, liberties };
  }

  /** 获取某个位置的气数 */
  getLibertyCount(row: number, col: number): number {
    return this.getGroup(row, col).liberties.size;
  }

  /**
   * 判断落子是否合法
   * 规则：
   * 1. 位置为空
   * 2. 不是劫禁点
   * 3. 落子后不能自杀（除非能提对方的子）
   */
  isValidMove(row: number, col: number, color?: StoneColor): boolean {
    if (this.gameOver) return false;
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return false;
    if (this.board[row][col] !== null) return false;

    const player = color || this.currentPlayer;

    // 检查劫禁点：如果该点是劫禁点，且轮到的玩家就是下棋方，则禁止
    if (this.koPoint && this.koPoint.row === row && this.koPoint.col === col) {
      return false;
    }

    // 模拟落子
    const savedBoard = this.cloneBoard();
    this.board[row][col] = player;

    const opponent = player === 'black' ? 'white' : 'black';

    // 收集所有需要提掉的对方棋子组（递归检查无气组）
    const toRemove: Set<string> = new Set();
    for (const [nr, nc] of this.getNeighbors(row, col)) {
      if (this.board[nr][nc] === opponent) {
        const { group, liberties } = this.getGroup(nr, nc);
        if (liberties.size === 0) {
          for (const key of group) {
            toRemove.add(key);
          }
        }
      }
    }

    // 实际提掉被吃的子
    for (const key of toRemove) {
      const [r, c] = key.split(',').map(Number);
      this.board[r][c] = null;
    }

    // 检查自己是否有气（禁止自杀，除非提了对方的子）
    const { liberties } = this.getGroup(row, col);
    if (liberties.size === 0 && toRemove.size === 0) {
      // 自杀且没有提子，非法
      this.board = savedBoard;
      return false;
    }

    this.board = savedBoard;
    return true;
  }

  /**
   * 落子
   * @returns 被提走的棋子位置列表，null 表示非法落子
   */
  placeStone(row: number, col: number): { capturedStones: [number, number][]; isValid: boolean } {
    if (!this.isValidMove(row, col)) {
      return { capturedStones: [], isValid: false };
    }

    // 保存落子前的棋盘状态（用于悔棋）
    const boardSnapshot = this.cloneBoard();

    const player = this.currentPlayer;
    const opponent = player === 'black' ? 'white' : 'black';

    // 落子
    this.board[row][col] = player;

    // 提子：检查相邻对方棋子组是否无气
    const capturedStones: [number, number][] = [];
    for (const [nr, nc] of this.getNeighbors(row, col)) {
      if (this.board[nr][nc] === opponent) {
        const { group, liberties } = this.getGroup(nr, nc);
        if (liberties.size === 0) {
          for (const key of group) {
            const [r, c] = key.split(',').map(Number);
            capturedStones.push([r, c]);
            this.board[r][c] = null;
          }
        }
      }
    }

    // 更新提子计数
    // capturedStones.black = 被黑棋提掉的白子数
    // capturedStones.white = 被白棋提掉的黑子数
    if (player === 'black') {
      // 黑棋吃的是白子
      this.capturedStones.white += capturedStones.length;
    } else {
      // 白棋吃的是黑子
      this.capturedStones.black += capturedStones.length;
    }

    // 记录历史
    this.moveHistory.push({
      row,
      col,
      color: player,
      captured: boardSnapshot,
      koPoint: this.koPoint, // 保存当前的劫点
    });

    // 劫的判断：如果恰好提了一个子，且落子处也恰好只有一个子
    let newKoPoint: { row: number; col: number } | null = null;
    if (capturedStones.length === 1) {
      const { group, liberties } = this.getGroup(row, col);
      if (group.size === 1 && liberties.size === 1) {
        newKoPoint = { row: capturedStones[0][0], col: capturedStones[0][1] };
      }
    }
    this.koPoint = newKoPoint;

    // 切换玩家
    this.currentPlayer = opponent;
    this.consecutivePasses = 0;

    return { capturedStones, isValid: true };
  }

  /**
   * 悔棋：撤销最后一步
   */
  undo(): boolean {
    if (this.moveHistory.length === 0) return false;

    const lastMove = this.moveHistory.pop()!;
    this.board = lastMove.captured;
    this.currentPlayer = lastMove.color;
    this.koPoint = lastMove.koPoint; // 恢复之前的劫点

    // 恢复提子计数（需要重新计算）
    this.recalculateCaptures();

    this.consecutivePasses = 0;
    this.gameOver = false;

    return true;
  }

  /** 重新计算提子数（悔棋后调用） */
  private recalculateCaptures() {
    this.capturedStones = { black: 0, white: 0 };

    // 重建一个临时棋盘，逐手模拟以统计提子
    const tempBoard = this.createEmptyBoard();

    for (const move of this.moveHistory) {
      if (move.row < 0 || move.col < 0) continue; // 跳过pass

      const opponent: StoneColor = move.color === 'black' ? 'white' : 'black';
      tempBoard[move.row][move.col] = move.color;

      // 检查相邻对方棋子是否被提
      for (const [nr, nc] of this.getNeighbors(move.row, move.col)) {
        if (tempBoard[nr][nc] === opponent) {
          // 手动检查该组的气（不用 getGroup，因为 getGroup 依赖 this.board）
          const group = new Set<string>();
          const liberties = new Set<string>();
          const stack: [number, number][] = [[nr, nc]];

          while (stack.length > 0) {
            const [r, c] = stack.pop()!;
            const key = `${r},${c}`;
            if (group.has(key)) continue;
            group.add(key);

            for (const [nnr, nnc] of this.getNeighbors(r, c)) {
              const nKey = `${nnr},${nnc}`;
              if (tempBoard[nnr][nnc] === null) {
                liberties.add(nKey);
              } else if (tempBoard[nnr][nnc] === opponent && !group.has(nKey)) {
                stack.push([nnr, nnc]);
              }
            }
          }

          if (liberties.size === 0) {
            for (const key of group) {
              const [r, c] = key.split(',').map(Number);
              tempBoard[r][c] = null;
              // capturedStones.black = 被白棋提掉的黑子
              // capturedStones.white = 被黑棋提掉的白子
              if (move.color === 'black') {
                // 黑棋吃的是白子
                this.capturedStones.white++;
              } else {
                // 白棋吃的是黑子
                this.capturedStones.black++;
              }
            }
          }
        }
      }
    }
  }

  /**
   * 虚手（Pass）
   */
  pass(): boolean {
    if (this.gameOver) return false;

    this.moveHistory.push({
      row: -1,
      col: -1,
      color: this.currentPlayer,
      captured: this.cloneBoard(),
      koPoint: this.koPoint, // 保存当前的劫点
    });

    this.consecutivePasses++;
    this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
    this.koPoint = null;

    // 双方连续虚手，游戏结束
    if (this.consecutivePasses >= 2) {
      this.gameOver = true;
    }

    return true;
  }

  /**
   * 认输
   */
  resign(): StoneColor {
    this.gameOver = true;
    return this.currentPlayer === 'black' ? 'white' : 'black'; // 认输方输
  }

  /**
   * 中国规则数子法判定胜负
   * 黑方得分 = 黑子数 + 黑地数
   * 白方得分 = 白子数 + 白地数 + 贴目
   * @param removeDeadStones 是否移除死子（终局数子时应为 true）
   */
  calculateScore(removeDeadStones: boolean = false): GoGameResult {
    // 终局时先标记并移除死子（只移除一次）
    if (removeDeadStones && !this.deadStonesRemoved) {
      this.removeDeadStones();
      this.deadStonesRemoved = true;
    }

    const territory = this.calculateTerritory();

    let blackStones = 0;
    let whiteStones = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 'black') blackStones++;
        if (this.board[r][c] === 'white') whiteStones++;
      }
    }

    const blackTerritory = territory.black.size;
    const whiteTerritory = territory.white.size;

    const blackScore = blackStones + blackTerritory;
    const whiteScore = whiteStones + whiteTerritory + this.komi;

    return {
      winner: blackScore > whiteScore ? 'black' : 'white',
      blackScore,
      whiteScore,
      komi: this.komi,
      details: {
        blackStones,
        blackTerritory,
        whiteStones,
        whiteTerritory,
        whiteKomi: this.komi,
      },
    };
  }

  /**
   * 移除死子（终局数子前的处理）
   * 使用简化规则：完全被对方领地包围且没有眼的棋子组视为死子
   */
  private removeDeadStones(): void {
    const visited = new Set<string>();
    const deadStones: [number, number, StoneColor][] = [];

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const key = `${r},${c}`;
        if (this.board[r][c] === null || visited.has(key)) continue;

        const color = this.board[r][c]!;
        const { group, liberties } = this.getGroup(r, c);

        for (const k of group) visited.add(k);

        // 判断是否为死子：气数 <= 2 且没有眼的棋组
        if (liberties.size <= 2) {
          // 检查是否有真眼
          const hasEye = this.groupHasEye(group, color);
          if (!hasEye && liberties.size <= 1) {
            // 没有真眼且只有0-1口气 → 大概率是死子
            for (const k of group) {
              const [dr, dc] = k.split(',').map(Number);
              deadStones.push([dr, dc, color]);
            }
          }
        }
      }
    }

    // 移除死子
    // 注意：这是终局时由白方（计算方）移除死子
    // capturedStones.black = 被白棋提掉的黑子数
    // capturedStones.white = 被黑棋提掉的白子数
    for (const [r, c, color] of deadStones) {
      this.board[r][c] = null;
      if (color === 'black') {
        // 黑子是死子，由白方（计算方）移除，相当于白方提掉了黑子
        this.capturedStones.black += 1;
      } else {
        // 白子是死子，但这是白方移除的，不会算作黑棋的提子
        // 白方移除己方死子不应增加任何计数，因为这不是对弈中的提子
        // 不做任何增加
      }
    }
  }

  /**
   * 检查一个棋组是否有真眼
   */
  private groupHasEye(group: Set<string>, color: StoneColor): boolean {
    const opponent = color === 'black' ? 'white' : 'black';
    let eyeCount = 0;

    for (const k of group) {
      const [r, c] = k.split(',').map(Number);
      for (const [nr, nc] of this.getNeighbors(r, c)) {
        // 空邻点
        if (this.board[nr][nc] === null) {
          // 检查这个空点是否为真眼
          let isEye = true;
          const diagNeighbors = this.getDiagonals(nr, nc);
          let opponentDiag = 0;
          let totalDiag = diagNeighbors.length;

          for (const [dr, dc] of diagNeighbors) {
            if (this.board[dr][dc] === opponent) opponentDiag++;
          }

          // 角上：对方占1个对角就不算眼；边上/中间：对方占2个以上不算
          const isCornerOrEdge = totalDiag < 4;
          if (isCornerOrEdge && opponentDiag >= 1) isEye = false;
          else if (!isCornerOrEdge && opponentDiag >= 2) isEye = false;

          if (isEye) eyeCount++;
        }
      }
    }

    return eyeCount >= 1;
  }

  /**
   * 获取对角线邻居
   */
  private getDiagonals(row: number, col: number): [number, number][] {
    const diags: [number, number][] = [];
    if (row > 0 && col > 0) diags.push([row - 1, col - 1]);
    if (row > 0 && col < this.size - 1) diags.push([row - 1, col + 1]);
    if (row < this.size - 1 && col > 0) diags.push([row + 1, col - 1]);
    if (row < this.size - 1 && col < this.size - 1) diags.push([row + 1, col + 1]);
    return diags;
  }

  /**
   * 计算领地（中国规则）
   * 空点如果只被一方棋子包围，则为该方领地
   */
  calculateTerritory(): { black: Set<string>; white: Set<string>; neutral: Set<string> } {
    const visited = new Set<string>();
    const blackTerritory = new Set<string>();
    const whiteTerritory = new Set<string>();
    const neutral = new Set<string>();

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const key = `${r},${c}`;
        if (this.board[r][c] !== null || visited.has(key)) continue;

        // BFS 找到连通的空区域
        const emptyGroup = new Set<string>();
        const adjacentColors = new Set<StoneColor>();
        const stack: [number, number][] = [[r, c]];

        while (stack.length > 0) {
          const [cr, cc] = stack.pop()!;
          const ck = `${cr},${cc}`;
          if (emptyGroup.has(ck) || visited.has(ck)) continue;

          if (this.board[cr][cc] !== null) {
            adjacentColors.add(this.board[cr][cc]!);
            continue;
          }

          emptyGroup.add(ck);
          visited.add(ck);

          for (const [nr, nc] of this.getNeighbors(cr, cc)) {
            if (!visited.has(`${nr},${nc}`) && !emptyGroup.has(`${nr},${nc}`)) {
              stack.push([nr, nc]);
            }
          }
        }

        // 判断空区域归属
        if (adjacentColors.size === 1) {
          const color = adjacentColors.values().next().value!;
          if (color === 'black') {
            for (const k of emptyGroup) blackTerritory.add(k);
          } else {
            for (const k of emptyGroup) whiteTerritory.add(k);
          }
        } else {
          for (const k of emptyGroup) neutral.add(k);
        }
      }
    }

    return { black: blackTerritory, white: whiteTerritory, neutral };
  }

  /** 获取所有合法落子点 */
  getValidMoves(): [number, number][] {
    const moves: [number, number][] = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.isValidMove(r, c)) {
          moves.push([r, c]);
        }
      }
    }
    return moves;
  }

  /** 获取最后一手 */
  getLastMove(): { row: number; col: number; color: StoneColor } | null {
    if (this.moveHistory.length === 0) return null;
    const last = this.moveHistory[this.moveHistory.length - 1];
    if (last.row === -1) return null; // 虚手
    return { row: last.row, col: last.col, color: last.color };
  }

  /** 获取手数 */
  getMoveCount(): number {
    return this.moveHistory.length;
  }

  /** 获取指定位置的棋子 */
  getStone(row: number, col: number): PointState {
    return this.board[row][col];
  }

  /** 获取完整棋谱历史 */
  getMoveHistory(): GoMove[] {
    return this.moveHistory;
  }

  /** 从初始位置加载棋盘（用于题目/定式展示） */
  loadPosition(position: { black: number[][]; white: number[][] }, nextPlayer: StoneColor = 'black') {
    this.board = this.createEmptyBoard();
    position.black?.forEach(([r, c]) => {
      if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
        this.board[r][c] = 'black';
      }
    });
    position.white?.forEach(([r, c]) => {
      if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
        this.board[r][c] = 'white';
      }
    });
    this.currentPlayer = nextPlayer;
    this.moveHistory = [];
    this.capturedStones = { black: 0, white: 0 };
    this.koPoint = null;
    this.consecutivePasses = 0;
    this.gameOver = false;
    this.lastBoardState = this.boardToString();
  }

  // ========== 形势判断 ==========

  /**
   * 形势判断（基于棋子数+领地+影响力的加权评估）
   * 前半盘置信度低(0.3~0.5)，中盘中等(0.5~0.7)，终局精确(0.9+)
   * 返回估算目数差和胜率
   */
  estimatePosition(): PositionEstimate {
    const moveCount = this.getMoveCount();
    const totalPoints = this.size * this.size;
    const phaseThreshold = totalPoints * 0.4;

    let phase: PositionEstimate['phase'];
    if (this.gameOver) phase = 'finished';
    else if (moveCount < totalPoints * 0.15) phase = 'opening';
    else if (moveCount < phaseThreshold) phase = 'middlegame';
    else phase = 'endgame';

    // 精确数子（不移动死子，只计算棋盘上的）
    let blackStones = 0, whiteStones = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 'black') blackStones++;
        else if (this.board[r][c] === 'white') whiteStones++;
      }
    }

    // 领地计算
    const territory = this.calculateTerritory();
    const blackTerritory = territory.black.size;
    const whiteTerritory = territory.white.size;

    // 终局时用中国规则数子法
    if (phase === 'finished') {
      const blackScore = blackStones + blackTerritory;
      const whiteScore = whiteStones + whiteTerritory + this.komi;
      const leadBy = blackScore - whiteScore;
      return { blackWinRate: blackScore > whiteScore ? 100 : 0, leadBy, phase, confidence: 1.0 };
    }

    // 非终局：影响力评估（简化版，权重更低）
    const influence = this.calculateInfluence();

    // 综合评分（影响力权重更低，更保守）
    const territoryScore = phase === 'endgame' ? 0.8 : 0.4;
    const influenceWeight = phase === 'endgame' ? 0.2 : 0.1;

    const blackEval = blackStones + blackTerritory * territoryScore + influence.blackInfluence * influenceWeight;
    const whiteEval = whiteStones + whiteTerritory * territoryScore + influence.whiteInfluence * influenceWeight + this.komi * 0.2;

    const leadBy = blackEval - whiteEval;

    // 置信度：更保守的开局预估
    let confidence: number;
    switch (phase) {
      case 'opening': confidence = Math.min(0.15 + moveCount / 100, 0.35); break;
      case 'middlegame': confidence = Math.min(0.35 + (moveCount - totalPoints * 0.15) / (phaseThreshold - totalPoints * 0.15) * 0.25, 0.6); break;
      case 'endgame': confidence = Math.min(0.6 + (moveCount - phaseThreshold) / (totalPoints * 0.15) * 0.35, 0.95); break;
      default: confidence = 0.95;
    }

    // 胜率计算（用更大的scale使曲线更平滑）
    const scale = phase === 'endgame' ? 6 : 10;
    const rawWinRate = 100 / (1 + Math.exp(-leadBy / scale));
    const blackWinRate = 50 + (rawWinRate - 50) * confidence;

    return { blackWinRate, leadBy, phase, confidence };
  }

  /**
   * 估算形势判断地盘（基于死活判断）
   * 结合棋子死活、领地归属来估算双方地盘
   * @returns 包含黑白地盘、死子位置的地盘信息
   */
  estimateTerritory(): TerritoryEstimate {
    const black = new Map<string, 'solid' | 'possible'>();
    const white = new Map<string, 'solid' | 'possible'>();
    const neutral = new Set<string>();
    const deadStones = new Map<string, StoneColor>();

    // 1. 先移除死子（在估算副本上）
    const boardCopy = this.cloneBoard();
    const { groups: deadGroups } = this.analyzeDeadGroups();

    // 标记死子
    for (const [key, color] of deadGroups) {
      const [r, c] = key.split(',').map(Number);
      deadStones.set(key, color);
      boardCopy[r][c] = null; // 临时移除用于领地计算
    }

    // 2. 计算领地（使用处理过死子的棋盘）
    const visited = new Set<string>();
    const tempEngine = new GoEngine(this.size, this.komi);
    tempEngine.board = boardCopy;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const key = `${r},${c}`;
        if (boardCopy[r][c] !== null || visited.has(key)) continue;

        // BFS 找到连通的空区域
        const emptyGroup = new Set<string>();
        const adjacentColors = new Set<StoneColor>();
        const stack: [number, number][] = [[r, c]];

        while (stack.length > 0) {
          const [cr, cc] = stack.pop()!;
          const ck = `${cr},${cc}`;
          if (emptyGroup.has(ck) || visited.has(ck)) continue;

          if (boardCopy[cr][cc] !== null) {
            adjacentColors.add(boardCopy[cr][cc]!);
            continue;
          }

          emptyGroup.add(ck);
          visited.add(ck);

          for (const [nr, nc] of this.getNeighbors(cr, cc)) {
            if (!visited.has(`${nr},${nc}`) && !emptyGroup.has(`${nr},${nc}`) && boardCopy[nr][nc] === null) {
              stack.push([nr, nc]);
            }
          }
        }

        // 判断空区域归属
        if (adjacentColors.size === 1) {
          const color = adjacentColors.values().next().value!;
          for (const k of emptyGroup) {
            if (color === 'black') {
              black.set(k, 'solid');
            } else {
              white.set(k, 'solid');
            }
          }
        } else {
          // 争议区域，标记为possible给双方
          for (const k of emptyGroup) {
            neutral.add(k);
          }
        }
      }
    }

    // 3. 扩展地盘影响力（基于死活判断）
    // 活棋周围的地盘更确定，死棋周围的地盘要打折
    const influenceRange = 2; // 影响范围
    for (const [key, color] of deadGroups) {
      const [r, c] = key.split(',').map(Number);
      const enemyColor = color === 'black' ? 'white' : 'black';

      // 死子周围的地盘归属敌方
      for (let dr = -influenceRange; dr <= influenceRange; dr++) {
        for (let dc = -influenceRange; dc <= influenceRange; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
          const nk = `${nr},${nc}`;
          if (boardCopy[nr][nc] === null && !deadStones.has(nk)) {
            // 死子周围空点归敌方（可能的）
            if (enemyColor === 'black') {
              if (!black.has(nk) && !neutral.has(nk)) black.set(nk, 'possible');
            } else {
              if (!white.has(nk) && !neutral.has(nk)) white.set(nk, 'possible');
            }
          }
        }
      }
    }

    return { black, white, neutral, deadStones };
  }

  /**
   * 分析死子（简化版死活判断）
   * @returns 返回死子组和对应的颜色
   */
  private analyzeDeadGroups(): { groups: Map<string, StoneColor>; liveGroups: Set<string> } {
    const groups = new Map<string, StoneColor>();
    const liveGroups = new Set<string>();
    const visited = new Set<string>();

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const key = `${r},${c}`;
        if (this.board[r][c] === null || visited.has(key)) continue;

        const color = this.board[r][c]!;
        const { group, liberties } = this.getGroup(r, c);

        for (const k of group) visited.add(k);

        // 判断死活：
        // 1. 气数很少(<=1)且没眼 = 大概率死子
        // 2. 气数>=3且有眼 = 活棋
        // 3. 其他 = 模糊
        const hasEye = this.groupHasEye(group, color);

        if (liberties.size <= 1 && !hasEye) {
          // 无气且无眼 = 死子
          for (const k of group) {
            groups.set(k, color);
          }
        } else if (liberties.size >= 3 && hasEye) {
          // 多气且有眼 = 活棋
          for (const k of group) {
            liveGroups.add(k);
          }
        }
        // 其他情况不标记（模糊）
      }
    }

    return { groups, liveGroups };
  }

  /**
   * 计算双方影响力（优化版）
   * 使用BFS从棋子向外扩展计算影响，减少遍历次数
   */
  private calculateInfluence() { 
    let blackInf = 0; 
    let whiteInf = 0;
    const visited = new Set<string>();
    const range = this.size;
    
    // 优化：从棋子向外扩展，而非从空点找棋子
    // 使用队列进行BFS
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const key = `${r},${c}`;
        if (visited.has(key) || !this.board[r][c]) continue;
        
        const color = this.board[r][c] as StoneColor;
        const isBlack = color === 'black';
        
        // BFS扩散
        const queue: [number, number, number][] = [[r, c, 0]]; // row, col, distance
        const colorVisited = new Set<string>();
        
        while (queue.length > 0) {
          const [qr, qc, dist] = queue.shift()!;
          const qkey = `${qr},${qc}`;
          
          if (colorVisited.has(qkey)) continue;
          colorVisited.add(qkey);
          
          if (dist > 0) { // 不计算原点
            const weight = Math.max(0, 1 - dist / range);
            if (this.board[qr][qc] === null) {
              // 空点：增加影响力
              if (isBlack) blackInf += weight;
              else whiteInf += weight;
            } else if (this.board[qr][qc] !== color) {
              // 对方棋子：减少对方影响力
              if (isBlack) whiteInf += weight * 0.5;
              else blackInf += weight * 0.5;
            }
          }
          
          // 扩散到邻居
          if (dist < range) {
            const neighbors = this.getNeighbors(qr, qc);
            for (const [nr, nc] of neighbors) {
              const nkey = `${nr},${nc}`;
              if (!colorVisited.has(nkey) && dist + 1 < range) {
                queue.push([nr, nc, dist + 1]);
              }
            }
          }
        }
      }
    }
    return { blackInfluence: blackInf, whiteInfluence: whiteInf };
  }

  // ========== 试下模式方法 ==========

  /** 进入试下模式 */
  enterVariationMode(): void {
    this.isVariationMode = true;
    this.variationMoves = [];
    this.variationBranches = [];
    this.currentBranchId = 0;
  }

  /**
   * 在试下模式下添加着法
   * @returns 是否添加成功（如果位置已有棋子则失败）
   */
  addVariationMove(row: number, col: number): boolean {
    if (!this.isVariationMode) return false;
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return false;

    // 检查该位置是否已有棋子（包括正式着法和试下着法）
    if (this.board[row][col] !== null) return false;
    if (this.variationMoves.some(m => m.row === row && m.col === col)) return false;

    // 检查试下着法是否会提走正式棋局的棋子
    // 简化为：只允许在空位落子

    const move: VariationMove = {
      row,
      col,
      color: this.getVariationCurrentPlayer(),
    };

    // 分支覆盖逻辑：如果当前步数小于试下着法列表长度，说明在回退后换了着法
    // 则截断后面的试下着法，用新着法替代
    if (this.variationMoves.length > 0) {
      // 移除当前分支后续的所有着法
      this.variationMoves = this.variationMoves.slice(0, this.variationMoves.length);
    }

    this.variationMoves.push(move);
    return true;
  }

  /** 获取试下模式下的当前玩家 */
  getVariationCurrentPlayer(): StoneColor {
    if (this.variationMoves.length === 0) {
      // 试下从最后一手正式着法后的下一个玩家开始
      if (this.moveHistory.length === 0) return 'black';
      return this.moveHistory[this.moveHistory.length - 1].color === 'black' ? 'white' : 'black';
    }
    return this.variationMoves[this.variationMoves.length - 1].color === 'black' ? 'white' : 'black';
  }

  /** 获取试下模式下的最后一手 */
  getLastVariationMove(): VariationMove | null {
    if (this.variationMoves.length === 0) return null;
    return this.variationMoves[this.variationMoves.length - 1];
  }

  /** 试下模式后退一步 */
  undoVariationMove(): boolean {
    if (!this.isVariationMode || this.variationMoves.length === 0) return false;
    this.variationMoves.pop();
    return true;
  }

  /** 试下模式前进到下一步 */
  redoVariationMove(): boolean {
    if (!this.isVariationMode) return false;
    // 当前已经显示到最后了，无法前进
    return false;
  }

  /** 获取当前试下着法索引 */
  getVariationCurrentIndex(): number {
    return this.variationMoves.length;
  }

  /** 获取试下着法数量 */
  getVariationMoveCount(): number {
    return this.variationMoves.length;
  }

  /** 退出试下模式，清空所有试下着法 */
  exitVariationMode(): void {
    this.isVariationMode = false;
    this.variationMoves = [];
    this.variationBranches = [];
    this.currentBranchId = 0;
  }

  /** 清空试下着法（保留试下模式） */
  clearVariationMoves(): void {
    this.variationMoves = [];
    this.variationBranches = [];
  }

  // ========== 让子功能方法 ==========

  /**
   * 设置让子数
   * @param handicap 让子数量（2-9）
   * @returns 放置的位置列表
   */
  setHandicap(n: number): [number, number][] {
    if (n < 2) {
      this.handicapStones = [];
      this.handicapPlaced = false;
      return [];
    }

    // 根据棋盘大小和让子数计算标准让子位置
    const positions = this.calculateHandicapPositions(n);
    this.handicapStones = positions;
    this.handicapPlaced = false; // 待确认后放置
    return positions;
  }

  /**
   * 计算让子位置（星位布局）
   */
  private calculateHandicapPositions(n: number): [number, number][] {
    const positions: [number, number][] = [];

    if (this.size === 9) {
      // 9路棋盘：标准让子位置
      const starPoints = [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]];
      for (let i = 0; i < Math.min(n, 5); i++) {
        positions.push(starPoints[i]);
      }
    } else if (this.size === 13) {
      // 13路棋盘
      const starPoints = [[3, 3], [3, 9], [6, 6], [9, 3], [9, 9], [6, 3], [6, 9], [3, 6], [9, 6]];
      for (let i = 0; i < Math.min(n, 9); i++) {
        positions.push(starPoints[i]);
      }
    } else {
      // 19路棋盘：标准星位
      const starPoints = [
        [3, 3], [3, 9], [3, 15],
        [9, 3], [9, 9], [9, 15],
        [15, 3], [15, 9], [15, 15],
      ];
      // 让子2-4个：放在星位
      // 让子5-9个：加上4个角的星位
      if (n <= 4) {
        for (let i = 0; i < n; i++) {
          positions.push(starPoints[i]);
        }
      } else {
        // 5个以上：先放4个角，再加上下边的星位
        positions.push(starPoints[0]); // 左上
        positions.push(starPoints[2]); // 右上
        positions.push(starPoints[6]); // 左下
        positions.push(starPoints[8]); // 右下
        if (n >= 5) positions.push(starPoints[4]); // 天元
        if (n >= 6) positions.push(starPoints[1]); // 上边
        if (n >= 7) positions.push(starPoints[7]); // 下边
        if (n >= 8) positions.push(starPoints[3]); // 左边
        if (n >= 9) positions.push(starPoints[5]); // 右边
      }
    }

    return positions.slice(0, n);
  }

  /**
   * 放置让子（确认放置到棋盘上）
   * 让子默认是黑棋，放在指定位置
   */
  placeHandicap(): void {
    if (this.handicapPlaced || this.handicapStones.length === 0) return;

    for (const [row, col] of this.handicapStones) {
      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        this.board[row][col] = 'black';
      }
    }
    this.handicapPlaced = true;
    // 让子后，白棋先行
    this.currentPlayer = 'white';
  }

  /**
   * 放置让子（白方放子版本，用于"AI让我"场景）
   * 让子是白棋，放在指定位置
   */
  placeHandicapAsWhite(): void {
    if (this.handicapPlaced || this.handicapStones.length === 0) return;

    for (const [row, col] of this.handicapStones) {
      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        this.board[row][col] = 'white';
      }
    }
    this.handicapPlaced = true;
    // 让子后，黑棋先行
    this.currentPlayer = 'black';
  }

  /**
   * 获取让子数量
   */
  getHandicapCount(): number {
    return this.handicapStones.length;
  }

  /**
   * 是否已放置让子
   */
  isHandicapPlaced(): boolean {
    return this.handicapPlaced;
  }

  /**
   * 重置让子
   */
  resetHandicap(): void {
    this.handicapStones = [];
    this.handicapPlaced = false;
  }
}
