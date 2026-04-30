/**
 * 围棋文化动画故事数据结构
 * 
 * 每个故事由多个"场景"组成，每个场景可以包含：
 * - 旁白文字
 * - 棋盘动画（落子、标注等）
 * - 场景配图（CSS渐变/emoji装饰，无需真实图片）
 * - 角色对话
 */

/** 场景中的棋盘动画 */
export interface StoryBoardMove {
  x: number;
  y: number;
  color: 'black' | 'white';
  /** 是否为"虚影"，仅提示不实际落子 */
  ghost?: boolean;
}

/** 角色对话 */
export interface StoryDialogue {
  /** 角色名 */
  speaker: string;
  /** 角色emoji头像 */
  avatar: string;
  /** 对话内容 */
  text: string;
  /** 对话气泡位置 */
  align?: 'left' | 'right';
}

/** 单个场景 */
export interface StoryScene {
  /** 场景旁白（叙述者语气） */
  narration: string;
  /** 场景标题（可选，显示在场景顶部） */
  title?: string;
  /** 角色对话列表 */
  dialogues?: StoryDialogue[];
  /** 棋盘落子动画 */
  boardMoves?: StoryBoardMove[];
  /** 棋盘标注高亮 */
  highlights?: { x: number; y: number; type: 'circle' | 'square' | 'cross'; color?: string }[];
  /** 场景背景色主题 */
  bgTheme?: 'forest' | 'mountain' | 'palace' | 'cave' | 'night' | 'dawn' | 'default';
  /** 场景装饰 emoji */
  emoji?: string;
  /** 停留时间(秒)，0=手动翻页 */
  duration: number;
}

/** 完整故事 */
export interface CultureStory {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  /** 故事标签 */
  tags: string[];
  /** 棋盘大小（如无棋盘动画则忽略） */
  boardSize?: number;
  /** 故事场景列表 */
  scenes: StoryScene[];
  /** 学习要点总结 */
  takeaway?: string;
}
