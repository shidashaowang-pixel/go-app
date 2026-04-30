import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { AnimationStep } from '@/types/types';

interface AnimationPlayerProps {
  steps: AnimationStep[];
  boardSize?: number;
  onComplete?: () => void;
  title?: string;
}

/**
 * 动画微课播放器 v2.0
 */

// 提子判断辅助函数
const removeCaptured = (
  b: (string | null)[][], x: number, y: number, color: string, size: number
) => {
  const opponent = color === 'black' ? 'white' : 'black';
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
    if (b[ny][nx] !== opponent) continue;
    const visited = new Set<string>();
    let hasLiberty = false;
    const stack: [number, number][] = [[nx, ny]];
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const key = `${cy},${cx}`;
      if (visited.has(key)) continue;
      visited.add(key);
      for (const [ddx, ddy] of dirs) {
        const ex = cx + ddx, ey = cy + ddy;
        if (ex < 0 || ex >= size || ey < 0 || ey >= size) continue;
        if (b[ey][ex] === null) { hasLiberty = true; break; }
        if (b[ey][ex] === opponent && !visited.has(`${ey},${ex}`)) {
          stack.push([ex, ey]);
        }
      }
      if (hasLiberty) break;
    }
    if (!hasLiberty) {
      for (const key of visited) {
        const [gy, gx] = key.split(',').map(Number);
        b[gy][gx] = null;
      }
    }
  }
};

export default function AnimationPlayer({ steps, boardSize = 9, onComplete, title }: AnimationPlayerProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = 封面
  const [board, setBoard] = useState<(string | null)[][]>([]);
  const [highlights, setHighlights] = useState<Map<string, 'circle' | 'square' | 'cross'>>(new Map());
  const [playing, setPlaying] = useState(false);
  const [lastPlaced, setLastPlaced] = useState<string | null>(null);
  const [showBoard, setShowBoard] = useState(false); // 控制棋盘显示
  const [speaking, setSpeaking] = useState(false); // 语音朗读中
  const [subtitle, setSubtitle] = useState(''); // 字幕文本
  const [subtitleVisible, setSubtitleVisible] = useState(false); // 字幕显示
  const [teacherTalking, setTeacherTalking] = useState<'left' | 'right' | null>(null); // 哪个老师在说话
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 初始化空棋盘
  useEffect(() => {
    const empty = Array.from({ length: boardSize }, () =>
      Array.from({ length: boardSize }, () => null as string | null)
    );
    setBoard(empty);
  }, [boardSize]);

  // 清理定时器和语音
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      speechSynthesis.cancel();
    };
  }, []);

  // 语音朗读功能
  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    speechSynthesis.cancel(); // 停止之前的朗读
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    speechRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, []);

  // 停止语音
  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // 放置棋子到棋盘
  const applyMoves = useCallback((targetStep: number) => {
    const empty = Array.from({ length: boardSize }, () =>
      Array.from({ length: boardSize }, () => null as string | null)
    );
    const newBoard = empty.map(row => [...row]);
    let lastKey: string | null = null;

    for (let s = 0; s <= targetStep; s++) {
      const step = steps[s];
      if (!step) continue;
      for (const move of step.moves) {
        newBoard[move.y][move.x] = move.color;
        lastKey = `${move.y},${move.x}`;
        removeCaptured(newBoard, move.x, move.y, move.color, boardSize);
      }
    }

    setBoard(newBoard);
    setLastPlaced(lastKey);

    // 高亮
    const step = steps[targetStep];
    if (step?.highlights) {
      const map = new Map<string, 'circle' | 'square' | 'cross'>();
      for (const h of step.highlights) {
        map.set(`${h.y},${h.x}`, h.type);
      }
      setHighlights(map);
    } else {
      setHighlights(new Map());
    }
  }, [steps, boardSize]);

  // 跳转到指定步
  const goToStep = useCallback((step: number) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    stopSpeaking();
    setCurrentStep(step);
    
    if (step >= 0) {
      const stepData = steps[step];
      
      // 决定棋盘是否显示（只有需要落子或高亮时才显示）
      const hasContent = stepData?.moves?.length || stepData?.highlights?.length;
      if (hasContent && !showBoard) {
        setShowBoard(true);
      }
      
      if (step === 0 || stepData?.moves?.length) {
        setTimeout(() => applyMoves(step), 300);
      }
      
      // 字幕处理
      if (stepData?.narration) {
        setSubtitle(stepData.narration);
        setSubtitleVisible(true);
        // 交替让两个老师说话
        setTeacherTalking(step % 2 === 0 ? 'left' : 'right');
        // 语音朗读
        speakText(stepData.narration);
      }
    } else {
      setShowBoard(false);
      setSubtitleVisible(false);
      setTeacherTalking(null);
    }
  }, [steps, showBoard, applyMoves, speakText, stopSpeaking]);

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      stopSpeaking();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setPlaying(true);
  }, [playing, stopSpeaking]);

  // 自动播放逻辑
  useEffect(() => {
    if (!playing) return;

    if (currentStep < 0) {
      timerRef.current = setTimeout(() => goToStep(0), 1000);
      return;
    }

    if (currentStep >= steps.length - 1) {
      setPlaying(false);
      stopSpeaking();
      onComplete?.();
      return;
    }

    const step = steps[currentStep];
    const dur = (step?.duration || 3) * 1000;
    timerRef.current = setTimeout(() => {
      goToStep(currentStep + 1);
    }, dur);
  }, [playing, currentStep, steps, goToStep, onComplete, stopSpeaking]);

  // 重播
  const handleReplay = () => {
    setPlaying(false);
    stopSpeaking();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const empty = Array.from({ length: boardSize }, () =>
      Array.from({ length: boardSize }, () => null as string | null)
    );
    setBoard(empty);
    setHighlights(new Map());
    setLastPlaced(null);
    setShowBoard(false);
    setSubtitleVisible(false);
    setTeacherTalking(null);
    setCurrentStep(-1);
  };

  const cellSize = boardSize <= 9 ? 40 : boardSize <= 13 ? 32 : 26;
  const svgSize = cellSize * (boardSize - 1);
  const stoneRadius = cellSize * 0.44;

  const getStarPoints = () => {
    if (boardSize === 19) return [3, 9, 15];
    if (boardSize === 13) return [3, 6, 9];
    if (boardSize === 9) return [2, 4, 6];
    return [];
  };
  const starPoints = getStarPoints();

  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  return (
    <div className="relative w-full">
      {/* 顶部标题栏 */}
      {title && currentStep < 0 && (
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
      )}

      {/* 主内容区 */}
      <div className={cn(
        "relative rounded-2xl overflow-hidden shadow-2xl",
        "bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-800",
        "transition-all duration-500"
      )}>
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-200/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-green-200/20 rounded-full translate-x-1/4 translate-y-1/4" />
        </div>

        {/* 角色区域 - 封面时全屏显示 */}
        <div className={cn(
          "flex items-center justify-center gap-8 p-8 transition-all duration-500",
          showBoard ? "h-48" : "h-80"
        )}>
          {/* 左侧熊猫老师 */}
          <div className={cn(
            "flex flex-col items-center transition-all duration-500",
            teacherTalking === 'left' ? "scale-110" : "scale-100 opacity-70"
          )}>
            <div className={cn(
              "text-6xl",
              teacherTalking === 'left' && "animate-wiggle"
            )}>
              🐼
            </div>
            <div className={cn(
              "mt-2 px-3 py-1 rounded-full text-sm font-medium transition-all",
              teacherTalking === 'left' 
                ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-500"
            )}>
              盼盼老师
            </div>
          </div>

          {/* 中央对话框 */}
          <div className={cn(
            "flex-1 max-w-lg transition-all duration-500",
            showBoard ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
          )}>
            <div className={cn(
              "bg-white/90 dark:bg-slate-800/90 rounded-2xl p-4 shadow-lg border border-amber-200 dark:border-amber-700",
              "relative"
            )}>
              <div className="absolute -top-2 left-8 w-4 h-4 bg-white/90 dark:bg-slate-800/90 border-l border-t border-amber-200 dark:border-amber-700 rotate-45" />
              <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200">
                {currentStep < 0 
                  ? "点击播放按钮，让我们开始学习围棋吧！" 
                  : steps[currentStep]?.narration || ""}
              </p>
            </div>
          </div>

          {/* 右侧熊猫老师 */}
          <div className={cn(
            "flex flex-col items-center transition-all duration-500",
            teacherTalking === 'right' ? "scale-110" : "scale-100 opacity-70"
          )}>
            <div className={cn(
              "text-6xl transition-all",
              teacherTalking === 'right' && "animate-wiggle"
            )}>
              🐼
            </div>
            <div className={cn(
              "mt-2 px-3 py-1 rounded-full text-sm font-medium transition-all",
              teacherTalking === 'right' 
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-500"
            )}>
              晶晶老师
            </div>
          </div>
        </div>

        {/* 棋盘区域 - 带入场动画 */}
        <div className={cn(
          "flex justify-center px-4 pb-4 transition-all duration-700",
          showBoard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 absolute inset-0 flex items-center justify-center"
        )}>
          <div className="relative">
            {/* 棋盘木框效果 */}
            <div 
              className="absolute -inset-2 bg-gradient-to-br from-amber-700 to-amber-900 rounded-lg shadow-xl"
              style={{ transform: 'perspective(200px) rotateX(2deg)' }}
            />
            <div className="relative border-2 border-amber-800 rounded bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100 dark:from-amber-900/30 dark:via-amber-800/20 dark:to-amber-900/30 p-4">
              <svg 
                width={svgSize + 16} 
                height={svgSize + 16} 
                className="select-none drop-shadow-sm"
              >
                {/* 棋盘背景木纹 */}
                <defs>
                  <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#deb887" />
                    <stop offset="50%" stopColor="#d2a86e" />
                    <stop offset="100%" stopColor="#c9985a" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width={svgSize + 16} height={svgSize + 16} fill="url(#boardGradient)" rx="4" />
                
                {/* 网格线 */}
                {Array.from({ length: boardSize }).map((_, i) => (
                  <g key={`line-${i}`}>
                    <line x1={8} y1={i * cellSize + 8} x2={(boardSize - 1) * cellSize + 8} y2={i * cellSize + 8}
                      stroke="#8B6914" strokeWidth="0.8" />
                    <line x1={i * cellSize + 8} y1={8} x2={i * cellSize + 8} y2={(boardSize - 1) * cellSize + 8}
                      stroke="#8B6914" strokeWidth="0.8" />
                  </g>
                ))}
                {/* 星位 */}
                {starPoints.map(row =>
                  starPoints.map(col => (
                    <circle key={`star-${row}-${col}`} cx={col * cellSize + 8} cy={row * cellSize + 8}
                      r={boardSize <= 9 ? 3.5 : 3} fill="#8B6914" />
                  ))
                )}
                
                {/* 棋子容器 */}
                <g>
                  {board.map((row, r) =>
                    row.map((cell, c) => {
                      if (!cell) return null;
                      const key = `${r},${c}`;
                      const isLast = lastPlaced === key;
                      return (
                        <g key={key}>
                          {/* 棋子阴影 */}
                          <circle cx={c * cellSize + 9} cy={r * cellSize + 11}
                            r={stoneRadius} fill="rgba(0,0,0,0.15)" />
                          {/* 棋子主体 */}
                          <circle 
                            cx={c * cellSize + 8} 
                            cy={r * cellSize + 8} 
                            r={stoneRadius}
                            fill={cell === 'black' ? '#1a1a1a' : '#f5f5f0'}
                            stroke={cell === 'white' ? '#ccc' : 'none'}
                            strokeWidth="1"
                            className={cn(
                              "transition-all",
                              isLast && "animate-stone-drop"
                            )}
                          />
                          {/* 光泽 */}
                          <circle cx={c * cellSize + 8 - stoneRadius * 0.3} cy={r * cellSize + 8 - stoneRadius * 0.3}
                            r={stoneRadius * 0.35}
                            fill={cell === 'black' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)'} />
                          {/* 最后落子标记 */}
                          {isLast && (
                            <circle cx={c * cellSize + 8} cy={r * cellSize + 8} r={stoneRadius * 0.35}
                              fill={cell === 'black' ? '#fff' : '#1a1a1a'} opacity={0.9}
                              className="animate-pulse-subtle" />
                          )}
                        </g>
                      );
                    })
                  )}
                  {/* 高亮标注 */}
                  {Array.from(highlights.entries()).map(([key, type]) => {
                    const [r, c] = key.split(',').map(Number);
                    if (type === 'circle') {
                      return (
                        <circle key={`hl-${key}`} cx={c * cellSize + 8} cy={r * cellSize + 8}
                          r={stoneRadius + 6} fill="none" stroke="#ef4444" strokeWidth="3"
                          className="animate-pulse-subtle" />
                      );
                    }
                    if (type === 'square') {
                      const s = stoneRadius + 6;
                      return (
                        <rect key={`hl-${key}`} x={c * cellSize + 8 - s} y={r * cellSize + 8 - s}
                          width={s * 2} height={s * 2} fill="none" stroke="#3b82f6" strokeWidth="3"
                          rx={3} className="animate-pulse-subtle" />
                      );
                    }
                    if (type === 'cross') {
                      const s = stoneRadius * 0.7;
                      return (
                        <g key={`hl-${key}`} className="animate-pulse-subtle">
                          <line x1={c * cellSize + 8 - s} y1={r * cellSize + 8 - s}
                            x2={c * cellSize + 8 + s} y2={r * cellSize + 8 + s}
                            stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
                          <line x1={c * cellSize + 8 + s} y1={r * cellSize + 8 - s}
                            x2={c * cellSize + 8 - s} y2={r * cellSize + 8 + s}
                            stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
                        </g>
                      );
                    }
                    return null;
                  })}
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* 底部字幕区域 */}
        {subtitleVisible && (
          <div className="absolute bottom-12 left-0 right-0 px-4 animate-fade-in-up">
            <div className={cn(
              "mx-auto max-w-2xl bg-black/80 text-white rounded-lg px-4 py-2 text-center",
              "border border-white/20 shadow-lg backdrop-blur-sm"
            )}>
              <p className="text-sm leading-relaxed">{subtitle}</p>
            </div>
          </div>
        )}
      </div>

      {/* 控制栏 */}
      <div className="mt-4 space-y-3">
        {/* 进度条 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
            {Math.max(0, currentStep + 1)}/{steps.length}
          </span>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-center gap-4">
          {/* 重播 */}
          <button
            onClick={handleReplay}
            className="p-2.5 rounded-full hover:bg-secondary transition-colors"
            title="重播"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* 上一步 */}
          <button
            onClick={() => goToStep(Math.max(-1, currentStep - 1))}
            disabled={currentStep < 0}
            className="p-2.5 rounded-full hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 播放/暂停 */}
          <button
            onClick={togglePlay}
            className={cn(
              "p-4 rounded-full transition-all shadow-lg",
              playing 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {playing ? (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* 下一步 */}
          <button
            onClick={() => goToStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep >= steps.length - 1}
            className="p-2.5 rounded-full hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 语音开关 */}
          <button
            onClick={() => speaking ? stopSpeaking() : speakText(steps[currentStep]?.narration || '')}
            disabled={currentStep < 0}
            className={cn(
              "p-2.5 rounded-full transition-colors",
              speaking 
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 hover:bg-blue-200" 
                : "hover:bg-secondary",
              currentStep < 0 && "opacity-30 cursor-not-allowed"
            )}
            title="语音朗读"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
        </div>

        {/* 步骤列表 */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {steps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => goToStep(idx)}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-medium transition-all",
                idx === currentStep
                  ? "bg-primary text-primary-foreground shadow-md scale-110"
                  : idx < currentStep
                    ? "bg-secondary hover:bg-secondary/80"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary",
                idx > currentStep && "opacity-60"
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
