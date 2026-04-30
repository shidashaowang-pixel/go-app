import type { Course, AnimationStep } from '@/types/types';

/**
 * 内置动画微课数据
 * 当 Supabase 数据库中没有课程时，作为 fallback 显示
 * id 使用 'builtin-' 前缀，CourseDetail 页面可识别并直接渲染
 */

// 围棋基础规则 - 从介绍到棋盘
const goBasicsSteps: AnimationStep[] = [
  { moves: [], narration: '欢迎来到围棋世界！今天我们一起学习围棋的基本规则。', duration: 4 },
  { moves: [], narration: '围棋是一种古老的策略棋类游戏，起源于中国，有着四千多年的历史。', duration: 4 },
  { moves: [], narration: '围棋的棋盘是正方形的，由横竖各19条线组成，我们叫它19路棋盘。', duration: 4 },
  { moves: [], narration: '对于初学者，我们也可以用9路或13路的小棋盘来练习。', duration: 3 },
  { moves: [{ x: 4, y: 4, color: 'black' }], narration: '围棋在交叉点上落子。黑棋先行，可以下在棋盘上任何空的位置。这里我们下在天元——棋盘正中央。', duration: 5, highlights: [{ x: 4, y: 4, type: 'circle' }] },
  { moves: [{ x: 4, y: 4, color: 'black' }, { x: 2, y: 6, color: 'white' }], narration: '白棋后行，两人交替落子，可以下在棋盘任意空位，每人每次只能下一手棋。', duration: 4 },
  { moves: [{ x: 4, y: 4, color: 'black' }, { x: 2, y: 6, color: 'white' }, { x: 6, y: 2, color: 'black' }], narration: '棋子一旦落在棋盘上，就不能移动了，只能选择在哪里落子。', duration: 4 },
  { moves: [{ x: 4, y: 4, color: 'black' }, { x: 2, y: 6, color: 'white' }, { x: 6, y: 2, color: 'black' }, { x: 2, y: 2, color: 'white' }], narration: '围棋的目标是围地——用棋子围住尽可能多的地盘，谁围的地大，谁就赢！', duration: 5 },
  { moves: [], narration: '好了，记住这三个要点：交替落子、不能移动、围地取胜！', duration: 3 },
];

// 吃子与气 - 演示气的概念和吃子
const captureSteps: AnimationStep[] = [
  { moves: [], narration: '这节课我们学习围棋中最有趣的概念——"吃子"！', duration: 3 },
  { moves: [], narration: '要想吃子，首先要知道什么是"气"。', duration: 2 },
  { moves: [{ x: 4, y: 4, color: 'black' }], narration: '看，这颗黑棋有4条"气"——就是上下左右四个方向上相邻的空交叉点。', duration: 5, highlights: [{ x: 3, y: 4, type: 'cross' }, { x: 5, y: 4, type: 'cross' }, { x: 4, y: 3, type: 'cross' }, { x: 4, y: 5, type: 'cross' }] },
  { moves: [{ x: 4, y: 4, color: 'black' }, { x: 3, y: 4, color: 'white' }], narration: '白棋堵住了黑棋的一条气，现在黑棋只剩3口气了。', duration: 4, highlights: [{ x: 5, y: 4, type: 'cross' }, { x: 4, y: 3, type: 'cross' }, { x: 4, y: 5, type: 'cross' }] },
  { moves: [{ x: 4, y: 4, color: 'black' }, { x: 3, y: 4, color: 'white' }, { x: 5, y: 4, color: 'white' }], narration: '白棋继续堵，又少了一口气，黑棋只剩2口气了。', duration: 4, highlights: [{ x: 4, y: 3, type: 'cross' }, { x: 4, y: 5, type: 'cross' }] },
  { moves: [{ x: 4, y: 4, color: 'black' }, { x: 3, y: 4, color: 'white' }, { x: 5, y: 4, color: 'white' }, { x: 4, y: 3, color: 'white' }], narration: '只剩最后1口气了！白棋再下一步，就能把黑棋提掉！', duration: 4, highlights: [{ x: 4, y: 5, type: 'cross' }] },
  { moves: [{ x: 4, y: 4, color: 'black' }, { x: 3, y: 4, color: 'white' }, { x: 5, y: 4, color: 'white' }, { x: 4, y: 3, color: 'white' }, { x: 4, y: 5, color: 'white' }], narration: '好！白棋落下最后一口气，黑棋被全部围住——黑棋被"提"走了！', duration: 5 },
  { moves: [], narration: '记住这个口诀：气被堵光，棋子死翘翘！被提掉的棋子会从棋盘上消失。', duration: 4 },
];

// 做眼活棋 - 演示眼和活棋概念
const eyeAndLifeSteps: AnimationStep[] = [
  { moves: [], narration: '学完吃子，我们来学习最重要的生存法则——"做眼活棋"！', duration: 3 },
  { moves: [], narration: '棋子没气就会被提走。但如果能做出两只"眼"，这块棋就永远死不了。', duration: 4 },
  { moves: [
    { x: 2, y: 2, color: 'black' }, { x: 3, y: 2, color: 'black' }, { x: 4, y: 2, color: 'black' },
    { x: 2, y: 3, color: 'black' }, { x: 4, y: 3, color: 'black' },
    { x: 2, y: 4, color: 'black' }, { x: 3, y: 4, color: 'black' }, { x: 4, y: 4, color: 'black' },
  ], narration: '看，黑棋围成了一个圈，中间留下一个空点 [3,3]。这就是一只"眼"。', duration: 5, highlights: [{ x: 3, y: 3, type: 'square' }] },
  { moves: [
    { x: 2, y: 2, color: 'black' }, { x: 3, y: 2, color: 'black' }, { x: 4, y: 2, color: 'black' },
    { x: 2, y: 3, color: 'black' }, { x: 4, y: 3, color: 'black' },
    { x: 2, y: 4, color: 'black' }, { x: 3, y: 4, color: 'black' }, { x: 4, y: 4, color: 'black' },
    { x: 5, y: 2, color: 'black' }, { x: 6, y: 2, color: 'black' },
    { x: 6, y: 3, color: 'black' },
    { x: 5, y: 4, color: 'black' }, { x: 6, y: 4, color: 'black' },
  ], narration: '现在黑棋有两个眼了！左边一个 [3,3]，右边一个 [5,3]。', duration: 5, highlights: [{ x: 3, y: 3, type: 'square' }, { x: 5, y: 3, type: 'square' }] },
  { moves: [
    { x: 2, y: 2, color: 'black' }, { x: 3, y: 2, color: 'black' }, { x: 4, y: 2, color: 'black' },
    { x: 2, y: 3, color: 'black' }, { x: 4, y: 3, color: 'black' },
    { x: 2, y: 4, color: 'black' }, { x: 3, y: 4, color: 'black' }, { x: 4, y: 4, color: 'black' },
    { x: 5, y: 2, color: 'black' }, { x: 6, y: 2, color: 'black' },
    { x: 6, y: 3, color: 'black' },
    { x: 5, y: 4, color: 'black' }, { x: 6, y: 4, color: 'black' },
  ], narration: '白棋如果下在 [3,3]，它既没有气也不能提掉黑棋（因为黑棋在 [5,3] 还有眼），所以这是"禁着点"，禁止落子！', duration: 5, highlights: [{ x: 3, y: 3, type: 'cross' }] },
  { moves: [], narration: '同理，白棋也不能下在 [5,3]。因为无法同时下在两个眼位，黑棋就永远活在了棋盘上！', duration: 5 },
  { moves: [], narration: '记住：两只真眼就是活棋。这是围棋中最核心的生存法则！', duration: 4 },
];

// 打劫规则 - 演示劫的规则
const koSteps: AnimationStep[] = [
  { moves: [], narration: '这节课学习围棋中最独特的规则——"打劫"！', duration: 3 },
  { moves: [
    { x: 3, y: 2, color: 'black' }, { x: 2, y: 3, color: 'black' }, { x: 4, y: 3, color: 'black' },
    { x: 3, y: 3, color: 'white' }, { x: 2, y: 4, color: 'white' }, { x: 4, y: 4, color: 'white' }, { x: 3, y: 5, color: 'white' },
  ], narration: '看，现在的形状：黑棋围住了 [3,3] 的白子，白棋也围住了 [3,4] 这个空位。', duration: 5 },
  { moves: [
    { x: 3, y: 2, color: 'black' }, { x: 2, y: 3, color: 'black' }, { x: 4, y: 3, color: 'black' },
    { x: 2, y: 4, color: 'white' }, { x: 4, y: 4, color: 'white' }, { x: 3, y: 5, color: 'white' },
    { x: 3, y: 4, color: 'black' },
  ], narration: '黑棋下在 [3,4]，吃掉了白棋在 [3,3] 的一颗子！', duration: 4 },
  { moves: [], narration: '如果白棋马上在 [3,3] 提回黑子，棋局就会陷入无限循环。所以规则规定：不能立即提回！', duration: 5 },
  { moves: [
    { x: 3, y: 2, color: 'black' }, { x: 2, y: 3, color: 'black' }, { x: 4, y: 3, color: 'black' },
    { x: 2, y: 4, color: 'white' }, { x: 4, y: 4, color: 'white' }, { x: 3, y: 5, color: 'white' },
    { x: 3, y: 4, color: 'black' },
    { x: 7, y: 7, color: 'white' },
  ], narration: '白棋必须先在别处下一手，比如 [7,7]。这叫"寻劫"。', duration: 5 },
  { moves: [
    { x: 3, y: 2, color: 'black' }, { x: 2, y: 3, color: 'black' }, { x: 4, y: 3, color: 'black' },
    { x: 2, y: 4, color: 'white' }, { x: 4, y: 4, color: 'white' }, { x: 3, y: 5, color: 'white' },
    { x: 3, y: 4, color: 'black' },
    { x: 7, y: 7, color: 'white' }, { x: 7, y: 6, color: 'black' },
  ], narration: '黑棋跟着下在 [7,6] 应劫。现在白棋可以回提了！', duration: 4 },
  { moves: [
    { x: 3, y: 2, color: 'black' }, { x: 2, y: 3, color: 'black' }, { x: 4, y: 3, color: 'black' },
    { x: 2, y: 4, color: 'white' }, { x: 4, y: 4, color: 'white' }, { x: 3, y: 5, color: 'white' },
    { x: 7, y: 7, color: 'white' }, { x: 7, y: 6, color: 'black' },
    { x: 3, y: 3, color: 'white' },
  ], narration: '好，白棋现在可以在 [3,3] 提回黑子。这就是"打劫"的完整过程！', duration: 5 },
];

export const builtinCourses: Course[] = [
  {
    id: 'builtin-go-basics',
    title: '围棋基础规则',
    description: '从零开始学习围棋的基本规则：落子、交替、围地取胜',
    type: 'animation',
    content_url: null,
    cover_image_url: null,
    teacher_id: 'system',
    duration: 8,
    animation_steps: goBasicsSteps,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'builtin-capture',
    title: '吃子与气',
    description: '学习"气"的概念，掌握吃子的基本方法',
    type: 'animation',
    content_url: null,
    cover_image_url: null,
    teacher_id: 'system',
    duration: 8,
    animation_steps: captureSteps,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'builtin-eye-life',
    title: '做眼活棋',
    description: '学习"眼"的概念，掌握做活的基本方法',
    type: 'animation',
    content_url: null,
    cover_image_url: null,
    teacher_id: 'system',
    duration: 7,
    animation_steps: eyeAndLifeSteps,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'builtin-ko',
    title: '打劫规则',
    description: '学习"劫"的概念，理解为什么不能立即提回',
    type: 'animation',
    content_url: null,
    cover_image_url: null,
    teacher_id: 'system',
    duration: 8,
    animation_steps: koSteps,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
