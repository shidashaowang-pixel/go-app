/**
 * IndexedDB 本地数据库
 * 特点：
 * - 跨浏览器共享（Chrome/Firefox/Edge 等）
 * - 跨用户共享（同一台电脑任何账户都能访问）
 * - 存储空间大（通常 50MB 以上）
 */

const DB_NAME = 'goapp_local';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

/** 打开数据库 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] 打开数据库失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[IndexedDB] 数据库打开成功');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // 创建题目存储
      if (!database.objectStoreNames.contains('problems')) {
        const store = database.createObjectStore('problems', { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('updated_at', 'updated_at', { unique: false });
        console.log('[IndexedDB] 创建 problems 对象存储');
      }

      // 创建题目列表索引（用于快速查询所有本地题目）
      if (!database.objectStoreNames.contains('problem_index')) {
        database.createObjectStore('problem_index', { keyPath: 'id' });
        console.log('[IndexedDB] 创建 problem_index 对象存储');
      }

      // 创建学习进度存储
      if (!database.objectStoreNames.contains('progress')) {
        const progressStore = database.createObjectStore('progress', { keyPath: 'id' });
        progressStore.createIndex('problem_id', 'problem_id', { unique: false });
        console.log('[IndexedDB] 创建 progress 对象存储');
      }

      // 创建课程存储（用于云端失败时的本地备份）
      if (!database.objectStoreNames.contains('courses')) {
        const courseStore = database.createObjectStore('courses', { keyPath: 'id' });
        courseStore.createIndex('teacher_id', 'teacher_id', { unique: false });
        courseStore.createIndex('synced', 'synced', { unique: false });
        console.log('[IndexedDB] 创建 courses 对象存储');
      }
    };
  });
}

/** 保存题目到 IndexedDB */
export async function saveProblemToIndexedDB(problem: any): Promise<void> {
  try {
    const database = await openDB();
    const problemId = problem.id || `local-${Date.now()}`;
    
    const problemData = {
      ...problem,
      id: problemId,
      updated_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['problems', 'problem_index'], 'readwrite');
      const problemStore = transaction.objectStore('problems');
      const indexStore = transaction.objectStore('problem_index');

      problemStore.put(problemData);
      indexStore.put({ id: problemId, updated_at: problemData.updated_at });

      transaction.oncomplete = () => {
        console.log(`[IndexedDB] 保存题目成功: ${problemId}`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[IndexedDB] 保存题目失败:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 保存题目异常:', e);
    throw e;
  }
}

/** 从 IndexedDB 获取单个题目 */
export async function getProblemFromIndexedDB(id: string): Promise<any | null> {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['problems'], 'readonly');
      const store = transaction.objectStore('problems');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('[IndexedDB] 获取题目失败:', request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 获取题目异常:', e);
    return null;
  }
}

/** 获取 IndexedDB 中的所有本地题目 */
export async function getAllProblemsFromIndexedDB(): Promise<any[]> {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['problems'], 'readonly');
      const store = transaction.objectStore('problems');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        console.log(`[IndexedDB] 获取到 ${results.length} 个本地题目`);
        resolve(results);
      };

      request.onerror = () => {
        console.error('[IndexedDB] 获取所有题目失败:', request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 获取所有题目异常:', e);
    return [];
  }
}

/** 删除 IndexedDB 中的题目 */
export async function deleteProblemFromIndexedDB(id: string): Promise<void> {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['problems', 'problem_index'], 'readwrite');
      const problemStore = transaction.objectStore('problems');
      const indexStore = transaction.objectStore('problem_index');

      problemStore.delete(id);
      indexStore.delete(id);

      transaction.oncomplete = () => {
        console.log(`[IndexedDB] 删除题目成功: ${id}`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[IndexedDB] 删除题目失败:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 删除题目异常:', e);
    throw e;
  }
}

/** 检查 IndexedDB 是否支持 */
export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** 导出数据（用于调试或备份） */
export async function exportAllData(): Promise<{ problems: any[] }> {
  const problems = await getAllProblemsFromIndexedDB();
  return { problems };
}

/** 清除所有本地数据 */
export async function clearAllData(): Promise<void> {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['problems', 'problem_index', 'progress'], 'readwrite');
      const problemStore = transaction.objectStore('problems');
      const indexStore = transaction.objectStore('problem_index');
      const progressStore = transaction.objectStore('progress');

      problemStore.clear();
      indexStore.clear();
      progressStore.clear();

      transaction.oncomplete = () => {
        console.log('[IndexedDB] 清除所有数据成功');
        resolve();
      };

      transaction.onerror = () => {
        console.error('[IndexedDB] 清除数据失败:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 清除数据异常:', e);
    throw e;
  }
}

// ========== 课程/微课本地备份相关 ==========

/** 课程数据结构 */
export interface LocalCourse {
  id: string;
  title: string;
  description: string | null;
  type: 'video' | 'animation' | 'article';
  content_url: string | null;
  cover_image_url: string | null;
  duration: number | null;
  teacher_id: string;
  published: boolean;
  animation_steps: any[] | null;
  created_at: string;
  updated_at: string;
  synced: boolean; // 是否已同步到云端
  local_only?: boolean; // 是否是本地创建的
}

/** 保存课程到 IndexedDB（用于云端失败时的本地备份） */
export async function saveCourseToIndexedDB(course: LocalCourse): Promise<void> {
  try {
    const database = await openDB();

    const courseData = {
      ...course,
      updated_at: new Date().toISOString(),
      synced: false, // 本地保存的课程标记为未同步
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['courses'], 'readwrite');
      const store = transaction.objectStore('courses');

      store.put(courseData);

      transaction.oncomplete = () => {
        console.log(`[IndexedDB] 保存课程到本地: ${course.id} - ${course.title}`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[IndexedDB] 保存课程失败:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 保存课程异常:', e);
    throw e;
  }
}

/** 从 IndexedDB 获取课程 */
export async function getCourseFromIndexedDB(id: string): Promise<LocalCourse | null> {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['courses'], 'readonly');
      const store = transaction.objectStore('courses');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('[IndexedDB] 获取课程失败:', request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 获取课程异常:', e);
    return null;
  }
}

/** 获取 IndexedDB 中的所有本地课程 */
export async function getAllCoursesFromIndexedDB(): Promise<LocalCourse[]> {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['courses'], 'readonly');
      const store = transaction.objectStore('courses');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        console.log(`[IndexedDB] 获取到 ${results.length} 个本地课程`);
        resolve(results);
      };

      request.onerror = () => {
        console.error('[IndexedDB] 获取所有课程失败:', request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 获取所有课程异常:', e);
    return [];
  }
}

/** 删除 IndexedDB 中的课程 */
export async function deleteCourseFromIndexedDB(id: string): Promise<void> {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['courses'], 'readwrite');
      const store = transaction.objectStore('courses');

      store.delete(id);

      transaction.oncomplete = () => {
        console.log(`[IndexedDB] 删除本地课程: ${id}`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[IndexedDB] 删除课程失败:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 删除课程异常:', e);
    throw e;
  }
}

/** 标记课程为已同步 */
export async function markCourseSynced(id: string): Promise<void> {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['courses'], 'readwrite');
      const store = transaction.objectStore('courses');
      const request = store.get(id);

      request.onsuccess = () => {
        const course = request.result;
        if (course) {
          course.synced = true;
          store.put(course);
        }
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 标记课程同步失败:', e);
  }
}

// ========== 学习进度相关 ==========

/** 保存学习进度到 IndexedDB */
export async function saveProgressToIndexedDB(
  userId: string,
  problemId: string | null,
  courseId: string | null,
  progress: number,
  completed: boolean
): Promise<void> {
  try {
    const database = await openDB();
    // 根据类型生成唯一ID
    const progressId = problemId 
      ? `problem_${userId}_${problemId}`
      : `course_${userId}_${courseId}`;

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');

      store.put({
        id: progressId,
        user_id: userId,
        problem_id: problemId,
        course_id: courseId,
        progress,
        completed,
        last_accessed_at: new Date().toISOString(),
      });

      transaction.oncomplete = () => {
        console.log(`[IndexedDB] 保存进度成功: ${progressId}`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[IndexedDB] 保存进度失败:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 保存进度异常:', e);
    throw e;
  }
}

/** 获取用户在 IndexedDB 中的所有学习进度 */
export async function getAllProgressFromIndexedDB(userId: string): Promise<any[]> {
  try {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['progress'], 'readonly');
      const store = transaction.objectStore('progress');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result || []).filter(p => p.user_id === userId);
        console.log(`[IndexedDB] 获取到 ${results.length} 条学习进度`);
        resolve(results);
      };

      request.onerror = () => {
        console.error('[IndexedDB] 获取进度失败:', request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('[IndexedDB] 获取进度异常:', e);
    return [];
  }
}
