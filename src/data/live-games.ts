/**
 * 观战系统数据结构
 */

export interface LiveGame {
  id: string;
  blackPlayer: {
    id: string;
    nickname: string;
    avatar?: string;
    rank: number; // 段位/级位
  };
  whitePlayer: {
    id: string;
    nickname: string;
    avatar?: string;
    rank: number;
  };
  boardSize: number;
  currentMove: number;
  moves: { row: number; col: number; color: 'black' | 'white' }[];
  isPrivate: boolean;
  startedAt: string;
  // AI对战特有
  aiDifficulty?: 'beginner' | 'intermediate' | 'advanced';
  // 观战人数
  spectatorCount: number;
}

// 模拟的观战大厅数据
export const MOCK_LIVE_GAMES: LiveGame[] = [
  {
    id: 'live-1',
    blackPlayer: { id: 'u1', nickname: '小明', rank: -5 },
    whitePlayer: { id: 'u2', nickname: '小红', rank: -3 },
    boardSize: 9,
    currentMove: 45,
    moves: [
      { row: 2, col: 2, color: 'black' },
      { row: 2, col: 6, color: 'white' },
      { row: 6, col: 2, color: 'black' },
      { row: 6, col: 6, color: 'white' },
    ],
    isPrivate: false,
    startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    spectatorCount: 3,
  },
  {
    id: 'live-2',
    blackPlayer: { id: 'u3', nickname: '围棋小子', rank: 3 },
    whitePlayer: { id: 'u4', nickname: '棋魂', rank: 5 },
    boardSize: 19,
    currentMove: 128,
    moves: [],
    isPrivate: false,
    startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    spectatorCount: 12,
  },
  {
    id: 'live-3',
    blackPlayer: { id: 'u5', nickname: '初学者A', rank: -20 },
    aiDifficulty: 'beginner',
    whitePlayer: { id: 'ai', nickname: 'AI 初级', rank: -18 },
    boardSize: 9,
    currentMove: 32,
    moves: [],
    isPrivate: false,
    startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    spectatorCount: 1,
  },
];

// 获取段位标签
export function getRankLabel(rank: number): string {
  if (rank >= 1) {
    return `${rank}段`;
  } else {
    return `${Math.abs(rank)}级`;
  }
}

// 获取排名图标
export function getRankIcon(rank: number): string {
  if (rank >= 7) return '👑';
  if (rank >= 5) return '💎';
  if (rank >= 3) return '🌟';
  if (rank >= 1) return '⭐';
  if (rank >= -5) return '🔥';
  if (rank >= -15) return '🎯';
  return '🌱';
}
