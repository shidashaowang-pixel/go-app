/**
 * 围棋文化多场景故事动画组件
 * 支持连贯的故事情节动画，让典故真正"活"起来
 */
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { SceneAnimation, SceneCharacter } from '@/types/types';
// 导入已有的角色组件
import StoryCharacters, { EmperorYao, DanZhu, ImmortalBoy } from './StoryCharacters';

/* ──────────── 动画场景步骤类型 ──────────── */
export interface StorySceneStep {
  /** 场景标题 */
  title?: string;
  /** 场景描述/旁白 */
  narration: string;
  /** 场景背景 */
  background: SceneAnimation['background'];
  /** 场景中的角色 */
  characters: Array<{
    type: SceneCharacter['type'];
    position: 'left' | 'center' | 'right';
    action: 'standing' | 'sitting' | 'playing' | 'happy' | 'worried' | 'calm' | 'celebrating' | 'teaching' | 'watching' | 'thinking';
    dialog?: string;
  }>;
  /** 场景特效 */
  effects: SceneAnimation['effects'];
  /** 停留时间(秒)，0=手动翻页 */
  duration: number;
}

/* ──────────── 谢安下棋故事 ──────────── */
const xieAnStory: StorySceneStep[] = [
  {
    title: '前秦大军压境',
    narration: '东晋时期，前秦苻坚率百万大军南下，号称"投鞭断流"。东晋朝野上下一片恐慌，丞相谢安却临危不乱...',
    background: 'palace',
    characters: [
      { type: 'xie-an', position: 'center', action: 'calm', dialog: '不必惊慌，诸位稍安勿躁。' },
    ],
    effects: ['wind'],
    duration: 4,
  },
  {
    title: '与谢玄下棋',
    narration: '谢安邀请侄子谢玄到别墅下棋。谢玄心里着急，担心前线战事，棋下得心不在焉。',
    background: 'palace',
    characters: [
      { type: 'xie-an', position: 'left', action: 'playing', dialog: '贤侄，该你落子了。' },
      { type: 'xiexuan', position: 'right', action: 'worried', dialog: '叔叔，前线战事吃紧...' },
    ],
    effects: [],
    duration: 4,
  },
  {
    title: '运筹帷幄',
    narration: '谢安若无其事地继续下棋，仿佛一切尽在掌握。实际上，他早已暗中安排好了战略部署。',
    background: 'mountain',
    characters: [
      { type: 'xie-an', position: 'center', action: 'thinking', dialog: '棋如战事，胸有成竹方能制胜。' },
    ],
    effects: [],
    duration: 4,
  },
  {
    title: '捷报传来',
    narration: '淝水之战大捷！东晋以八万精兵击溃前秦百万大军！谢安依然平静地下完了棋。',
    background: 'palace',
    characters: [
      { type: 'xie-an', position: 'center', action: 'happy', dialog: '好！大胜！' },
    ],
    effects: ['sparkles'],
    duration: 4,
  },
  {
    title: '从容品格',
    narration: '当有人问谢安为何如此镇定时，他只是微微一笑。这正是围棋培养出的沉着品格——越是危急时刻，越要冷静如水。',
    background: 'palace',
    characters: [
      { type: 'xie-an', position: 'center', action: 'calm', dialog: '不过是赢了一盘棋罢了。' },
    ],
    effects: [],
    duration: 5,
  },
];

/* ──────────── 丹朱学棋故事 ──────────── */
const danZhuStory: StorySceneStep[] = [
  {
    title: '尧帝教子',
    narration: '上古时期，尧帝是天下共主，但他有个儿子叫丹朱，性格暴躁，不太听话。尧帝想找一个方法让儿子安静下来...',
    background: 'palace',
    characters: [
      { type: 'emperor-yao', position: 'left', action: 'standing', dialog: '丹朱，过来，父王教你下棋。' },
      { type: 'dan-zhu', position: 'right', action: 'standing', dialog: '我才不要学那些无聊的东西！' },
    ],
    effects: [],
    duration: 4,
  },
  {
    title: '发明围棋',
    narration: '尧帝在地上画了横竖交叉的网格，用石子做棋子，教丹朱围地。丹朱第一次见到这样新奇的游戏，眼睛亮了起来。',
    background: 'palace',
    characters: [
      { type: 'emperor-yao', position: 'left', action: 'teaching', dialog: '看，黑先白后，围住对方的棋子就算赢。' },
      { type: 'dan-zhu', position: 'right', action: 'thinking', dialog: '这个...好像挺有意思的？' },
    ],
    effects: ['sparkles'],
    duration: 4,
  },
  {
    title: '丹朱学棋',
    narration: '丹朱在学习围棋的过程中，渐渐变得安静专注。他发现下棋需要思考、耐心，渐渐学会了控制自己的脾气。',
    background: 'palace',
    characters: [
      { type: 'emperor-yao', position: 'left', action: 'happy', dialog: '不错，你进步很快！' },
      { type: 'dan-zhu', position: 'right', action: 'happy', dialog: '父王，我还想再下一盘！' },
    ],
    effects: [],
    duration: 4,
  },
  {
    title: '围棋传承',
    narration: '从此，围棋传承四千年，成为中华文化的瑰宝。尧帝用棋盘教会了儿子耐心与智慧，这就是围棋的起源。',
    background: 'palace',
    characters: [
      { type: 'emperor-yao', position: 'center', action: 'happy', dialog: '围棋之道，在于静心思考。' },
    ],
    effects: ['sparkles'],
    duration: 5,
  },
];

/* ──────────── 烂柯传说故事 ──────────── */
const lankezhuanStory: StorySceneStep[] = [
  {
    title: '樵夫王质',
    narration: '晋朝时，樵夫王质到衢州石室山砍柴。走着走着，他发现一个山洞里透出奇异的光芒...',
    background: 'mountain',
    characters: [
      { type: 'woodcutter', position: 'center', action: 'watching', dialog: '这山洞里有光...' },
    ],
    effects: [],
    duration: 4,
  },
  {
    title: '仙人下棋',
    narration: '洞中两位童子正在下围棋，棋盘上黑白纵横，光芒闪烁。王质被这神奇的棋局吸引，坐在旁边观看。',
    background: 'cave',
    characters: [
      { type: 'woodcutter', position: 'left', action: 'watching', dialog: '这棋太精彩了！' },
      { type: 'immortal-boy', position: 'center', action: 'playing', dialog: '来，吃颗仙枣。' },
      { type: 'immortal-boy', position: 'right', action: 'playing', dialog: '这局你输了。' },
    ],
    effects: ['sparkles'],
    duration: 5,
  },
  {
    title: '时光飞逝',
    narration: '一局棋下完，童子说："你该回家了，看看你的斧头吧。"王质低头一看，斧柄竟然已经腐烂成灰了！',
    background: 'cave',
    characters: [
      { type: 'woodcutter', position: 'center', action: 'surprised', dialog: '怎么可能！才下了一盘棋！' },
    ],
    effects: ['time-lapse'],
    duration: 5,
  },
  {
    title: '物是人非',
    narration: '等他回到村里，发现已经过去了数十年，认识的人都不在了，村子也变了样。王质这才明白，他遇到的是仙人。',
    background: 'village',
    characters: [
      { type: 'woodcutter', position: 'center', action: 'standing', dialog: '这是...我的家吗？' },
    ],
    effects: [],
    duration: 5,
  },
];

/* ──────────── 王积薪遇仙故事 ──────────── */
const wangjixinStory: StorySceneStep[] = [
  {
    title: '安史之乱',
    narration: '唐朝安史之乱时，棋待诏王积薪跟随唐玄宗逃往四川。一天晚上，他在山中借宿，隔壁住着一位老婆婆和儿媳。',
    background: 'night',
    characters: [
      { type: 'wangjixin', position: 'center', action: 'thinking', dialog: '这深山里，不知能否借宿...' },
    ],
    effects: [],
    duration: 4,
  },
  {
    title: '以口代手',
    narration: '深夜，王积薪听到隔壁婆媳二人竟然在以口代手下围棋——她们不用棋盘棋子，全凭口述棋步！',
    background: 'night',
    characters: [
      { type: 'elderly-woman', position: 'left', action: 'thinking', dialog: '东五南九...飞...' },
      { type: 'young-woman', position: 'right', action: 'thinking', dialog: '西五北十二...粘。' },
    ],
    effects: [],
    duration: 5,
  },
  {
    title: '暗暗记下',
    narration: '王积薪屏息凝神，暗暗记下每一句棋步。他发现这棋局深奥无比，远超自己的棋力！',
    background: 'night',
    characters: [
      { type: 'wangjixin', position: 'center', action: 'surprised', dialog: '这棋路...我从未见过！' },
    ],
    effects: [],
    duration: 4,
  },
  {
    title: '仙人指点',
    narration: '第二天，王积薪虚心请教两位妇人。老婆婆淡淡一笑，说了一句意味深长的话...',
    background: 'mountain',
    characters: [
      { type: 'elderly-woman', position: 'left', action: 'standing', dialog: '你可以跟人下棋娱乐。' },
      { type: 'wangjixin', position: 'center', action: 'thinking', dialog: '多谢前辈指点！' },
    ],
    effects: [],
    duration: 5,
  },
  {
    title: '棋道无止境',
    narration: '"但不要妄想成为国手。"老婆婆说完便消失不见。王积薪这才明白，他遇到的是仙人。围棋的境界深不可测，永无止境。',
    background: 'mountain',
    characters: [
      { type: 'wangjixin', position: 'center', action: 'thinking', dialog: '棋道无边，学无止境...' },
    ],
    effects: ['sparkles'],
    duration: 5,
  },
];

/* ──────────── 黄龙士与徐星友故事 ──────────── */
const huanglongshiStory: StorySceneStep[] = [
  {
    title: '棋圣黄龙士',
    narration: '清朝康熙年间，有一位被称为"棋圣"的围棋高手——黄龙士。他的棋风大气磅礴，像长江大河一泻千里，被后人尊为棋圣。',
    background: 'palace',
    characters: [
      { type: 'huanglongshi', position: 'center', action: 'playing', dialog: '棋如流水，势不可挡！' },
    ],
    effects: [],
    duration: 4,
  },
  {
    title: '大器晚成',
    narration: '徐星友是黄龙士的挚友，也是大器晚成的代表。他50多岁才开始学棋，起初棋艺平平，但他没有放弃。',
    background: 'palace',
    characters: [
      { type: 'xuxingyou', position: 'center', action: 'thinking', dialog: '活到老，学到老...' },
    ],
    effects: [],
    duration: 4,
  },
  {
    title: '让三子',
    narration: '黄龙士为了帮助徐星友进步，故意在对局中让他三子。这种以强让弱、悉心指导的方式，后来被称为围棋佳话"血泪篇"。',
    background: 'palace',
    characters: [
      { type: 'huanglongshi', position: 'left', action: 'teaching', dialog: '你能让我三子，已经很不错了。' },
      { type: 'xuxingyou', position: 'right', action: 'happy', dialog: '多谢前辈悉心指导！' },
    ],
    effects: [],
    duration: 5,
  },
  {
    title: '刻苦钻研',
    narration: '徐星友在黄龙士的指导下，加上自己的刻苦努力，日夜钻研棋谱，棋力突飞猛进。',
    background: 'night',
    characters: [
      { type: 'xuxingyou', position: 'center', action: 'thinking', dialog: '这步棋...我再想想...' },
    ],
    effects: [],
    duration: 4,
  },
  {
    title: '双璧成佳话',
    narration: '从此，黄龙士和徐星友成为中国围棋史上的双璧。这个故事告诉我们：学习围棋需要好老师的引导，更需要自己的刻苦努力。不管什么时候开始学，都不算晚！',
    background: 'palace',
    characters: [
      { type: 'huanglongshi', position: 'left', action: 'happy', dialog: '棋道无涯！' },
      { type: 'xuxingyou', position: 'right', action: 'happy', dialog: '学无止境！' },
    ],
    effects: ['sparkles'],
    duration: 5,
  },
];

/* ──────────── 故事数据映射 ──────────── */
export const storyAnimations: Record<string, StorySceneStep[]> = {
  'xie-an': xieAnStory,
  'dan-zhu': danZhuStory,
  'lan-ke': lankezhuanStory,
  'wangjixin': wangjixinStory,
  'huanglongshi': huanglongshiStory,
};

/* ──────────── 谢安角色（带动画） ──────────── */
function XieAnCharacter({ action, dialog }: { action: string; dialog?: string }) {
  const eyeExpression = () => {
    if (action === 'surprised') return <><circle cx="40" cy="33" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1" /><circle cx="40" cy="33" r="3" fill="#1a1a1a" /><circle cx="60" cy="33" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1" /><circle cx="60" cy="33" r="3" fill="#1a1a1a" /></>;
    if (action === 'happy') return <><path d="M36 32 Q40 28 44 32" stroke="#1a1a1a" strokeWidth="2" fill="none" /><path d="M56 32 Q60 28 64 32" stroke="#1a1a1a" strokeWidth="2" fill="none" /></>;
    if (action === 'thinking') return <><line x1="38" y1="33" x2="46" y2="33" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" /><ellipse cx="62" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="63" cy="32" r="1" fill="white" /><ellipse cx="50" cy="46" rx="3" ry="2" fill="#C06040" opacity="0.6" /></>;
    if (action === 'worried') return <><ellipse cx="40" cy="34" rx="3" ry="4" fill="#1a1a1a" /><ellipse cx="60" cy="34" rx="3" ry="4" fill="#1a1a1a" /><path d="M36 28 Q40 30 44 28" stroke="#666" strokeWidth="1" fill="none" /><path d="M56 28 Q60 30 64 28" stroke="#666" strokeWidth="1" fill="none" /></>;
    return <><ellipse cx="40" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="41" cy="32" r="1" fill="white" /><circle cx="61" cy="32" r="1" fill="white" /></>;
  };
  const mouthExpression = () => {
    if (action === 'surprised') return <circle cx="50" cy="46" r="4" fill="#C06040" opacity="0.6" />;
    if (action === 'happy' || action === 'celebrating') return <path d="M42 44 Q50 52 58 44" stroke="#C06040" strokeWidth="2" fill="#E87060" fillOpacity="0.3" />;
    if (action === 'thinking') return <ellipse cx="50" cy="46" rx="3" ry="2" fill="#C06040" opacity="0.6" />;
    if (action === 'worried') return <path d="M44 48 Q50 46 56 48" stroke="#C06040" strokeWidth="1.5" fill="none" />;
    return <path d="M44 44 Q50 49 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />;
  };
  const armPose = () => {
    if (action === 'playing') return <><path d="M30 65 L5 55" stroke="#2a6a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="5" cy="55" r="5" fill="#FDBCB4" /><circle cx="5" cy="52" r="4" fill="#1a1a1a" /><path d="M70 65 L95 55" stroke="#2a6a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="95" cy="55" r="5" fill="#FDBCB4" /><circle cx="95" cy="52" r="4" fill="#f5f5f0" stroke="#ccc" /></>;
    if (action === 'thinking') return <><path d="M30 70 L15 50" stroke="#2a6a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="15" cy="50" r="5" fill="#FDBCB4" /><path d="M70 70 L85 90" stroke="#2a6a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="85" cy="90" r="5" fill="#FDBCB4" /></>;
    if (action === 'celebrating' || action === 'happy') return <><path d="M30 65 L0 40" stroke="#2a6a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="0" cy="40" r="5" fill="#FDBCB4" /><path d="M70 65 L100 40" stroke="#2a6a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="100" cy="40" r="5" fill="#FDBCB4" /></>;
    return <><path d="M30 75 L15 100" stroke="#2a6a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="15" cy="100" r="5" fill="#FDBCB4" /><path d="M70 75 L85 100" stroke="#2a6a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="85" cy="100" r="5" fill="#FDBCB4" /></>;
  };
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36">
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        <path d="M28 20 L50 8 L72 20" fill="#1a1a1a" />
        <rect x="32" y="18" width="36" height="6" rx="2" fill="#2a2a2a" />
        {eyeExpression()}
        {mouthExpression()}
        <path d="M46 47 Q50 55 54 47" stroke="#555" strokeWidth="1" fill="none" />
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#2a6a4a" />
        <path d="M40 57 L50 75 L60 57" stroke="#1a5a3a" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="6" rx="2" fill="#1a5a3a" />
        {armPose()}
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-green-700 dark:text-green-400 mt-1">谢安</span>
      {dialog && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[160px] story-dialog-pop text-center">
          {dialog}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

/* ──────────── 谢玄角色 ──────────── */
function XieXuanCharacter({ action, dialog }: { action: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36">
        <circle cx="50" cy="35" r="20" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 年轻人发型 */}
        <path d="M32 25 Q50 10 68 25" fill="#1a1a1a" />
        <ellipse cx="50" cy="18" rx="12" ry="8" fill="#1a1a1a" />
        {/* 表情 */}
        {action === 'worried' ? (
          <><ellipse cx="42" cy="33" rx="3" ry="4" fill="#1a1a1a" /><ellipse cx="58" cy="33" rx="3" ry="4" fill="#1a1a1a" /><path d="M44 44 Q50 42 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" /><path d="M38 28 Q42 30 46 28" stroke="#666" strokeWidth="1" fill="none" /><path d="M54 28 Q58 30 62 28" stroke="#666" strokeWidth="1" fill="none" /></>
        ) : (
          <><ellipse cx="42" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><ellipse cx="58" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="43" cy="32" r="1" fill="white" /><circle cx="59" cy="32" r="1" fill="white" /><path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" /></>
        )}
        {/* 蓝衫身体 */}
        <path d="M32 55 L28 125 L72 125 L68 55 Q50 62 32 55Z" fill="#4a6a9a" />
        <path d="M40 55 L50 72 L60 55" stroke="#3a5a8a" strokeWidth="2" fill="none" />
        <rect x="30" y="82" width="40" height="5" rx="2" fill="#3a5a8a" />
        <path d="M32 70 L18 95" stroke="#4a6a9a" strokeWidth="7" fill="none" strokeLinecap="round" />
        <circle cx="18" cy="95" r="4" fill="#FDBCB4" />
        <path d="M68 70 L82 95" stroke="#4a6a9a" strokeWidth="7" fill="none" strokeLinecap="round" />
        <circle cx="82" cy="95" r="4" fill="#FDBCB4" />
        <rect x="35" y="123" width="12" height="5" rx="2" fill="#2a1a1a" />
        <rect x="53" y="123" width="12" height="5" rx="2" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-1">谢玄</span>
      {dialog && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop text-center">
          {dialog}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

/* ──────────── 王质（樵夫）角色 ──────────── */
function WoodcutterCharacter({ action, dialog }: { action: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36">
        {/* 头 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 斗笠 */}
        <path d="M20 25 Q50 0 80 25" fill="#c8a050" stroke="#a08030" strokeWidth="1.5" />
        <rect x="35" y="22" width="30" height="5" rx="2" fill="#b09040" />
        {/* 表情 */}
        {action === 'surprised' ? (
          <><circle cx="40" cy="33" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1" /><circle cx="40" cy="33" r="3" fill="#1a1a1a" /><circle cx="60" cy="33" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1" /><circle cx="60" cy="33" r="3" fill="#1a1a1a" /><circle cx="50" cy="46" r="4" fill="#C06040" opacity="0.6" /></>
        ) : action === 'watching' ? (
          <><ellipse cx="40" cy="33" rx="3" ry="4" fill="#1a1a1a" /><ellipse cx="60" cy="33" rx="3" ry="4" fill="#1a1a1a" /><path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" /></>
        ) : (
          <><ellipse cx="40" cy="33" rx="3" ry="3" fill="#1a1a1a" /><ellipse cx="60" cy="33" rx="3" ry="3" fill="#1a1a1a" /><path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" /></>
        )}
        {/* 身体（粗布衣） */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#8B7355" />
        <path d="M40 57 L50 75 L60 57" stroke="#6B5335" strokeWidth="2" fill="none" />
        {/* 绳带 */}
        <rect x="28" y="85" width="44" height="5" rx="2" fill="#6B5335" />
        {/* 手臂+斧头 */}
        {action === 'surprised' ? (
          <><path d="M30 70 L10 60" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="10" cy="60" r="5" fill="#FDBCB4" /><path d="M70 70 L90 60" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="90" cy="60" r="5" fill="#FDBCB4" /><rect x="86" y="48" width="3" height="15" rx="1" fill="#5a3a1a" opacity="0.6" /></>
        ) : action === 'watching' ? (
          <><path d="M30 70 L15 90" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="15" cy="90" r="5" fill="#FDBCB4" /><path d="M70 65 L85 55" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="85" cy="55" r="5" fill="#FDBCB4" /><rect x="82" y="40" width="3" height="20" rx="1" fill="#8B5A2B" /></>
        ) : (
          <><path d="M30 75 L15 100" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="15" cy="100" r="5" fill="#FDBCB4" /><path d="M70 75 L85 100" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="85" cy="100" r="5" fill="#FDBCB4" /></>
        )}
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#3a2a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#3a2a1a" />
      </svg>
      <span className="text-xs font-bold text-amber-800 dark:text-amber-400 mt-1">王质</span>
      {dialog && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[160px] story-dialog-pop text-center">
          {dialog}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

/* ──────────── 王积薪角色 ──────────── */
function WangJiXinCharacter({ action, dialog }: { action: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36">
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 文人巾帽 */}
        <path d="M30 22 L50 12 L70 22 L65 28 L35 28 Z" fill="#2a4a3a" />
        <rect x="35" y="25" width="30" height="4" rx="1" fill="#1a3a2a" />
        {/* 表情 */}
        {action === 'surprised' ? (
          <><circle cx="42" cy="33" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1" /><circle cx="42" cy="33" r="3" fill="#1a1a1a" /><circle cx="58" cy="33" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1" /><circle cx="58" cy="33" r="3" fill="#1a1a1a" /><circle cx="50" cy="46" r="4" fill="#C06040" opacity="0.6" /></>
        ) : action === 'thinking' ? (
          <><line x1="38" y1="33" x2="46" y2="33" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" /><ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="61" cy="32" r="1" fill="white" /><ellipse cx="50" cy="46" rx="3" ry="2" fill="#C06040" opacity="0.6" /></>
        ) : (
          <><ellipse cx="42" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><ellipse cx="58" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="43" cy="32" r="1" fill="white" /><circle cx="59" cy="32" r="1" fill="white" /><path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" /></>
        )}
        {/* 胡须（中年文人） */}
        <path d="M45 48 Q50 54 55 48" stroke="#555" strokeWidth="1" fill="none" />
        {/* 青灰袍 */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#5a6a7a" />
        <path d="M40 57 L50 75 L60 57" stroke="#4a5a6a" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="6" rx="2" fill="#4a5a6a" />
        <path d="M30 75 L15 100" stroke="#5a6a7a" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="15" cy="100" r="5" fill="#FDBCB4" />
        <path d="M70 75 L85 100" stroke="#5a6a7a" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="85" cy="100" r="5" fill="#FDBCB4" />
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-gray-700 dark:text-gray-400 mt-1">王积薪</span>
      {dialog && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[160px] story-dialog-pop text-center">
          {dialog}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

/* ──────────── 老婆婆角色 ──────────── */
function ElderlyWomanCharacter({ action, dialog }: { action: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36">
        <circle cx="50" cy="38" r="20" fill="#E8D0C0" stroke="#D0B0A0" strokeWidth="1.5" />
        {/* 白发 */}
        <ellipse cx="50" cy="22" rx="18" ry="12" fill="#E0E0E0" />
        <path d="M32 25 Q50 15 68 25" fill="#D0D0D0" />
        {/* 皱纹 */}
        <path d="M38 42 Q42 44 46 42" stroke="#C0B0A0" strokeWidth="1" fill="none" />
        <path d="M54 42 Q58 44 62 42" stroke="#C0B0A0" strokeWidth="1" fill="none" />
        {/* 表情 */}
        {action === 'thinking' ? (
          <><ellipse cx="42" cy="36" rx="3" ry="3" fill="#1a1a1a" /><ellipse cx="58" cy="36" rx="3" ry="3" fill="#1a1a1a" /><ellipse cx="50" cy="46" rx="3" ry="2" fill="#C06040" opacity="0.6" /></>
        ) : (
          <><ellipse cx="42" cy="36" rx="3" ry="3" fill="#1a1a1a" /><ellipse cx="58" cy="36" rx="3" ry="3" fill="#1a1a1a" /><path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" /></>
        )}
        {/* 素色衣裳 */}
        <path d="M32 58 L28 125 L72 125 L68 58 Q50 65 32 58Z" fill="#8a8a9a" />
        <path d="M40 58 L50 75 L60 58" stroke="#7a7a8a" strokeWidth="2" fill="none" />
        <rect x="30" y="85" width="40" height="5" rx="2" fill="#7a7a8a" />
        <path d="M32 70 L18 95" stroke="#8a8a9a" strokeWidth="7" fill="none" strokeLinecap="round" />
        <circle cx="18" cy="95" r="4" fill="#E8D0C0" />
        <path d="M68 70 L82 95" stroke="#8a8a9a" strokeWidth="7" fill="none" strokeLinecap="round" />
        <circle cx="82" cy="95" r="4" fill="#E8D0C0" />
        <rect x="35" y="123" width="12" height="5" rx="2" fill="#3a3a3a" />
        <rect x="53" y="123" width="12" height="5" rx="2" fill="#3a3a3a" />
      </svg>
      <span className="text-xs font-bold text-gray-600 dark:text-gray-400 mt-1">老婆婆</span>
      {dialog && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop text-center">
          {dialog}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

/* ──────────── 年轻妇人角色 ──────────── */
function YoungWomanCharacter({ action, dialog }: { action: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36">
        <circle cx="50" cy="35" r="18" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 发髻 */}
        <ellipse cx="50" cy="20" rx="14" ry="10" fill="#2a1a1a" />
        <circle cx="50" cy="12" r="5" fill="#2a1a1a" />
        {/* 步摇 */}
        <circle cx="35" cy="18" r="2" fill="#FFD700" />
        <circle cx="38" cy="22" r="1.5" fill="#FFD700" />
        {/* 表情 */}
        {action === 'thinking' ? (
          <><line x1="40" y1="33" x2="46" y2="33" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" /><ellipse cx="58" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="59" cy="32" r="1" fill="white" /><ellipse cx="50" cy="44" rx="3" ry="2" fill="#C06040" opacity="0.6" /></>
        ) : (
          <><ellipse cx="42" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><ellipse cx="58" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="43" cy="32" r="1" fill="white" /><circle cx="59" cy="32" r="1" fill="white" /><path d="M44 42 Q50 46 56 42" stroke="#C06040" strokeWidth="1.5" fill="none" /></>
        )}
        {/* 粉色衣裳 */}
        <path d="M34 53 L30 125 L70 125 L66 53 Q50 60 34 53Z" fill="#d4a0a0" />
        <path d="M42 53 L50 68 L58 53" stroke="#c09090" strokeWidth="2" fill="none" />
        <rect x="32" y="82" width="36" height="5" rx="2" fill="#c09090" />
        <path d="M34 65 L20 88" stroke="#d4a0a0" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="20" cy="88" r="4" fill="#FDBCB4" />
        <path d="M66 65 L80 88" stroke="#d4a0a0" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="80" cy="88" r="4" fill="#FDBCB4" />
        <rect x="37" y="123" width="11" height="5" rx="2" fill="#3a2a2a" />
        <rect x="52" y="123" width="11" height="5" rx="2" fill="#3a2a2a" />
      </svg>
      <span className="text-xs font-bold text-pink-700 dark:text-pink-400 mt-1">儿媳</span>
      {dialog && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop text-center">
          {dialog}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

/* ──────────── 黄龙士角色 ──────────── */
function HuangLongShiCharacter({ action, dialog }: { action: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36">
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 黑色方巾帽 */}
        <path d="M28 18 L50 8 L72 18 L68 25 L32 25 Z" fill="#1a1a1a" />
        <rect x="32" y="22" width="36" height="4" rx="1" fill="#2a2a2a" />
        {/* 表情 */}
        {action === 'teaching' ? (
          <><ellipse cx="42" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><ellipse cx="58" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="43" cy="32" r="1" fill="white" /><circle cx="59" cy="32" r="1" fill="white" /><path d="M44 44 Q50 50 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" /></>
        ) : action === 'happy' ? (
          <><path d="M36 31 Q40 27 44 31" stroke="#1a1a1a" strokeWidth="2" fill="none" /><path d="M56 31 Q60 27 64 31" stroke="#1a1a1a" strokeWidth="2" fill="none" /><path d="M42 44 Q50 52 58 44" stroke="#C06040" strokeWidth="2" fill="#E87060" fillOpacity="0.3" /></>
        ) : (
          <><ellipse cx="42" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><ellipse cx="58" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="43" cy="32" r="1" fill="white" /><circle cx="59" cy="32" r="1" fill="white" /><path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" /></>
        )}
        {/* 长须 */}
        <path d="M44 48 Q50 58 56 48" stroke="#444" strokeWidth="1.5" fill="none" />
        {/* 黄色长袍 */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#c8a020" />
        <path d="M40 57 L50 75 L60 57" stroke="#a88010" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="6" rx="2" fill="#a88010" />
        {action === 'teaching' ? (
          <><path d="M30 65 L5 55" stroke="#c8a020" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="5" cy="55" r="5" fill="#FDBCB4" /><path d="M70 65 L95 55" stroke="#c8a020" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="95" cy="55" r="5" fill="#FDBCB4" /><circle cx="5" cy="52" r="4" fill="#1a1a1a" /><circle cx="95" cy="52" r="4" fill="#f5f5f0" stroke="#ccc" /></>
        ) : action === 'happy' ? (
          <><path d="M30 60 L0 40" stroke="#c8a020" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="0" cy="40" r="5" fill="#FDBCB4" /><path d="M70 60 L100 40" stroke="#c8a020" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="100" cy="40" r="5" fill="#FDBCB4" /></>
        ) : (
          <><path d="M30 75 L15 100" stroke="#c8a020" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="15" cy="100" r="5" fill="#FDBCB4" /><path d="M70 75 L85 100" stroke="#c8a020" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="85" cy="100" r="5" fill="#FDBCB4" /></>
        )}
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 mt-1">黄龙士</span>
      {dialog && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[160px] story-dialog-pop text-center">
          {dialog}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

/* ──────────── 徐星友角色 ──────────── */
function XuXingYouCharacter({ action, dialog }: { action: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36">
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 朴素帽子 */}
        <path d="M30 20 L50 10 L70 20 L66 26 L34 26 Z" fill="#4a4a4a" />
        <rect x="35" y="23" width="30" height="4" rx="1" fill="#3a3a3a" />
        {/* 表情 */}
        {action === 'thinking' ? (
          <><line x1="38" y1="33" x2="46" y2="33" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" /><ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="61" cy="32" r="1" fill="white" /><ellipse cx="50" cy="46" rx="3" ry="2" fill="#C06040" opacity="0.6" /></>
        ) : action === 'happy' ? (
          <><path d="M36 31 Q40 27 44 31" stroke="#1a1a1a" strokeWidth="2" fill="none" /><path d="M56 31 Q60 27 64 31" stroke="#1a1a1a" strokeWidth="2" fill="none" /><path d="M42 44 Q50 52 58 44" stroke="#C06040" strokeWidth="2" fill="#E87060" fillOpacity="0.3" /></>
        ) : (
          <><ellipse cx="42" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><ellipse cx="58" cy="33" rx="3" ry="3.5" fill="#1a1a1a" /><circle cx="43" cy="32" r="1" fill="white" /><circle cx="59" cy="32" r="1" fill="white" /><path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" /></>
        )}
        {/* 花白胡须（年长） */}
        <path d="M44 48 Q50 56 56 48" stroke="#888" strokeWidth="1.5" fill="none" />
        {/* 灰褐长袍 */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#6a5a4a" />
        <path d="M40 57 L50 75 L60 57" stroke="#5a4a3a" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="6" rx="2" fill="#5a4a3a" />
        {action === 'thinking' ? (
          <><path d="M30 70 L15 50" stroke="#6a5a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="15" cy="50" r="5" fill="#FDBCB4" /><path d="M70 70 L85 90" stroke="#6a5a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="85" cy="90" r="5" fill="#FDBCB4" /></>
        ) : (
          <><path d="M30 75 L15 100" stroke="#6a5a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="15" cy="100" r="5" fill="#FDBCB4" /><path d="M70 75 L85 100" stroke="#6a5a4a" strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="85" cy="100" r="5" fill="#FDBCB4" /></>
        )}
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-1">徐星友</span>
      {dialog && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[160px] story-dialog-pop text-center">
          {dialog}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

/* ──────────── 通用角色渲染 ──────────── */
function CharacterWithAnimation({ character }: { character: StorySceneStep['characters'][0] }) {
  switch (character.type) {
    case 'xie-an':
      return <XieAnCharacter action={character.action} dialog={character.dialog} />;
    case 'xiexuan':
      return <XieXuanCharacter action={character.action} dialog={character.dialog} />;
    case 'woodcutter':
      return <WoodcutterCharacter action={character.action} dialog={character.dialog} />;
    case 'emperor-yao':
      return <EmperorYao action={character.action} dialog={character.dialog} />;
    case 'dan-zhu':
      return <DanZhu action={character.action} dialog={character.dialog} />;
    case 'immortal-boy':
      return <ImmortalBoy action={character.action} dialog={character.dialog} />;
    case 'wangjixin':
      return <WangJiXinCharacter action={character.action} dialog={character.dialog} />;
    case 'elderly-woman':
      return <ElderlyWomanCharacter action={character.action} dialog={character.dialog} />;
    case 'young-woman':
      return <YoungWomanCharacter action={character.action} dialog={character.dialog} />;
    case 'huanglongshi':
      return <HuangLongShiCharacter action={character.action} dialog={character.dialog} />;
    case 'xuxingyou':
      return <XuXingYouCharacter action={character.action} dialog={character.dialog} />;
    case 'scholar':
    default:
      return <XieAnCharacter action={character.action} dialog={character.dialog} />;
  }
}

/* ──────────── 场景背景 ──────────── */
function AnimatedBackground({ type }: { type: SceneAnimation['background'] }) {
  const backgrounds: Record<string, React.ReactNode> = {
    palace: (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100 via-amber-50 to-red-100" />
        <svg className="absolute bottom-0 w-full" viewBox="0 0 400 200">
          <rect x="0" y="150" width="400" height="50" fill="#c8a060" />
          <rect x="60" y="40" width="20" height="110" fill="#c03030" />
          <rect x="160" y="40" width="20" height="110" fill="#c03030" />
          <rect x="220" y="40" width="20" height="110" fill="#c03030" />
          <rect x="320" y="40" width="20" height="110" fill="#c03030" />
          <path d="M30 40 L200 5 L370 40Z" fill="#1a1a6e" />
          <path d="M50 40 L200 15 L350 40Z" fill="#2a2a8e" />
          <rect x="60" y="38" width="280" height="8" fill="#FFD700" />
        </svg>
      </div>
    ),
    mountain: (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-200 to-green-200" />
        <svg className="absolute bottom-0 w-full" viewBox="0 0 400 200">
          <path d="M0 200 L0 120 L80 60 L160 100 L240 40 L320 90 L400 70 L400 200Z" fill="#4a8c3f" opacity="0.6" />
          <path d="M0 200 L0 140 L100 80 L200 120 L300 70 L400 100 L400 200Z" fill="#3a7c2f" opacity="0.8" />
          <path d="M0 200 L0 160 L120 120 L240 150 L360 110 L400 130 L400 200Z" fill="#2a6c1f" />
          <circle cx="350" cy="40" r="25" fill="#FFD700" opacity="0.8" />
          <circle cx="350" cy="40" r="20" fill="#FFEC80" />
        </svg>
      </div>
    ),
    cave: (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-stone-700 via-stone-600 to-stone-800" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
          <path d="M50 300 L50 80 Q200 20 350 80 L350 300Z" fill="#1a1510" />
          <path d="M70 300 L70 90 Q200 35 330 90 L330 300Z" fill="#2a2518" />
          <ellipse cx="200" cy="100" rx="60" ry="30" fill="#FFD700" opacity="0.1" />
          <ellipse cx="200" cy="120" rx="80" ry="20" fill="#FFD700" opacity="0.05" />
          <path d="M100 80 L105 110 L110 80" fill="#3a3528" />
          <path d="M180 60 L183 90 L186 60" fill="#3a3528" />
          <path d="M260 70 L263 100 L266 70" fill="#3a3528" />
        </svg>
      </div>
    ),
    village: (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-green-100" />
        <svg className="absolute bottom-0 w-full" viewBox="0 0 400 200">
          <rect x="40" y="100" width="80" height="60" fill="#c8a060" />
          <path d="M30 100 L80 60 L130 100Z" fill="#8B4513" />
          <rect x="65" y="120" width="20" height="30" fill="#5a3a1a" />
          <rect x="260" y="110" width="70" height="50" fill="#c8a060" />
          <path d="M250 110 L295 75 L340 110Z" fill="#8B4513" />
          <rect x="0" y="160" width="400" height="40" fill="#5a8a3a" />
          <path d="M80 160 Q200 170 295 160" stroke="#c8a060" strokeWidth="8" fill="none" />
        </svg>
      </div>
    ),
    forest: (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-200 via-green-100 to-green-300" />
        <svg className="absolute bottom-0 w-full" viewBox="0 0 400 200">
          <rect x="80" y="80" width="20" height="120" fill="#5a3a1a" />
          <circle cx="90" cy="50" r="45" fill="#2a6a1a" />
          <circle cx="70" cy="70" r="30" fill="#3a7a2a" />
          <circle cx="110" cy="65" r="35" fill="#2a6a1a" />
          <rect x="280" y="100" width="12" height="80" fill="#5a3a1a" />
          <circle cx="286" cy="75" r="30" fill="#3a7a2a" />
          <rect x="0" y="180" width="400" height="20" fill="#2a5a1a" />
        </svg>
      </div>
    ),
    night: (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-indigo-800 to-slate-900" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
          <circle cx="320" cy="60" r="30" fill="#FFEC80" opacity="0.9" />
          <circle cx="330" cy="55" r="25" fill="indigo-800" opacity="0.5" />
          <circle cx="50" cy="30" r="2" fill="white" opacity="0.8" />
          <circle cx="120" cy="50" r="1.5" fill="white" opacity="0.6" />
          <circle cx="200" cy="20" r="2" fill="white" opacity="0.7" />
          <circle cx="260" cy="40" r="1.5" fill="white" opacity="0.5" />
          <path d="M0 250 L100 180 L200 220 L300 170 L400 200 L400 300 L0 300Z" fill="#1a1a3a" opacity="0.6" />
        </svg>
      </div>
    ),
  };
  
  return backgrounds[type] || backgrounds.palace;
}

/* ──────────── 场景特效 ──────────── */
function SceneEffects({ effects }: { effects: SceneAnimation['effects'] }) {
  if (!effects || effects.length === 0) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {effects.includes('sparkles') && (
        <>
          {Array.from({ length: 15 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-lg sparkle-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 2}s`,
              }}
            >
              ✨
            </span>
          ))}
        </>
      )}
      {effects.includes('wind') && (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-px bg-white/40 wind-blow"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: '-10%',
                width: `${50 + Math.random() * 80}px`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </>
      )}
      {effects.includes('time-lapse') && (
        <div className="absolute inset-0 z-30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-200 via-orange-300 to-red-400 opacity-0 animate-time-lapse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/70 text-white px-8 py-4 rounded-2xl text-center animate-pulse shadow-2xl">
              <div className="text-4xl mb-2">⏳</div>
              <div className="text-lg font-bold">时光飞逝</div>
              <div className="text-sm opacity-80 mt-1">沧海桑田，物是人非...</div>
            </div>
          </div>
        </div>
      )}
      {effects.includes('leaves') && (
        <>
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-lg leaf-fall"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: '-5%',
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${4 + Math.random() * 3}s`,
              }}
            >
              🍃
            </span>
          ))}
        </>
      )}
    </div>
  );
}

/* ──────────── 多场景故事动画主组件 ──────────── */
interface StoryAnimationPlayerProps {
  storyId: string;
  title: string;
  onComplete?: () => void;
}

export default function StoryAnimationPlayer({ storyId, title, onComplete }: StoryAnimationPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const steps = storyAnimations[storyId] || [];
  const currentScene = steps[currentStep];
  
  // 自动播放逻辑
  useEffect(() => {
    if (!isPlaying || !currentScene) return;
    
    if (currentScene.duration === 0) {
      // 手动模式，不自动切换
      return;
    }
    
    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setIsPlaying(false);
        onComplete?.();
      }
    }, currentScene.duration * 1000);
    
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, currentScene, steps.length, onComplete]);
  
  const handlePlay = () => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(true);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  if (!currentScene) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        故事加载中...
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* 故事标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="text-2xl">📖</span>
          {title}
        </h3>
        <span className="text-sm text-muted-foreground">
          {currentStep + 1} / {steps.length}
        </span>
      </div>
      
      {/* 场景动画区域 */}
      <div className="relative w-full h-80 md:h-96 rounded-2xl overflow-hidden border-2 border-amber-200 dark:border-amber-800 shadow-xl bg-gradient-to-b from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20">
        {/* 场景标题栏 */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white px-4 py-2 z-20 flex items-center gap-2">
          <span className="text-lg">🎬</span>
          <span className="text-sm font-bold">{currentScene.title || '故事情节'}</span>
        </div>
        
        {/* 背景 */}
        <AnimatedBackground type={currentScene.background} />
        
        {/* 特效 */}
        <SceneEffects effects={currentScene.effects} />
        
        {/* 角色区域 */}
        <div className="absolute inset-0 flex items-end justify-center gap-4 md:gap-8 pb-12 z-10 pt-14">
          {currentScene.characters.map((char, i) => (
            <div
              key={i}
              className={cn(
                'transform transition-all duration-500',
                char.position === 'left' ? '-translate-x-4' : '',
                char.position === 'right' ? 'translate-x-4' : '',
                'animate-character-enter'
              )}
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <CharacterWithAnimation character={char} />
            </div>
          ))}
        </div>
        
        {/* 场景切换动画 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={cn(
            'absolute inset-0 bg-white dark:bg-gray-900 transition-opacity duration-500',
            isPlaying && currentStep > 0 ? 'opacity-0' : 'opacity-0'
          )} />
        </div>
      </div>
      
      {/* 旁白文字 */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/30 rounded-2xl p-5 border border-primary/10">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💬</span>
          <p className="text-sm leading-relaxed whitespace-pre-line flex-1">
            {currentScene.narration}
          </p>
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
      
      {/* 控制按钮 */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="p-3 rounded-full hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          className="p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        
        <button
          onClick={handleNext}
          disabled={currentStep === steps.length - 1}
          className="p-3 rounded-full hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentStep(i);
              setIsPlaying(false);
            }}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              i === currentStep
                ? 'bg-primary w-6'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ──────────── 导出故事ID列表 ──────────── */
export const availableStories = [
  { id: 'xie-an', title: '谢安下棋定军心', emoji: '⚔️' },
  { id: 'dan-zhu', title: '尧帝教子丹朱', emoji: '👨‍👦' },
  { id: 'lan-ke', title: '烂柯传说', emoji: '🪓' },
  { id: 'wangjixin', title: '王积薪遇仙', emoji: '🌙' },
  { id: 'huanglongshi', title: '黄龙士与徐星友', emoji: '👑' },
];
