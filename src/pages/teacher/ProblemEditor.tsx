import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, CheckCircle, HelpCircle, Globe, GlobeLock, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { saveProblem, setProblemPublished, getProblem } from '@/db/api';
import { addCustomProblem, overrideSystemProblem, restoreSystemProblem, getOverriddenProblemIds } from '@/data/custom-problems';
import type { Problem, WrongAnswer, BoardPosition, Solution } from '@/types';

interface EditableMove {
  row: number;
  col: number;
  color: 'black' | 'white';
}

interface WrongAnswerInput {
  moves: EditableMove[];
  explanation: string;
}

/** 正解分支输入 */
interface SolutionBranchInput {
  id: string;
  moves: EditableMove[];
  explanation: string;
}

/** 题目类型 */
type ProblemTypeOption = 'life' | 'kill' | 'capture' | 'escape' | 'connect' | 'cut' | 'sacrifice' | 'other' | 'checkpoint';

/** 先手方 */
type TurnToPlayOption = 'black' | 'white';

/** AI对弈模式的单步 */
interface AIMoveStep {
  row: number;
  col: number;
  color: 'black' | 'white';
  isUserMove: boolean; // 是否是用户（先手方）的走法
  stepNumber: number;
}

/** AI对弈分支 */
interface AIBattleBranch {
  id: string;
  moves: AIMoveStep[];
  explanation: string;
  isWrongBranch?: boolean; // 是否是错误分支
}

/** 迷你棋盘编辑器 */
function MiniBoardEditor({
  boardSize,
  blackStones,
  whiteStones,
  onBlackChange,
  onWhiteChange,
  currentColor,
  onColorChange,
  highlightCell,
  onBoardClick,
}: {
  boardSize: number;
  blackStones: EditableMove[];
  whiteStones: EditableMove[];
  onBlackChange: (stones: EditableMove[]) => void;
  onWhiteChange: (stones: EditableMove[]) => void;
  currentColor: 'black' | 'white';
  onColorChange: (color: 'black' | 'white') => void;
  highlightCell?: { row: number; col: number };
  onBoardClick?: (row: number, col: number) => void;  // 正解点击回调
}) {
  const cellSize = boardSize <= 9 ? 28 : 20;
  const svgSize = cellSize * (boardSize - 1);

  const getStoneAt = (row: number, col: number) => {
    if (blackStones.some(s => s.row === row && s.col === col)) return 'black';
    if (whiteStones.some(s => s.row === row && s.col === col)) return 'white';
    return null;
  };

  const handleClick = (row: number, col: number) => {
    const existing = getStoneAt(row, col);
    
    // 如果有正解点击回调，先调用它
    if (onBoardClick) {
      onBoardClick(row, col);
      return;  // 正解模式下不放置棋子
    }
    
    if (existing) return; // 已有棋子

    const newStone = { row, col, color: currentColor };
    if (currentColor === 'black') {
      onBlackChange([...blackStones, newStone]);
    } else {
      onWhiteChange([...whiteStones, newStone]);
    }
    // 切换颜色
    onColorChange(currentColor === 'black' ? 'white' : 'black');
  };

  const removeStone = (row: number, col: number) => {
    onBlackChange(blackStones.filter(s => !(s.row === row && s.col === col)));
    onWhiteChange(whiteStones.filter(s => !(s.row === row && s.col === col)));
  };

  const stoneR = cellSize * 0.38;

  return (
    <div className="space-y-3">
      {/* 颜色选择 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">放置：</span>
        <div className="flex gap-2">
          <button
            onClick={() => onColorChange('black')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentColor === 'black'
                ? 'bg-gray-800 text-white shadow-md'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            ⚫ 黑棋
          </button>
          <button
            onClick={() => onColorChange('white')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
              currentColor === 'white'
                ? 'bg-white text-gray-800 shadow-md ring-2 ring-gray-400'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            ⚪ 白棋
          </button>
        </div>
        <span className="text-xs text-muted-foreground">（点击棋盘放置棋子）</span>
      </div>

      {/* 棋盘 */}
      <div className="inline-block">
        <div
          className="relative border-2 border-amber-700 rounded p-2"
          style={{ background: 'linear-gradient(135deg, #deb887, #d2a86e)' }}
        >
          <svg width={svgSize + 16} height={svgSize + 16} className="select-none">
            {/* 棋盘网格 */}
            {Array.from({ length: boardSize }).map((_, i) => (
              <g key={`l-${i}`}>
                <line x1={8} y1={8 + i * cellSize} x2={8 + (boardSize - 1) * cellSize} y2={8 + i * cellSize}
                  stroke="#8B6914" strokeWidth="0.8" />
                <line x1={8 + i * cellSize} y1={8} x2={8 + i * cellSize} y2={8 + (boardSize - 1) * cellSize}
                  stroke="#8B6914" strokeWidth="0.8" />
              </g>
            ))}
            {/* 星位点 */}
            {boardSize === 9 && [2, 4, 6].map(r =>
              [2, 4, 6].map(c => (
                <circle key={`s-${r}-${c}`} cx={8 + c * cellSize} cy={8 + r * cellSize}
                  r={2} fill="#8B6914" />
              ))
            )}
            {boardSize === 19 && [3, 9, 15].map(r =>
              [3, 9, 15].map(c => (
                <circle key={`s-${r}-${c}`} cx={8 + c * cellSize} cy={8 + r * cellSize}
                  r={2.5} fill="#8B6914" />
              ))
            )}

            {/* 棋子 */}
            {[...blackStones, ...whiteStones].map((stone, idx) => (
              <g key={`stone-${idx}`}>
                <circle
                  cx={8 + stone.col * cellSize}
                  cy={8 + stone.row * cellSize}
                  r={stoneR}
                  fill={stone.color === 'black' ? '#1a1a1a' : '#f5f5f0'}
                  stroke={stone.color === 'white' ? '#ccc' : 'none'}
                  strokeWidth="1"
                />
                {/* 棋子上的坐标标签（第一颗时显示） */}
                {idx < 1 && (
                  <text
                    x={8 + stone.col * cellSize}
                    y={8 + stone.row * cellSize}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="8"
                    fill={stone.color === 'black' ? '#fff' : '#333'}
                    fontWeight="bold"
                  >
                    {String.fromCharCode(65 + (stone.col >= 8 ? stone.col + 1 : stone.col))}{boardSize - stone.row}
                  </text>
                )}
              </g>
            ))}

            {/* 高亮点 */}
            {highlightCell && (
              <circle
                cx={8 + highlightCell.col * cellSize}
                cy={8 + highlightCell.row * cellSize}
                r={stoneR + 4}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            )}

            {/* 交互层 */}
            {Array.from({ length: boardSize }).map((_, r) =>
              Array.from({ length: boardSize }).map((_, c) => (
                <rect
                  key={`click-${r}-${c}`}
                  x={8 + c * cellSize - cellSize / 2}
                  y={8 + r * cellSize - cellSize / 2}
                  width={cellSize}
                  height={cellSize}
                  fill="transparent"
                  className="cursor-pointer hover:fill-primary/10"
                  onClick={() => handleClick(r, c)}
                />
              ))
            )}
          </svg>
        </div>
      </div>

      {/* 已放置棋子列表 */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">⚫ 黑棋：</span>
          <div className="flex flex-wrap gap-1">
            {blackStones.length === 0 && <span className="text-xs text-muted-foreground">无</span>}
            {blackStones.map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-destructive/10"
                onClick={() => removeStone(s.row, s.col)}>
                {String.fromCharCode(65 + (s.col >= 8 ? s.col + 1 : s.col))}{boardSize - s.row} ×
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">⚪ 白棋：</span>
          <div className="flex flex-wrap gap-1">
            {whiteStones.length === 0 && <span className="text-xs text-muted-foreground">无</span>}
            {whiteStones.map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-destructive/10"
                onClick={() => removeStone(s.row, s.col)}>
                {String.fromCharCode(65 + (s.col >= 8 ? s.col + 1 : s.col))}{boardSize - s.row} ×
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 落子选择器 - 类似于课程编辑器的迷你棋盘 */
function MovePicker({
  boardSize,
  currentMove,
  onMoveChange,
  onClear,
}: {
  boardSize: number;
  currentMove?: EditableMove;
  onMoveChange: (move: EditableMove) => void;
  onClear: () => void;
}) {
  const cellSize = 32;
  const svgSize = cellSize * (boardSize - 1);
  const stoneR = cellSize * 0.38;

  const handleClick = (row: number, col: number) => {
    onMoveChange({ row, col, color: 'black' });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">选择正解位置：</span>
        {currentMove && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            清除
          </Button>
        )}
      </div>
      <div className="inline-block">
        <div
          className="relative border-2 border-green-600 rounded p-2 bg-gradient-to-br from-green-50 to-emerald-50"
        >
          <svg width={svgSize + 16} height={svgSize + 16} className="select-none">
            {/* 棋盘网格 */}
            {Array.from({ length: boardSize }).map((_, i) => (
              <g key={`l-${i}`}>
                <line x1={8} y1={8 + i * cellSize} x2={8 + (boardSize - 1) * cellSize} y2={8 + i * cellSize}
                  stroke="#8B6914" strokeWidth="0.8" />
                <line x1={8 + i * cellSize} y1={8} x2={8 + i * cellSize} y2={8 + (boardSize - 1) * cellSize}
                  stroke="#8B6914" strokeWidth="0.8" />
              </g>
            ))}
            {/* 星位点 */}
            {boardSize === 9 && [2, 4, 6].map(r =>
              [2, 4, 6].map(c => (
                <circle key={`s-${r}-${c}`} cx={8 + c * cellSize} cy={8 + r * cellSize}
                  r={2} fill="#8B6914" />
              ))
            )}
            {boardSize === 19 && [3, 9, 15].map(r =>
              [3, 9, 15].map(c => (
                <circle key={`s-${r}-${c}`} cx={8 + c * cellSize} cy={8 + r * cellSize}
                  r={2.5} fill="#8B6914" />
              ))
            )}
            {/* 当前落子 */}
            {currentMove && (
              <circle
                cx={8 + currentMove.col * cellSize}
                cy={8 + currentMove.row * cellSize}
                r={stoneR + 4}
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
              />
            )}
            {/* 交互层 */}
            {Array.from({ length: boardSize }).map((_, r) =>
              Array.from({ length: boardSize }).map((_, c) => (
                <rect
                  key={`click-${r}-${c}`}
                  x={8 + c * cellSize - cellSize / 2}
                  y={8 + r * cellSize - cellSize / 2}
                  width={cellSize}
                  height={cellSize}
                  fill="transparent"
                  className="cursor-pointer hover:fill-green-200/50"
                  onClick={() => handleClick(r, c)}
                />
              ))
            )}
          </svg>
        </div>
      </div>
      {currentMove && (
        <p className="text-sm text-green-600">
          ✓ 正解位置：{String.fromCharCode(65 + (currentMove.col >= 8 ? currentMove.col + 1 : currentMove.col))}{boardSize - currentMove.row}
        </p>
      )}
    </div>
  );
}

/** 错误解答编辑器 */
function WrongAnswerEditor({
  wrongAnswer,
  boardSize,
  onChange,
  onRemove,
  index,
}: {
  wrongAnswer: WrongAnswerInput;
  boardSize: number;
  onChange: (wrongAnswer: WrongAnswerInput) => void;
  onRemove: () => void;
  index: number;
}) {
  const [currentMove, setCurrentMove] = useState<EditableMove | undefined>(
    wrongAnswer.moves.length > 0 ? wrongAnswer.moves[0] : undefined
  );

  const handleMoveChange = (move: EditableMove) => {
    setCurrentMove(move);
    onChange({ ...wrongAnswer, moves: [move] });
  };

  return (
    <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            错误解答 {index + 1}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <MovePicker
          boardSize={boardSize}
          currentMove={currentMove}
          onMoveChange={handleMoveChange}
          onClear={() => {
            setCurrentMove(undefined);
            onChange({ ...wrongAnswer, moves: [] });
          }}
        />
        <div>
          <label className="text-sm font-medium mb-1 block">错误原因</label>
          <Textarea
            value={wrongAnswer.explanation}
            onChange={(e) => onChange({ ...wrongAnswer, explanation: e.target.value })}
            placeholder="例如：这步棋虽然能吃掉一子，但会导致自己的棋被反吃..."
            rows={2}
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProblemEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 获取 URL 参数（用于判断是否从本地题目编辑）
  const searchParams = new URLSearchParams(window.location.search);
  const fromLocal = searchParams.get('from') === 'local';
  
  // 从题库管理传来的要编辑的题目
  const locationState = useLocation().state as { editProblem?: Problem; loadedProblem?: Problem } | null;
  const editProblem = locationState?.editProblem;
  const loadedProblem = locationState?.loadedProblem;
  
  // 新建题目：id 为 'new' 或不存在
  // 编辑题目：id 存在（可能是 uuid 或 systemId）
  // 如果 from=local，说明是编辑本地系统题目，应该直接加载原始本地题目
  const isNew = !id || id === 'new';

  // 题目基本信息 - 优先使用传递的数据，否则从 URL id 加载
  const [title, setTitle] = useState(editProblem?.title || loadedProblem?.title || '');
  const [description, setDescription] = useState(editProblem?.description || loadedProblem?.description || '');
  const [boardSize, setBoardSize] = useState(editProblem?.board_size || loadedProblem?.board_size || 9);
  const [type, setType] = useState<'checkpoint' | 'practice'>(editProblem?.type || loadedProblem?.type || 'practice');
  const [checkpointLevel, setCheckpointLevel] = useState<number>(editProblem?.checkpoint_level || loadedProblem?.checkpoint_level || 1);
  const [difficulty, setDifficulty] = useState(editProblem?.difficulty || loadedProblem?.difficulty || 1);
  const [published, setPublished] = useState(editProblem?.published || loadedProblem?.published || false);

  // 死活题特有字段
  const [toPlay, setToPlay] = useState<TurnToPlayOption>((editProblem?.solution || loadedProblem?.solution as any)?.to_play || 'black');  // 先手方
  const [problemType, setProblemType] = useState<ProblemTypeOption>((editProblem?.solution || loadedProblem?.solution as any)?.problem_type || 'life');  // 题目类型

  // 初始棋盘 - 从editProblem或loadedProblem加载
  const loadedInitialPos = editProblem?.initial_position || loadedProblem?.initial_position;
  const [blackStones, setBlackStones] = useState<EditableMove[]>(
    loadedInitialPos?.black?.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })) || []
  );
  const [whiteStones, setWhiteStones] = useState<EditableMove[]>(
    loadedInitialPos?.white?.map(([r, c]) => ({ row: r, col: c, color: 'white' as const })) || []
  );
  const [currentColor, setCurrentColor] = useState<'black' | 'white'>('black');

  // 正解分支（支持多分支多步正解）
  const loadedSolution = editProblem?.solution || loadedProblem?.solution;
  const [solutionBranches, setSolutionBranches] = useState<SolutionBranchInput[]>(() => {
    if (loadedSolution?.moves) {
      return [{
        id: generateBranchId(),
        moves: loadedSolution.moves.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })),
        explanation: loadedSolution.explanation || ''
      }];
    }
    return [{ id: generateBranchId(), moves: [], explanation: '' }];
  });
  const [currentBranchIndex, setCurrentBranchIndex] = useState(0);
  const [showSolutionPreview, setShowSolutionPreview] = useState(true);

  // 旧版正解（兼容）
  const [correctMove, setCorrectMove] = useState<EditableMove | undefined>(
    loadedSolution?.moves?.[0] ? { row: loadedSolution.moves[0][0], col: loadedSolution.moves[0][1], color: 'black' as const } : undefined
  );
  const [winCondition, setWinCondition] = useState<'exact_move' | 'capture' | 'make_eyes' | 'kill_opponent' | 'ai_battle'>(
    (loadedSolution as any)?.win_condition || 'exact_move'
  );
  const [captureMin, setCaptureMin] = useState((loadedSolution as any)?.capture_min || 1);
  const [eyeMin, setEyeMin] = useState((loadedSolution as any)?.eye_min || 2);
  const [explanation, setExplanation] = useState(loadedSolution?.explanation || '');

  // 错误解答
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerInput[]>(
    (editProblem?.wrong_answers || loadedProblem?.wrong_answers)?.map((w: any) => ({
      moves: w.moves.map(([r, c]: [number, number]) => ({ row: r, col: c, color: 'black' as const })),
      explanation: w.explanation || ''
    })) || []
  );

  // AI对弈模式状态
  const [isAIBattleMode, setIsAIBattleMode] = useState(
    (loadedSolution as any)?.win_condition === 'ai_battle' || false
  );
  // AI对弈正解分支
  const [aiBattleBranches, setAIBattleBranches] = useState<AIBattleBranch[]>(() => {
    const aiMoves = (loadedSolution as any)?.ai_moves;
    if (aiMoves && Array.isArray(aiMoves) && aiMoves.length > 0) {
      // 从已有数据恢复
      return [{
        id: generateBranchId(),
        moves: aiMoves.map((m: any, idx: number) => ({
          row: m.row,
          col: m.col,
          color: m.color || (idx % 2 === 0 ? toPlay : (toPlay === 'black' ? 'white' : 'black')),
          isUserMove: idx % 2 === 0,
          stepNumber: idx + 1,
        })),
        explanation: loadedSolution?.explanation || '',
      }];
    }
    // 尝试从旧版moves恢复
    if (loadedSolution?.moves && loadedSolution.moves.length > 0) {
      const moves: AIMoveStep[] = [];
      loadedSolution.moves.forEach(([r, c], idx) => {
        const userColor = toPlay;
        const aiColor = toPlay === 'black' ? 'white' : 'black';
        moves.push({ row: r, col: c, color: userColor, isUserMove: true, stepNumber: idx * 2 + 1 });
        // 如果有对应的AI应手，可以从alternative_moves或其他地方找，这里先只恢复用户走法
      });
      return [{ id: generateBranchId(), moves, explanation: loadedSolution?.explanation || '', isWrongBranch: false }];
    }
    return [{ id: generateBranchId(), moves: [], explanation: '', isWrongBranch: false }];
  });
  const [currentAIBranchIndex, setCurrentAIBranchIndex] = useState(0);
  // AI对弈错误分支
  const [aiWrongBranches, setAIWrongBranches] = useState<AIBattleBranch[]>(() => {
    const wa = editProblem?.wrong_answers || loadedProblem?.wrong_answers;
    if (wa && Array.isArray(wa)) {
      return wa.map((w: any, idx: number) => ({
        id: generateBranchId(),
        moves: w.ai_moves?.map((m: any, mIdx: number) => ({
          row: m.row,
          col: m.col,
          color: m.color || (mIdx % 2 === 0 ? toPlay : (toPlay === 'black' ? 'white' : 'black')),
          isUserMove: mIdx % 2 === 0,
          stepNumber: mIdx + 1,
        })) || w.moves?.map(([r, c]: [number, number], mIdx: number) => ({
          row: r, col: c,
          color: mIdx % 2 === 0 ? toPlay : (toPlay === 'black' ? 'white' : 'black'),
          isUserMove: mIdx % 2 === 0,
          stepNumber: mIdx + 1,
        })) || [],
        explanation: w.explanation || `错误分支 ${idx + 1}`,
        isWrongBranch: true,
      }));
    }
    return [];
  });

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 生成唯一分支ID
  function generateBranchId() {
    return Math.random().toString(36).substring(2, 11);
  }

  // 获取当前分支
  const currentBranch = solutionBranches[currentBranchIndex];

  // 添加正解落子到当前分支
  const addSolutionMove = (row: number, col: number) => {
    const newBranches = [...solutionBranches];
    // 检查是否已存在
    if (!newBranches[currentBranchIndex].moves.some(m => m.row === row && m.col === col)) {
      newBranches[currentBranchIndex] = {
        ...newBranches[currentBranchIndex],
        moves: [...newBranches[currentBranchIndex].moves, { row, col, color: toPlay === 'black' ? 'black' : 'white' }],
      };
      setSolutionBranches(newBranches);
    }
  };

  // 移除正解落子
  const removeSolutionMove = (index: number) => {
    const newBranches = [...solutionBranches];
    newBranches[currentBranchIndex] = {
      ...newBranches[currentBranchIndex],
      moves: newBranches[currentBranchIndex].moves.filter((_, i) => i !== index),
    };
    setSolutionBranches(newBranches);
  };

  // 添加新分支
  const addBranch = () => {
    setSolutionBranches([
      ...solutionBranches,
      { id: generateBranchId(), moves: [], explanation: '' }
    ]);
    setCurrentBranchIndex(solutionBranches.length);
  };

  // 删除分支
  const deleteBranch = (index: number) => {
    if (solutionBranches.length <= 1) return;
    const newBranches = solutionBranches.filter((_, i) => i !== index);
    setSolutionBranches(newBranches);
    if (currentBranchIndex >= newBranches.length) {
      setCurrentBranchIndex(newBranches.length - 1);
    }
  };

  // 更新分支解说
  const updateBranchExplanation = (index: number, explanation: string) => {
    const newBranches = [...solutionBranches];
    newBranches[index] = { ...newBranches[index], explanation };
    setSolutionBranches(newBranches);
  };

  // ========== AI对弈模式相关函数 ==========

  // 获取当前应该走棋的颜色（在AI对弈模式下）
  const getCurrentAIColor = (branchMoves: AIMoveStep[]): 'black' | 'white' => {
    if (branchMoves.length === 0) return toPlay;
    const lastMove = branchMoves[branchMoves.length - 1];
    return lastMove.color === 'black' ? 'white' : 'black';
  };

  // 判断当前是否应该用户落子
  const isUserTurn = (branchMoves: AIMoveStep[]): boolean => {
    if (branchMoves.length === 0) return true; // 第一手总是用户
    const lastMove = branchMoves[branchMoves.length - 1];
    // 如果最后一手是AI走的，现在轮到用户
    return !lastMove.isUserMove;
  };

  // 添加AI对弈落子
  const addAIBattleMove = (row: number, col: number, isUser: boolean) => {
    const isSolution = !isUser; // 从UI调用时，isUser=true表示用户在正解分支上落子
    // 实际上这个函数会被不同的回调调用
  };

  // 添加正解分支的落子（用户在正解分支上点击）
  const addSolutionAIBattleMove = (row: number, col: number) => {
    const branch = aiBattleBranches[currentAIBranchIndex];
    const nextColor = getCurrentAIColor(branch.moves);
    const userMove = nextColor === toPlay;
    if (!userMove) return; // 不该用户走

    const newBranches = [...aiBattleBranches];
    newBranches[currentAIBranchIndex] = {
      ...branch,
      moves: [...branch.moves, {
        row, col, color: nextColor, isUserMove: true, stepNumber: branch.moves.length + 1
      }]
    };
    setAIBattleBranches(newBranches);
  };

  // 添加AI应手到正解分支
  const addAIResponseToSolution = (row: number, col: number) => {
    const branch = aiBattleBranches[currentAIBranchIndex];
    const nextColor = getCurrentAIColor(branch.moves);
    const userMove = nextColor === toPlay;
    if (userMove) return; // 不该AI走

    const newBranches = [...aiBattleBranches];
    newBranches[currentAIBranchIndex] = {
      ...branch,
      moves: [...branch.moves, {
        row, col, color: nextColor, isUserMove: false, stepNumber: branch.moves.length + 1
      }]
    };
    setAIBattleBranches(newBranches);
  };

  // 添加错误分支的落子
  const addWrongAIBattleMove = (branchIndex: number, row: number, col: number) => {
    const branch = aiWrongBranches[branchIndex];
    const nextColor = getCurrentAIColor(branch.moves);
    const userMove = nextColor === toPlay;
    if (!userMove) return;

    const newBranches = [...aiWrongBranches];
    newBranches[branchIndex] = {
      ...branch,
      moves: [...branch.moves, {
        row, col, color: nextColor, isUserMove: true, stepNumber: branch.moves.length + 1
      }]
    };
    setAIWrongBranches(newBranches);
  };

  // 添加AI应手到错误分支
  const addAIResponseToWrong = (branchIndex: number, row: number, col: number) => {
    const branch = aiWrongBranches[branchIndex];
    const nextColor = getCurrentAIColor(branch.moves);
    const userMove = nextColor === toPlay;
    if (userMove) return;

    const newBranches = [...aiWrongBranches];
    newBranches[branchIndex] = {
      ...branch,
      moves: [...branch.moves, {
        row, col, color: nextColor, isUserMove: false, stepNumber: branch.moves.length + 1
      }]
    };
    setAIWrongBranches(newBranches);
  };

  // 移除AI对弈落子
  const removeAIBattleMove = (branchIndex: number, moveIndex: number, isWrong: boolean) => {
    if (isWrong) {
      const newBranches = [...aiWrongBranches];
      newBranches[branchIndex] = {
        ...newBranches[branchIndex],
        moves: newBranches[branchIndex].moves.filter((_, i) => i !== moveIndex),
      };
      // 重新编号
      newBranches[branchIndex].moves = newBranches[branchIndex].moves.map((m, i) => ({
        ...m, stepNumber: i + 1,
      }));
      setAIWrongBranches(newBranches);
    } else {
      const newBranches = [...aiBattleBranches];
      newBranches[branchIndex] = {
        ...newBranches[branchIndex],
        moves: newBranches[branchIndex].moves.filter((_, i) => i !== moveIndex),
      };
      newBranches[branchIndex].moves = newBranches[branchIndex].moves.map((m, i) => ({
        ...m, stepNumber: i + 1,
      }));
      setAIBattleBranches(newBranches);
    }
  };

  // 添加AI对弈正解分支
  const addAIBattleBranch = () => {
    setAIBattleBranches([...aiBattleBranches, { id: generateBranchId(), moves: [], explanation: '' }]);
    setCurrentAIBranchIndex(aiBattleBranches.length);
  };

  // 删除AI对弈正解分支
  const deleteAIBattleBranch = (index: number) => {
    if (aiBattleBranches.length <= 1) return;
    const newBranches = aiBattleBranches.filter((_, i) => i !== index);
    setAIBattleBranches(newBranches);
    if (currentAIBranchIndex >= newBranches.length) {
      setCurrentAIBranchIndex(newBranches.length - 1);
    }
  };

  // 更新AI对弈分支解说
  const updateAIBattleBranchExplanation = (index: number, explanation: string, isWrong: boolean) => {
    if (isWrong) {
      const newBranches = [...aiWrongBranches];
      newBranches[index] = { ...newBranches[index], explanation };
      setAIWrongBranches(newBranches);
    } else {
      const newBranches = [...aiBattleBranches];
      newBranches[index] = { ...newBranches[index], explanation };
      setAIBattleBranches(newBranches);
    }
  };

  // 添加AI对弈错误分支
  const addAIWrongBranch = () => {
    setAIWrongBranches([...aiWrongBranches, { id: generateBranchId(), moves: [], explanation: '', isWrongBranch: true }]);
  };

  // 删除AI对弈错误分支
  const deleteAIWrongBranch = (index: number) => {
    setAIWrongBranches(aiWrongBranches.filter((_, i) => i !== index));
  };

  // 正解预览
  const solutionPreview = useMemo(() => {
    if (!showSolutionPreview) return [];
    return solutionBranches.flatMap((branch, branchIdx) =>
      branch.moves.map((move, moveIdx) => ({
        row: move.row,
        col: move.col,
        step: moveIdx + 1,
        isCurrentBranch: branchIdx === currentBranchIndex && moveIdx === branch.moves.length - 1,
      }))
    );
  }, [solutionBranches, currentBranchIndex, showSolutionPreview]);

  // 从本地数据加载题目（不查云端）
  const loadFromLocalData = async (problemId: string) => {
    const { CHECKPOINT_LEVELS, VERIFIED_PRACTICE_PROBLEMS } = await import('@/data/problems');
    const { getProblemOverridesSync } = await import('@/data/custom-problems');
    
    // 先检查是否有覆盖版本（用户修改后的版本）
    const overrides = getProblemOverridesSync();
    const overrideVersion = overrides.get(problemId);
    if (overrideVersion) {
      console.log('[题目加载] 找到覆盖版本:', overrideVersion.title, '(id:', problemId, ')');
      const ov = overrideVersion;
      setTitle(ov.title || '');
      setDescription(ov.description || '');
      setBoardSize(ov.board_size || 9);
      setType(ov.type || 'practice');
      setCheckpointLevel(ov.checkpoint_level || 1);
      setDifficulty(ov.difficulty || 1);
      setPublished(ov.published || false);
      setBlackStones(ov.initial_position?.black?.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })) || []);
      setWhiteStones(ov.initial_position?.white?.map(([r, c]) => ({ row: r, col: c, color: 'white' as const })) || []);
      setSolutionBranches(ov.solution?.moves?.length > 0 ? [{
        id: generateBranchId(),
        moves: ov.solution.moves.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })),
        explanation: ov.solution.explanation || ''
      }] : [{ id: generateBranchId(), moves: [], explanation: '' }]);
      setWrongAnswers(ov.wrong_answers?.map((w: any) => ({
        moves: w.moves.map(([r, c]: [number, number]) => ({ row: r, col: c, color: 'black' as const })),
        explanation: w.explanation || ''
      })) || []);
      const sol = ov.solution as any;
      if (sol?.to_play) setToPlay(sol.to_play);
      if (sol?.problem_type) setProblemType(sol.problem_type);
      if (sol?.win_condition) setWinCondition(sol.win_condition);
      if (sol?.capture_min) setCaptureMin(sol.capture_min);
      if (sol?.eye_min) setEyeMin(sol.eye_min);
      if (sol?.explanation) setExplanation(sol.explanation);
      return;
    }
    
    // 没有覆盖版本，从原始数据加载
    
    // 查找闯关题
    let localProblem = null;
    for (let level = 1; level <= CHECKPOINT_LEVELS.length; level++) {
      const levelIndex = level - 1;
      const found = CHECKPOINT_LEVELS[levelIndex].find(p => 
        p.systemId === problemId || `system-level-${level}-${CHECKPOINT_LEVELS[levelIndex].indexOf(p)}` === problemId
      );
      if (found) {
        localProblem = { ...found, type: 'checkpoint' as const, checkpoint_level: level };
        break;
      }
    }
    
    // 查找练习题
    if (!localProblem) {
      const foundIndex = VERIFIED_PRACTICE_PROBLEMS.findIndex(p => 
        p.systemId === problemId || p.systemId === `system-practice-${VERIFIED_PRACTICE_PROBLEMS.indexOf(p)}`
      );
      if (foundIndex !== -1) {
        localProblem = VERIFIED_PRACTICE_PROBLEMS[foundIndex];
      }
    }
    
    // 查找死活题
    if (!localProblem) {
      const { LIFE_DEATH_PROBLEMS } = await import('@/data/life-death-problems');
      const foundIndex = LIFE_DEATH_PROBLEMS.findIndex(p =>
        p.systemId === problemId || p.systemId === `system-life-${LIFE_DEATH_PROBLEMS.indexOf(p)}`
      );
      if (foundIndex !== -1) {
        localProblem = LIFE_DEATH_PROBLEMS[foundIndex];
      }
    }
    
    if (localProblem) {
      console.log('[题目加载] 从本地数据加载题目:', localProblem.title, '(id:', problemId, ')');
      setTitle(localProblem.title || '');
      setDescription(localProblem.description || '');
      setBoardSize(localProblem.board_size || 9);
      setType(localProblem.type || 'practice');
      setCheckpointLevel(localProblem.checkpoint_level || 1);
      setDifficulty(localProblem.difficulty || 1);
      setPublished(false);
      setBlackStones(localProblem.initial_position?.black?.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })) || []);
      setWhiteStones(localProblem.initial_position?.white?.map(([r, c]) => ({ row: r, col: c, color: 'white' as const })) || []);
      setSolutionBranches(localProblem.solution?.moves?.length > 0 ? [{
        id: generateBranchId(),
        moves: localProblem.solution.moves.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })),
        explanation: localProblem.solution.explanation || ''
      }] : [{ id: generateBranchId(), moves: [], explanation: '' }]);
      setWrongAnswers(localProblem.wrong_answers?.map(w => ({
        moves: w.moves.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })),
        explanation: w.explanation || ''
      })) || []);
      const sol = localProblem.solution as any;
      if (sol?.to_play) setToPlay(sol.to_play);
      if (sol?.problem_type) setProblemType(sol.problem_type);
      if (sol?.win_condition) setWinCondition(sol.win_condition);
      if (sol?.capture_min) setCaptureMin(sol.capture_min);
      if (sol?.eye_min) setEyeMin(sol.eye_min);
      if (sol?.explanation) setExplanation(sol.explanation);
    } else {
      console.error('[题目加载] 未找到题目:', problemId);
      toast.error('未找到该题目');
    }
  };

  // 加载题目（编辑模式）- 当 id 存在且为本地题目 id 时，从数据库或本地数据加载
  useEffect(() => {
    const loadProblem = async () => {
      // ========== 检查是否有从SGF导入的题目 ==========
      const importedStr = sessionStorage.getItem('importedProblems');
      if (importedStr && isNew) {
        try {
          const importedProblems = JSON.parse(importedStr);
          if (Array.isArray(importedProblems) && importedProblems.length > 0) {
            // 使用第一道导入的题目
            const imported = importedProblems[0];
            console.log('[题目导入] 从SGF导入题目:', imported.title);
            
            setTitle(imported.title || '导入题目');
            setDescription(imported.description || '');
            setBoardSize(imported.board_size || 9);
            setDifficulty(imported.difficulty || 3);
            
            // 设置初始位置
            if (imported.initial_position) {
              setBlackStones(imported.initial_position.black?.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })) || []);
              setWhiteStones(imported.initial_position.white?.map(([r, c]) => ({ row: r, col: c, color: 'white' as const })) || []);
            }
            
            // 设置正解
            if (imported.solution?.moves?.length > 0) {
              setSolutionBranches([{
                id: generateBranchId(),
                moves: imported.solution.moves.map(([r, c]: number[]) => ({ row: r, col: c, color: 'black' as const })),
                explanation: imported.solution.explanation || ''
              }]);
            }
            
            toast.success('已加载导入的题目，请检查并调整');
            
            // 清除导入数据
            sessionStorage.removeItem('importedProblems');
            return;
          }
        } catch (e) {
          console.error('[题目导入] 解析导入数据失败:', e);
          sessionStorage.removeItem('importedProblems');
        }
      }
      
      // 新建模式不加载
      if (isNew || !id) return;
      
      // 如果已经有 loadedProblem（从 locationState 传入），使用它
      if (loadedProblem) {
        console.log('[题目加载] 使用 locationState 传入的题目:', loadedProblem.title);
        return;
      }
      
      // 如果是编辑本地题目（fromLocal=true），直接从本地数据加载，不查云端
      if (fromLocal) {
        console.log('[题目加载] 从本地数据加载（编辑系统题目）:', id);
        await loadFromLocalData(id);
        return;
      }
      
      // 从数据库加载题目（支持 systemId 查询）
      try {
        const data = await getProblem(id);
        if (data) {
          console.log('[题目加载] 从数据库加载题目:', data.title, 'id:', id);
          // 更新各状态
          setTitle(data.title || '');
          setDescription(data.description || '');
          setBoardSize(data.board_size || 9);
          setType(data.type || 'practice');
          setCheckpointLevel(data.checkpoint_level || 1);
          setDifficulty(data.difficulty || 1);
          setPublished(data.published || false);
          setBlackStones(data.initial_position?.black?.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })) || []);
          setWhiteStones(data.initial_position?.white?.map(([r, c]) => ({ row: r, col: c, color: 'white' as const })) || []);
          setSolutionBranches(data.solution?.moves?.length > 0 ? [{
            id: generateBranchId(),
            moves: data.solution.moves.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })),
            explanation: data.solution.explanation || ''
          }] : [{ id: generateBranchId(), moves: [], explanation: '' }]);
          setWrongAnswers(data.wrong_answers?.map(w => ({
            moves: w.moves.map(([r, c]) => ({ row: r, col: c, color: 'black' as const })),
            explanation: w.explanation || ''
          })) || []);
          // 死活题特有字段
          const sol = data.solution as any;
          if (sol?.to_play) setToPlay(sol.to_play);
          if (sol?.problem_type) setProblemType(sol.problem_type);
          if (sol?.win_condition) setWinCondition(sol.win_condition);
          if (sol?.capture_min) setCaptureMin(sol.capture_min);
          if (sol?.eye_min) setEyeMin(sol.eye_min);
          if (sol?.explanation) setExplanation(sol.explanation);

          // AI对弈模式：恢复分支数据
          if (sol?.win_condition === 'ai_battle') {
            setIsAIBattleMode(true);
            // 恢复正解分支
            if (sol.ai_moves && Array.isArray(sol.ai_moves)) {
              const tp = sol.to_play || 'black';
              setAIBattleBranches([{
                id: generateBranchId(),
                moves: sol.ai_moves.map((m: any, idx: number) => ({
                  row: m.row,
                  col: m.col,
                  color: m.color || (idx % 2 === 0 ? tp : (tp === 'black' ? 'white' : 'black')),
                  isUserMove: idx % 2 === 0,
                  stepNumber: idx + 1,
                })),
                explanation: sol.explanation || '',
                isWrongBranch: false,
              }]);
              // 恢复替代正解分支
              if (sol.alternative_ai_moves && Array.isArray(sol.alternative_ai_moves)) {
                const altBranches = sol.alternative_ai_moves.map((alt: any[]) => ({
                  id: generateBranchId(),
                  moves: alt.map((m: any, idx: number) => ({
                    row: m.row,
                    col: m.col,
                    color: m.color || (idx % 2 === 0 ? tp : (tp === 'black' ? 'white' : 'black')),
                    isUserMove: idx % 2 === 0,
                    stepNumber: idx + 1,
                  })),
                  explanation: '',
                  isWrongBranch: false,
                }));
                setAIBattleBranches(prev => [...prev, ...altBranches]);
              }
            }
            // 恢复错误分支
            if (data.wrong_answers && Array.isArray(data.wrong_answers)) {
              const tp = sol.to_play || 'black';
              setAIWrongBranches(data.wrong_answers.map((w: any) => ({
                id: generateBranchId(),
                moves: w.ai_moves?.map((m: any, idx: number) => ({
                  row: m.row,
                  col: m.col,
                  color: m.color || (idx % 2 === 0 ? tp : (tp === 'black' ? 'white' : 'black')),
                  isUserMove: idx % 2 === 0,
                  stepNumber: idx + 1,
                })) || w.moves?.map(([r, c]: [number, number], idx: number) => ({
                  row: r, col: c,
                  color: idx % 2 === 0 ? tp : (tp === 'black' ? 'white' : 'black'),
                  isUserMove: idx % 2 === 0,
                  stepNumber: idx + 1,
                })) || [],
                explanation: w.explanation || '',
                isWrongBranch: true,
              })));
            }
          }
        } else {
          console.log('[题目加载] 数据库未找到，尝试从本地数据加载:', id);
          // 数据库没有，尝试从本地数据加载
          await loadFromLocalData(id);
        }
      } catch (err) {
        console.error('加载题目失败:', err);
        toast.error('加载题目失败');
      }
    };
    loadProblem();
  }, [id, isNew, loadedProblem, fromLocal]);

  // 判断是否为系统题目
  const isSystemProblem = editProblem?.systemId || (id && id.startsWith('level-') || id && id.startsWith('practice-') || id && id.startsWith('system-'));
  
  // 处理保存
  const handleSave = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    if (!title.trim()) {
      toast.error('请输入题目标题');
      return;
    }
    if (blackStones.length === 0 && whiteStones.length === 0) {
      toast.error('请在棋盘上放置至少一颗棋子');
      return;
    }

    // 检查是否有正解
    const hasSolution = isAIBattleMode
      ? aiBattleBranches.some(b => b.moves.length > 0 && b.moves.some(m => m.isUserMove))
      : solutionBranches.some(b => b.moves.length > 0);
    if (!hasSolution) {
      toast.error(isAIBattleMode ? '请在AI对弈正解分支中设置至少一步用户走法' : '请在棋盘上点击设置至少一个正解落子');
      return;
    }

    setSaving(true);
    try {
      let solutionData;
      let wrongAnswersData;

      if (isAIBattleMode) {
        // AI对弈模式：构建包含完整交替序列的正解数据
        const mainBranch = aiBattleBranches[0];
        solutionData = {
          moves: mainBranch.moves.filter(m => m.isUserMove).map(m => [m.row, m.col]),
          ai_moves: mainBranch.moves.map(m => ({ row: m.row, col: m.col, color: m.color })),
          alternative_moves: aiBattleBranches.slice(1).map(b =>
            b.moves.filter(m => m.isUserMove).map(m => [m.row, m.col])
          ),
          alternative_ai_moves: aiBattleBranches.slice(1).map(b =>
            b.moves.map(m => ({ row: m.row, col: m.col, color: m.color }))
          ),
          explanation: mainBranch.explanation || explanation,
          win_condition: 'ai_battle' as const,
          to_play: toPlay,
          problem_type: problemType,
        };
        wrongAnswersData = aiWrongBranches
          .filter(b => b.moves.length > 0 && b.moves.some(m => m.isUserMove))
          .map(b => ({
            moves: b.moves.filter(m => m.isUserMove).map(m => [m.row, m.col]),
            ai_moves: b.moves.map(m => ({ row: m.row, col: m.col, color: m.color })),
            explanation: b.explanation,
          }));
      } else {
        // 传统模式
        solutionData = {
          moves: solutionBranches[0].moves.map(m => [m.row, m.col]),
          alternative_moves: solutionBranches.slice(1).map(b => b.moves.map(m => [m.row, m.col])),
          explanation: solutionBranches[0].explanation || explanation,
          win_condition: winCondition,
          capture_min: winCondition === 'capture' ? captureMin : undefined,
          eye_min: winCondition === 'make_eyes' ? eyeMin : undefined,
          to_play: toPlay,
          problem_type: problemType,
        };
        wrongAnswersData = wrongAnswers
          .filter(w => w.moves.length > 0)
          .map(w => ({
            moves: w.moves.map(m => [m.row, m.col]),
            explanation: w.explanation,
          }));
      }
      
      // 构建题目数据
      const problemData = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        checkpoint_level: type === 'checkpoint' ? checkpointLevel : null,
        board_size: boardSize,
        initial_position: {
          black: blackStones.map(s => [s.row, s.col]),
          white: whiteStones.map(s => [s.row, s.col]),
        },
        solution: solutionData,
        wrong_answers: wrongAnswersData,
        difficulty,
        teacher_id: user.id,
        published: false,
        to_play: toPlay,
        problem_type: problemType,
      };

      // 判断是新建还是编辑系统题目
      const systemId = editProblem?.systemId;
      
      if (isNew) {
        // 新建题目 → 添加到自定义题目列表
        const newProblem = await addCustomProblem(problemData);
        toast.success(
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>自定义题目创建成功！</span>
          </div>,
          { duration: 4000 }
        );
        navigate('/teacher/problems');
      } else if (systemId) {
        // 编辑系统题目 → 保存为覆盖版本（同步到云端）
        await overrideSystemProblem(systemId, problemData);
        toast.success(
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>系统题目已修改！已同步到云端，所有用户可见。</span>
          </div>,
          { duration: 4000 }
        );
        navigate('/teacher/problems');
      } else {
        // 其他情况 → 保存到云端数据库
        const saveId = editProblem?.id || id;
        await saveProblem({ ...problemData, id: saveId });
        toast.success('题目保存成功！云端已同步。');
        navigate('/teacher/problems');
      }
    } catch (error) {
      console.error('保存失败:', error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('本地已保存')) {
        toast.warning(msg, { duration: 6000 });
      } else {
        toast.error(`保存失败：${msg}`, { duration: 6000 });
      }
    } finally {
      setSaving(false);
    }
  };
  
  // 恢复系统题目
  const handleRestore = async () => {
    if (!editProblem?.systemId) return;
    
    const confirmed = window.confirm('确定要恢复系统题目吗？你的修改将被丢弃。');
    if (!confirmed) return;
    
    await restoreSystemProblem(editProblem.systemId);
    toast.success('系统题目已恢复！');
    navigate('/teacher/problems');
  };

  // 发布/取消发布题目
  const handleTogglePublish = async () => {
    if (!id) {
      toast.error('请先保存题目后再发布');
      return;
    }

    setPublishing(true);
    try {
      const newPublished = !published;
      await setProblemPublished(id, newPublished);
      setPublished(newPublished);
      toast.success(newPublished ? '题目已发布，所有用户可见！' : '题目已取消发布');
    } catch {
      toast.warning('发布状态更新失败，可稍后重试');
    } finally {
      setPublishing(false);
    }
  };

  const addWrongAnswer = () => {
    setWrongAnswers([...wrongAnswers, { moves: [], explanation: '' }]);
  };

  const updateWrongAnswer = (index: number, wrongAnswer: WrongAnswerInput) => {
    const newWrongAnswers = [...wrongAnswers];
    newWrongAnswers[index] = wrongAnswer;
    setWrongAnswers(newWrongAnswers);
  };

  const removeWrongAnswer = (index: number) => {
    setWrongAnswers(wrongAnswers.filter((_, i) => i !== index));
  };

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/teacher/problems')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回题库管理
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isNew ? <Plus className="h-5 w-5" /> : <Save className="h-5 w-5" />}
              {isNew ? '创建新题目' : '编辑题目'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 基本信息 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">题目标题 *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：黑先吃子"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">题目描述</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述这道题目的要求和目标..."
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">题目类型</label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice">📝 练习题</SelectItem>
                    <SelectItem value="checkpoint">🎯 关卡题</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === 'checkpoint' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">关卡等级</label>
                  <Select value={checkpointLevel.toString()} onValueChange={(v) => setCheckpointLevel(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                        <SelectItem key={level} value={level.toString()}>第 {level} 关</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">棋盘大小</label>
                <Select value={boardSize.toString()} onValueChange={(v) => setBoardSize(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">9×9 小棋盘</SelectItem>
                    <SelectItem value="13">13×13 中棋盘</SelectItem>
                    <SelectItem value="19">19×19 标准棋盘</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">难度</label>
                <Select value={difficulty.toString()} onValueChange={(v) => setDifficulty(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">⭐ 入门</SelectItem>
                    <SelectItem value="2">⭐⭐ 简单</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ 基础</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ 进阶</SelectItem>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ 困难</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 先手方选择 */}
              <div>
                <label className="text-sm font-medium mb-2 block">先手方 *</label>
                <Select value={toPlay} onValueChange={(v) => setToPlay(v as TurnToPlayOption)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="black">⚫ 黑棋先下</SelectItem>
                    <SelectItem value="white">⚪ 白棋先下</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 题目类型选择 */}
              <div>
                <label className="text-sm font-medium mb-2 block">题目类型</label>
                <Select value={problemType} onValueChange={(v) => {
                    const newType = v as ProblemTypeOption;
                    setProblemType(newType);
                    // 闯关题目类型时自动设置type为checkpoint
                    if (newType === 'checkpoint') {
                      setType('checkpoint');
                    } else if (type === 'checkpoint') {
                      setType('practice'); // 切换回其他类型时重置
                    }
                  }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="life">🟢 做活（让己方棋活）</SelectItem>
                    <SelectItem value="kill">🔴 杀棋（吃掉对方棋）</SelectItem>
                    <SelectItem value="capture">⬛ 吃子（提掉对方子）</SelectItem>
                    <SelectItem value="escape">🏃 出逃（让己方棋逃出）</SelectItem>
                    <SelectItem value="connect">🔗 连接（连接己方棋）</SelectItem>
                    <SelectItem value="cut">✂️ 切断（切断对方连接）</SelectItem>
                    <SelectItem value="sacrifice">💔 弃子（故意送吃）</SelectItem>
                    <SelectItem value="checkpoint">🎯 闯关题目（提子/做活/杀棋）</SelectItem>
                    <SelectItem value="other">📌 其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 闯关题目特有设置 */}
              {problemType === 'checkpoint' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-4">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-3">🎯 闯关题目设置</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">闯关关卡</label>
                      <Select value={checkpointLevel} onValueChange={(v) => setCheckpointLevel(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              第 {i + 1} 关
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">胜负条件</label>
                      <Select value={winCondition} onValueChange={(v) => setWinCondition(v as typeof winCondition)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="capture">🍽️ 提子（吃到对方子）</SelectItem>
                          <SelectItem value="exact_move">📍 精确落子（落对位置）</SelectItem>
                          <SelectItem value="make_eyes">👁️ 做眼（做成眼）</SelectItem>
                          <SelectItem value="kill_opponent">💀 杀棋（破眼杀棋）</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {(winCondition === 'capture') && (
                    <div className="mt-4">
                      <label className="text-sm font-medium mb-2 block">提子数量（答对此题需要提掉至少几个子）</label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={captureMin}
                        onChange={(e) => setCaptureMin(Number(e.target.value))}
                        className="w-32"
                      />
                    </div>
                  )}
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
                    💡 闯关题目会自动添加到对应的闯关关卡中，玩家通关闯关时可以看到这些题目。
                  </p>
                </div>
              )}
            </div>

            {/* 初始棋盘设置 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-500" />
                设置初始棋盘
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                在下方棋盘上点击放置黑白棋子，设置题目的初始状态。
              </p>
              <MiniBoardEditor
                boardSize={boardSize}
                blackStones={blackStones}
                whiteStones={whiteStones}
                onBlackChange={setBlackStones}
                onWhiteChange={setWhiteStones}
                currentColor={currentColor}
                onColorChange={setCurrentColor}
              />
            </div>

            {/* 胜利判定方式选择 */}
            <div className="border-t pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">胜利判定方式</label>
                  <Select value={winCondition} onValueChange={(v) => {
                    const newWc = v as typeof winCondition;
                    setWinCondition(newWc);
                    setIsAIBattleMode(newWc === 'ai_battle');
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact_move">📍 精确落子（必须下在指定位置）</SelectItem>
                      <SelectItem value="capture">🍽️ 提子（吃到对方即胜利）</SelectItem>
                      <SelectItem value="make_eyes">👁️ 做成两眼（做活即胜利）</SelectItem>
                      <SelectItem value="kill_opponent">⚔️ 杀死对方（杀棋即胜利）</SelectItem>
                      <SelectItem value="ai_battle">🤖 AI对弈模式（AI自动应对）</SelectItem>
                    </SelectContent>
                  </Select>
                  {winCondition === 'ai_battle' && (
                    <p className="text-xs text-blue-600 mt-2">
                      🤖 AI对弈模式：用户和AI按正解图/错误图交替落子。用户是先手方（{toPlay === 'black' ? '黑棋' : '白棋'}），AI自动按预设分支应对。
                    </p>
                  )}
                </div>
                {winCondition === 'capture' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">需要提掉的棋子数</label>
                    <Input
                      type="number"
                      value={captureMin}
                      onChange={(e) => setCaptureMin(parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-24"
                    />
                  </div>
                )}
                {winCondition === 'make_eyes' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">需要做成的眼数</label>
                    <Input
                      type="number"
                      value={eyeMin}
                      onChange={(e) => setEyeMin(parseInt(e.target.value) || 2)}
                      min={2}
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* AI对弈模式 - 正解与错误分支 */}
            {isAIBattleMode ? (
              <>
                {/* AI对弈正解设置 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    🤖 AI对弈 - 正解分支（用户{toPlay === 'black' ? '黑' : '白'} vs AI{toPlay === 'black' ? '白' : '黑'}）
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    在下方棋盘上交替录入走法：先点用户走法（{toPlay === 'black' ? '黑棋' : '白棋'}），再点AI应手（{toPlay === 'black' ? '白棋' : '黑棋'}），依此类推。支持多个正解分支。
                  </p>

                  {/* 正解分支选择 */}
                  <div className="mb-4 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium">正解分支：</span>
                    {aiBattleBranches.map((branch, index) => (
                      <div key={branch.id} className="flex items-center gap-1">
                        <Button
                          variant={currentAIBranchIndex === index ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentAIBranchIndex(index)}
                          className={currentAIBranchIndex === index ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          分支 {index + 1} ({branch.moves.filter(m => m.isUserMove).length}步)
                        </Button>
                        {aiBattleBranches.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAIBattleBranch(index)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 px-1"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addAIBattleBranch}>
                      + 添加分支
                    </Button>
                  </div>

                  {/* 当前正解分支序列 */}
                  {aiBattleBranches[currentAIBranchIndex]?.moves.length > 0 && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                        当前分支 {currentAIBranchIndex + 1} 序列（用户=🔵 AI=🤖）：
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {aiBattleBranches[currentAIBranchIndex].moves.map((move, idx) => (
                          <Badge key={idx} variant="outline"
                            className={move.isUserMove
                              ? "bg-blue-100 border-blue-300 text-blue-700 cursor-pointer hover:bg-red-100"
                              : "bg-gray-100 border-gray-300 text-gray-600 cursor-pointer hover:bg-red-100"}
                            onClick={() => removeAIBattleMove(currentAIBranchIndex, idx, false)}>
                            {move.isUserMove ? '🔵' : '🤖'} {idx + 1}. {String.fromCharCode(65 + (move.col >= 8 ? move.col + 1 : move.col))}{boardSize - move.row} ×
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        下一步请点：{isUserTurn(aiBattleBranches[currentAIBranchIndex].moves)
                          ? `🔵 用户走法（${toPlay === 'black' ? '黑棋' : '白棋'}）`
                          : `🤖 AI应手（${toPlay === 'black' ? '白棋' : '黑棋'}）`}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium mb-2">
                        {isUserTurn(aiBattleBranches[currentAIBranchIndex]?.moves || [])
                          ? `🔵 请点用户走法（${toPlay === 'black' ? '黑棋' : '白棋'}）`
                          : `🤖 请点AI应手（${toPlay === 'black' ? '白棋' : '黑棋'}）`}
                      </div>
                      <AIBattleBoardEditor
                        boardSize={boardSize}
                        initialBlack={blackStones}
                        initialWhite={whiteStones}
                        moves={aiBattleBranches[currentAIBranchIndex]?.moves || []}
                        onAddMove={(row, col) => {
                          if (isUserTurn(aiBattleBranches[currentAIBranchIndex]?.moves || [])) {
                            addSolutionAIBattleMove(row, col);
                          } else {
                            addAIResponseToSolution(row, col);
                          }
                        }}
                        toPlay={toPlay}
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          当前分支 {currentAIBranchIndex + 1} 的解说
                        </label>
                        <Textarea
                          value={aiBattleBranches[currentAIBranchIndex]?.explanation || ''}
                          onChange={(e) => updateAIBattleBranchExplanation(currentAIBranchIndex, e.target.value, false)}
                          placeholder="解释这道正解的走法..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI对弈错误分支 */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      🤖 AI对弈 - 错误分支（可选）
                    </h3>
                    <Button variant="outline" size="sm" onClick={addAIWrongBranch}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加错误分支
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    添加用户常见错误走法及AI的惩罚应手。如果用户走到这些分支，AI会按预设走法应对并判错。
                  </p>
                  {aiWrongBranches.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground">
                      <p className="mb-2">还没有添加错误分支</p>
                      <Button variant="outline" onClick={addAIWrongBranch}>
                        <Plus className="h-4 w-4 mr-1" />
                        添加第一个错误分支
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {aiWrongBranches.map((branch, branchIdx) => (
                        <AIBattleWrongBranchEditor
                          key={branch.id}
                          branch={branch}
                          branchIndex={branchIdx}
                          boardSize={boardSize}
                          initialBlack={blackStones}
                          initialWhite={whiteStones}
                          toPlay={toPlay}
                          onAddUserMove={(row, col) => addWrongAIBattleMove(branchIdx, row, col)}
                          onAddAIMove={(row, col) => addAIResponseToWrong(branchIdx, row, col)}
                          onRemoveMove={(moveIdx) => removeAIBattleMove(branchIdx, moveIdx, true)}
                          onExplanationChange={(exp) => updateAIBattleBranchExplanation(branchIdx, exp, true)}
                          onRemoveBranch={() => deleteAIWrongBranch(branchIdx)}
                        />
                      ))}
                      <Button variant="outline" onClick={addAIWrongBranch} className="w-full">
                        <Plus className="h-4 w-4 mr-1" />
                        添加更多错误分支
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* 传统模式 - 正解设置 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    设置正确答案（支持多步正解和多分支正解）
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    在下方主棋盘上点击空位添加正解落子。支持按顺序点击添加多步正解，以及添加多个分支。
                  </p>

                  {/* 分支选择 */}
                  <div className="mb-4 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium">正解分支：</span>
                    {solutionBranches.map((branch, index) => (
                      <div key={branch.id} className="flex items-center gap-1">
                        <Button
                          variant={currentBranchIndex === index ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentBranchIndex(index)}
                          className={currentBranchIndex === index ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          分支 {index + 1} ({branch.moves.length}步)
                        </Button>
                        {solutionBranches.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBranch(index)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 px-1"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addBranch}>
                      + 添加分支
                    </Button>
                    <label className="flex items-center gap-2 text-sm ml-4">
                      <input
                        type="checkbox"
                        checked={showSolutionPreview}
                        onChange={(e) => setShowSolutionPreview(e.target.checked)}
                        className="rounded"
                      />
                      显示正解预览
                    </label>
                  </div>

                  {/* 正解预览 */}
                  {currentBranch && currentBranch.moves.length > 0 && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                        当前分支 {currentBranchIndex + 1} 正解序列：
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {currentBranch.moves.map((move, idx) => (
                          <Badge key={idx} variant="outline" className="bg-green-100 border-green-300 text-green-700 cursor-pointer hover:bg-red-100"
                            onClick={() => removeSolutionMove(idx)}>
                            {idx + 1}. {String.fromCharCode(65 + (move.col >= 8 ? move.col + 1 : move.col))}{boardSize - move.row} ×
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        点击棋盘空位继续添加下一步，点击落子标签"×"删除该步
                      </div>
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* 主棋盘 - 正解编辑 */}
                    <div>
                      <div className="text-sm font-medium mb-2">
                        主棋盘 - 点击空位添加正解落子
                      </div>
                      <MiniBoardEditor
                        boardSize={boardSize}
                        blackStones={blackStones}
                        whiteStones={whiteStones}
                        onBlackChange={setBlackStones}
                        onWhiteChange={setWhiteStones}
                        currentColor={currentColor}
                        onColorChange={setCurrentColor}
                        highlightCell={currentBranch?.moves[currentBranch.moves.length - 1]}
                        onBoardClick={addSolutionMove}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        点击棋盘上的空位即可添加正解落子
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* 当前分支解说 */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          当前分支 {currentBranchIndex + 1} 的解说
                        </label>
                        <Textarea
                          value={currentBranch?.explanation || ''}
                          onChange={(e) => updateBranchExplanation(currentBranchIndex, e.target.value)}
                          placeholder="解释这道正解的走法..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 传统模式 - 错误解答 */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      错误解答（可选）
                    </h3>
                    <Button variant="outline" size="sm" onClick={addWrongAnswer}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加误答
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    添加常见的错误解答和错误原因，帮助学生理解为什么这些走法是错的。
                  </p>
                  {wrongAnswers.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground">
                      <p className="mb-2">还没有添加错误解答</p>
                      <Button variant="outline" onClick={addWrongAnswer}>
                        <Plus className="h-4 w-4 mr-1" />
                        添加第一个误答
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {wrongAnswers.map((wrongAnswer, index) => (
                        <WrongAnswerEditor
                          key={index}
                          wrongAnswer={wrongAnswer}
                          boardSize={boardSize}
                          onChange={(wa) => updateWrongAnswer(index, wa)}
                          onRemove={() => removeWrongAnswer(index)}
                          index={index}
                        />
                      ))}
                      <Button variant="outline" onClick={addWrongAnswer} className="w-full">
                        <Plus className="h-4 w-4 mr-1" />
                        添加更多误答
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 保存按钮 */}
            <div className="border-t pt-6 space-y-3">
              {/* 系统题目提示 */}
              {editProblem?.systemId && (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      系统题目 | 修改将保存为覆盖版本，不会改变原文件
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleRestore} className="text-amber-600 hover:text-amber-700 hover:bg-amber-100">
                    <Sparkles className="h-4 w-4 mr-1" />
                    恢复原题
                  </Button>
                </div>
              )}
              
              {/* 新建题目提示 */}
              {isNew && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700 dark:text-blue-400">
                    新题目将添加到「自定义题目」列表，不会影响系统题目
                  </span>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? '保存中...' : isNew ? '创建题目' : '保存修改'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/teacher/problems')}>
                  取消
                </Button>
              </div>
              
              {/* 发布按钮（仅编辑模式显示） */}
              {!isNew && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {published ? (
                      <>
                        <Globe className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">已发布</span>
                        <span className="text-xs text-muted-foreground">所有用户可见</span>
                      </>
                    ) : (
                      <>
                        <GlobeLock className="h-5 w-5 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">未发布</span>
                        <span className="text-xs text-muted-foreground">仅你可见</span>
                      </>
                    )}
                  </div>
                  <Button
                    variant={published ? 'destructive' : 'default'}
                    size="sm"
                    onClick={handleTogglePublish}
                    disabled={publishing}
                  >
                    {publishing ? '处理中...' : published ? '取消发布' : '立即发布'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

/** AI对弈棋盘编辑器 - 显示初始棋子+已录入序列 */
function AIBattleBoardEditor({
  boardSize,
  initialBlack,
  initialWhite,
  moves,
  onAddMove,
  toPlay,
}: {
  boardSize: number;
  initialBlack: EditableMove[];
  initialWhite: EditableMove[];
  moves: AIMoveStep[];
  onAddMove: (row: number, col: number) => void;
  toPlay: 'black' | 'white';
}) {
  const cellSize = boardSize <= 9 ? 28 : 20;
  const svgSize = cellSize * (boardSize - 1);
  const stoneR = cellSize * 0.38;

  // 合并初始棋子和序列中的棋子
  const allBlack = [
    ...initialBlack,
    ...moves.filter(m => m.color === 'black').map(m => ({ row: m.row, col: m.col, color: 'black' as const })),
  ];
  const allWhite = [
    ...initialWhite,
    ...moves.filter(m => m.color === 'white').map(m => ({ row: m.row, col: m.col, color: 'white' as const })),
  ];

  const getStoneAt = (row: number, col: number) => {
    if (allBlack.some(s => s.row === row && s.col === col)) return 'black';
    if (allWhite.some(s => s.row === row && s.col === col)) return 'white';
    return null;
  };

  const handleClick = (row: number, col: number) => {
    if (getStoneAt(row, col)) return;
    onAddMove(row, col);
  };

  // 判断当前该谁走
  const isUserTurn = moves.length === 0 || !moves[moves.length - 1].isUserMove;
  const currentColor = isUserTurn ? toPlay : (toPlay === 'black' ? 'white' : 'black');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">当前落子：</span>
        <Badge className={currentColor === 'black' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 border'}>
          {currentColor === 'black' ? '⚫ 黑棋' : '⚪ 白棋'}
        </Badge>
        <Badge variant="outline" className={isUserTurn ? 'border-blue-300 text-blue-600' : 'border-gray-300 text-gray-500'}>
          {isUserTurn ? '🔵 用户走法' : '🤖 AI应手'}
        </Badge>
      </div>
      <div className="inline-block">
        <div
          className="relative border-2 border-amber-700 rounded p-2"
          style={{ background: 'linear-gradient(135deg, #deb887, #d2a86e)' }}
        >
          <svg width={svgSize + 16} height={svgSize + 16} className="select-none">
            {/* 棋盘网格 */}
            {Array.from({ length: boardSize }).map((_, i) => (
              <g key={`l-${i}`}>
                <line x1={8} y1={8 + i * cellSize} x2={8 + (boardSize - 1) * cellSize} y2={8 + i * cellSize}
                  stroke="#8B6914" strokeWidth="0.8" />
                <line x1={8 + i * cellSize} y1={8} x2={8 + i * cellSize} y2={8 + (boardSize - 1) * cellSize}
                  stroke="#8B6914" strokeWidth="0.8" />
              </g>
            ))}
            {/* 星位点 */}
            {boardSize === 9 && [2, 4, 6].map(r =>
              [2, 4, 6].map(c => (
                <circle key={`s-${r}-${c}`} cx={8 + c * cellSize} cy={8 + r * cellSize}
                  r={2} fill="#8B6914" />
              ))
            )}
            {boardSize === 19 && [3, 9, 15].map(r =>
              [3, 9, 15].map(c => (
                <circle key={`s-${r}-${c}`} cx={8 + c * cellSize} cy={8 + r * cellSize}
                  r={2.5} fill="#8B6914" />
              ))
            )}

            {/* 棋子 */}
            {[...allBlack, ...allWhite].map((stone, idx) => {
              const isInitial = idx < initialBlack.length + initialWhite.length;
              const moveIdx = !isInitial
                ? moves.findIndex(m => m.row === stone.row && m.col === stone.col)
                : -1;
              const isUserMove = moveIdx >= 0 ? moves[moveIdx].isUserMove : false;
              return (
                <g key={`stone-${idx}`}>
                  <circle
                    cx={8 + stone.col * cellSize}
                    cy={8 + stone.row * cellSize}
                    r={stoneR}
                    fill={stone.color === 'black' ? '#1a1a1a' : '#f5f5f0'}
                    stroke={stone.color === 'white' ? '#ccc' : 'none'}
                    strokeWidth="1"
                    opacity={isInitial ? 1 : 1}
                  />
                  {/* 序列中的棋子显示步数 */}
                  {!isInitial && moveIdx >= 0 && (
                    <text
                      x={8 + stone.col * cellSize}
                      y={8 + stone.row * cellSize}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="8"
                      fill={stone.color === 'black' ? '#fff' : '#333'}
                      fontWeight="bold"
                    >
                      {moves[moveIdx].stepNumber}
                    </text>
                  )}
                  {/* 初始棋子显示坐标 */}
                  {isInitial && idx < 1 && (
                    <text
                      x={8 + stone.col * cellSize}
                      y={8 + stone.row * cellSize}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="8"
                      fill={stone.color === 'black' ? '#fff' : '#333'}
                      fontWeight="bold"
                    >
                      {String.fromCharCode(65 + (stone.col >= 8 ? stone.col + 1 : stone.col))}{boardSize - stone.row}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 交互层 */}
            {Array.from({ length: boardSize }).map((_, r) =>
              Array.from({ length: boardSize }).map((_, c) => (
                <rect
                  key={`click-${r}-${c}`}
                  x={8 + c * cellSize - cellSize / 2}
                  y={8 + r * cellSize - cellSize / 2}
                  width={cellSize}
                  height={cellSize}
                  fill="transparent"
                  className="cursor-pointer hover:fill-primary/10"
                  onClick={() => handleClick(r, c)}
                />
              ))
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

/** AI对弈错误分支编辑器 */
function AIBattleWrongBranchEditor({
  branch,
  branchIndex,
  boardSize,
  initialBlack,
  initialWhite,
  toPlay,
  onAddUserMove,
  onAddAIMove,
  onRemoveMove,
  onExplanationChange,
  onRemoveBranch,
}: {
  branch: AIBattleBranch;
  branchIndex: number;
  boardSize: number;
  initialBlack: EditableMove[];
  initialWhite: EditableMove[];
  toPlay: 'black' | 'white';
  onAddUserMove: (row: number, col: number) => void;
  onAddAIMove: (row: number, col: number) => void;
  onRemoveMove: (moveIdx: number) => void;
  onExplanationChange: (exp: string) => void;
  onRemoveBranch: () => void;
}) {
  const isUserTurn = branch.moves.length === 0 || !branch.moves[branch.moves.length - 1].isUserMove;

  const handleBoardClick = (row: number, col: number) => {
    if (isUserTurn) {
      onAddUserMove(row, col);
    } else {
      onAddAIMove(row, col);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            错误分支 {branchIndex + 1}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onRemoveBranch}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 序列显示 */}
        {branch.moves.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {branch.moves.map((move, idx) => (
              <Badge key={idx} variant="outline"
                className={move.isUserMove
                  ? "bg-blue-100 border-blue-300 text-blue-700 cursor-pointer hover:bg-red-100"
                  : "bg-gray-100 border-gray-300 text-gray-600 cursor-pointer hover:bg-red-100"}
                onClick={() => onRemoveMove(idx)}>
                {move.isUserMove ? '🔵' : '🤖'} {idx + 1}. {String.fromCharCode(65 + (move.col >= 8 ? move.col + 1 : move.col))}{boardSize - move.row} ×
              </Badge>
            ))}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium mb-2">
              {isUserTurn
                ? `🔵 请点用户错误走法（${toPlay === 'black' ? '黑棋' : '白棋'}）`
                : `🤖 请点AI惩罚应手（${toPlay === 'black' ? '白棋' : '黑棋'}）`}
            </div>
            <AIBattleBoardEditor
              boardSize={boardSize}
              initialBlack={initialBlack}
              initialWhite={initialWhite}
              moves={branch.moves}
              onAddMove={handleBoardClick}
              toPlay={toPlay}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">错误原因</label>
            <Textarea
              value={branch.explanation}
              onChange={(e) => onExplanationChange(e.target.value)}
              placeholder="解释为什么这个走法是错误的..."
              rows={3}
              className="text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
