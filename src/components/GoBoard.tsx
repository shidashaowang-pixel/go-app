import { useState } from 'react';
import { cn } from '@/lib/utils';

interface BoardProps {
  size?: number;
  initialPosition?: { black: number[][]; white: number[][] };
  onMove?: (row: number, col: number) => void;
  disabled?: boolean;
  showCoordinates?: boolean;
}

export default function GoBoard({
  size = 19,
  initialPosition,
  onMove,
  disabled = false,
  showCoordinates = true
}: BoardProps) {
  const [stones, setStones] = useState<{ [key: string]: 'black' | 'white' }>(() => {
    const initial: { [key: string]: 'black' | 'white' } = {};
    if (initialPosition) {
      initialPosition.black?.forEach(([row, col]) => {
        initial[`${row}-${col}`] = 'black';
      });
      initialPosition.white?.forEach(([row, col]) => {
        initial[`${row}-${col}`] = 'white';
      });
    }
    return initial;
  });

  const [currentPlayer, setCurrentPlayer] = useState<'black' | 'white'>('black');

  const handleCellClick = (row: number, col: number) => {
    if (disabled) return;
    const key = `${row}-${col}`;
    if (stones[key]) return;

    setStones(prev => ({ ...prev, [key]: currentPlayer }));
    setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
    onMove?.(row, col);
  };

  const cellSize = size <= 9 ? 40 : size <= 13 ? 32 : 28;
  const boardSize = cellSize * (size - 1);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative bg-card border-2 border-border rounded-sm p-8">
        <svg
          width={boardSize}
          height={boardSize}
          className="board-bg"
          style={{
            backgroundSize: `${cellSize}px ${cellSize}px`,
            backgroundPosition: '0 0'
          }}
        >
          {/* 绘制网格线 */}
          {Array.from({ length: size }).map((_, i) => (
            <g key={i}>
              <line
                x1={0}
                y1={i * cellSize}
                x2={boardSize}
                y2={i * cellSize}
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />
              <line
                x1={i * cellSize}
                y1={0}
                x2={i * cellSize}
                y2={boardSize}
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* 绘制星位 */}
          {size === 19 && [3, 9, 15].map(row =>
            [3, 9, 15].map(col => (
              <circle
                key={`${row}-${col}`}
                cx={col * cellSize}
                cy={row * cellSize}
                r="4"
                fill="hsl(var(--foreground))"
              />
            ))
          )}

          {/* 绘制棋子 */}
          {Object.entries(stones).map(([key, color]) => {
            const [row, col] = key.split('-').map(Number);
            return (
              <g key={key}>
                <circle
                  cx={col * cellSize}
                  cy={row * cellSize}
                  r={cellSize * 0.45}
                  fill={color === 'black' ? 'hsl(var(--foreground))' : 'hsl(var(--background))'}
                  stroke={color === 'white' ? 'hsl(var(--border))' : 'none'}
                  strokeWidth="2"
                  className="drop-shadow-md"
                />
              </g>
            );
          })}

          {/* 交互层 */}
          {!disabled && Array.from({ length: size }).map((_, row) =>
            Array.from({ length: size }).map((_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={col * cellSize}
                cy={row * cellSize}
                r={cellSize * 0.45}
                fill="transparent"
                className="cursor-pointer hover:fill-primary/10"
                onClick={() => handleCellClick(row, col)}
              />
            ))
          )}
        </svg>
      </div>

      {/* 当前玩家指示 */}
      {!disabled && (
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-6 h-6 rounded-full',
            currentPlayer === 'black' ? 'stone-black' : 'stone-white'
          )} />
          <span className="text-sm font-medium">
            {currentPlayer === 'black' ? '黑棋' : '白棋'}落子
          </span>
        </div>
      )}
    </div>
  );
}
