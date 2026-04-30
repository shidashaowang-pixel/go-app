/**
 * AI 辅助复盘服务
 * 使用 KataGo 分析每一步棋的优劣
 */

import type { GameMove } from '@/types';
import { GoEngine } from '@/lib/go-engine';

// 复盘分析结果
export interface MoveAnalysis {
  moveNumber: number;
  row: number;
  col: number;
  color: 'black' | 'white';
  // AI 评估
  winRateBefore: number;      // 落子前胜率
  winRateAfter: number;       // 落子后胜率
  winRateChange: number;      // 胜率变化
  scoreLead: number;          // 目数领先
  scoreLeadChange: number;    // 目数变化
  // 评价
  evaluation: 'excellent' | 'good' | 'ok' | 'mistake' | 'blunder';
  comment: string;
  // 建议
  suggestion?: string;
  betterMoves?: { row: number; col: number; winRate: number }[];
}

// AI 评估配置
interface ReviewConfig {
  boardSize: number;
  komi: number;
  analysisDepth: number; // 分析深度
}

// 判断着法评价
function evaluateMove(
  winRateChange: number,
  scoreLeadChange: number
): 'excellent' | 'good' | 'ok' | 'mistake' | 'blunder' {
  if (winRateChange >= 15 || scoreLeadChange >= 10) return 'excellent';
  if (winRateChange >= 5 || scoreLeadChange >= 3) return 'good';
  if (winRateChange >= -5 || scoreLeadChange >= -3) return 'ok';
  if (winRateChange >= -15 || scoreLeadChange >= -10) return 'mistake';
  return 'blunder';
}

// 获取评价说明
function getEvaluationComment(evaluation: string): string {
  switch (evaluation) {
    case 'excellent':
      return '妙手！这一步大大提升了胜率';
    case 'good':
      return '好棋！这步走得不错';
    case 'ok':
      return '平稳，常规着法';
    case 'mistake':
      return '疑问手，这步有待商榷';
    case 'blunder':
      return '失误，这步损失较大';
    default:
      return '';
  }
}

// AI 模拟评估（实际使用时替换为真实 KataGo 调用）
async function simulateAIAnalysis(
  moves: GameMove[],
  config: ReviewConfig
): Promise<MoveAnalysis[]> {
  const results: MoveAnalysis[] = [];
  const engine = new GoEngine(config.boardSize, config.komi);

  // 基础胜率（简化模型，实际需要 KataGo）
  let blackWinRate = 50 + (config.komi > 6 ? 5 : 0); // 考虑贴目
  let blackScoreLead = 0;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    
    if (move.isPass) {
      results.push({
        moveNumber: i + 1,
        row: -1,
        col: -1,
        color: move.color,
        winRateBefore: move.color === 'black' ? blackWinRate : 100 - blackWinRate,
        winRateAfter: move.color === 'black' ? blackWinRate : 100 - blackWinRate,
        winRateChange: 0,
        scoreLead: blackScoreLead,
        scoreLeadChange: 0,
        evaluation: 'ok',
        comment: '虚着（Pass）',
      });
      continue;
    }

    // 落子
    const success = engine.placeStone(move.row, move.col, move.color);
    
    if (!success) {
      // 非法着法
      results.push({
        moveNumber: i + 1,
        row: move.row,
        col: move.col,
        color: move.color,
        winRateBefore: 50,
        winRateAfter: 0,
        winRateChange: -50,
        scoreLead: 0,
        scoreLeadChange: -50,
        evaluation: 'blunder',
        comment: '非法着法',
      });
      continue;
    }

    // 模拟 AI 评估
    // 实际应用中，这里会调用 KataGo API
    const moveQuality = Math.random() * 40 - 20; // 模拟 -20% 到 +20% 的胜率变化
    const moveScoreChange = Math.random() * 10 - 5; // 模拟 -5 到 +5 的目数变化

    const winRateBefore = move.color === 'black' ? blackWinRate : 100 - blackWinRate;
    const winRateAfter = winRateBefore + moveQuality;
    const scoreLeadBefore = blackScoreLead;
    
    // 更新全局状态
    if (move.color === 'black') {
      blackWinRate += moveQuality;
      blackScoreLead += moveScoreChange;
    } else {
      blackWinRate -= moveQuality;
      blackScoreLead -= moveScoreChange;
    }

    const evaluation = evaluateMove(moveQuality, moveScoreChange);
    const suggestion = evaluation === 'mistake' || evaluation === 'blunder'
      ? getSuggestion(engine, move.color)
      : undefined;

    results.push({
      moveNumber: i + 1,
      row: move.row,
      col: move.col,
      color: move.color,
      winRateBefore,
      winRateAfter,
      winRateChange: moveQuality,
      scoreLead: scoreLeadBefore + (move.color === 'black' ? moveScoreChange : -moveScoreChange),
      scoreLeadChange: moveScoreChange,
      evaluation,
      comment: getEvaluationComment(evaluation),
      suggestion,
      betterMoves: evaluation === 'mistake' || evaluation === 'blunder'
        ? generateBetterMoves(engine, move.color)
        : undefined,
    });
  }

  return results;
}

// 获取建议
function getSuggestion(engine: GoEngine, color: 'black' | 'white'): string {
  const suggestions = [
    '可以考虑在边上围空',
    '攻击对方的薄弱之处',
    '加强自己的棋形',
    '注意对方的跳或飞',
    '这步可以更大胆一些',
  ];
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

// 生成更好的着法
function generateBetterMoves(
  engine: GoEngine,
  color: 'black' | 'white'
): { row: number; col: number; winRate: number }[] {
  const moves: { row: number; col: number; winRate: number }[] = [];
  const size = engine.size;

  // 随机生成几个候选着法
  for (let i = 0; i < 3; i++) {
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);
    if (engine.getPointState(row, col) === null) {
      moves.push({
        row,
        col,
        winRate: 50 + Math.random() * 20,
      });
    }
  }

  return moves;
}

// 主复盘函数
export async function analyzeGame(
  moves: GameMove[],
  boardSize: number = 9,
  komi: number = 5.5
): Promise<{
  overallScore: number;
  excellentMoves: number;
  goodMoves: number;
  mistakes: number;
  blunders: number;
  analysis: MoveAnalysis[];
  summary: string;
}> {
  const config: ReviewConfig = {
    boardSize,
    komi,
    analysisDepth: 20,
  };

  const analysis = await simulateAIAnalysis(moves, config);

  // 统计
  const excellentMoves = analysis.filter(m => m.evaluation === 'excellent').length;
  const goodMoves = analysis.filter(m => m.evaluation === 'good').length;
  const mistakes = analysis.filter(m => m.evaluation === 'mistake').length;
  const blunders = analysis.filter(m => m.evaluation === 'blunder').length;

  // 综合评分 (0-100)
  const totalMoves = analysis.length;
  const overallScore = Math.round(
    (excellentMoves * 100 + goodMoves * 80 + (totalMoves - excellentMoves - goodMoves - mistakes - blunders) * 60 - mistakes * 30 - blunders * 50) / Math.max(totalMoves, 1)
  );

  // 生成总结
  let summary = '';
  if (overallScore >= 85) {
    summary = '这是一盘高水平对局！着法精准，值得学习。';
  } else if (overallScore >= 70) {
    summary = '整体表现不错，有一些值得改进的地方。';
  } else if (overallScore >= 50) {
    summary = '对局中有一些失误，需要多加练习。';
  } else {
    summary = '建议先复习基本功，多做死活题提升棋感。';
  }

  if (blunders > 3) {
    summary += ' 失误较多，建议注意常见棋形。';
  }
  if (excellentMoves > moves.length * 0.3) {
    summary += ' 有多处妙手，棋感很好！';
  }

  return {
    overallScore,
    excellentMoves,
    goodMoves,
    mistakes,
    blunders,
    analysis,
    summary,
  };
}

// 获取评价标签颜色
export function getEvaluationColor(evaluation: string): string {
  switch (evaluation) {
    case 'excellent': return 'text-green-500';
    case 'good': return 'text-emerald-500';
    case 'ok': return 'text-gray-500';
    case 'mistake': return 'text-amber-500';
    case 'blunder': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

// 获取评价图标
export function getEvaluationIcon(evaluation: string): string {
  switch (evaluation) {
    case 'excellent': return '✨';
    case 'good': return '👍';
    case 'ok': return '👌';
    case 'mistake': return '🤔';
    case 'blunder': return '❌';
    default: return '❓';
  }
}
