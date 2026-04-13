import { supabase } from './supabase';
import type {
  Profile,
  Course,
  Problem,
  Game,
  Friendship,
  Achievement,
  LearningProgress,
  UserRole,
  GameResult
} from '@/types/types';

// ========== Profiles ==========
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function searchUsers(query: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,nickname.ilike.%${query}%`)
    .limit(20);

  if (error) {
    console.error('搜索用户失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function getLeaderboard(limit = 50): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'child')
    .order('rating', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取排行榜失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// ========== Courses ==========
export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取课程列表失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function getCourse(id: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('获取课程详情失败:', error);
    return null;
  }
  return data;
}

export async function createCourse(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('courses')
    .insert(course)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateCourse(id: string, updates: Partial<Course>) {
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ========== Problems ==========
export async function getCheckpointProblems(level: number): Promise<Problem[]> {
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .eq('type', 'checkpoint')
    .eq('checkpoint_level', level)
    .order('created_at');

  if (error) {
    console.error('获取闯关题目失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function getPracticeProblems(limit = 20): Promise<Problem[]> {
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .eq('type', 'practice')
    .order('difficulty')
    .limit(limit);

  if (error) {
    console.error('获取练习题目失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function getProblem(id: string): Promise<Problem | null> {
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('获取题目详情失败:', error);
    return null;
  }
  return data;
}

// ========== Games ==========
export async function createGame(game: Omit<Game, 'id' | 'started_at' | 'finished_at'>) {
  const { data, error } = await supabase
    .from('games')
    .insert(game)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateGame(id: string, updates: Partial<Game>) {
  const { data, error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getGame(id: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('获取对弈详情失败:', error);
    return null;
  }
  return data;
}

export async function getUserGames(userId: string, limit = 20): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .or(`black_player_id.eq.${userId},white_player_id.eq.${userId}`)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取用户对弈记录失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// ========== Friendships ==========
export async function getFriends(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (error) {
    console.error('获取好友列表失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  const friendIds = data.map(f => f.friend_id);
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', friendIds);

  if (profileError) {
    console.error('获取好友信息失败:', profileError);
    return [];
  }

  return Array.isArray(profiles) ? profiles : [];
}

export async function addFriend(userId: string, friendId: string) {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: friendId, status: 'pending' })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function removeFriend(userId: string, friendId: string) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId);

  if (error) throw error;
}

// ========== Achievements ==========
export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('获取成就列表失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function createAchievement(achievement: Omit<Achievement, 'id' | 'earned_at'>) {
  const { data, error } = await supabase
    .from('achievements')
    .insert(achievement)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ========== Learning Progress ==========
export async function getUserProgress(userId: string): Promise<LearningProgress[]> {
  const { data, error } = await supabase
    .from('learning_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_accessed_at', { ascending: false });

  if (error) {
    console.error('获取学习进度失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function updateProgress(
  userId: string,
  courseId: string | null,
  problemId: string | null,
  progress: number,
  completed: boolean
) {
  const { data, error } = await supabase
    .from('learning_progress')
    .upsert({
      user_id: userId,
      course_id: courseId,
      problem_id: problemId,
      progress,
      completed,
      last_accessed_at: new Date().toISOString()
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}
