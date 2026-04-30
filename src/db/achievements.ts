import { supabase } from './supabase';
import type { Achievement, AchievementType } from '@/types/types';

/**
 * 成就定义规则
 * 定义了所有可获得的成就及其解锁条件
 */
export interface AchievementDefinition {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  check: (stats: UserStats) => boolean;
}

export interface UserStats {
  // 对弈统计
  totalGames: number;
  totalWins: number;
  consecutiveWins: number; // 当前连胜
  maxConsecutiveWins: number; // 历史最高连胜
  totalLosses: number;
  
  // 闯关统计
  checkpointLevel: number; // 最高通过关卡
  
  // 练习统计
  problemsSolved: number;
  totalProblemsSolved: number; // 累计解题数
  
  // 课程统计
  coursesCompleted: number;
  
  // 社交统计
  friendsCount: number;
  uniqueOpponents: string[]; // 击败过的不同对手ID
  
  // 其他
  onlineDays: number; // 在线天数
  totalOnlineMinutes: number; // 累计在线分钟数
}

// 成就定义列表
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ========== 对弈成就 ==========
  {
    id: 'first_win',
    type: 'game',
    title: '首战告捷',
    description: '赢得第一场对弈',
    icon: '🎯',
    check: (stats) => stats.totalWins >= 1,
  },
  {
    id: 'win_streak_3',
    type: 'game',
    title: '三连胜',
    description: '连续赢得3场对弈',
    icon: '🔥',
    check: (stats) => stats.consecutiveWins >= 3,
  },
  {
    id: 'win_streak_5',
    type: 'game',
    title: '五连胜',
    description: '连续赢得5场对弈',
    icon: '⚡',
    check: (stats) => stats.consecutiveWins >= 5,
  },
  {
    id: 'win_streak_10',
    type: 'game',
    title: '十连胜',
    description: '连续赢得10场对弈',
    icon: '💥',
    check: (stats) => stats.consecutiveWins >= 10,
  },
  {
    id: 'win_streak_20',
    type: 'game',
    title: '二十连胜',
    description: '连续赢得20场对弈',
    icon: '🚀',
    check: (stats) => stats.consecutiveWins >= 20,
  },
  {
    id: 'win_10_opponents',
    type: 'game',
    title: '击败10人',
    description: '累计击败10个不同的对手',
    icon: '🏅',
    check: (stats) => stats.uniqueOpponents.length >= 10,
  },
  {
    id: 'win_50_opponents',
    type: 'game',
    title: '击败50人',
    description: '累计击败50个不同的对手',
    icon: '🎖️',
    check: (stats) => stats.uniqueOpponents.length >= 50,
  },
  {
    id: 'win_100_opponents',
    type: 'game',
    title: '击败100人',
    description: '累计击败100个不同的对手',
    icon: '🏆',
    check: (stats) => stats.uniqueOpponents.length >= 100,
  },
  {
    id: 'total_games_10',
    type: 'game',
    title: '初出茅庐',
    description: '完成10场对弈',
    icon: '📅',
    check: (stats) => stats.totalGames >= 10,
  },
  {
    id: 'total_games_50',
    type: 'game',
    title: '对弈新秀',
    description: '完成50场对弈',
    icon: '⚔️',
    check: (stats) => stats.totalGames >= 50,
  },
  {
    id: 'total_games_100',
    type: 'game',
    title: '对弈高手',
    description: '完成100场对弈',
    icon: '🗡️',
    check: (stats) => stats.totalGames >= 100,
  },
  {
    id: 'total_games_500',
    type: 'game',
    title: '对弈大师',
    description: '完成500场对弈',
    icon: '👑',
    check: (stats) => stats.totalGames >= 500,
  },
  {
    id: 'win_rate_50',
    type: 'game',
    title: '五五开',
    description: '胜率达到50%',
    icon: '⚖️',
    check: (stats) => stats.totalGames >= 10 && (stats.totalWins / stats.totalGames) >= 0.5,
  },
  {
    id: 'win_rate_70',
    type: 'game',
    title: '常胜将军',
    description: '胜率达到70%',
    icon: '🎌',
    check: (stats) => stats.totalGames >= 20 && (stats.totalWins / stats.totalGames) >= 0.7,
  },

  // ========== 闯关成就 ==========
  {
    id: 'checkpoint_1',
    type: 'checkpoint',
    title: '第一关通过',
    description: '通过围棋入门第一关',
    icon: '🌱',
    check: (stats) => stats.checkpointLevel >= 1,
  },
  {
    id: 'checkpoint_2',
    type: 'checkpoint',
    title: '第二关通过',
    description: '通过围棋入门第二关',
    icon: '🌿',
    check: (stats) => stats.checkpointLevel >= 2,
  },
  {
    id: 'checkpoint_3',
    type: 'checkpoint',
    title: '三关全通',
    description: '通过全部三关，围棋入门毕业！',
    icon: '🌳',
    check: (stats) => stats.checkpointLevel >= 3,
  },

  // ========== 练习成就 ==========
  {
    id: 'problems_first',
    type: 'practice',
    title: '初试身手',
    description: '完成第一道练习题',
    icon: '📝',
    check: (stats) => stats.totalProblemsSolved >= 1,
  },
  {
    id: 'problems_10',
    type: 'practice',
    title: '小试牛刀',
    description: '累计完成10道练习题',
    icon: '📚',
    check: (stats) => stats.totalProblemsSolved >= 10,
  },
  {
    id: 'problems_50',
    type: 'practice',
    title: '练习达人',
    description: '累计完成50道练习题',
    icon: '📖',
    check: (stats) => stats.totalProblemsSolved >= 50,
  },
  {
    id: 'problems_100',
    type: 'practice',
    title: '题海无涯',
    description: '累计完成100道练习题',
    icon: '🏆',
    check: (stats) => stats.totalProblemsSolved >= 100,
  },
  {
    id: 'problems_500',
    type: 'practice',
    title: '做题狂人',
    description: '累计完成500道练习题',
    icon: '💯',
    check: (stats) => stats.totalProblemsSolved >= 500,
  },

  // ========== 课程成就 ==========
  {
    id: 'course_first',
    type: 'course',
    title: '第一课',
    description: '完成第一堂课程学习',
    icon: '🎬',
    check: (stats) => stats.coursesCompleted >= 1,
  },
  {
    id: 'courses_5',
    type: 'course',
    title: '好学不倦',
    description: '完成5堂课程学习',
    icon: '📺',
    check: (stats) => stats.coursesCompleted >= 5,
  },
  {
    id: 'courses_10',
    type: 'course',
    title: '学富五车',
    description: '完成10堂课程学习',
    icon: '🎓',
    check: (stats) => stats.coursesCompleted >= 10,
  },

  // ========== 社交成就 ==========
  {
    id: 'friend_first',
    type: 'game',
    title: '志同道合',
    description: '添加第一位好友',
    icon: '🤝',
    check: (stats) => stats.friendsCount >= 1,
  },
  {
    id: 'friends_10',
    type: 'game',
    title: '交友广泛',
    description: '拥有10位好友',
    icon: '👥',
    check: (stats) => stats.friendsCount >= 10,
  },

  // ========== 累计在线成就 ==========
  {
    id: 'online_1hour',
    type: 'game',
    title: '初次登录',
    description: '累计在线超过1小时',
    icon: '⏰',
    check: (stats) => stats.totalOnlineMinutes >= 60,
  },
  {
    id: 'online_10hours',
    type: 'game',
    title: '常驻玩家',
    description: '累计在线超过10小时',
    icon: '⏱️',
    check: (stats) => stats.totalOnlineMinutes >= 600,
  },
  {
    id: 'online_100hours',
    type: 'game',
    title: '铁杆粉丝',
    description: '累计在线超过100小时',
    icon: '💎',
    check: (stats) => stats.totalOnlineMinutes >= 6000,
  },
];

/**
 * 获取用户已获得的成就ID列表
 */
export async function getEarnedAchievementIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('id')
    .eq('user_id', userId);

  if (error) {
    console.error('获取已获得成就失败:', error);
    return [];
  }

  return (data || []).map(a => a.id);
}

/**
 * 获取用户统计信息
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  // 并行查询所有需要的统计数据
  const [
    gamesResult,
    checkpointResult,
    problemsResult,
    coursesResult,
    friendsResult,
    dailyStatsResult,
  ] = await Promise.all([
    // 对弈统计
    supabase
      .from('games')
      .select('result, black_player_id, white_player_id')
      .eq('status', 'finished')
      .or(`black_player_id.eq.${userId},white_player_id.eq.${userId}`),
    
    // 闯关进度
    supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .not('checkpoint_level', 'is', null),
    
    // 练习统计（从 daily_stats 累计）
    supabase
      .from('daily_stats')
      .select('problems_solved')
      .eq('user_id', userId),
    
    // 课程完成数
    supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', true)
      .not('course_id', 'is', null),
    
    // 好友数量
    supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'accepted'),
    
    // 在线时长
    supabase
      .from('daily_stats')
      .select('online_minutes')
      .eq('user_id', userId),
  ]);

  // 处理对弈统计
  const games = gamesResult.data || [];
  const totalGames = games.length;
  const totalWins = games.filter(g => {
    if (g.result === 'black_win') return g.black_player_id === userId;
    if (g.result === 'white_win') return g.white_player_id === userId;
    return false;
  }).length;
  
  // 统计击败过的不同对手
  const uniqueOpponents = new Set<string>();
  games.forEach(g => {
    if (g.result === 'black_win' && g.black_player_id === userId) {
      uniqueOpponents.add(g.white_player_id);
    } else if (g.result === 'white_win' && g.white_player_id === userId) {
      uniqueOpponents.add(g.black_player_id);
    }
  });

  // 简化处理：连胜和最高连胜需要前端额外计算，这里返回当前连胜（取最近N场的连续胜利）
  const recentGames = games.slice(0, 20); // 只看最近20场
  let consecutiveWins = 0;
  for (const g of recentGames) {
    const isWin = (g.result === 'black_win' && g.black_player_id === userId) ||
                  (g.result === 'white_win' && g.white_player_id === userId);
    if (isWin) consecutiveWins++;
    else break;
  }

  // 从 daily_stats 获取历史最高连胜（如果有记录的话）
  const maxConsecutiveWins = consecutiveWins; // 简化处理

  // 处理闯关进度
  const checkpointProgress = checkpointResult.data || [];
  const checkpointLevel = Math.max(0, ...checkpointProgress.map(p => (p as any).checkpoint_level || 0));

  // 处理练习统计
  const problemsStats = problemsResult.data || [];
  const totalProblemsSolved = problemsStats.reduce((sum, d) => sum + (d.problems_solved || 0), 0);

  // 处理课程完成数
  const courseProgress = coursesResult.data || [];
  const coursesCompleted = courseProgress.length;

  // 处理好友数量
  const friends = friendsResult.data || [];
  const friendsCount = friends.length;

  // 处理在线时长
  const onlineStats = dailyStatsResult.data || [];
  const totalOnlineMinutes = onlineStats.reduce((sum, d) => sum + (d.online_minutes || 0), 0);
  const onlineDays = onlineStats.filter(d => (d.online_minutes || 0) > 0).length;

  return {
    totalGames,
    totalWins,
    consecutiveWins,
    maxConsecutiveWins,
    totalLosses: totalGames - totalWins,
    checkpointLevel,
    problemsSolved: totalProblemsSolved, // 当天解题数
    totalProblemsSolved,
    coursesCompleted,
    friendsCount,
    uniqueOpponents: Array.from(uniqueOpponents),
    onlineDays,
    totalOnlineMinutes,
  };
}

/**
 * 检查并授予新成就
 * 返回新获得的成就列表
 */
export async function checkAndAwardAchievements(userId: string): Promise<Achievement[]> {
  // 获取用户统计和已获得的成就
  const [stats, earnedIds] = await Promise.all([
    getUserStats(userId),
    getEarnedAchievementIds(userId),
  ]);

  const newAchievements: Achievement[] = [];

  // 检查每个未获得的成就
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (earnedIds.includes(def.id)) continue; // 已获得，跳过

    if (def.check(stats)) {
      // 满足条件，授予成就
      const { data, error } = await supabase
        .from('achievements')
        .insert({
          user_id: userId,
          type: def.type,
          title: def.title,
          description: def.description,
          icon: def.icon,
          earned_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        newAchievements.push(data);
      }
    }
  }

  return newAchievements;
}

/**
 * 便捷函数：在对弈结束后调用
 */
export async function awardGameAchievements(
  userId: string,
  won: boolean,
  opponentId: string | null
): Promise<Achievement[]> {
  // 这里可以添加针对对局的特殊逻辑
  // 比如记录对手ID用于统计击败人数
  return checkAndAwardAchievements(userId);
}

/**
 * 便捷函数：在闯关通过后调用
 */
export async function awardCheckpointAchievements(userId: string, level: number): Promise<Achievement[]> {
  // 可以先更新闯关进度
  await supabase
    .from('learning_progress')
    .upsert({
      user_id: userId,
      checkpoint_level: level,
      completed: true,
      last_accessed_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,problem_id', // 简化，实际可能需要不同逻辑
    });
  
  return checkAndAwardAchievements(userId);
}

/**
 * 便捷函数：在完成练习后调用
 */
export async function awardPracticeAchievements(userId: string): Promise<Achievement[]> {
  return checkAndAwardAchievements(userId);
}

/**
 * 便捷函数：在完成课程后调用
 */
export async function awardCourseAchievements(userId: string): Promise<Achievement[]> {
  return checkAndAwardAchievements(userId);
}
