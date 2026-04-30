import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { GoEngine, type StoneColor, type PointState, type TerritoryEstimate } from '@/lib/go-engine';
import { playStoneSound } from '@/lib/sounds';

interface BoardProps {
  size?: number;
  engine?: GoEngine;
  initialPosition?: { black: number[][]; white: number[][] };
  onMove?: (row: number, col: number, engine: GoEngine) => void;
  onCaptured?: (stones: [number, number][]) => void;
  onVariationMove?: (row: number, col: number, engine: GoEngine) => void; // 试下模式落子回调
  disabled?: boolean;
  showCoordinates?: boolean;
  highlightLastMove?: boolean;
  showTerritory?: boolean;
  showVariationMoves?: boolean; // 是否显示试下着法
  territoryEstimate?: TerritoryEstimate | null; // 形势判断地盘数据
}

export default function GoBoard({
  size = 19,
  engine: externalEngine,
  initialPosition,
  onMove,
  onCaptured,
  onVariationMove,
  disabled = false,
  showCoordinates = true,
  highlightLastMove = true,
  showTerritory = false,
  showVariationMoves = true,
  territoryEstimate,
}: BoardProps) {
  const [internalEngine] = useState(() => {
    const e = new GoEngine(size);
    if (initialPosition) {
      e.loadPosition(initialPosition);
    }
    return e;
  });

  const engine = externalEngine || internalEngine;
  const [boardState, setBoardState] = useState<PointState[][]>(engine.board);
  const [currentPlayer, setCurrentPlayer] = useState<StoneColor>(engine.currentPlayer);
  const [lastMove, setLastMove] = useState<{ row: number; col: number; color: StoneColor } | null>(null);
  const [capturedAnimation, setCapturedAnimation] = useState<Set<string>>(new Set());
  const [territory, setTerritory] = useState<{ black: Set<string>; white: Set<string> } | null>(null);
  const prevEngineRef = useRef(engine);
  // 用于检测 engine 实例是否被完全替换（重置时创建新实例）
  const engineInstanceRef = useRef(engine);
  // 试下着法渲染状态
  const [variationMoves, setVariationMoves] = useState<{ row: number; col: number; color: StoneColor; index: number }[]>([]);
  const [lastVariationMove, setLastVariationMove] = useState<{ row: number; col: number } | null>(null);

  // 同步外部引擎状态 - 使用 ref 追踪变化避免无限循环
  const prevBoardRef = useRef<string>('');
  useEffect(() => {
    if (externalEngine) {
      // 检测 engine 实例是否被完全替换（用于重置场景）
      const isEngineReset = engineInstanceRef.current !== externalEngine;
      if (isEngineReset) {
        engineInstanceRef.current = externalEngine;
        prevBoardRef.current = '';
      }

      // 优化：使用棋盘状态字符串比较代替 JSON.stringify
      // 将棋盘转换为紧凑字符串格式，减少比较开销
      const boardKey = externalEngine.board
        .map(row => row.map(cell => cell === 'black' ? '1' : cell === 'white' ? '2' : '0').join(''))
        .join('|');
      const playerKey = externalEngine.currentPlayer;
      const lastMove = externalEngine.getLastMove();
      
      // 实例被替换或棋盘内容变化时强制更新
      if (isEngineReset || boardKey !== prevBoardRef.current) {
        setBoardState(externalEngine.board.map(row => [...row]));
        setLastMove(lastMove);
        setCapturedAnimation(new Set());
        prevBoardRef.current = boardKey;
      }
      setCurrentPlayer(playerKey);

      // 同步试下着法
      if (showVariationMoves) {
        const vm = externalEngine.variationMoves.map((m, i) => ({
          ...m,
          index: i + 1,
        }));
        setVariationMoves(vm);
        const lastVar = externalEngine.getLastVariationMove();
        setLastVariationMove(lastVar ? { row: lastVar.row, col: lastVar.col } : null);
      }

      if (showTerritory) {
        // gameOver 时显示精确领地，非终局时显示形势判断领地
        const t = externalEngine.calculateTerritory();
        setTerritory(t);
      } else {
        setTerritory(null);
      }
    }
  }, [externalEngine, showTerritory, showVariationMoves]);

  // 内部引擎时也需同步
  useEffect(() => {
    if (!externalEngine && engine !== prevEngineRef.current) {
      setBoardState(engine.board.map(row => [...row]));
      setCurrentPlayer(engine.currentPlayer);
      prevEngineRef.current = engine;
    }
  }, [externalEngine, engine]);

  // 防止重复点击锁
  const clickLockRef = useRef(false);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (disabled || engine.gameOver || clickLockRef.current) return;

    // 立即加锁，防止异步期间重复点击
    clickLockRef.current = true;

    // 试下模式处理
    if (engine.isVariationMode && onVariationMove) {
      // 检查该位置是否已有棋子
      if (engine.board[row][col] !== null) {
        clickLockRef.current = false;
        return;
      }
      // 检查是否已有试下着法
      if (engine.variationMoves.some(m => m.row === row && m.col === col)) {
        clickLockRef.current = false;
        return;
      }

      // 触发试下落子回调
      onVariationMove(row, col, engine);

      // 更新试下着法显示
      const vm = engine.variationMoves.map((m, i) => ({
        ...m,
        index: i + 1,
      }));
      setVariationMoves(vm);
      const lastVar = engine.getLastVariationMove();
      setLastVariationMove(lastVar ? { row: lastVar.row, col: lastVar.col } : null);

      playStoneSound();
      clickLockRef.current = false;
      return;
    }

    // 正常模式处理
    const result = engine.placeStone(row, col);
    if (!result.isValid) {
      clickLockRef.current = false;
      return;
    }

    // 播放落子音效
    playStoneSound();

    // 更新棋盘状态
    setBoardState(engine.board.map(row => [...row]));
    setCurrentPlayer(engine.currentPlayer);
    setLastMove({ row, col, color: engine.currentPlayer === 'black' ? 'white' : 'black' });

    // 提子动画
    if (result.capturedStones.length > 0) {
      const capturedSet = new Set(result.capturedStones.map(([r, c]) => `${r},${c}`));
      setCapturedAnimation(capturedSet);
      onCaptured?.(result.capturedStones);
      setTimeout(() => setCapturedAnimation(new Set()), 600);
    }

    onMove?.(row, col, engine);

    // onMove 是异步的（AI思考），解锁在 disabled prop 变化时处理
    // 如果 onMove 是同步完成的，也延迟解锁
    setTimeout(() => { clickLockRef.current = false; }, 500);
  }, [disabled, engine, onMove, onVariationMove, onCaptured]);

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

  return (
    <div className="flex flex-col items-center gap-3">
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
                x2={boardSize - cellSize * 0 + (size - 1) * 0}
                y2={i * cellSize}
                stroke="#8B6914"
                strokeWidth="0.8"
                style={{ x2: (size - 1) * cellSize }}
              />
              <line
                x1={i * cellSize}
                y1={0}
                x2={i * cellSize}
                y2={(size - 1) * cellSize}
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

          {/* 领地标记（对弈结束时显示 / 形势判断） */}
          {showTerritory && (
            <>
              {/* 终局精确领地显示 */}
              {territory && !territoryEstimate && (
                <>
                  {Array.from(territory.black).map(key => {
                    const [r, c] = key.split(',').map(Number);
                    return (
                      <rect
                        key={`tb-${key}`}
                        x={c * cellSize - cellSize * 0.15}
                        y={r * cellSize - cellSize * 0.15}
                        width={cellSize * 0.3}
                        height={cellSize * 0.3}
                        fill="#333"
                        opacity={0.4}
                      />
                    );
                  })}
                  {Array.from(territory.white).map(key => {
                    const [r, c] = key.split(',').map(Number);
                    return (
                      <rect
                        key={`tw-${key}`}
                        x={c * cellSize - cellSize * 0.15}
                        y={r * cellSize - cellSize * 0.15}
                        width={cellSize * 0.3}
                        height={cellSize * 0.3}
                        fill="#fff"
                        stroke="#999"
                        strokeWidth={0.5}
                        opacity={0.5}
                      />
                    );
                  })}
                </>
              )}

              {/* 形势判断地盘显示（基于死活判断） */}
              {territoryEstimate && (
                <>
                  {/* 黑方地盘 - 实心小方格（确定）或半透明虚线框（可能的） */}
                  {Array.from(territoryEstimate.black.entries()).map(([key, type]) => {
                    const [r, c] = key.split(',').map(Number);
                    const isSolid = type === 'solid';
                    return (
                      <rect
                        key={`etb-${key}`}
                        x={c * cellSize - cellSize * 0.18}
                        y={r * cellSize - cellSize * 0.18}
                        width={cellSize * 0.36}
                        height={cellSize * 0.36}
                        fill={isSolid ? '#1a1a1a' : '#1a1a1a'}
                        opacity={isSolid ? 0.35 : 0.18}
                        stroke={isSolid ? '#1a1a1a' : '#666'}
                        strokeWidth={isSolid ? 0 : 1}
                        strokeDasharray={isSolid ? '' : '2,2'}
                      />
                    );
                  })}

                  {/* 白方地盘 - 实心小方格（确定）或半透明虚线框（可能的） */}
                  {Array.from(territoryEstimate.white.entries()).map(([key, type]) => {
                    const [r, c] = key.split(',').map(Number);
                    const isSolid = type === 'solid';
                    return (
                      <rect
                        key={`etw-${key}`}
                        x={c * cellSize - cellSize * 0.18}
                        y={r * cellSize - cellSize * 0.18}
                        width={cellSize * 0.36}
                        height={cellSize * 0.36}
                        fill={isSolid ? '#ffffff' : '#f5f5f5'}
                        opacity={isSolid ? 0.45 : 0.22}
                        stroke={isSolid ? '#ccc' : '#999'}
                        strokeWidth={isSolid ? 0.5 : 1}
                        strokeDasharray={isSolid ? '' : '2,2'}
                      />
                    );
                  })}

                  {/* 争议/中立区域 */}
                  {Array.from(territoryEstimate.neutral).map(key => {
                    const [r, c] = key.split(',').map(Number);
                    return (
                      <circle
                        key={`etn-${key}`}
                        cx={c * cellSize}
                        cy={r * cellSize}
                        r={cellSize * 0.1}
                        fill="none"
                        stroke="#888"
                        strokeWidth={0.5}
                        strokeDasharray="2,2"
                        opacity={0.4}
                      />
                    );
                  })}

                  {/* 死子标记（红色X） */}
                  {Array.from(territoryEstimate.deadStones.entries()).map(([key, color]) => {
                    const [r, c] = key.split(',').map(Number);
                    return (
                      <g key={`dead-${key}`}>
                        <line
                          x1={c * cellSize - cellSize * 0.25}
                          y1={r * cellSize - cellSize * 0.25}
                          x2={c * cellSize + cellSize * 0.25}
                          y2={r * cellSize + cellSize * 0.25}
                          stroke="#ff4444"
                          strokeWidth={1.5}
                          opacity={0.7}
                        />
                        <line
                          x1={c * cellSize + cellSize * 0.25}
                          y1={r * cellSize - cellSize * 0.25}
                          x2={c * cellSize - cellSize * 0.25}
                          y2={r * cellSize + cellSize * 0.25}
                          stroke="#ff4444"
                          strokeWidth={1.5}
                          opacity={0.7}
                        />
                      </g>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* 绘制棋子 */}
          {boardState.map((row, r) =>
            row.map((cell, c) => {
              if (!cell) return null;
              const key = `${r},${c}`;
              const isCaptured = capturedAnimation.has(key);
              const isLastMove = highlightLastMove && lastMove && lastMove.row === r && lastMove.col === c;

              return (
                <g key={key}>
                  {/* 棋子阴影 */}
                  <circle
                    cx={c * cellSize + 1.5}
                    cy={r * cellSize + 1.5}
                    r={stoneRadius}
                    fill="rgba(0,0,0,0.15)"
                  />
                  {/* 棋子本体 */}
                  <circle
                    cx={c * cellSize}
                    cy={r * cellSize}
                    r={stoneRadius}
                    fill={cell === 'black' ? '#1a1a1a' : '#f5f5f0'}
                    stroke={cell === 'white' ? '#bbb' : 'none'}
                    strokeWidth="1"
                    style={{
                      transition: 'all 0.15s ease',
                      opacity: isCaptured ? 0 : 1,
                    }}
                  />
                  {/* 棋子光泽 */}
                  <circle
                    cx={c * cellSize - stoneRadius * 0.25}
                    cy={r * cellSize - stoneRadius * 0.25}
                    r={stoneRadius * 0.3}
                    fill={cell === 'black' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)'}
                  />
                  {/* 最后一手标记 */}
                  {isLastMove && (
                    <circle
                      cx={c * cellSize}
                      cy={r * cellSize}
                      r={stoneRadius * 0.3}
                      fill={cell === 'black' ? '#fff' : '#1a1a1a'}
                      opacity={0.8}
                    />
                  )}
                </g>
              );
            })
          )}

          {/* 提子动画效果 */}
          {Array.from(capturedAnimation).map(key => {
            const [r, c] = key.split(',').map(Number);
            return (
              <circle
                key={`cap-${key}`}
                cx={c * cellSize}
                cy={r * cellSize}
                r={stoneRadius}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                opacity={0.6}
                className="animate-ping"
              />
            );
          })}

          {/* 试下着法标记 */}
          {variationMoves.map((move) => (
            <g key={`var-${move.row}-${move.col}`}>
              {/* 试下棋子（半透明效果） */}
              <circle
                cx={move.col * cellSize}
                cy={move.row * cellSize}
                r={stoneRadius}
                fill={move.color === 'black' ? 'rgba(26,26,26,0.5)' : 'rgba(245,245,240,0.5)'}
                stroke={move.color === 'black' ? 'rgba(80,80,80,0.8)' : 'rgba(180,180,180,0.8)'}
                strokeWidth="1.5"
                strokeDasharray="4,2"
              />
              {/* 试下着法编号 */}
              <text
                x={move.col * cellSize}
                y={move.row * cellSize}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={cellSize * 0.5}
                fontWeight="bold"
                fill="#1a1a1a"
                style={{ pointerEvents: 'none' }}
              >
                {move.index}
              </text>
            </g>
          ))}

          {/* 交互层 */}
          {(!disabled && !engine.gameOver) && Array.from({ length: size }).map((_, row) =>
            Array.from({ length: size }).map((_, col) => {
              const isOccupied = boardState[row][col] !== null;
              // 试下模式下：检查正式棋盘和试下着法
              const hasVariation = engine.isVariationMode && variationMoves.some(m => m.row === row && m.col === col);
              const isValidForVariation = engine.isVariationMode && !isOccupied && !hasVariation;
              const isValidForNormal = !engine.isVariationMode && !isOccupied && engine.isValidMove(row, col);
              const isValid = isValidForVariation || isValidForNormal;

              return (
                <rect
                  key={`interact-${row}-${col}`}
                  x={col * cellSize - cellSize / 2}
                  y={row * cellSize - cellSize / 2}
                  width={cellSize}
                  height={cellSize}
                  fill="transparent"
                  className={cn(
                    isValid && 'cursor-pointer',
                  )}
                  style={{
                    pointerEvents: isValid ? 'auto' : 'none',
                  }}
                  onClick={() => handleCellClick(row, col)}
                  onMouseEnter={(e) => {
                    if (isValid) {
                      const target = e.target as SVGRectElement;
                      target.setAttribute('fill',
                        currentPlayer === 'black' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'
                      );
                    }
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as SVGRectElement;
                    target.setAttribute('fill', 'transparent');
                  }}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* 当前玩家指示 */}
      {(!disabled || engine.gameOver) && (
        <div className="flex items-center gap-3 bg-card rounded-full px-5 py-2 border border-border shadow-sm">
          <div className={cn(
            'w-7 h-7 rounded-full shadow-md border-2',
            currentPlayer === 'black' ? 'bg-[#1a1a1a] border-gray-600' : 'bg-[#f5f5f0] border-gray-300'
          )} />
          <span className="text-sm font-semibold">
            {engine.isVariationMode
              ? `试下模式 · ${variationMoves.length > 0 ? `${currentPlayer === 'black' ? '黑' : '白'}第${variationMoves.length + 1}手` : '请落子'}`
              : engine.gameOver
              ? '对弈结束'
              : `${currentPlayer === 'black' ? '黑棋' : '白棋'}落子`
            }
          </span>
          <span className="text-xs text-muted-foreground">
            {engine.isVariationMode
              ? `共${variationMoves.length}手试下`
              : `第${engine.getMoveCount() + 1}手`
            }
          </span>
        </div>
      )}
    </div>
  );
}
