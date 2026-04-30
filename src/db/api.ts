import { supabase, isSupabaseConfigured } from './supabase';
import {
  saveProblemToIndexedDB,
  getProblemFromIndexedDB,
  getAllProblemsFromIndexedDB,
  deleteProblemFromIndexedDB,
  saveProgressToIndexedDB,
  getAllProgressFromIndexedDB,
  saveCourseToIndexedDB,
  getCourseFromIndexedDB,
  getAllCoursesFromIndexedDB,
  deleteCourseFromIndexedDB,
  type LocalCourse,
} from './indexeddb';
import type {
  Profile,
  Course,
  Problem,
  Game,
  Friendship,
  Achievement,
  LearningProgress,
  UserRole,
  GameResult,
  DailyStat,
} from '@/types/types';

// ========== 网络状态和同步管理 ==========

/** 检测网络是否可用 */
export async function checkNetworkStatus(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    // 尝试 ping Supabase
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** 带重试的 Supabase 操作 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // 检查是否是网络错误
      const isNetworkError = 
        !error ||
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Failed to fetch') ||
        error.code === 'NETWORK_ERROR' ||
        error.status === 0;
      
      if (isNetworkError && attempt < maxRetries) {
        onRetry?.(attempt, lastError);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError!;
}

/** 同步队列状态 */
interface SyncQueueItem {
  id: string;
  type: 'course' | 'problem';
  action: 'create' | 'update' | 'delete';
  data: any;
  createdAt: number;
  retries: number;
}

let syncQueue: SyncQueueItem[] = [];
let isSyncing = false;
let networkListeners: Array<(online: boolean) => void> = [];

/** 监听网络状态变化 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[同步] 网络已恢复，尝试同步...');
    networkListeners.forEach(fn => fn(true));
    processSyncQueue();
  });
  
  window.addEventListener('offline', () => {
    console.log('[同步] 网络已断开');
    networkListeners.forEach(fn => fn(false));
  });
}

/** 添加网络状态监听器 */
export function addNetworkListener(callback: (online: boolean) => void) {
  networkListeners.push(callback);
  return () => {
    networkListeners = networkListeners.filter(fn => fn !== callback);
  };
}

/** 获取待同步队列 */
export function getSyncQueue(): SyncQueueItem[] {
  return [...syncQueue];
}

/** 添加到同步队列 */
export function addToSyncQueue(item: Omit<SyncQueueItem, 'createdAt' | 'retries'>) {
  // 检查是否已存在
  const existing = syncQueue.find(q => q.id === item.id && q.type === item.type);
  if (existing) {
    // 更新现有项
    Object.assign(existing, item, { createdAt: Date.now(), retries: 0 });
  } else {
    syncQueue.push({ ...item, createdAt: Date.now(), retries: 0 });
  }
  saveSyncQueueToStorage();
}

/** 从同步队列移除 */
export function removeFromSyncQueue(id: string, type: string) {
  syncQueue = syncQueue.filter(q => !(q.id === id && q.type === type));
  saveSyncQueueToStorage();
}

/** 保存同步队列到 localStorage */
function saveSyncQueueToStorage() {
  try {
    localStorage.setItem('goapp_sync_queue', JSON.stringify(syncQueue));
  } catch (e) {
    console.error('[同步] 保存队列失败:', e);
  }
}

/** 从 localStorage 加载同步队列 */
export function loadSyncQueueFromStorage() {
  try {
    const saved = localStorage.getItem('goapp_sync_queue');
    if (saved) {
      syncQueue = JSON.parse(saved);
      console.log(`[同步] 加载了 ${syncQueue.length} 个待同步项`);
    }
  } catch (e) {
    console.error('[同步] 加载队列失败:', e);
  }
}

/** 处理同步队列 */
export async function processSyncQueue() {
  if (isSyncing || syncQueue.length === 0) return;
  
  isSyncing = true;
  console.log(`[同步] 开始处理同步队列，共 ${syncQueue.length} 项`);
  
  while (syncQueue.length > 0) {
    const item = syncQueue[0];
    
    try {
      await withRetry(
        async () => {
          if (item.type === 'course') {
            if (item.action === 'create') {
              const { data, error } = await supabase
                .from('courses')
                .insert(item.data)
                .select('id')
                .single();
              
              if (error) throw error;
              
              if (item.id.startsWith('local-course-') && data?.id) {
                try {
                  const localCourse = await getCourseFromIndexedDB(item.id);
                  if (localCourse) {
                    await deleteCourseFromIndexedDB(item.id);
                    await saveCourseToIndexedDB({
                      ...localCourse,
                      id: data.id,
                      synced: true,
                      local_only: false,
                      updated_at: new Date().toISOString(),
                    });
                  }
                } catch (e) {
                  console.warn('[同步] 更新本地课程ID失败:', e);
                }

                for (const q of syncQueue) {
                  if (q.type === 'course' && q.id === item.id) {
                    q.id = data.id;
                  }
                }
              }

              removeFromSyncQueue(item.id, item.type);
              console.log(`[同步] 课程 ${item.id} 同步成功`);
            } else if (item.action === 'update') {
              const { error } = await supabase
                .from('courses')
                .update(item.data)
                .eq('id', item.id);
              
              if (error) throw error;
              removeFromSyncQueue(item.id, item.type);
              console.log(`[同步] 课程 ${item.id} 更新同步成功`);
            }
          } else if (item.type === 'problem') {
            if (item.action === 'create' || item.action === 'update') {
              const { error } = await supabase
                .from('problems')
                .upsert(item.data);
              
              if (error) throw error;
              removeFromSyncQueue(item.id, item.type);
              console.log(`[同步] 题目 ${item.id} 同步成功`);
            }
          }
        },
        {
          maxRetries: 3,
          onRetry: (attempt) => {
            console.log(`[同步] ${item.type} ${item.id} 第 ${attempt} 次重试...`);
            item.retries++;
          }
        }
      );
      
      // 同步成功，从队列移除
      syncQueue.shift();
      saveSyncQueueToStorage();
      
    } catch (error) {
      console.error(`[同步] ${item.type} ${item.id} 同步失败:`, error);
      
      // 如果重试次数过多，移除该项
      if (item.retries >= 5) {
        console.warn(`[同步] ${item.type} ${item.id} 重试次数过多，移出队列`);
        syncQueue.shift();
        saveSyncQueueToStorage();
      } else {
        // 将该项移到最后，稍后重试
        syncQueue.shift();
        syncQueue.push(item);
        saveSyncQueueToStorage();
        break; // 暂停，稍后继续
      }
    }
  }
  
  isSyncing = false;
  
  if (syncQueue.length > 0) {
    console.log(`[同步] 队列中还有 ${syncQueue.length} 项待同步，稍后继续...`);
    // 5秒后继续尝试
    setTimeout(processSyncQueue, 5000);
  } else {
    console.log('[同步] 所有队列项已同步完成');
  }
}

// 初始化时加载同步队列
if (typeof window !== 'undefined') {
  loadSyncQueueFromStorage();
  // 尝试处理积压的同步任务
  setTimeout(processSyncQueue, 3000);
}

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

export interface PeriodRankEntry {
  userId: string;
  nickname: string;
  username: string;
  avatarUrl: string | null;
  wins: number;
  games: number;
  winRate: number;
}

export async function getPeriodLeaderboard(
  period: 'month' | 'week',
  limit = 50
): Promise<PeriodRankEntry[]> {
  const now = new Date();
  let since: Date;
  if (period === 'month') {
    since = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    const day = now.getDay() || 7;
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
  }

  const { data, error } = await supabase
    .from('games')
    .select('black_player_id, white_player_id, result, started_at')
    .eq('status', 'finished')
    .gte('started_at', since.toISOString());

  if (error) {
    console.error('获取时段排行榜失败:', error);
    return [];
  }
  if (!data || data.length === 0) return [];

  // 统计每个用户的胜场和总场次
  const stats = new Map<string, { wins: number; games: number }>();
  for (const g of data) {
    if (!g.result || g.result === 'draw') continue;
    const winnerId = g.result === 'black_win' ? g.black_player_id : g.white_player_id;
    const loserId = g.result === 'black_win' ? g.white_player_id : g.black_player_id;
    if (winnerId) {
      const s = stats.get(winnerId) || { wins: 0, games: 0 };
      s.wins++;
      s.games++;
      stats.set(winnerId, s);
    }
    if (loserId) {
      const s = stats.get(loserId) || { wins: 0, games: 0 };
      s.games++;
      stats.set(loserId, s);
    }
  }

  // 获取相关用户信息
  const userIds = Array.from(stats.keys());
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, username, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  const entries: PeriodRankEntry[] = [];
  for (const [userId, s] of stats) {
    const profile = profileMap.get(userId);
    if (!profile) continue;
    entries.push({
      userId,
      nickname: profile.nickname || '',
      username: profile.username || '',
      avatarUrl: profile.avatar_url || null,
      wins: s.wins,
      games: s.games,
      winRate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
    });
  }

  // 按胜场排序，胜场相同按胜率排序
  entries.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
  return entries.slice(0, limit);
}

// ========== Courses ==========
// 获取已发布的课程（学生端使用）
export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('published', true)  // 只返回已发布的课程
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取课程列表失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// 获取教师的所有课程（包括未发布的）
export async function getTeacherCourses(teacherId: string): Promise<Course[]> {
  // 1. 获取云端课程
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取教师课程失败:', error);
  }

  const cloudCourses: Course[] = Array.isArray(data) ? data : [];

  // 2. 获取本地课程
  const localCourses = await getAllCoursesFromIndexedDB();
  const teacherLocalCourses = localCourses.filter(c => c.teacher_id === teacherId);
  
  console.log(`[获取课程] 云端: ${cloudCourses.length} 个, 本地: ${teacherLocalCourses.length} 个`);

  // 3. 合并去重（本地优先，因为可能包含修改或未同步的新课程）
  const courseMap = new Map<string, Course>();
  
  // 先加入云端课程
  cloudCourses.forEach(c => courseMap.set(c.id, c));
  
  // 再加入本地课程
  teacherLocalCourses.forEach(c => {
    courseMap.set(c.id, c as unknown as Course);
  });

  return Array.from(courseMap.values());
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

export async function createCourse(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course> {
  // 生成一个临时 ID 用于本地备份
  const localId = `local-course-${Date.now()}`;
  const courseWithDefaults = { ...course, published: false };

  // 1. 先保存到本地 IndexedDB（无论云端成功与否）
  const localCourse: LocalCourse = {
    id: localId,
    ...courseWithDefaults,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    synced: false,
    local_only: true,
  };
  
  try {
    await saveCourseToIndexedDB(localCourse);
    console.log('[创建课程] 已保存本地备份:', localId);
  } catch (e) {
    console.error('[创建课程] 本地备份失败:', e);
  }

  // 2. 使用重试机制尝试同步到云端
  try {
    const data = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('courses')
          .insert(courseWithDefaults)
          .select()
          .maybeSingle();
        
        if (error) throw error;
        return data;
      },
      {
        maxRetries: 3,
        retryDelay: 1500,
        onRetry: (attempt, err) => {
          console.warn(`[创建课程] 第 ${attempt} 次重试，错误:`, err.message);
        }
      }
    );

    // 云端成功，删除本地备份
    try {
      const { deleteCourseFromIndexedDB } = await import('./indexeddb');
      await deleteCourseFromIndexedDB(localId);
      console.log('[创建课程] 云端同步成功，删除本地备份');
    } catch (e) {
      console.warn('[创建课程] 删除本地备份失败:', e);
    }
    
    return Object.assign(data!, { __synced: true }) as Course;
  } catch (e) {
    // 云端失败，但本地已保存
    // 添加到同步队列，网络恢复后自动重试
    console.warn('[创建课程] 云端同步失败，添加到待同步队列:', e);
    addToSyncQueue({
      id: localId,
      type: 'course',
      action: 'create',
      data: courseWithDefaults,
    });
    
    // 返回本地课程对象，让用户可以继续使用
    return Object.assign(localCourse, { __synced: false }) as unknown as Course;
  }
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
  // 1. 先获取现有课程信息（用于本地备份）
  let existingCourse: Course | LocalCourse | null = null;
  
  let cloudCourse: Course | null = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    cloudCourse = data ?? null;
  }
  
  if (cloudCourse) {
    existingCourse = cloudCourse;
  } else {
    // 云端没有，尝试从本地获取
    existingCourse = await getCourseFromIndexedDB(id);
  }

  // 2. 保存到本地 IndexedDB 作为备份
  try {
    const localCourse: LocalCourse = {
      id,
      title: existingCourse?.title || '',
      description: existingCourse?.description || null,
      type: existingCourse?.type || 'video',
      content_url: existingCourse?.content_url || null,
      cover_image_url: existingCourse?.cover_image_url || null,
      duration: existingCourse?.duration || null,
      teacher_id: existingCourse?.teacher_id || '',
      published: existingCourse?.published || false,
      animation_steps: existingCourse?.animation_steps || null,
      created_at: existingCourse?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced: false,
      local_only: !cloudCourse,
    };
    
    await saveCourseToIndexedDB({
      ...localCourse,
      ...updates,
    });
    console.log('[更新课程] 已保存本地备份:', id);
  } catch (e) {
    console.error('[更新课程] 本地备份失败:', e);
  }

  // 3. 使用重试机制尝试同步到云端
  try {
    const data = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('courses')
          .update(updates)
          .eq('id', id)
          .select()
          .maybeSingle();
        
        if (error) throw error;
        return data;
      },
      {
        maxRetries: 3,
        retryDelay: 1500,
        onRetry: (attempt, err) => {
          console.warn(`[更新课程] 第 ${attempt} 次重试，错误:`, err.message);
        }
      }
    );
    
    // 云端成功，更新本地状态
    console.log('[更新课程] 云端同步成功:', id);
    return Object.assign(data!, { __synced: true }) as Course;
  } catch (e) {
    // 云端失败，但本地已保存
    console.warn('[更新课程] 云端同步失败，添加到待同步队列:', e);
    
    // 如果是本地课程（id 以 local- 开头），添加到创建队列
    if (id.startsWith('local-course-')) {
      const localCourse = await getCourseFromIndexedDB(id);
      const merged = { ...(localCourse ?? {}), ...updates } as any;
      const { id: _id, synced: _synced, local_only: _localOnly, created_at: _createdAt, updated_at: _updatedAt, ...payload } = merged;
      addToSyncQueue({
        id,
        type: 'course',
        action: 'create',
        data: payload,
      });
    } else {
      // 已存在的课程，添加到更新队列
      addToSyncQueue({
        id,
        type: 'course',
        action: 'update',
        data: updates,
      });
    }
    
    // 返回更新后的本地课程
    return {
      ...(existingCourse as Course),
      ...updates,
      updated_at: new Date().toISOString(),
      __synced: false,
    } as any;
  }
}

// 发布/取消发布课程
export async function setCoursePublished(courseId: string, published: boolean) {
  const { error } = await supabase
    .from('courses')
    .update({ published })
    .eq('id', courseId);

  if (error) throw error;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ========== Problems ==========
// 获取已发布的闯关题目（所有用户可见）
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

// 从本地 IndexedDB 获取题目（用于云端失败时的备份）
async function getLocalProblem(id: string): Promise<Problem | null> {
  try {
    return await getProblemFromIndexedDB(id);
  } catch (e) {
    console.error('[获取题目] 读取本地备份失败:', e);
    return null;
  }
}

// 获取题目详情（支持 id 或 systemId 查询，优先云端，失败则用本地备份）
export async function getProblem(id: string): Promise<Problem | null> {
  // 如果是本地题目 id（如 system-level-1-0 或 custom-xxx），优先用 systemId 查询
  if (id.startsWith('system-') || id.startsWith('custom-')) {
    // 优先查找覆盖版本（is_overridden=true），否则查找原始版本
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('systemId', id)
      .order('is_overridden', { ascending: false })  // 覆盖版本排前面
      .order('created_at', { ascending: false })    // 最新创建排前面
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      console.log('[获取题目] 从云端获取成功:', id, data.is_overridden ? '(覆盖版本)' : '(原始版本)');
      return data;
    }
    
    console.warn(`[获取题目] 云端查询失败 (${error?.message})，尝试本地备份...`);
    
    // 云端失败，尝试从本地备份读取
    const localData = await getLocalProblem(id);
    if (localData) {
      console.log('[获取题目] 从本地备份获取:', id);
      return localData;
    }
    
    // 本地也没有，返回 null（会继续从本地数据文件加载）
    return null;
  }

  // 普通 uuid 查询
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.warn(`[获取题目] 云端获取失败 (${error.message})，尝试本地备份...`);
    const localData = await getLocalProblem(id);
    if (localData) return localData;
    return null;
  }
  return data;
}

// 获取教师的所有题目（包括未发布的）
export async function getTeacherProblems(teacherId: string): Promise<Problem[]> {
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取教师题目失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// 获取所有题目（用于教师端显示所有系统题目，包括云端和本地）
export async function getAllProblems(): Promise<Problem[]> {
  // 1. 先获取云端题目
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取云端题目失败:', error);
  }

  const cloudProblems: Problem[] = Array.isArray(data) ? data : [];

  // 2. 再获取本地 IndexedDB 题目
  const localProblems = await getAllProblemsFromIndexedDB();
  console.log(`[获取题目] 云端: ${cloudProblems.length} 个, 本地: ${localProblems.length} 个`);

  // 3. 合并去重（本地题目优先，因为可能包含修改）
  const problemMap = new Map<string, Problem>();
  
  // 先加入云端题目
  cloudProblems.forEach(p => problemMap.set(p.id, p));
  
  // 再加入本地题目（会覆盖同 id 的云端题目）
  localProblems.forEach(p => {
    problemMap.set(p.id, p);
  });

  return Array.from(problemMap.values());
}

// 发布/取消发布题目
export async function setProblemPublished(problemId: string, published: boolean) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 未配置，无法同步发布状态');
  }
  const { error } = await supabase
    .from('problems')
    .update({ published })
    .eq('id', problemId);

  if (error) {
    console.error('更新题目发布状态失败:', error);
    throw error;
  }
}

// 保存题目（创建或更新）- 同时保存到云端和本地 IndexedDB
export async function saveProblem(problem: Partial<Problem> & { id?: string }) {
  // 保存到本地 IndexedDB 作为备份
  const saveToLocal = async () => {
    try {
      const problemId = problem.id || `local-${Date.now()}`;
      await saveProblemToIndexedDB({
        ...problem,
        id: problemId,
      });
      console.log(`[保存题目] 已备份到本地 IndexedDB: ${problemId}`);
    } catch (e) {
      console.error('[保存题目] 本地备份失败:', e);
    }
  };

  // 无论成功与否，先保存本地备份
  await saveToLocal();
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 未配置，但本地已保存备份');
  }

  // 如果是本地题目（id 以 system- 开头），需要特殊处理
  if (problem.id && problem.id.startsWith('system-')) {
    // 查找数据库中是否已有这个 systemId 的记录
    const { data: existing } = await supabase
      .from('problems')
      .select('id, systemId')
      .eq('systemId', problem.id)
      .maybeSingle();

    if (existing) {
      // 已存在记录，更新它（排除 id 字段）
      console.log(`[保存题目] 更新云端已有记录: ${existing.id} (systemId: ${problem.id})`);
      const { id: _, ...updateData } = problem;
      const { error } = await supabase
        .from('problems')
        .update({ ...updateData, systemId: problem.id })
        .eq('id', existing.id);
      if (error) {
        console.warn('[保存题目] 云端更新失败，本地已备份:', error.message);
        throw new Error(`云端更新失败（${error.message}），但本地已保存备份`);
      }
      return existing.id;
    } else {
      // 不存在，创建新记录
      console.log(`[保存题目] 创建新记录（本地题目同步到云端）: ${problem.id}`);
      const newProblem = {
        ...problem,
        systemId: problem.id,
        published: true,  // 同步到云端的题目默认发布
      };
      const { id: _, ...insertData } = newProblem as any;
      const { data, error } = await supabase
        .from('problems')
        .insert(insertData)
        .select('id')
        .single();
      if (error) {
        console.warn('[保存题目] 云端创建失败，本地已备份:', error.message);
        throw new Error(`云端创建失败（${error.message}），但本地已保存备份`);
      }
      return data.id;
    }
  }

  // 普通题目（云端题目）
  if (problem.id) {
    const { error } = await supabase
      .from('problems')
      .update(problem)
      .eq('id', problem.id);
    if (error) {
      console.warn('[保存题目] 云端更新失败，本地已备份:', error.message);
      throw new Error(`云端更新失败（${error.message}），但本地已保存备份`);
    }
    return problem.id;
  } else {
    // 创建新题目，默认未发布
    const newProblem = {
      ...problem,
      published: false,
    };
    const { data, error } = await supabase
      .from('problems')
      .insert(newProblem)
      .select('id')
      .single();
    if (error) {
      console.warn('[保存题目] 云端创建失败，本地已备份:', error.message);
      throw new Error(`云端创建失败（${error.message}），但本地已保存备份`);
    }
    return data.id;
  }
}

// 删除题目（同时从云端和本地删除）
export async function deleteProblem(id: string) {
  // 先删除本地 IndexedDB
  try {
    await deleteProblemFromIndexedDB(id);
  } catch (e) {
    console.warn('[删除题目] 本地删除失败:', e);
  }

  // 再删除云端
  const { error } = await supabase
    .from('problems')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除题目失败:', error);
    throw error;
  }
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
export async function getFriendCount(userId: string): Promise<{ following: number; followers: number }> {
  const [followingRes, followersRes] = await Promise.all([
    supabase.from('friendships').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'accepted'),
    supabase.from('friendships').select('id', { count: 'exact', head: true }).eq('friend_id', userId).eq('status', 'accepted'),
  ]);
  return {
    following: followingRes.count ?? 0,
    followers: followersRes.count ?? 0,
  };
}

export async function getOnlineUserCount(): Promise<number> {
  // 查询最近5分钟内更新过 profile 的用户视为在线
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', fiveMinAgo);
  if (error) return 0;
  return count ?? 0;
}

export async function getFriends(userId: string): Promise<Profile[]> {
  // 双向查询：用户发起的好友关系 或 别人发给用户的好友关系
  console.log('[getFriends] 开始获取好友列表, userId:', userId);
  
  // 先检查当前认证状态
  const { data: sessionData } = await supabase.auth.getSession();
  console.log('[getFriends] 当前session:', sessionData?.session?.user?.id || '无session');
  
  const { data, error } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  console.log('[getFriends] friendships查询结果:', { data, error });

  if (error) {
    console.error('获取好友列表失败:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('[getFriends] 没有找到好友关系记录');
    return [];
  }

  // 提取所有好友的 ID（双向）
  const friendIds = data.map(f => 
    f.user_id === userId ? f.friend_id : f.user_id
  );
  
  // 去重
  const uniqueFriendIds = [...new Set(friendIds)];
  console.log('[getFriends] 唯一好友IDs:', uniqueFriendIds);
  
  if (uniqueFriendIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', uniqueFriendIds);

  console.log('[getFriends] profiles查询结果:', { profiles, profileError });

  if (profileError) {
    console.error('获取好友信息失败:', profileError);
    return [];
  }

  return Array.isArray(profiles) ? profiles : [];
}

export async function addFriend(userId: string, friendId: string) {
  // 先检查是否已存在关系
  const { data: existingData, error: selectError } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
    .maybeSingle();

  if (selectError) {
    console.error('检查好友关系失败:', selectError);
    throw selectError;
  }

  if (existingData) {
    // 关系已存在，分析情况
    const { status, user_id, friend_id } = existingData;
    
    if (status === 'accepted') {
      throw new Error('已经是好友了');
    }
    
    if (status === 'pending') {
      // 如果是对方发给我的请求（我作为 friend_id）
      if (friend_id === userId) {
        // 对方已发送请求，我需要接受
        const { error: updateError } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', existingData.id);
        
        if (updateError) throw updateError;
        return { ...existingData, status: 'accepted' };
      }
      // 如果是我发起的请求（我作为 user_id）
      throw new Error('已发送过好友请求，请等待对方确认');
    }
    
    // 被拒绝后可以重新发送
    const { error: updateError } = await supabase
      .from('friendships')
      .update({ status: 'pending' })
      .eq('id', existingData.id);
    
    if (updateError) throw updateError;
    return { ...existingData, status: 'pending' };
  }

  // 全新关系，插入
  const { data, error } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: friendId, status: 'pending' })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function removeFriend(userId: string, friendId: string) {
  // 删除双向的好友关系
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

  if (error) throw error;
}

/** 获取发给当前用户的好友请求（待处理） */
export async function getPendingFriendRequests(userId: string): Promise<Profile[]> {
  // 查询 friend_id = userId 且 status = 'pending' 的记录
  const { data, error } = await supabase
    .from('friendships')
    .select('user_id')
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error) {
    console.error('获取待处理好友请求失败:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 获取发送请求的用户信息
  const userIds = data.map((f: any) => f.user_id);
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  if (profileError) {
    console.error('获取用户信息失败:', profileError);
    return [];
  }

  return Array.isArray(profiles) ? profiles : [];
}

/** 接受好友请求 */
export async function acceptFriendRequest(userId: string, requesterId: string) {
  // 1. 更新 friendships 表中的状态为 accepted
  const { error: updateError } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('user_id', requesterId)
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (updateError) throw updateError;

  // 2. 创建反向的好友关系（双向好友）
  const { error: insertError } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: requesterId, status: 'accepted' })
    .select()
    .maybeSingle();

  if (insertError && insertError.code !== '23505') { // 忽略重复键错误
    console.warn('创建反向好友关系时出错（可能已存在）:', insertError);
  }

  return { success: true };
}

/** 拒绝好友请求 */
export async function rejectFriendRequest(userId: string, requesterId: string) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', requesterId)
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  return { success: true };
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
  // 1. 获取 IndexedDB 中的本地进度（优先读取，本地快速）
  const localProgress = await getAllProgressFromIndexedDB(userId);
  
  // 2. 获取数据库中的云端进度
  const { data, error } = await supabase
    .from('learning_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_accessed_at', { ascending: false });

  if (error) {
    console.error('获取学习进度失败:', error);
  }

  const cloudProgress: LearningProgress[] = Array.isArray(data) ? data : [];

  // 3. 合并云端和本地进度（本地优先，因为更新）
  const progressMap = new Map<string, LearningProgress>();

  // 先加入云端进度
  cloudProgress.forEach(p => {
    const key = p.problem_id ? `problem_${p.problem_id}` : `course_${p.course_id}`;
    progressMap.set(key, p);
  });

  // 再加入本地进度（会覆盖云端，因为本地更近）
  localProgress.forEach((info: any) => {
    const key = info.problem_id ? `problem_${info.problem_id}` : `course_${info.course_id}`;
    const existing = progressMap.get(key);
    // 只有当本地进度比云端新，或者云端没有时，才使用本地进度
    if (!existing || new Date(info.last_accessed_at) > new Date(existing.last_accessed_at)) {
      progressMap.set(key, {
        id: info.id || key,
        user_id: userId,
        course_id: info.course_id || null,
        problem_id: info.problem_id || null,
        progress: info.progress || 100,
        completed: info.completed || false,
        last_accessed_at: info.last_accessed_at,
      });
    }
  });

  const progressList = Array.from(progressMap.values());
  console.log(`[进度] 加载完成: 云端 ${cloudProgress.length} 条, 本地 ${localProgress.length} 条, 合并后 ${progressList.length} 条`);

  return progressList;
}

export async function updateProgress(
  userId: string,
  courseId: string | null,
  problemId: string | null,
  progress: number,
  completed: boolean
): Promise<{ success: boolean; synced?: boolean }> {
  // 1. 优先保存到 IndexedDB（所有类型的进度都保存本地备份）
  let localSaved = false;
  try {
    await saveProgressToIndexedDB(userId, problemId, courseId, progress, completed);
    localSaved = true;
    console.log('[进度] IndexedDB 保存成功');
  } catch (e) {
    console.error('[进度] IndexedDB 保存失败:', e);
  }

  // 2. 云端同步（失败不影响本地进度）
  // 注意：只有 UUID 格式的 id 才能同步到云端（数据库字段是 uuid 类型）
  // 本地内置课程/题目使用字符串 id，只保存在 IndexedDB
  let cloudSynced = false;
  try {
    // 检查 id 是否为有效的 UUID 格式（云端同步必需）
    const isValidUUID = (id: string | null) => {
      if (!id) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    if (courseId && isValidUUID(courseId)) {
      // 先尝试更新，如果失败再插入
      const { data: existing } = await supabase
        .from('learning_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existing) {
        // 已有记录，更新
        const { error } = await supabase
          .from('learning_progress')
          .update({
            progress,
            completed,
            last_accessed_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // 没有记录，插入
        const { error } = await supabase
          .from('learning_progress')
          .insert({
            user_id: userId,
            course_id: courseId,
            progress,
            completed,
            last_accessed_at: new Date().toISOString()
          });
        if (error) throw error;
      }
      cloudSynced = true;
      console.log('[进度] 云端同步成功 (课程)');
    } else if (problemId && isValidUUID(problemId)) {
      // 先尝试更新，如果失败再插入
      const { data: existing } = await supabase
        .from('learning_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('problem_id', problemId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('learning_progress')
          .update({
            progress,
            completed,
            last_accessed_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('learning_progress')
          .insert({
            user_id: userId,
            problem_id: problemId,
            progress,
            completed,
            last_accessed_at: new Date().toISOString()
          });
        if (error) throw error;
      }
      cloudSynced = true;
      console.log('[进度] 云端同步成功 (题目)');
    }
  } catch (e) {
    console.warn('[进度] 云端同步失败，将稍后重试:', e);
    // 不抛出错误，本地已保存
  }

  return { success: localSaved, synced: cloudSynced };
}

// ========== Daily Stats ==========

/** 记录或更新每日统计（upsert，增量累加） */
export async function upsertDailyStat(
  userId: string,
  date: string,
  updates: Partial<Pick<DailyStat, 'games_played' | 'games_won' | 'problems_solved' | 'courses_studied' | 'online_minutes'>>
) {
  if (!userId || !date) {
    console.warn('[每日统计] 缺少用户ID或日期，跳过记录');
    return null;
  }

  const { data: existing, error: selectError } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (selectError) {
    console.error('[每日统计] 查询失败:', selectError);
    return null;
  }

  if (existing) {
    const merged = {
      games_played: (existing.games_played || 0) + (updates.games_played || 0),
      games_won: (existing.games_won || 0) + (updates.games_won || 0),
      problems_solved: (existing.problems_solved || 0) + (updates.problems_solved || 0),
      courses_studied: (existing.courses_studied || 0) + (updates.courses_studied || 0),
      online_minutes: Math.max(existing.online_minutes || 0, updates.online_minutes || 0),
    };
    const { data, error } = await supabase
      .from('daily_stats')
      .update(merged)
      .eq('id', existing.id)
      .select()
      .maybeSingle();
    if (error) {
      console.error('[每日统计] 更新失败:', error);
      return null;
    }
    return data;
  } else {
    const { data, error } = await supabase
      .from('daily_stats')
      .insert({ user_id: userId, date, ...updates })
      .select()
      .maybeSingle();
    if (error) {
      console.error('[每日统计] 插入失败:', error);
      return null;
    }
    return data;
  }
}

/** 获取用户每日统计（最近N天） */
export async function getDailyStats(userId: string, days = 30): Promise<DailyStat[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false });
  if (error) {
    console.error('获取每日统计失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

/** 获取用户连续学习天数（streak） */
export async function getStudyStreak(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('date')
    .eq('user_id', userId)
    .gt('games_played', 0)
    .order('date', { ascending: false })
    .limit(365);
  if (error || !data || data.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < data.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (data[i].date === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ========== Culture Views ==========

/** 记录文化内容浏览 */
export async function recordCultureView(userId: string, storyId: string) {
  const { error } = await supabase
    .from('culture_views')
    .upsert({ user_id: userId, story_id: storyId }, { onConflict: 'user_id,story_id' });
  if (error) console.error('记录浏览失败:', error);
}

/** 获取用户已浏览的文化内容ID列表 */
export async function getCultureViews(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('culture_views')
    .select('story_id')
    .eq('user_id', userId);
  if (error) return [];
  return (data || []).map(d => d.story_id);
}

// 重新导出 achievements 模块的函数
export { getUserStats, ACHIEVEMENT_DEFINITIONS } from './achievements';

// ========== 私信系统 ==========

/** 获取用户的所有会话列表 */
export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('获取会话列表失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 获取每个会话的其他用户信息和最后一条消息
  const conversations: Conversation[] = [];
  for (const conv of data) {
    const otherId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherId)
      .maybeSingle();

    const { data: lastMsg } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 计算未读消息数
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('is_read', false)
      .neq('sender_id', userId);

    conversations.push({
      ...conv,
      other_user: otherUser ?? undefined,
      last_message: lastMsg ?? undefined,
      unread_count: unreadCount ?? 0,
    });
  }

  return conversations;
}

/** 获取或创建与某用户的会话 */
export async function getOrCreateConversation(userId: string, otherUserId: string): Promise<Conversation | null> {
  // 先查找是否已存在会话
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .or(`and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`)
    .maybeSingle();

  if (existing) {
    // 获取其他用户信息
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherUserId)
      .maybeSingle();

    return { ...existing, other_user: otherUser ?? undefined };
  }

  // 创建新会话
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      user1_id: userId,
      user2_id: otherUserId,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('创建会话失败:', error);
    return null;
  }

  // 获取其他用户信息
  const { data: otherUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', otherUserId)
    .maybeSingle();

  return { ...newConv!, other_user: otherUser ?? undefined };
}

/** 获取会话中的所有消息 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取消息失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 获取每个消息的发送者信息
  const senderIds = [...new Set(data.map(m => m.sender_id))];
  const { data: senders } = await supabase
    .from('profiles')
    .select('*')
    .in('id', senderIds);

  const senderMap = new Map((senders ?? []).map(s => [s.id, s]));

  return data.map(msg => ({
    ...msg,
    sender: senderMap.get(msg.sender_id),
  }));
}

/** 发送消息 */
export async function sendMessage(conversationId: string, senderId: string, content: string): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('发送消息失败:', error);
    return null;
  }

  // 更新会话的最后消息时间
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  // 获取发送者信息
  const { data: sender } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', senderId)
    .maybeSingle();

  return { ...data, sender: sender ?? undefined };
}

/** 标记消息为已读 */
export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);
}

/** 获取未读消息总数 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  const conversations = await getConversations(userId);
  return conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
}

// ========== 社区系统 ==========

/** 获取帖子列表 */
export async function getPosts(category?: string, limit = 20): Promise<Post[]> {
  let query = supabase
    .from('posts')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('获取帖子列表失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 获取作者信息
  const authorIds = [...new Set(data.map(p => p.author_id))];
  const { data: authors } = await supabase
    .from('profiles')
    .select('*')
    .in('id', authorIds);

  const authorMap = new Map((authors ?? []).map(a => [a.id, a]));

  return data.map(post => ({
    ...post,
    author: authorMap.get(post.author_id),
  }));
}

/** 获取单个帖子 */
export async function getPost(postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    console.error('获取帖子失败:', error);
    return null;
  }

  if (!data) return null;

  // 获取作者信息
  const { data: author } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.author_id)
    .maybeSingle();

  return { ...data, author: author ?? undefined };
}

/** 创建帖子 */
export async function createPost(authorId: string, title: string, content: string, category: string = 'general'): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: authorId,
      title,
      content,
      category,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('创建帖子失败:', error);
    return null;
  }

  // 获取作者信息
  const { data: author } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authorId)
    .maybeSingle();

  return { ...data, author: author ?? undefined };
}

/** 删除帖子 */
export async function deletePost(postId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', userId);

  if (error) {
    console.error('删除帖子失败:', error);
    return false;
  }
  return true;
}

/** 点赞/取消点赞帖子 */
export async function togglePostLike(postId: string, userId: string): Promise<boolean> {
  // 先检查是否已点赞
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // 取消点赞
    await supabase
      .from('post_likes')
      .delete()
      .eq('id', existing.id);
    return false;
  } else {
    // 添加点赞
    await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });
    return true;
  }
}

/** 检查用户是否已点赞帖子 */
export async function checkPostLiked(postId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

/** 获取帖子的评论列表 */
export async function getComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .is('parent_id', null) // 只获取顶级评论
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取评论失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 获取所有评论的回复
  const { data: replies } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .not('parent_id', 'is', null)
    .order('created_at', { ascending: true });

  // 获取所有评论的作者信息
  const allAuthorIds = [...new Set(data.map(c => c.author_id)), ...new Set((replies ?? []).map(r => r.author_id))];
  const { data: authors } = await supabase
    .from('profiles')
    .select('*')
    .in('id', allAuthorIds);

  const authorMap = new Map((authors ?? []).map(a => [a.id, a]));

  // 组织评论结构
  const replyMap = new Map<string | null, Comment[]>();
  replies?.forEach(reply => {
    const parentId = reply.parent_id;
    if (!replyMap.has(parentId)) {
      replyMap.set(parentId, []);
    }
    replyMap.get(parentId)!.push({ ...reply, author: authorMap.get(reply.author_id) });
  });

  return data.map(comment => ({
    ...comment,
    author: authorMap.get(comment.author_id),
    replies: replyMap.get(comment.id) ?? [],
  }));
}

/** 添加评论 */
export async function addComment(postId: string, authorId: string, content: string, parentId?: string): Promise<Comment | null> {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      author_id: authorId,
      content,
      parent_id: parentId ?? null,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('添加评论失败:', error);
    return null;
  }

  // 获取作者信息
  const { data: author } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authorId)
    .maybeSingle();

  return { ...data!, author: author ?? undefined };
}

/** 删除评论 */
export async function deleteComment(commentId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', userId);

  if (error) {
    console.error('删除评论失败:', error);
    return false;
  }
  return true;
}

/** 点赞/取消点赞评论 */
export async function toggleCommentLike(commentId: string, userId: string): Promise<boolean> {
  // 先检查是否已点赞
  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // 取消点赞
    await supabase
      .from('comment_likes')
      .delete()
      .eq('id', existing.id);
    return false;
  } else {
    // 添加点赞
    await supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: userId });
    return true;
  }
}

/** 获取在线用户列表 */
export async function getOnlineUsers(): Promise<Profile[]> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .gte('updated_at', fiveMinAgo)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('获取在线用户失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// ========== 虚拟金币系统 ==========

export interface UserCoins {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface CoinTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  created_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  checkin_date: string;
  coins_earned: number;
}

export interface ShopItem {
  id: string;
  category: string;
  name: string;
  description: string;
  icon_url: string | null;
  price: number;
  is_premium: boolean;
}

export interface UserTask {
  id: string;
  user_id: string;
  task_type: string;
  current_progress: number;
  is_completed: boolean;
  completed_at: string | null;
}

/** 获取用户金币余额 */
export async function getUserCoins(userId: string): Promise<UserCoins | null> {
  const { data, error } = await supabase
    .from('user_coins')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('获取金币余额失败:', error);
    return null;
  }
  return data;
}

/** 确保用户金币账户存在（首次访问时自动创建） */
export async function ensureUserCoins(userId: string): Promise<UserCoins> {
  const existing = await getUserCoins(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('user_coins')
    .insert({ user_id: userId, balance: 0 })
    .select()
    .maybeSingle();

  if (error) {
    console.error('创建金币账户失败:', error);
    return { id: '', user_id: userId, balance: 0, total_earned: 0, total_spent: 0 };
  }
  return data;
}

/** 添加金币（带交易记录） */
export async function addCoins(userId: string, amount: number, type: string, description: string, referenceId?: string): Promise<boolean> {
  if (amount <= 0) return false;

  // 确保账户存在
  await ensureUserCoins(userId);

  // 使用数据库函数原子操作
  const { data: updated, error } = await supabase.rpc('add_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_description: description,
    p_reference_id: referenceId || null,
  }).maybeSingle();

  if (error) {
    console.error('添加金币失败:', error);
    return false;
  }
  return true;
}

/** 扣除金币（带交易记录） */
export async function deductCoins(userId: string, amount: number, type: string, description: string, referenceId?: string): Promise<boolean> {
  if (amount <= 0) return false;

  // 检查余额
  const coins = await getUserCoins(userId);
  if (!coins || coins.balance < amount) {
    console.error('金币不足');
    return false;
  }

  const { error } = await supabase.rpc('deduct_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_description: description,
    p_reference_id: referenceId || null,
  });

  if (error) {
    console.error('扣除金币失败:', error);
    return false;
  }
  return true;
}

/** 获取金币交易记录 */
export async function getCoinTransactions(userId: string, limit = 50): Promise<CoinTransaction[]> {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取交易记录失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

/** 每日签到 */
export async function dailyCheckin(userId: string): Promise<{ success: boolean; coins: number; streak: number; message: string }> {
  const today = new Date().toISOString().split('T')[0];

  // 检查今天是否已签到
  const { data: existing } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('checkin_date', today)
    .maybeSingle();

  if (existing) {
    return { success: false, coins: 0, streak: 0, message: '今日已签到' };
  }

  // 获取或创建连续签到记录
  const { data: streakData, error: streakError } = await supabase
    .from('checkin_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  let currentStreak = 1;
  let longestStreak = 1;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (streakData) {
    if (streakData.last_checkin_date === yesterday) {
      currentStreak = streakData.current_streak + 1;
    } else if (streakData.last_checkin_date === today) {
      return { success: false, coins: 0, streak: streakData.current_streak, message: '今日已签到' };
    }
    longestStreak = Math.max(currentStreak, streakData.longest_streak);
  }

  // 计算奖励（连续签到越多，奖励越高）
  const baseReward = 10;
  const streakBonus = Math.min(currentStreak - 1, 7) * 2; // 最多额外14金币
  const totalCoins = baseReward + streakBonus;

  // 添加金币
  await addCoins(userId, totalCoins, 'daily_login', `每日签到（第${currentStreak}天）`);

  // 记录签到
  await supabase
    .from('daily_checkins')
    .insert({ user_id: userId, checkin_date: today, coins_earned: totalCoins });

  // 更新连续签到记录
  await supabase
    .from('checkin_streaks')
    .upsert({
      user_id: userId,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_checkin_date: today,
    });

  // 更新任务进度
  await updateTaskProgress(userId, 'daily_login');

  return {
    success: true,
    coins: totalCoins,
    streak: currentStreak,
    message: `签到成功！获得 ${totalCoins} 金币（连续${currentStreak}天）`,
  };
}

/** 获取连续签到信息 */
export async function getCheckinStreak(userId: string): Promise<{ current: number; longest: number; checkedInToday: boolean }> {
  const today = new Date().toISOString().split('T')[0];

  const { data: streak } = await supabase
    .from('checkin_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!streak) {
    return { current: 0, longest: 0, checkedInToday: false };
  }

  const checkedInToday = streak.last_checkin_date === today;

  return {
    current: streak.current_streak,
    longest: streak.longest_streak,
    checkedInToday,
  };
}

/** 获取任务列表 */
export async function getTasks(): Promise<any[]> {
  const { data, error } = await supabase
    .from('task_definitions')
    .select('*')
    .eq('is_active', true)
    .order('type');

  if (error) {
    console.error('获取任务列表失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

/** 获取用户任务进度 */
export async function getUserTasks(userId: string): Promise<UserTask[]> {
  const { data, error } = await supabase
    .from('user_tasks')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('获取用户任务失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

/** 更新任务进度 */
export async function updateTaskProgress(userId: string, taskType: string): Promise<void> {
  // 获取任务定义
  const { data: taskDef } = await supabase
    .from('task_definitions')
    .select('*')
    .eq('type', taskType)
    .maybeSingle();

  if (!taskDef) return;

  // 获取或创建用户任务
  const { data: userTask } = await supabase
    .from('user_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('task_type', taskType)
    .maybeSingle();

  const currentProgress = (userTask?.current_progress ?? 0) + 1;
  const isCompleted = currentProgress >= taskDef.target_count;

  if (userTask) {
    await supabase
      .from('user_tasks')
      .update({
        current_progress: currentProgress,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        last_updated: new Date().toISOString(),
      })
      .eq('id', userTask.id);
  } else {
    await supabase
      .from('user_tasks')
      .insert({
        user_id: userId,
        task_type: taskType,
        current_progress: 1,
        is_completed: currentProgress >= taskDef.target_count,
        completed_at: currentProgress >= taskDef.target_count ? new Date().toISOString() : null,
      });
  }

  // 如果任务完成，发放奖励
  if (isCompleted && (!userTask || !userTask.is_completed)) {
    await addCoins(userId, taskDef.coins_reward, 'task_reward', `完成任务：${taskDef.title}`);
  }
}

/** 获取商城物品 */
export async function getShopItems(category?: string): Promise<ShopItem[]> {
  let query = supabase
    .from('shop_items')
    .select('*')
    .eq('is_active', true)
    .order('price');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('获取商城物品失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

/** 购买商城物品 */
export async function purchaseItem(userId: string, itemId: string): Promise<{ success: boolean; message: string }> {
  // 获取物品信息
  const { data: item, error: itemError } = await supabase
    .from('shop_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError || !item) {
    return { success: false, message: '物品不存在' };
  }

  // 检查是否已拥有
  const { data: existing } = await supabase
    .from('user_inventory')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existing) {
    return { success: false, message: '已拥有该物品' };
  }

  // 扣除金币
  const success = await deductCoins(userId, item.price, 'purchase', `购买物品：${item.name}`, itemId);
  if (!success) {
    return { success: false, message: '金币不足' };
  }

  // 添加到背包
  await supabase
    .from('user_inventory')
    .insert({ user_id: userId, item_id: itemId });

  return { success: true, message: `购买成功！获得 ${item.name}` };
}

/** 获取用户背包 */
export async function getUserInventory(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('user_inventory')
    .select('*, shop_items(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('获取背包失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

/** 装备物品 */
export async function equipItem(userId: string, itemId: string): Promise<boolean> {
  // 获取物品信息
  const { data: item } = await supabase
    .from('shop_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (!item) return false;

  // 检查是否拥有该物品
  const { data: inventory } = await supabase
    .from('user_inventory')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (!inventory) return false;

  // 根据物品类型更新装备
  const updateField = `${item.category}_id`;

  await supabase
    .from('user_equipment')
    .upsert({
      user_id: userId,
      [updateField]: itemId,
    });

  // 标记物品为已装备
  await supabase
    .from('user_inventory')
    .update({ is_equipped: true })
    .eq('id', inventory.id);

  return true;
}

/** 获取用户装备 */
export async function getUserEquipment(userId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('user_equipment')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('获取装备失败:', error);
    return null;
  }
  return data;
}

// ========== 棋社系统 ==========

export interface Club {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  is_public: boolean;
  member_count?: number;
  owner?: Profile;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  nickname: string | null;
  join_games: number;
  joined_at: string;
  profile?: Profile;
}

export interface ClubAnnouncement {
  id: string;
  club_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author?: Profile;
}

export interface ClubPost {
  id: string;
  club_id: string;
  author_id: string;
  title: string | null;
  content: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
  author?: Profile;
  is_liked?: boolean;
}

/** 获取公开棋社列表 */
export async function getPublicClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取棋社列表失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 获取成员数量
  const clubsWithCount = await Promise.all(
    data.map(async (club) => {
      const { count } = await supabase
        .from('club_members')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', club.id);

      // 获取社长信息
      const { data: owner } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', club.owner_id)
        .maybeSingle();

      return {
        ...club,
        member_count: count ?? 0,
        owner: owner ?? undefined,
      };
    })
  );

  return clubsWithCount;
}

/** 获取用户加入的棋社 */
export async function getUserClubs(userId: string): Promise<Club[]> {
  const { data: memberships, error } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId);

  if (error || !memberships || memberships.length === 0) {
    return [];
  }

  const clubIds = memberships.map(m => m.club_id);
  const { data: clubs } = await supabase
    .from('clubs')
    .select('*')
    .in('id', clubIds);

  if (!clubs) return [];

  // 获取成员数量
  const clubsWithCount = await Promise.all(
    clubs.map(async (club) => {
      const { count } = await supabase
        .from('club_members')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', club.id);

      return {
        ...club,
        member_count: count ?? 0,
      };
    })
  );

  return clubsWithCount;
}

/** 创建棋社 */
export async function createClub(userId: string, name: string, description: string): Promise<Club | null> {
  // 1. 创建棋社记录
  const { data, error } = await supabase
    .from('clubs')
    .insert({
      owner_id: userId,
      name,
      description,
      is_public: true,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ 创建棋社失败:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return null;
  }

  // 2. 自动将自己添加为社长
  const { error: memberError } = await supabase
    .from('club_members')
    .insert({
      club_id: data.id,
      user_id: userId,
      role: 'owner',
    });

  if (memberError) {
    console.error('❌ 添加社长成员失败:', {
      code: memberError.code,
      message: memberError.message,
      details: memberError.details,
      hint: memberError.hint
    });
    // 清理已创建的棋社
    await supabase.from('clubs').delete().eq('id', data.id);
    return null;
  }

  // 3. club_settings 记录会通过数据库触发器自动创建
  // 如果需要，可以在这里手动创建或查询

  // 4. 发放加入奖励（可选，静默失败不影响创建成功）
  try {
    const { data: settings } = await supabase
      .from('club_settings')
      .select('join_bonus_coins')
      .eq('club_id', data.id)
      .maybeSingle();

    if (settings?.join_bonus_coins) {
      await addCoins(userId, settings.join_bonus_coins, 'club_join_bonus', `加入棋社：${name}`);
    }
  } catch (e) {
    console.warn('发放加入奖励失败（不影响棋社创建）:', e);
  }

  return { ...data, member_count: 1 };
}

/** 获取棋社详情 */
export async function getClub(clubId: string): Promise<Club | null> {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .maybeSingle();

  if (error || !data) {
    console.error('获取棋社详情失败:', error);
    return null;
  }

  // 获取成员数量
  const { count } = await supabase
    .from('club_members')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId);

  // 获取社长信息
  const { data: owner } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.owner_id)
    .maybeSingle();

  return {
    ...data,
    member_count: count ?? 0,
    owner: owner ?? undefined,
  };
}

/** 加入棋社 */
export async function joinClub(userId: string, clubId: string): Promise<{ success: boolean; message: string }> {
  // 检查是否已加入
  const { data: existing } = await supabase
    .from('club_members')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return { success: false, message: '已加入该棋社' };
  }

  // 检查棋社是否需要审批
  const { data: settings } = await supabase
    .from('club_settings')
    .select('require_approval')
    .eq('club_id', clubId)
    .maybeSingle();

  if (settings?.require_approval) {
    // 需要审批，创建申请
    await supabase
      .from('club_applications')
      .insert({ club_id: clubId, user_id: userId });
    return { success: true, message: '申请已提交，等待审批' };
  }

  // 直接加入
  await supabase
    .from('club_members')
    .insert({ club_id: clubId, user_id: userId, role: 'member' });

  // 发放加入奖励
  if (settings?.join_bonus_coins) {
    await addCoins(userId, settings.join_bonus_coins, 'club_join_bonus', '加入棋社奖励');
  }

  return { success: true, message: '加入成功！' };
}

/** 退出棋社 */
export async function leaveClub(userId: string, clubId: string): Promise<boolean> {
  // 检查是否是社长
  const { data: club } = await supabase
    .from('clubs')
    .select('owner_id')
    .eq('id', clubId)
    .maybeSingle();

  if (club?.owner_id === userId) {
    // 检查是否还有其他管理员或成员
    const { count } = await supabase
      .from('club_members')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId);

    if ((count ?? 0) > 1) {
      return false; // 社长需要先转让或删除棋社
    }

    // 删除棋社
    await supabase.from('clubs').delete().eq('id', clubId);
  } else {
    // 普通成员退出
    await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userId);
  }

  return true;
}

/** 获取棋社成员列表 */
export async function getClubMembers(clubId: string): Promise<ClubMember[]> {
  const { data, error } = await supabase
    .from('club_members')
    .select('*')
    .eq('club_id', clubId)
    .order('role')
    .order('joined_at');

  if (error) {
    console.error('获取成员列表失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 获取所有成员的资料
  const userIds = data.map(m => m.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  return data.map(member => ({
    ...member,
    profile: profileMap.get(member.user_id),
  }));
}

/** 获取棋社公告 */
export async function getClubAnnouncements(clubId: string): Promise<ClubAnnouncement[]> {
  const { data, error } = await supabase
    .from('club_announcements')
    .select('*')
    .eq('club_id', clubId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取公告失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 获取作者信息
  const authorIds = [...new Set(data.map(a => a.author_id))];
  const { data: authors } = await supabase
    .from('profiles')
    .select('*')
    .in('id', authorIds);

  const authorMap = new Map((authors ?? []).map(a => [a.id, a]));

  return data.map(ann => ({
    ...ann,
    author: authorMap.get(ann.author_id),
  }));
}

/** 发布公告 */
export async function createClubAnnouncement(clubId: string, authorId: string, title: string, content: string): Promise<ClubAnnouncement | null> {
  const { data, error } = await supabase
    .from('club_announcements')
    .insert({
      club_id: clubId,
      author_id: authorId,
      title,
      content,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('发布公告失败:', error);
    return null;
  }

  // 获取作者信息
  const { data: author } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authorId)
    .maybeSingle();

  return { ...data!, author: author ?? undefined };
}

/** 获取棋社帖子列表 */
export async function getClubPosts(clubId: string): Promise<ClubPost[]> {
  const { data, error } = await supabase
    .from('club_posts')
    .select('*')
    .eq('club_id', clubId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取帖子列表失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 获取作者信息
  const authorIds = [...new Set(data.map(p => p.author_id))];
  const { data: authors } = await supabase
    .from('profiles')
    .select('*')
    .in('id', authorIds);

  const authorMap = new Map((authors ?? []).map(a => [a.id, a]));

  return data.map(post => ({
    ...post,
    author: authorMap.get(post.author_id),
  }));
}

/** 创建棋社帖子 */
export async function createClubPost(clubId: string, authorId: string, content: string, title?: string): Promise<ClubPost | null> {
  const { data, error } = await supabase
    .from('club_posts')
    .insert({
      club_id: clubId,
      author_id: authorId,
      title: title ?? null,
      content,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('创建帖子失败:', error);
    return null;
  }

  // 获取作者信息
  const { data: author } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authorId)
    .maybeSingle();

  return { ...data!, author: author ?? undefined };
}

/** 检查用户是否是棋社成员 */
export async function isClubMember(userId: string, clubId: string): Promise<boolean> {
  const { data } = await supabase
    .from('club_members')
    .select('id')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .maybeSingle();

  return !!data;
}

/** 检查用户是否是棋社管理员 */
export async function isClubAdmin(userId: string, clubId: string): Promise<boolean> {
  const { data } = await supabase
    .from('club_members')
    .select('role')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .maybeSingle();

  return data?.role === 'owner' || data?.role === 'admin';
}

/** 获取棋社排行榜 */
export async function getClubLeaderboard(clubId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('club_leaderboard')
    .select('*')
    .eq('club_id', clubId)
    .order('rating', { ascending: false })
    .limit(20);

  if (error) {
    console.error('获取排行榜失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 获取用户信息
  const userIds = data.map(l => l.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  return data.map(entry => ({
    ...entry,
    profile: profileMap.get(entry.user_id),
  }));
}

/** 更新棋社对弈统计 */
export async function updateClubGameStats(clubId: string, blackPlayerId: string, whitePlayerId: string, result: string): Promise<void> {
  // 更新社内对弈记录
  await supabase.rpc('update_club_game_stats', {
    p_club_id: clubId,
    p_black_id: blackPlayerId,
    p_white_id: whitePlayerId,
    p_result: result,
  });
}

// ========== 好友对战邀请 ==========

export interface FriendInvitation {
  id: string;
  inviter_id: string;
  invited_id: string;
  board_size: number;
  time_control: string;
  handicap_mode: string;
  handicap_count: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  inviter?: Profile;
  invited?: Profile;
}

/** 发起好友对战邀请 */
export async function createFriendInvitation(
  inviterId: string,
  invitedId: string,
  boardSize: number,
  timeControl: string,
  handicapMode: string,
  handicapCount: number
): Promise<FriendInvitation | null> {
  // 删除旧的 pending 邀请
  await supabase
    .from('friend_invitations')
    .delete()
    .eq('inviter_id', inviterId)
    .eq('invited_id', invitedId)
    .eq('status', 'pending');

  const { data, error } = await supabase
    .from('friend_invitations')
    .insert({
      inviter_id: inviterId,
      invited_id: invitedId,
      board_size: boardSize,
      time_control: timeControl,
      handicap_mode: handicapMode,
      handicap_count: handicapCount,
      status: 'pending',
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('创建好友邀请失败:', error);
    return null;
  }

  return data;
}

/** 获取收到的邀请列表 */
export async function getReceivedInvitations(userId: string): Promise<FriendInvitation[]> {
  const { data, error } = await supabase
    .from('friend_invitations')
    .select('*')
    .eq('invited_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取邀请列表失败:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 获取邀请者信息
  const inviterIds = data.map(i => i.inviter_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', inviterIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  return data.map(inv => ({
    ...inv,
    inviter: profileMap.get(inv.inviter_id),
  }));
}

/** 接受好友邀请 */
export async function acceptFriendInvitation(invitationId: string, userId: string): Promise<{ success: boolean; gameId?: string }> {
  // 1. 更新邀请状态
  const { error: updateError } = await supabase
    .from('friend_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId)
    .eq('invited_id', userId)
    .eq('status', 'pending');

  if (updateError) {
    console.error('接受邀请失败:', updateError);
    return { success: false };
  }

  // 2. 获取邀请信息
  const { data: invitation } = await supabase
    .from('friend_invitations')
    .select('*')
    .eq('id', invitationId)
    .maybeSingle();

  if (!invitation) return { success: false };

  // 3. 创建游戏
  const userIsBlack = Math.random() < 0.5;
  const blackPlayerId = userIsBlack ? userId : invitation.inviter_id;
  const whitePlayerId = userIsBlack ? invitation.inviter_id : userId;

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      type: 'human',
      status: 'ongoing',
      result: null,
      black_player_id: blackPlayerId,
      white_player_id: whitePlayerId,
      board_size: invitation.board_size,
      moves: [],
      end_type: null,
      score_detail: null,
      black_captures: 0,
      white_captures: 0,
      move_count: 0,
    })
    .select()
    .maybeSingle();

  if (gameError || !game) {
    console.error('创建游戏失败:', gameError);
    return { success: false };
  }

  // 4. 更新邀请关联游戏ID
  await supabase
    .from('friend_invitations')
    .update({ game_id: game.id })
    .eq('id', invitationId);

  return { success: true, gameId: game.id };
}

/** 拒绝好友邀请 */
export async function rejectFriendInvitation(invitationId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_invitations')
    .update({ status: 'rejected' })
    .eq('id', invitationId)
    .eq('invited_id', userId)
    .eq('status', 'pending');

  return !error;
}

/** 监听收到的邀请（实时） */
export function subscribeToFriendInvitations(
  userId: string,
  onNewInvitation: (invitation: FriendInvitation) => void
): () => void {
  const channel = supabase
    .channel('friend-invitations-' + userId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'friend_invitations',
      filter: `invited_id=eq.${userId}`,
    }, async (payload) => {
      const inv = payload.new as FriendInvitation;
      // 获取邀请者信息
      const { data: inviter } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', inv.inviter_id)
        .maybeSingle();
      
      onNewInvitation({ ...inv, inviter: inviter ?? undefined });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** 监听邀请状态变化（被邀请方接受后，邀请方收到通知） */
export function subscribeToInvitationAccepted(
  userId: string,
  onAccepted: (gameId: string, myColor: 'black' | 'white') => void
): () => void {
  const channel = supabase
    .channel('invitation-accepted-' + userId)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'friend_invitations',
      filter: `inviter_id=eq.${userId}`,
    }, async (payload) => {
      const inv = payload.new as FriendInvitation;
      if (inv.status === 'accepted' && inv.game_id) {
        // 获取我是什么颜色
        const { data: game } = await supabase
          .from('games')
          .select('black_player_id')
          .eq('id', inv.game_id)
          .maybeSingle();
        
        if (game) {
          const myColor = game.black_player_id === userId ? 'black' : 'white';
          onAccepted(inv.game_id, myColor);
        }
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
