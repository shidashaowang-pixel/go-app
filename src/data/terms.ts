/**
 * 围棋术语数据库
 */

export interface GoTerm {
  id: string;
  term: string;           // 术语名称
  reading?: string;       // 日语读音（罗马音）
  chinese: string;        // 中文解释
  category: TermCategory;
  difficulty: 1 | 2 | 3;  // 1:入门 2:进阶 3:高级
  example?: string;       // 示例说明
  relatedTerms?: string[]; // 相关术语
}

export type TermCategory = 
  | 'basic'        // 基础术语
  | 'shape'        // 棋形
  | 'strategy'     // 策略
  | 'life_death'   // 死活
  | 'endgame'      // 官子
  | 'culture';     // 文化

export const GO_TERMS: GoTerm[] = [
  // ========== 基础术语 ==========
  {
    id: 'basic-1',
    term: '气',
    chinese: '棋子周围可以落子的空交叉点。一个棋子有多少个这样的空点，就有多少气。',
    category: 'basic',
    difficulty: 1,
    example: '角上的棋子有2气，边上有3气，中腹最多有4气。',
    relatedTerms: ['提', '禁入点'],
  },
  {
    id: 'basic-2',
    term: '提',
    chinese: '将对方没有气的棋子从棋盘上拿掉。',
    category: 'basic',
    difficulty: 1,
    example: '当对方棋子的气被全部堵住时，就可以提掉。',
    relatedTerms: ['气', '吃子'],
  },
  {
    id: 'basic-3',
    term: '眼',
    chinese: '由己方棋子围住的一个或多个空交叉点，形成两块眼可活棋。',
    category: 'basic',
    difficulty: 1,
    example: '活棋需要有两个或以上的眼。',
    relatedTerms: ['活棋', '死棋'],
  },
  {
    id: 'basic-4',
    term: '劫',
    chinese: '双方可以反复互相提子的特殊局面，需要隔一手才能提回。',
    category: 'basic',
    difficulty: 2,
    example: '打劫时，一方不能立即提回被吃的子，需要在别处下一手。',
    relatedTerms: ['劫材', '连环劫'],
  },
  {
    id: 'basic-5',
    term: '封',
    chinese: '围棋每手棋必须落子，不允许Pass。虚着称为"弃权"。',
    category: 'basic',
    difficulty: 1,
  },
  {
    id: 'basic-6',
    term: '连',
    chinese: '将两颗以上相邻的同色棋子连接起来。',
    category: 'basic',
    difficulty: 1,
    example: '连接后的棋子作为一个整体计算气数。',
    relatedTerms: ['断点', '跳'],
  },
  {
    id: 'basic-7',
    term: '断',
    chinese: '将对方连接的棋子分开，切断它们的联系。',
    category: 'basic',
    difficulty: 1,
    example: '切断对方的棋后，可以分别攻击。',
    relatedTerms: ['连', '征子'],
  },
  {
    id: 'basic-8',
    term: '飞',
    chinese: '走法名称，类似"日"字的对角。也可指"小飞"（隔一路）、"大飞"（隔二路）。',
    category: 'basic',
    difficulty: 1,
    relatedTerms: ['跳', '镇'],
  },
  {
    id: 'basic-9',
    term: '跳',
    chinese: '隔一路在同一直线上走棋。',
    category: 'basic',
    difficulty: 1,
    relatedTerms: ['飞', '尖'],
  },
  {
    id: 'basic-10',
    term: '尖',
    chinese: '在原有棋子的对角上落子，走法类似"目"字。',
    category: 'basic',
    difficulty: 1,
    relatedTerms: ['跳', '飞'],
  },

  // ========== 棋形 ==========
  {
    id: 'shape-1',
    term: '愚形',
    chinese: '效率低下的棋形，如愚形三角、丁子、刀把五等。',
    category: 'shape',
    difficulty: 2,
    example: '应尽量避免走出愚形，提高棋子效率。',
    relatedTerms: ['效率', '棋形'],
  },
  {
    id: 'shape-2',
    term: '棋形效率',
    chinese: '棋子效率，指用最少的棋子发挥最大的作用。',
    category: 'shape',
    difficulty: 2,
    relatedTerms: ['愚形', '好形'],
  },
  {
    id: 'shape-3',
    term: '好形',
    chinese: '效率高的棋形，如板六、梅花六、刀板五等。',
    category: 'shape',
    difficulty: 2,
    relatedTerms: ['愚形', '棋形'],
  },
  {
    id: 'shape-4',
    term: '裂形',
    chinese: '双方棋子交织在一起形成的复杂形状。',
    category: 'shape',
    difficulty: 3,
    relatedTerms: ['扭断', '缠绕'],
  },
  {
    id: 'shape-5',
    term: '空三角',
    chinese: '一种愚形，三颗棋子形成三角形的走法。',
    category: 'shape',
    difficulty: 2,
    relatedTerms: ['愚形', '棋形'],
  },

  // ========== 策略 ==========
  {
    id: 'strategy-1',
    term: '布局',
    chinese: '围棋开局阶段，主要任务是围取外势和实地。',
    category: 'strategy',
    difficulty: 1,
    example: '常见布局有错小目、中国流、迷你中国流等。',
    relatedTerms: ['定式', '中盘'],
  },
  {
    id: 'strategy-2',
    term: '定式',
    chinese: '角部常见的、标准化的应对走法。',
    category: 'strategy',
    difficulty: 1,
    example: '学习定式可以快速提升棋力。',
    relatedTerms: ['布局', '手筋'],
  },
  {
    id: 'strategy-3',
    term: '手筋',
    chinese: '精妙的着法，能在关键时刻发挥重要作用。',
    category: 'strategy',
    difficulty: 2,
    example: '手筋是围棋中最高级的技巧之一。',
    relatedTerms: ['妙手', '俗筋'],
  },
  {
    id: 'strategy-4',
    term: '中盘',
    chinese: '布局之后、官子之前的阶段，进行战斗和转换。',
    category: 'strategy',
    difficulty: 1,
    relatedTerms: ['布局', '官子'],
  },
  {
    id: 'strategy-5',
    term: '围地',
    chinese: '用棋子围住空地，形成自己的领地。',
    category: 'strategy',
    difficulty: 1,
    relatedTerms: ['实地', '外势'],
  },
  {
    id: 'strategy-6',
    term: '外势',
    chinese: '棋子在边缘形成的影响力，具有潜在价值。',
    category: 'strategy',
    difficulty: 1,
    relatedTerms: ['实地', '厚势'],
  },
  {
    id: 'strategy-7',
    term: '厚势',
    chinese: '棋形厚实，具有强大影响力的棋子。',
    category: 'strategy',
    difficulty: 2,
    relatedTerms: ['外势', '薄形'],
  },

  // ========== 死活 ==========
  {
    id: 'life-1',
    term: '活棋',
    chinese: '有两个或以上眼位，不会被对方吃掉的棋子。',
    category: 'life_death',
    difficulty: 1,
    example: '活棋才能保留在棋盘上参与计算。',
    relatedTerms: ['眼', '死棋'],
  },
  {
    id: 'life-2',
    term: '死棋',
    chinese: '无法做出两个眼，最终会被提掉的棋子。',
    category: 'life_death',
    difficulty: 1,
    relatedTerms: ['活棋', '做眼'],
  },
  {
    id: 'life-3',
    term: '做眼',
    chinese: '通过走棋创造眼位，使棋活。',
    category: 'life_death',
    difficulty: 1,
    relatedTerms: ['活棋', '破眼'],
  },
  {
    id: 'life-4',
    term: '破眼',
    chinese: '破坏对方的眼位，使其变成死棋。',
    category: 'life_death',
    difficulty: 1,
    relatedTerms: ['做眼', '死棋'],
  },
  {
    id: 'life-5',
    term: '金柜角',
    chinese: '一种经典死活题形状，角部特殊的死活配置。',
    category: 'life_death',
    difficulty: 3,
    relatedTerms: ['死活', '手筋'],
  },
  {
    id: 'life-6',
    term: '盘角曲四',
    chinese: '一种特殊的死形，虽然看起来像活棋，但实际上是死的。',
    category: 'life_death',
    difficulty: 3,
    relatedTerms: ['死活', '劫'],
  },

  // ========== 官子 ==========
  {
    id: 'endgame-1',
    term: '官子',
    chinese: '收尾阶段，争夺最后的空点和利益。',
    category: 'endgame',
    difficulty: 2,
    example: '官子阶段每手棋的价值计算很重要。',
    relatedTerms: ['中盘', '收官'],
  },
  {
    id: 'endgame-2',
    term: '先手',
    chinese: '逼迫对方必须应对的着法，获得主动权。',
    category: 'endgame',
    difficulty: 2,
    relatedTerms: ['后手', '先手利'],
  },
  {
    id: 'endgame-3',
    term: '后手',
    chinese: '对方可以不应手的着法，处于被动地位。',
    category: 'endgame',
    difficulty: 2,
    relatedTerms: ['先手', '后手官子'],
  },
  {
    id: 'endgame-4',
    term: '收官',
    chinese: '围棋最后阶段，清理死子并确定地域。',
    category: 'endgame',
    difficulty: 2,
    relatedTerms: ['官子', '数子'],
  },
  {
    id: 'endgame-5',
    term: '双先',
    chinese: '双方都是先手的官子，价值最大。',
    category: 'endgame',
    difficulty: 3,
    relatedTerms: ['官子', '先手'],
  },

  // ========== 文化 ==========
  {
    id: 'culture-1',
    term: '棋圣',
    chinese: '围棋最高称号之一，日本古代授予最强棋手的称号。',
    category: 'culture',
    difficulty: 1,
    example: '日本历史上有多位著名棋圣。',
  },
  {
    id: 'culture-2',
    term: '段位',
    chinese: '表示围棋水平的等级，从初段到九段，业余从1级到30级。',
    category: 'culture',
    difficulty: 1,
    example: '段位越高代表棋力越强。',
  },
  {
    id: 'culture-3',
    term: '本因坊',
    chinese: '日本围棋世家称号，历史上有众多著名本因坊。',
    category: 'culture',
    difficulty: 2,
  },
  {
    id: 'culture-4',
    term: '纹枰',
    chinese: '围棋棋盘的美称。',
    category: 'culture',
    difficulty: 2,
  },
  {
    id: 'culture-5',
    term: '手谈',
    chinese: '围棋的别称，意为用手交谈。',
    category: 'culture',
    difficulty: 1,
  },
  {
    id: 'culture-6',
    term: '烂柯',
    chinese: '围棋的别称，典故出自"烂柯人"传说。',
    category: 'culture',
    difficulty: 2,
  },
];

// 按类别分组
export const TERMS_BY_CATEGORY = GO_TERMS.reduce((acc, term) => {
  if (!acc[term.category]) acc[term.category] = [];
  acc[term.category].push(term);
  return acc;
}, {} as Record<TermCategory, GoTerm[]>);

// 类别名称
export const CATEGORY_NAMES: Record<TermCategory, { name: string; desc: string }> = {
  basic: { name: '基础术语', desc: '围棋最基本的名词和走法' },
  shape: { name: '棋形', desc: '棋子的形状和效率' },
  strategy: { name: '策略', desc: '布局、战术和战略思想' },
  life_death: { name: '死活', desc: '棋子的生死判定' },
  endgame: { name: '官子', desc: '收官阶段的技巧' },
  culture: { name: '围棋文化', desc: '围棋历史和趣闻' },
};

// 难度名称
export const DIFFICULTY_NAMES: Record<1 | 2 | 3, string> = {
  1: '入门',
  2: '进阶',
  3: '高级',
};
