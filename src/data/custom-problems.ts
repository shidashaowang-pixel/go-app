/**
 * 自定义题目和系统题目覆盖管理
 * 
 * 功能：
 * 1. 管理用户新增的自定义题目（同步到云端，所有用户可见）
 * 2. 管理用户对系统题目的修改（同步到云端，所有用户可见）
 * 
 * 存储策略：
 * - localStorage: 本地缓存
 * - Supabase 云端: 云端同步，所有用户可见
 * 
 * 题目区分：
 * - systemId: 系统题目的原始 ID（如 "level-1-0", "practice-5"）
 * - customId: 自定义题目的唯一 ID（格式 "custom-{timestamp}"）
 */

import type { Problem } from '@/types';
import { supabase, isSupabaseConfigured } from '@/db/supabase';

const CUSTOM_STORAGE_KEY = 'go-app-custom-problems';
const OVERRIDES_KEY = 'go-app-problem-overrides';

// ========== 本地存储 ==========

/** 获取所有自定义题目（本地缓存） */
function getLocalCustomProblems(): Problem[] {
  try {
    const data = localStorage.getItem(CUSTOM_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/** 保存所有自定义题目到本地缓存 */
function saveLocalCustomProblems(problems: Problem[]): void {
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(problems));
}

/** 获取所有覆盖版本（本地缓存） */
function getLocalOverrides(): Map<string, Problem> {
  try {
    const data = localStorage.getItem(OVERRIDES_KEY);
    if (!data) return new Map();
    const arr = JSON.parse(data);
    return new Map(arr);
  } catch {
    return new Map();
  }
}

/** 保存所有覆盖版本到本地缓存 */
function saveLocalOverrides(overrides: Map<string, Problem>): void {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify([...overrides]));
}

// ========== 云端同步 ==========

/** 从云端获取自定义题目 */
async function fetchCloudCustomProblems(): Promise<Problem[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    // 先尝试用 is_custom 字段查询
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('is_custom', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      // 如果 is_custom 字段不存在，尝试通过 systemId 格式过滤
      if (error.message.includes('is_custom') || error.code === '42703') {
        console.warn('[自定义题目] is_custom 字段不存在，使用 systemId 格式过滤');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('problems')
          .select('*')
          .ilike('systemId', 'custom-%')
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          console.warn('[自定义题目] 过滤失败:', fallbackError.message);
          return [];
        }
        console.log(`[自定义题目] 从云端获取到 ${fallbackData?.length || 0} 道题目（通过 systemId 格式）`);
        return fallbackData || [];
      }
      console.warn('[自定义题目] 云端获取失败:', error.message);
      return [];
    }
    
    console.log(`[自定义题目] 从云端获取到 ${data?.length || 0} 道题目`);
    return data || [];
  } catch (e) {
    console.warn('[自定义题目] 云端获取异常:', e);
    return [];
  }
}

/** 从云端获取系统题目的覆盖版本 */
async function fetchCloudOverrides(): Promise<Map<string, Problem>> {
  if (!isSupabaseConfigured) return new Map();
  
  try {
    // 先尝试用 is_overridden 字段查询
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('is_overridden', true);
    
    if (error) {
      // 如果 is_overridden 字段不存在，通过 systemId 格式过滤（排除 custom- 开头）
      if (error.message.includes('is_overridden') || error.code === '42703') {
        console.warn('[覆盖版本] is_overridden 字段不存在，使用 systemId 格式过滤');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('problems')
          .select('*')
          .not('systemId', 'ilike', 'custom-%')
          .not('systemId', 'is', 'null');
        
        if (fallbackError) {
          console.warn('[覆盖版本] 过滤失败:', fallbackError.message);
          return new Map();
        }
        
        const map = new Map<string, Problem>();
        for (const p of fallbackData || []) {
          if (p.systemId) {
            map.set(p.systemId, p);
          }
        }
        console.log(`[覆盖版本] 从云端获取到 ${map.size} 个（通过 systemId 格式）`);
        return map;
      }
      console.warn('[覆盖版本] 云端获取失败:', error.message);
      return new Map();
    }
    
    console.log(`[覆盖版本] 从云端获取到 ${data?.length || 0} 个覆盖版本`);
    
    const map = new Map<string, Problem>();
    for (const p of data || []) {
      if (p.systemId) {
        map.set(p.systemId, p);
      }
    }
    return map;
  } catch (e) {
    console.warn('[覆盖版本] 云端获取异常:', e);
    return new Map();
  }
}

/** 保存题目到云端 */
async function saveToCloud(problem: Problem): Promise<void> {
  if (!isSupabaseConfigured) {
    console.warn('[云端] Supabase 未配置，题目仅保存到本地');
    return;
  }
  
  try {
    const cloudData = {
      ...problem,
      published: true,
      // 确保 systemId 存在
      systemId: problem.systemId || problem.id,
    };
    
    // 检查是否已存在（通过 systemId 查询）
    if (cloudData.systemId) {
      const { data: existing } = await supabase
        .from('problems')
        .select('id')
        .eq('systemId', cloudData.systemId)
        .maybeSingle();
      
      if (existing) {
        // 已存在，更新
        const { id: _, ...updateData } = cloudData as any;
        const { error: updateError } = await supabase
          .from('problems')
          .update({ ...updateData, systemId: cloudData.systemId })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error(`[云端] 更新失败:`, updateError);
        } else {
          console.log(`[云端] 更新覆盖版本: ${cloudData.systemId}`);
        }
        return;
      }
    }
    
    // 不存在，创建新记录
    const { id: _, ...insertData } = cloudData as any;
    const { error: insertError } = await supabase
      .from('problems')
      .insert(insertData);
    
    if (insertError) {
      console.error(`[云端] 插入失败:`, insertError);
      // 即使云端插入失败，也保存到本地
      throw insertError;
    } else {
      console.log(`[云端] 创建新记录: ${cloudData.systemId || cloudData.id}`);
    }
  } catch (e) {
    console.warn('[云端] 保存失败:', e);
    throw e; // 抛出错误让调用方知道
  }
}

/** 从云端删除题目 */
async function deleteFromCloud(systemId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  
  try {
    await supabase
      .from('problems')
      .delete()
      .eq('systemId', systemId);
    console.log(`[云端] 删除: ${systemId}`);
  } catch (e) {
    console.warn('[云端] 删除失败:', e);
  }
}

// ========== 公开 API ==========

/** 
 * 获取所有自定义题目
 * 策略：云端优先，失败用本地缓存
 */
export async function getCustomProblems(): Promise<Problem[]> {
  // 先尝试从云端获取
  const cloudProblems = await fetchCloudCustomProblems();
  
  if (cloudProblems.length > 0) {
    // 云端有数据，同步到本地缓存
    saveLocalCustomProblems(cloudProblems);
    return cloudProblems;
  }
  
  // 云端没有数据，使用本地缓存
  return getLocalCustomProblems();
}

/** 
 * 添加自定义题目
 */
export async function addCustomProblem(problemData: Partial<Problem>): Promise<Problem> {
  const customId = `custom-${Date.now()}`;
  
  const newProblem: Problem = {
    ...problemData,
    id: customId,
    systemId: customId,
    created_at: new Date().toISOString(),
    published: true,
    is_custom: true,
  } as Problem;
  
  // 保存到本地（始终保存，即使云端失败）
  const local = getLocalCustomProblems();
  local.push(newProblem);
  saveLocalCustomProblems(local);
  console.log(`[自定义题目] 已保存到本地: ${customId}`);
  
  // 保存到云端（异步，不阻塞）
  saveToCloud(newProblem).catch(err => {
    console.warn(`[自定义题目] 云端同步失败，数据已保存到本地: ${err.message}`);
  });
  
  return newProblem;
}

/** 
 * 删除自定义题目
 */
export async function removeCustomProblem(customId: string): Promise<void> {
  // 从本地删除
  const local = getLocalCustomProblems();
  const filtered = local.filter(p => p.systemId !== customId && p.id !== customId);
  saveLocalCustomProblems(filtered);
  
  // 从云端删除
  await deleteFromCloud(customId);
}

/** 
 * 获取所有覆盖版本（系统题目的修改）
 * 策略：云端优先，失败用本地缓存
 */
export async function getProblemOverrides(): Promise<Map<string, Problem>> {
  // 先尝试从云端获取
  const cloudOverrides = await fetchCloudOverrides();
  
  if (cloudOverrides.size > 0) {
    // 云端有数据，同步到本地缓存
    saveLocalOverrides(cloudOverrides);
    return cloudOverrides;
  }
  
  // 云端没有数据，使用本地缓存
  return getLocalOverrides();
}

/** 
 * 同步获取覆盖版本（用于不需要等待异步的场景）
 */
export function getProblemOverridesSync(): Map<string, Problem> {
  return getLocalOverrides();
}

/** 
 * 保存系统题目的覆盖版本（会同步到云端）
 */
export async function overrideSystemProblem(systemId: string, problemData: Partial<Problem>): Promise<void> {
  // 使用唯一的 override id，避免与原始题目冲突
  const overrideId = `override-${systemId}-${Date.now()}`;
  const override: Problem = {
    ...problemData,
    systemId,
    id: overrideId,  // 使用唯一的 id，不与原始题目冲突
    created_at: new Date().toISOString(),
    published: true,
    is_overridden: true,
    is_custom: false,
  } as Problem;
  
  // 保存到本地
  const overrides = getLocalOverrides();
  overrides.set(systemId, override);
  saveLocalOverrides(overrides);
  
  // 保存到云端
  await saveToCloud(override);
  
  console.log(`[覆盖题目] 已保存并同步到云端: ${systemId}`);
}

/** 
 * 恢复系统题目（删除覆盖版本）
 */
export async function restoreSystemProblem(systemId: string): Promise<void> {
  // 从本地删除
  const overrides = getLocalOverrides();
  overrides.delete(systemId);
  saveLocalOverrides(overrides);
  
  // 从云端删除
  await deleteFromCloud(systemId);
  
  console.log(`[恢复题目] 已删除: ${systemId}`);
}

/** 
 * 获取所有自定义题目和覆盖版本的总数
 */
export async function getCustomCount(): Promise<number> {
  const [custom, overrides] = await Promise.all([
    getCustomProblems(),
    getProblemOverrides(),
  ]);
  return custom.length + overrides.size;
}
