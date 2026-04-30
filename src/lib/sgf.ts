/**
 * SGF (Smart Game Format) 解析与生成器
 * 用于导入/导出围棋棋谱和题目
 */

import type { GameMove, ScoreDetail } from '@/types';
import type { Problem } from '@/types';

// SGF 特殊字符转义
function escapeSGF(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
}

// 将坐标转换为 SGF 格式 (a-s for 0-18)
function coordToSGF(row: number, col: number, size: number = 19): string {
  if (row < 0 || col < 0) return 'tt'; // Pass
  const letter = String.fromCharCode(97 + col); // a=97
  const letter2 = String.fromCharCode(97 + (size - 1 - row));
  return letter + letter2;
}

// 解析 SGF 坐标
function sgfToCoord(coord: string, size: number = 19): { row: number; col: number } | null {
  if (!coord || coord.length !== 2 || coord === 'tt') return null;
  const col = coord.charCodeAt(0) - 97;
  const row = size - 1 - (coord.charCodeAt(1) - 97);
  if (row < 0 || col < 0 || row >= size || col >= size) return null;
  return { row, col };
}

/** 将游戏记录转换为 SGF 格式 */
export function gameToSGF(
  moves: GameMove[] | number[][],
  boardSize: number,
  blackPlayer: string = 'Black',
  whitePlayer: string = 'White',
  result?: string,
  komi: number = 7.5,
  gameName: string = '围棋对局',
  date?: string
): string {
  const lines: string[] = [];
  lines.push('(;');
  
  // 游戏信息
  lines.push(`GM[1]FF[4]SZ[${boardSize}]`);
  lines.push(`CA[UTF-8]`);
  lines.push(`GN[${escapeSGF(gameName)}]`);
  
  // 日期
  const dateStr = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
  lines.push(`DT[${dateStr}]`);
  
  // 玩家信息
  lines.push(`PB[${escapeSGF(blackPlayer)}]`);
  lines.push(`PW[${escapeSGF(whitePlayer)}]`);
  
  // 贴目
  lines.push(`KM[${komi}]`);
  
  // 结果
  if (result) {
    lines.push(`RE[${escapeSGF(result)}]`);
  }
  
  // 棋谱
  lines.push(';');
  
  const isNewFormat = moves.length > 0 && 'color' in moves[0];
  
  for (let i = 0; i < moves.length; i++) {
    const move = isNewFormat ? (moves[i] as GameMove) : {
      row: (moves[i] as number[])[0],
      col: (moves[i] as number[])[1],
      color: i % 2 === 0 ? 'black' : 'white'
    };
    
    if (move.isPass) {
      lines.push(';W[]');
    } else {
      const coord = coordToSGF(move.row, move.col, boardSize);
      const stone = move.color === 'black' ? 'B' : 'W';
      lines.push(`;${stone}[${coord}]`);
    }
  }
  
  lines.push(')');
  return lines.join('\n');
}

/** 解析 SGF 格式字符串 */
export interface SGFParseResult {
  moves: { row: number; col: number; color: 'black' | 'white' }[];
  boardSize: number;
  blackPlayer: string;
  whitePlayer: string;
  result?: string;
  komi: number;
  gameName: string;
  date?: string;
  handicap?: number;
}

export function parseSGF(sgf: string): SGFParseResult | null {
  try {
    // 移除空白和换行
    sgf = sgf.replace(/\s+/g, '');
    
    // 检查基本格式
    if (!sgf.startsWith('(;') || !sgf.endsWith(')')) {
      return null;
    }
    
    const result: SGFParseResult = {
      moves: [],
      boardSize: 19,
      blackPlayer: 'Black',
      whitePlayer: 'White',
      komi: 7.5,
      gameName: 'Imported Game',
    };
    
    // 提取属性
    const propMatches = sgf.matchAll(/([A-Z]+)\[([^\]]*)\]/g);
    for (const match of propMatches) {
      const [, key, value] = match;
      switch (key) {
        case 'SZ':
          result.boardSize = parseInt(value) || 19;
          break;
        case 'PB':
          result.blackPlayer = value.replace(/\\]/g, ']');
          break;
        case 'PW':
          result.whitePlayer = value.replace(/\\]/g, ']');
          break;
        case 'KM':
          result.komi = parseFloat(value) || 7.5;
          break;
        case 'RE':
          result.result = value;
          break;
        case 'GN':
          result.gameName = value.replace(/\\]/g, ']');
          break;
        case 'DT':
          result.date = value;
          break;
        case 'HA':
          result.handicap = parseInt(value) || 0;
          break;
      }
    }
    
    // 提取棋谱 (B[...] 和 W[...])
    const moveRegex = /[BW]\[([a-s]{2}|)\]/g;
    let match;
    let moveIndex = 0;
    
    while ((match = moveRegex.exec(sgf)) !== null) {
      const coord = match[1];
      const isBlack = match[0][0] === 'B';
      
      // 跳过前几个落子（让子棋的前几手）
      if (result.handicap && moveIndex < result.handicap) {
        moveIndex++;
        continue;
      }
      
      if (!coord || coord === 'tt') {
        // Pass
        result.moves.push({
          row: -1,
          col: -1,
          color: isBlack ? 'black' : 'white'
        });
      } else {
        const pos = sgfToCoord(coord, result.boardSize);
        if (pos) {
          result.moves.push({
            row: pos.row,
            col: pos.col,
            color: isBlack ? 'black' : 'white'
          });
        }
      }
      moveIndex++;
    }
    
    return result;
  } catch {
    return null;
  }
}

/** 下载 SGF 文件 */
export function downloadSGF(
  moves: GameMove[] | number[][],
  boardSize: number,
  filename: string = 'game'
): void {
  const sgf = gameToSGF(moves, boardSize);
  const blob = new Blob([sgf], { type: 'application/x-go-sgf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.sgf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 复制 SGF 到剪贴板 */
export async function copySGFToClipboard(
  moves: GameMove[] | number[][],
  boardSize: number
): Promise<boolean> {
  try {
    const sgf = gameToSGF(moves, boardSize);
    await navigator.clipboard.writeText(sgf);
    return true;
  } catch {
    return false;
  }
}

/** 分享棋谱 (Web Share API) */
export async function shareGame(
  moves: GameMove[] | number[][],
  boardSize: number,
  title: string = '我的围棋对局'
): Promise<boolean> {
  const sgf = gameToSGF(moves, boardSize);
  
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text: `来看看我的围棋对局！共 ${moves.length} 手`,
        files: [
          new File([sgf], 'game.sgf', { type: 'application/x-go-sgf' })
        ]
      });
      return true;
    } catch {
      // 用户取消分享
      return false;
    }
  } else {
    // 不支持分享 API，复制到剪贴板
    return copySGFToClipboard(moves, boardSize);
  }
}

// ========== 题目导入相关类型 ==========

export interface ProblemImportResult {
  success: boolean;
  problems: Partial<Problem>[];
  errors: string[];
}

/**
 * 解析题目SGF文件
 * 支持多种格式：
 * 1. 普通对局SGF（第一手作为正解）
 * 2. 题目专用SGF（包含AB/AW设置初始位置）
 * 3. 多道题目的SGF集合
 */
export function parseProblemSGF(sgf: string): ProblemImportResult {
  const result: ProblemImportResult = {
    success: false,
    problems: [],
    errors: []
  };

  try {
    // 预处理：移除注释和多余空白
    let cleanSgf = sgf.replace(/CR\[.*?\]/g, ''); // 移除圆形标记
    cleanSgf = cleanSgf.replace(/SQ\[.*?\]/g, ''); // 移除方形标记
    cleanSgf = cleanSgf.replace(/MA\[.*?\]/g, ''); // 移除X标记
    cleanSgf = cleanSgf.replace(/TR\[.*?\]/g, ''); // 移除三角形标记
    cleanSgf = cleanSgf.replace(/[^()]*\([^)]*\)[^()]*/g, (match) => {
      // 保留主变化，简化分支变化
      return match.replace(/;/g, '\n;');
    });

    // 分割多个题目（用分号包围）
    const sgfParts = cleanSgf.split(/\)\s*\(;/);

    for (let partIndex = 0; partIndex < sgfParts.length; partIndex++) {
      let part = sgfParts[partIndex];
      if (!part.trim()) continue;

      // 确保每部分有完整的SGF格式
      if (!part.startsWith('(;')) {
        part = '(;' + part;
      }
      if (!part.endsWith(')')) {
        part = part + ')';
      }

      const problem = parseSingleProblemSGF(part, partIndex);
      if (problem) {
        result.problems.push(problem);
      }
    }

    result.success = result.problems.length > 0;
    return result;
  } catch (error: any) {
    result.errors.push(`解析失败: ${error.message}`);
    return result;
  }
}

/**
 * 解析单道题目SGF
 */
function parseSingleProblemSGF(sgf: string, index: number): Partial<Problem> | null {
  const problem: Partial<Problem> = {
    title: '',
    description: null,
    type: 'practice',
    checkpoint_level: null,
    board_size: 19,
    difficulty: 3,
    published: false,
    initial_position: { black: [], white: [] },
    solution: { moves: [] }
  };

  try {
    // 提取基本信息
    const propMatches = sgf.matchAll(/([A-Z]+)\[([^\]]*)\]/g);
    for (const match of propMatches) {
      const [, key, value] = match;
      switch (key) {
        case 'SZ':
          problem.board_size = parseInt(value) || 19;
          break;
        case 'GN':
        case 'NA':
          problem.title = problem.title || value.replace(/\\]/g, ']').substring(0, 50);
          break;
        case 'C':
          problem.description = problem.description || value.replace(/\\]/g, ']').substring(0, 200);
          break;
        case 'DI':
          problem.difficulty = parseInt(value) || 3;
          break;
      }
    }

    // 如果没有标题，生成一个
    if (!problem.title) {
      problem.title = `导入题目 ${index + 1}`;
    }

    const boardSize = problem.board_size!;

    // 解析初始位置 - AB (Add Black), AW (Add White)
    const abMatches = sgf.matchAll(/AB([a-s]+)/gi);
    for (const match of abMatches) {
      const coords = match[1];
      for (let i = 0; i < coords.length; i += 2) {
        if (i + 1 < coords.length) {
          const pos = sgfToCoord(coords.substring(i, i + 2), boardSize);
          if (pos) {
            problem.initial_position!.black.push([pos.row, pos.col]);
          }
        }
      }
    }

    const awMatches = sgf.matchAll(/AW([a-s]+)/gi);
    for (const match of awMatches) {
      const coords = match[1];
      for (let i = 0; i < coords.length; i += 2) {
        if (i + 1 < coords.length) {
          const pos = sgfToCoord(coords.substring(i, i + 2), boardSize);
          if (pos) {
            problem.initial_position!.white.push([pos.row, pos.col]);
          }
        }
      }
    }

    // 解析正解 - 第一个B或W作为正解的第一步
    // 题目格式通常是：初始位置 + 若干正解步
    const moveRegex = /([BW])\[([a-s]{2}|)\]/g;
    const moves: number[][] = [];
    let match;
    let solutionStarted = false;

    while ((match = moveRegex.exec(sgf)) !== null) {
      const [, stone, coord] = match;

      if (!coord || coord === 'tt') continue;

      const pos = sgfToCoord(coord, boardSize);
      if (pos) {
        // 如果是白子先走（题目可能白先），或者在AB/AW之后的第一手
        if (!solutionStarted) {
          solutionStarted = true;
        }
        moves.push([pos.row, pos.col]);

        // 限制正解步数（通常题目只有1-3步正解）
        if (moves.length >= 5) break;
      }
    }

    if (moves.length > 0) {
      problem.solution!.moves = moves;
    }

    // 验证题目完整性
    if (problem.initial_position!.black.length === 0 && problem.initial_position!.white.length === 0) {
      // 没有初始位置，可能整盘棋都是正解
      problem.initial_position = { black: [], white: [] };
    }

    return problem;
  } catch {
    return null;
  }
}

/**
 * 从文件内容解析题目
 */
export async function parseProblemFile(file: File): Promise<ProblemImportResult> {
  try {
    const text = await file.text();

    // 检查文件扩展名
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'sgf') {
      return parseProblemSGF(text);
    } else if (ext === 'txt') {
      // 尝试逐行解析多道题目
      const lines = text.split('\n');
      const problems: Partial<Problem>[] = [];
      let currentSgf = '';
      let inSgf = false;

      for (const line of lines) {
        if (line.trim().startsWith('(;')) {
          inSgf = true;
          currentSgf = line.trim();
        } else if (inSgf) {
          currentSgf += line.trim();
          if (line.includes(')')) {
            const result = parseSingleProblemSGF(currentSgf, problems.length);
            if (result) {
              problems.push(result);
            }
            currentSgf = '';
            inSgf = false;
          }
        }
      }

      return {
        success: problems.length > 0,
        problems,
        errors: problems.length === 0 ? ['未找到有效的题目'] : []
      };
    } else {
      return {
        success: false,
        problems: [],
        errors: ['不支持的文件格式，请使用 .sgf 或 .txt 文件']
      };
    }
  } catch (error: any) {
    return {
      success: false,
      problems: [],
      errors: [`读取文件失败: ${error.message}`]
    };
  }
}

/**
 * 批量导入多个题目文件
 */
export async function parseMultipleProblemFiles(files: FileList | File[]): Promise<ProblemImportResult> {
  const allResult: ProblemImportResult = {
    success: true,
    problems: [],
    errors: []
  };

  for (const file of Array.from(files)) {
    const result = await parseProblemFile(file);
    allResult.problems.push(...result.problems);
    allResult.errors.push(...result.errors.map(e => `${file.name}: ${e}`));
  }

  allResult.success = allResult.problems.length > 0;
  return allResult;
}
