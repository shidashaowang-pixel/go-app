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

export type CourseType = 'video' | 'article';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  type: CourseType;
  content_url: string | null;
  cover_image_url: string | null;
  teacher_id: string;
  duration: number | null;
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
  difficulty: number;
  created_at: string;
}

export interface BoardPosition {
  black: number[][];
  white: number[][];
}

export interface Solution {
  moves: number[][];
  explanation: string;
}

export type GameType = 'ai' | 'human';
export type GameStatus = 'ongoing' | 'finished' | 'abandoned';
export type GameResult = 'black_win' | 'white_win' | 'draw';

export interface Game {
  id: string;
  type: GameType;
  status: GameStatus;
  result: GameResult | null;
  black_player_id: string | null;
  white_player_id: string | null;
  ai_difficulty: string | null;
  board_size: number;
  moves: number[][];
  started_at: string;
  finished_at: string | null;
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
