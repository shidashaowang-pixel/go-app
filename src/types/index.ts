export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export type UserRole = 'child' | 'parent' | 'teacher';

export interface Profile {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  role: UserRole;
  parent_id: string | null;
  rating: number;
  created_at: string;
  updated_at: string;
}

export type CourseType = 'video' | 'article' | 'animation';

/** 动画微课中单步动画数据 */
export interface AnimationStep {
  /** 棋盘上的落子列表 [{x, y, color}] */
  moves: { x: number; y: number; color: 'black' | 'white' }[];
  /** 本步旁白/解说文字 */
  narration: string;
  /** 本步持续时间(秒)，0=手动翻页 */
  duration: number;
  /** 标注区域(可选)，高亮某些位置 */
  highlights?: { x: number; y: number; type: 'circle' | 'square' | 'cross' }[];
  /** 场景动画(可选)：角色、场景背景、特效 */
  scene?: SceneAnimation;
}

/** 场景动画数据 */
export interface SceneAnimation {
  /** 场景背景 */
  background?: 'mountain' | 'cave' | 'palace' | 'village' | 'forest' | 'night';
  /** 出场角色列表 */
  characters?: SceneCharacter[];
  /** 场景特效 */
  effects?: ('leaves' | 'sparkles' | 'decay' | 'time-lapse' | 'wind')[];
}

/** 场景角色 */
export interface SceneCharacter {
  /** 角色类型 */
  type: 'emperor-yao' | 'dan-zhu' | 'woodcutter' | 'immortal-boy' | 'scholar' 
      | 'xie-an' | 'xiexuan' | 'wangjixin' | 'elderly-woman' | 'young-woman'
      | 'huanglongshi' | 'xuxingyou';
  /** 位置：left/center/right */
  position: 'left' | 'center' | 'right';
  /** 动作 */
  action?: 'standing' | 'teaching' | 'thinking' | 'watching' | 'chopping' | 'surprised' | 'happy' | 'calm' | 'playing' | 'worried' | 'celebrating';
  /** 对话气泡内容 */
  dialog?: string;
  /** 角色名字（可选，不传则使用默认名字） */
  name?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  type: CourseType;
  content_url: string | null;
  cover_image_url: string | null;
  teacher_id: string;
  duration: number | null;
  /** 动画微课步骤数据（仅 type='animation' 时使用） */
  animation_steps: AnimationStep[] | null;
  /** 是否已发布（发布后所有用户可见） */
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type ProblemType = 'checkpoint' | 'practice';

export interface Problem {
  id: string;
  title: string;
  description: string | null;
  type: ProblemType;
  checkpoint_level: number | null;
  board_size: number;
  initial_position: BoardPosition;
  solution: Solution;
  /** 错误解答列表（误答） */
  wrong_answers?: WrongAnswer[];
  difficulty: number;
  teacher_id?: string;
  /** 是否已发布（发布后所有用户可见） */
  published?: boolean;
  created_at: string;
  /** 本地系统题目的标准ID，用于云端同步覆盖 */
  systemId?: string;
}

export interface BoardPosition {
  black: number[][];
  white: number[][];
}

/** 判定方式：精确匹配坐标 vs 提子判定 vs 做活判定 vs AI对弈模式 */
export type WinCondition = 'exact_move' | 'capture' | 'make_eyes' | 'kill_opponent' | 'ai_battle';

/** 单步落子记录（包含颜色信息，用于AI对弈模式） */
export interface SolutionMove {
  row: number;
  col: number;
  /** 落子方：'black' | 'white'。如果不传，则按先手方交替推导 */
  color?: 'black' | 'white';
}

export interface Solution {
  moves: number[][];
  /** 替代正确答案：与 moves 一样正确但不同的下法 */
  alternative_moves?: number[][][];
  explanation: string;
  /**
   * 胜利判定方式：
   * - 'exact_move'（默认）：必须下在指定坐标才算对
   * - 'capture'：只要吃到对方棋子就算赢（像101围棋那样）
   * - 'make_eyes'：需要做出眼位活棋
   * - 'kill_opponent'：需要杀死对方的棋
   * - 'ai_battle'：AI自动应对模式，用户和AI按正解图/错误图交替落子
   */
  win_condition?: WinCondition;
  /** capture 模式下，需要提掉的白子最少数量（默认1） */
  capture_min?: number;
  /** make_eyes 模式下，需要做成的最少眼数（默认2） */
  eye_min?: number;
  /** 先手方：'black' | 'white'，用于AI对弈模式判断谁先走 */
  to_play?: 'black' | 'white';
  /** AI对弈模式：完整的交替落子序列（包含用户和AI的走法），用于多步正解 */
  ai_moves?: SolutionMove[];
  /** AI对弈模式：替代正解分支的完整交替落子序列 */
  alternative_ai_moves?: SolutionMove[][];
}

/** 错误解/误答：常见但错误的落子 */
export interface WrongAnswer {
  moves: number[][];
  explanation: string;
  /** AI对弈模式：错误分支的完整交替落子序列 */
  ai_moves?: SolutionMove[];
}

export type GameType = 'ai' | 'human';
export type GameStatus = 'ongoing' | 'finished' | 'abandoned';
export type GameResult = 'black_win' | 'white_win' | 'draw';
export type GameEndType = 'score' | 'resign' | 'timeout' | 'abandon';

/** 棋谱中的单步记录（替代原来的 number[][]） */
export interface GameMove {
  row: number;
  col: number;
  color: 'black' | 'white';
  /** 是否为虚手(pass) */
  isPass?: boolean;
}

/** 终局数子得分详情 */
export interface ScoreDetail {
  winner: 'black' | 'white';
  blackScore: number;
  whiteScore: number;
  komi: number;
  details: {
    blackStones: number;
    blackTerritory: number;
    whiteStones: number;
    whiteTerritory: number;
    whiteKomi: number;
  };
}

export interface Game {
  id: string;
  type: GameType;
  status: GameStatus;
  result: GameResult | null;
  black_player_id: string | null;
  white_player_id: string | null;
  ai_difficulty: string | null;
  board_size: number;
  /** 棋谱：每步落子记录（新格式 GameMove[]，兼容旧格式 number[][]） */
  moves: GameMove[] | number[][];
  /** 结束方式 */
  end_type: GameEndType | null;
  /** 终局数子得分详情 */
  score_detail: ScoreDetail | null;
  /** 黑方提子数 */
  black_captures: number;
  /** 白方提子数 */
  white_captures: number;
  /** 总手数 */
  move_count: number;
  /** 对弈时长(秒) */
  duration_seconds: number | null;
  started_at: string;
  finished_at: string | null;
}

/** 每日活跃统计 */
export interface DailyStat {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  games_played: number;
  games_won: number;
  problems_solved: number;
  courses_studied: number;
  online_minutes: number;
  created_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
}

export type AchievementType = 'checkpoint' | 'practice' | 'game' | 'course';

export interface Achievement {
  id: string;
  user_id: string;
  type: AchievementType;
  title: string;
  description: string | null;
  icon: string | null;
  earned_at: string;
}

export interface LearningProgress {
  id: string;
  user_id: string;
  course_id: string | null;
  problem_id: string | null;
  completed: boolean;
  progress: number;
  last_accessed_at: string;
}

// ========== 私信系统 ==========
export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
  // 前端需要的附加信息
  other_user?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  // 前端需要的附加信息
  sender?: Profile;
}

// ========== 社区系统 ==========
export type PostCategory = 'general' | 'strategy' | 'share' | 'question' | 'announcement';

export interface Post {
  id: string;
  author_id: string;
  title: string;
  content: string;
  category: PostCategory;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  // 前端需要的附加信息
  author?: Profile;
  is_liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  // 前端需要的附加信息
  author?: Profile;
  is_liked?: boolean;
  replies?: Comment[];
}
