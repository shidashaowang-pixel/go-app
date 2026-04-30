/**
 * 可编辑的围棋棋盘组件
 * 支持摆子模式，可以放置和移除黑白棋子
 */

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { GoEngine, type StoneColor, type PointState } from '@/lib/go-engine';

interface EditableBoardProps {
  size?: 9 | 13 | 19;
  /** 初始局面（用于预览） */
  initialPosition?: { black: number[][]; white: number[][] };
  /** 当前编辑局面 */
  stones: { black: number[][]; white: number[][] };
  /** 落子回调 */
  onStonePlace?: (row: number, col: number, color: StoneColor) => void;
  /** 提子回调 */
  onStoneRemove?: (row: number, col: number) => void;
  /** 当前放置颜色 */
  currentColor?: StoneColor;
  /** 是否禁用交互 */
  disabled?: boolean;
  /** 是否显示坐标 */
  showCoordinates?: boolean;
  /** 是否显示正解预览 */
  correctMovePreview?: { row: number; col: number; step: number }[];
  /** 高亮显示的位置 */
  highlights?: { row: number; col: number; color: 'green' | 'red' | 'yellow' }[];
  /** 当前步骤提示 */
  hintText?: string;
  className?: string;
}

export default function EditableBoard({
  size = 9,
  initialPosition,
  stones,
  onStonePlace,
  onStoneRemove,
  currentColor = 'black',
  disabled = false,
  showCoordinates = true,
  correctMovePreview = [],
  highlights = [],
  hintText,
  className,
}: EditableBoardProps) {
  // 合并初始局面和编辑中的棋子
  const mergedBoard = useMemo(() => {
    const board: { black: Set<string>; white: Set<string> } = {
      black: new Set(stones.black.map(([r, c]) => `${r},${c}`)),
      white: new Set(stones.white.map(([r, c]) => `${r},${c}`)),
    };
    return board;
  }, [stones]);

  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (disabled) return;

    const key = `${row},${col}`;
    
    // 检查该位置是否有棋子
    const isBlack = mergedBoard.black.has(key);
    const isWhite = mergedBoard.white.has(key);

    if (isBlack || isWhite) {
      // 有棋子，移除它
      onStoneRemove?.(row, col);
    } else {
      // 没有棋子，放置当前颜色的棋子
      onStonePlace?.(row, col, currentColor);
    }
  }, [disabled, mergedBoard, currentColor, onStonePlace, onStoneRemove]);

  const cellSize = size <= 9 ? 44 : size <= 13 ? 36 : 28;
  const boardSize = cellSize * (size - 1);
  const stoneRadius = cellSize * 0.44;

  // 星位计算
  const getStarPoints = () => {
    if (size === 19) return [3, 9, 15];
    if (size === 13) return [3, 6, 9];
    if (size === 9) return [2, 4, 6];
    return [];
  };

  const starPoints = getStarPoints();

  // 渲染棋子
  const renderStone = (row: number, col: number, color: 'black' | 'white') => {
    const key = `${row},${col}`;
    const highlight = highlights.find(h => h.row === row && h.col === col);
    const preview = correctMovePreview.find(p => p.row === row && p.col === col);

    return (
      <g key={key} className="transition-all duration-200">
        {/* 高亮背景 */}
        {highlight && (
          <circle
            cx={col * cellSize}
            cy={row * cellSize}
            r={stoneRadius * 1.3}
            fill={
              highlight.color === 'green' ? 'rgba(34, 197, 94, 0.3)' :
              highlight.color === 'red' ? 'rgba(239, 68, 68, 0.3)' :
              'rgba(234, 179, 8, 0.3)'
            }
            className="animate-pulse"
          />
        )}
        
        {/* 棋子阴影 */}
        <circle
          cx={col * cellSize + 1.5}
          cy={row * cellSize + 1.5}
          r={stoneRadius}
          fill="rgba(0,0,0,0.15)"
        />
        
        {/* 棋子本体 */}
        <circle
          cx={col * cellSize}
          cy={row * cellSize}
          r={stoneRadius}
          fill={color === 'black' ? '#1a1a1a' : '#f5f5f0'}
          stroke={color === 'white' ? '#bbb' : 'none'}
          strokeWidth="1"
        />
        
        {/* 棋子光泽 */}
        <circle
          cx={col * cellSize - stoneRadius * 0.25}
          cy={row * cellSize - stoneRadius * 0.25}
          r={stoneRadius * 0.3}
          fill={color === 'black' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)'}
        />

        {/* 正解预览标记 */}
        {preview && (
          <>
            <circle
              cx={col * cellSize}
              cy={row * cellSize}
              r={stoneRadius * 0.35}
              fill={color === 'black' ? '#fff' : '#1a1a1a'}
              opacity={0.9}
            />
            <text
              x={col * cellSize + stoneRadius * 0.5}
              y={row * cellSize - stoneRadius * 0.5}
              fontSize="10"
              fill={color === 'black' ? '#22c55e' : '#22c55e'}
              fontWeight="bold"
            >
              {preview.step}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* 颜色选择器 */}
      <div className="flex items-center gap-4 bg-card rounded-lg px-4 py-2 border border-border shadow-sm">
        <span className="text-sm font-medium text-muted-foreground">放置：</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => !disabled && onStonePlace && onStonePlace(-1, -1, 'black')}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all",
              currentColor === 'black' 
                ? "bg-[#1a1a1a] border-gray-600 ring-2 ring-primary" 
                : "bg-[#1a1a1a] border-gray-400 opacity-50"
            )}
            disabled={disabled}
            title="黑棋"
          />
          <button
            type="button"
            onClick={() => !disabled && onStonePlace && onStonePlace(-1, -1, 'white')}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all",
              currentColor === 'white' 
                ? "bg-[#f5f5f0] border-gray-300 ring-2 ring-primary" 
                : "bg-[#f5f5f0] border-gray-300 opacity-50"
            )}
            disabled={disabled}
            title="白棋"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          点击棋盘放置/移除棋子
        </span>
      </div>

      {/* 棋盘 */}
      <div className="relative bg-amber-100 border-2 border-amber-700 rounded-md p-6 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #deb887 0%, #d2a86e 50%, #c9985a 100%)' }}
      >
        {/* 坐标标注 */}
        {showCoordinates && (
          <>
            {/* 顶部列号 A-T (跳过I) */}
            <div className="absolute left-0 right-0 flex text-xs text-amber-800 font-medium"
              style={{ top: 0, height: 18, paddingLeft: cellSize / 2 + 8, paddingRight: cellSize / 2 + 8 }}
            >
              {Array.from({ length: size }, (_, i) => (
                <span key={i} style={{ width: cellSize, textAlign: 'center', lineHeight: '18px' }}>
                  {String.fromCharCode(65 + (i >= 8 ? i + 1 : i))}
                </span>
              ))}
            </div>
            {/* 左侧行号 1-19 */}
            <div className="absolute top-0 bottom-0 flex flex-col text-xs text-amber-800 font-medium"
              style={{ left: 0, width: 18, paddingTop: cellSize / 2 + 8, paddingBottom: cellSize / 2 + 8 }}
            >
              {Array.from({ length: size }, (_, i) => (
                <span key={i} style={{ height: cellSize, lineHeight: `${cellSize}px`, textAlign: 'center', width: 18 }}>
                  {size - i}
                </span>
              ))}
            </div>
          </>
        )}

        <svg
          width={boardSize}
          height={boardSize}
          className="select-none"
        >
          {/* 绘制网格线 */}
          {Array.from({ length: size }).map((_, i) => (
            <g key={`line-${i}`}>
              <line
                x1={0}
                y1={i * cellSize}
                x2={boardSize}
                y2={i * cellSize}
                stroke="#8B6914"
                strokeWidth="0.8"
              />
              <line
                x1={i * cellSize}
                y1={0}
                x2={i * cellSize}
                y2={boardSize}
                stroke="#8B6914"
                strokeWidth="0.8"
              />
            </g>
          ))}

          {/* 绘制星位 */}
          {starPoints.map(row =>
            starPoints.map(col => (
              <circle
                key={`star-${row}-${col}`}
                cx={col * cellSize}
                cy={row * cellSize}
                r={size <= 9 ? 4 : 3.5}
                fill="#8B6914"
              />
            ))
          )}

          {/* 渲染棋子 - 黑子 */}
          {Array.from(mergedBoard.black).map(key => {
            const [r, c] = key.split(',').map(Number);
            return renderStone(r, c, 'black');
          })}

          {/* 渲染棋子 - 白子 */}
          {Array.from(mergedBoard.white).map(key => {
            const [r, c] = key.split(',').map(Number);
            return renderStone(r, c, 'white');
          })}

          {/* 交互层 */}
          {!disabled && Array.from({ length: size }).map((_, row) =>
            Array.from({ length: size }).map((_, col) => {
              const key = `${row},${col}`;
              const isOccupied = mergedBoard.black.has(key) || mergedBoard.white.has(key);
              const isHovered = hoverCell?.row === row && hoverCell?.col === col;

              return (
                <g key={`interact-${row}-${col}`}>
                  {/* 悬停预览 */}
                  {isHovered && !isOccupied && (
                    <circle
                      cx={col * cellSize}
                      cy={row * cellSize}
                      r={stoneRadius * 0.8}
                      fill={currentColor === 'black' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}
                      stroke={currentColor === 'black' ? '#1a1a1a' : '#f5f5f0'}
                      strokeWidth="1"
                      strokeDasharray="3,2"
                    />
                  )}
                  
                  {/* 点击区域 */}
                  <rect
                    x={col * cellSize - cellSize / 2}
                    y={row * cellSize - cellSize / 2}
                    width={cellSize}
                    height={cellSize}
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={() => handleCellClick(row, col)}
                    onMouseEnter={() => setHoverCell({ row, col })}
                    onMouseLeave={() => setHoverCell(null)}
                  />
                </g>
              );
            })
          )}
        </svg>
      </div>

      {/* 提示文字 */}
      {hintText && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
          {hintText}
        </div>
      )}
    </div>
  );
}
