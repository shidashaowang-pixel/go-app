/**
 * 围棋文化小知识闯关数据
 * 包含围棋历史、典故、礼仪、名局等方面的选择题
 */

export interface CultureQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: 'history' | 'story' | 'etiquette' | 'classic' | 'famous';
}

export interface CultureQuizLevel {
  level: number;
  title: string;
  description: string;
  category: string;
  icon: string;
  questions: CultureQuizQuestion[];
}

// 关卡定义
export const CULTURE_QUIZ_LEVELS: CultureQuizLevel[] = [
  {
    level: 1,
    title: '围棋起源',
    description: '探索围棋的古老历史',
    category: '历史',
    icon: '🏛️',
    questions: [
      {
        id: 'q1-1',
        question: '围棋起源于哪个国家？',
        options: ['日本', '中国', '韩国', '朝鲜'],
        correctIndex: 1,
        explanation: '围棋起源于中国，有超过4000年的历史。据古籍记载，围棋是由尧帝发明的。',
        category: 'history',
      },
      {
        id: 'q1-2',
        question: '传说中，是谁发明了围棋？',
        options: ['孔子', '尧帝', '秦始皇', '周文王'],
        correctIndex: 1,
        explanation: '传说围棋是上古时期尧帝为了教导儿子丹朱而发明的。',
        category: 'story',
      },
      {
        id: 'q1-3',
        question: '围棋最早出现在哪个历史时期有文字记载？',
        options: ['夏朝', '商朝', '春秋战国', '秦朝'],
        correctIndex: 2,
        explanation: '《左传》《论语》《孟子》等春秋时期的典籍中都有关于围棋的记载。',
        category: 'history',
      },
      {
        id: 'q1-4',
        question: '围棋在古代被称为什么？',
        options: ['象棋', '围棋', '奕', '手谈'],
        correctIndex: 3,
        explanation: '围棋在古代有多种称呼，如"弈"、"手谈"、"坐隐"等。',
        category: 'history',
      },
      {
        id: 'q1-5',
        question: '围棋在隋唐时期传入了哪个地区？',
        options: ['欧洲', '日本和朝鲜', '东南亚', '中东'],
        correctIndex: 1,
        explanation: '围棋在隋唐时期通过遣唐使传入日本和朝鲜，后来传遍全世界。',
        category: 'history',
      },
    ],
  },
  {
    level: 2,
    title: '围棋礼仪',
    description: '学习下棋的规矩与礼节',
    category: '礼仪',
    icon: '🙏',
    questions: [
      {
        id: 'q2-1',
        question: '下棋前，应该做什么？',
        options: ['直接坐下就开始', '双方互相行礼问好', '猜先决定先后手', '选择黑棋'],
        correctIndex: 1,
        explanation: '围棋礼仪要求下棋前双方应互相行礼问好，表示尊重。',
        category: 'etiquette',
      },
      {
        id: 'q2-2',
        question: '下列哪项是围棋礼仪的正确做法？',
        options: ['落子时用力拍打', '悔棋', '轻声落子', '大声讨论'],
        correctIndex: 2,
        explanation: '落子时应轻拿轻放，不要发出太大声响，保持安静。',
        category: 'etiquette',
      },
      {
        id: 'q2-3',
        question: '围棋中的"猜先"是什么意思？',
        options: ['猜测对方棋力', '决定谁先走', '猜测比赛结果', '猜测题目答案'],
        correctIndex: 1,
        explanation: '猜先是围棋开始前的仪式，由一方抓子，另一方猜单双，决定先后手。',
        category: 'etiquette',
      },
      {
        id: 'q2-4',
        question: '下棋时，应该如何观看对方落子？',
        options: ['盯着对方看', '关注棋盘', '低头思考', '四处张望'],
        correctIndex: 1,
        explanation: '下棋时应专注于棋盘，尊重对手，静静思考。',
        category: 'etiquette',
      },
      {
        id: 'q2-5',
        question: '比赛结束后，应该怎么做？',
        options: ['直接离开', '收拾棋子', '复盘讨论后行礼告别', '把棋盘带走'],
        correctIndex: 2,
        explanation: '比赛结束后，双方应复盘讨论，然后互相行礼告别，这是围棋礼仪。',
        category: 'etiquette',
      },
    ],
  },
  {
    level: 3,
    title: '围棋经典故事',
    description: '聆听流传千古的围棋传说',
    category: '典故',
    icon: '📜',
    questions: [
      {
        id: 'q3-1',
        question: '"烂柯"故事发生在什么地方？',
        options: ['寺庙', '深山', '王宫', '学堂'],
        correctIndex: 1,
        explanation: '"烂柯"讲述的是一人在深山看仙人下棋，回家后发现已过百年的故事。',
        category: 'story',
      },
      {
        id: 'q3-2',
        question: '围棋十诀是谁总结的？',
        options: ['黄庭坚', '王安石', '刘禹锡', '苏轼'],
        correctIndex: 0,
        explanation: '"围棋十诀"是唐代王积薪所作，由黄庭坚记录传承下来。',
        category: 'history',
      },
      {
        id: 'q3-3',
        question: '"手谈"是指什么？',
        options: ['唱歌', '下棋', '写信', '比武'],
        correctIndex: 1,
        explanation: '"手谈"是围棋的别称，意思是用手交谈，通过落子来交流思想。',
        category: 'history',
      },
      {
        id: 'q3-4',
        question: '古代哪位诗人的诗中提到了围棋？',
        options: ['李白', '杜甫', '白居易', '以上都有'],
        correctIndex: 3,
        explanation: '李白、杜甫、白居易等许多诗人都写过关于围棋的诗句。',
        category: 'history',
      },
      {
        id: 'q3-5',
        question: '"坐隐"是什么意思？',
        options: ['坐着睡觉', '下围棋', '坐着发呆', '隐居山林'],
        correctIndex: 1,
        explanation: '"坐隐"是围棋的雅称之一，意思是坐在那里下棋，仿佛隐居世外。',
        category: 'history',
      },
    ],
  },
  {
    level: 4,
    title: '围棋大师',
    description: '认识历史上的围棋高手',
    category: '人物',
    icon: '👑',
    questions: [
      {
        id: 'q4-1',
        question: '日本古代被称为"棋圣"的围棋大师是谁？',
        options: ['秀策', '秀甫', '道策', '吴清源'],
        correctIndex: 2,
        explanation: '日本围棋大师道策被称为"棋圣"，他创立了完善的布局理论。',
        category: 'classic',
      },
      {
        id: 'q4-2',
        question: '被称为"昭和棋圣"的是哪位围棋大师？',
        options: ['秀芳', '吴清源', '坂田荣男', '藤泽秀行'],
        correctIndex: 1,
        explanation: '吴清源被称为"昭和棋圣"，他在日本围棋界创造了辉煌战绩。',
        category: 'classic',
      },
      {
        id: 'q4-3',
        question: '中国现代被称为"石佛"的围棋选手是谁？',
        options: ['马晓春', '常昊', '聂卫平', '柯洁'],
        correctIndex: 2,
        explanation: '聂卫平因在比赛中冷静沉稳，被中国棋迷称为"石佛"。',
        category: 'classic',
      },
      {
        id: 'q4-4',
        question: '"围棋十诀"不包括以下哪一条？',
        options: ['不得贪胜', '入界宜缓', '弃子争先', '必须大龙'],
        correctIndex: 3,
        explanation: '围棋十诀包括：不得贪胜、入界宜缓、攻彼顾我、弃子争先等，没有"必须大龙"。',
        category: 'history',
      },
      {
        id: 'q4-5',
        question: '韩国著名围棋选手李世石与谁并称"韩流双璧"？',
        options: ['李昌镐', '曹薰铉', '刘昌赫', '朴廷桓'],
        correctIndex: 0,
        explanation: '李世石与李昌镐并称"韩流双璧"，统治了相当长时期的围棋界。',
        category: 'classic',
      },
    ],
  },
  {
    level: 5,
    title: '围棋别名',
    description: '了解围棋的各种雅称',
    category: '文化',
    icon: '✨',
    questions: [
      {
        id: 'q5-1',
        question: '以下哪个不是围棋的别称？',
        options: ['手谈', '坐隐', '象戏', '烂柯'],
        correctIndex: 2,
        explanation: '"象戏"是象棋的别称，不是围棋的别称。',
        category: 'history',
      },
      {
        id: 'q5-2',
        question: '"木野狐"是围棋的别称，关于它说法正确的是？',
        options: ['因为围棋是木头做的', '形容围棋像狐狸一样迷惑人', '一位叫木野的人发明的', '围棋比赛用的场地'],
        correctIndex: 1,
        explanation: '"木野狐"形容围棋像狐狸一样有魔力，能让人沉迷其中。',
        category: 'history',
      },
      {
        id: 'q5-3',
        question: '围棋在古代"琴棋书画"中排第几位？',
        options: ['第一位', '第二位', '第三位', '第四位'],
        correctIndex: 1,
        explanation: '琴棋书画是古代文人四艺，"棋"排在第二位。',
        category: 'history',
      },
      {
        id: 'q5-4',
        question: '围棋的"棋"字有什么含义？',
        options: ['棋子', '博弈工具', '木头的简称', '代表智慧'],
        correctIndex: 1,
        explanation: '"棋"本义是博弈工具，后泛指棋子，也指下棋的活动。',
        category: 'history',
      },
      {
        id: 'q5-5',
        question: '围棋为什么被称为"忘忧"？',
        options: ['忘记烦恼', '忘记吃饭', '忘记睡觉', '忘记一切'],
        correctIndex: 0,
        explanation: '围棋有"忘忧清乐"之意，意思是下棋可以忘记烦恼，享受乐趣。',
        category: 'history',
      },
    ],
  },
  {
    level: 6,
    title: '围棋术语',
    description: '学习围棋的专业用语',
    category: '术语',
    icon: '📚',
    questions: [
      {
        id: 'q6-1',
        question: '"目"在围棋中是什么意思？',
        options: ['眼睛', '棋盘', '围住的交叉点', '棋子'],
        correctIndex: 2,
        explanation: '"目"是围棋术语，指围住的交叉点，是计算胜负的单位。',
        category: 'history',
      },
      {
        id: 'q6-2',
        question: '"气"在围棋中是指什么？',
        options: ['空气', '棋子的生命线', '天气', '棋子的颜色'],
        correctIndex: 1,
        explanation: '"气"是围棋基本概念，指棋子在棋盘上可以连接的交叉点。',
        category: 'history',
      },
      {
        id: 'q6-3',
        question: '围棋棋盘有多少个交叉点（19路）？',
        options: ['361', '324', '289', '400'],
        correctIndex: 0,
        explanation: '19路围棋棋盘有19×19=361个交叉点。',
        category: 'history',
      },
      {
        id: 'q6-4',
        question: '"劫"是围棋中的什么现象？',
        options: ['一种棋子', '一种比赛', '双方可以反复提子的局面', '一种定式'],
        correctIndex: 2,
        explanation: '"劫"是围棋规则中的特殊情况，禁止立即提回对方的子。',
        category: 'history',
      },
      {
        id: 'q6-5',
        question: '"定式"在围棋中是指什么？',
        options: ['固定的规则', '双方公认的最佳着法', '一盘棋', '棋子的形状'],
        correctIndex: 1,
        explanation: '"定式"是围棋术语，指在角部双方公认的最佳着法组合。',
        category: 'history',
      },
    ],
  },
  {
    level: 7,
    title: '围棋之最',
    description: '了解围棋界的吉尼斯纪录',
    category: '趣闻',
    icon: '🏆',
    questions: [
      {
        id: 'q7-1',
        question: '世界上最小的正式围棋棋盘是几路？',
        options: ['9路', '7路', '5路', '3路'],
        correctIndex: 0,
        explanation: '9路是小棋盘，3路是最小的，但正式比赛通常用19路。',
        category: 'classic',
      },
      {
        id: 'q7-2',
        question: '围棋每手之间的最长思考时间纪录是多少？',
        options: ['1小时', '2小时', '3小时', '超过10小时'],
        correctIndex: 3,
        explanation: '一些比赛中出现过超过10小时的思考时间。',
        category: 'classic',
      },
      {
        id: 'q7-3',
        question: '世界围棋锦标赛最高荣誉叫什么？',
        options: ['应氏杯', '富士通杯', '三星火灾杯', '春兰杯'],
        correctIndex: 0,
        explanation: '应氏杯被称为"围棋奥运会"，是奖金最高的围棋赛事。',
        category: 'classic',
      },
      {
        id: 'q7-4',
        question: '以下哪个不是围棋大赛的名称？',
        options: ['LG杯', '三星杯', '土豆杯', '农心杯'],
        correctIndex: 2,
        explanation: '"土豆杯"不是围棋大赛名称，LG杯、三星杯、农心杯都是著名围棋赛事。',
        category: 'classic',
      },
      {
        id: 'q7-5',
        question: '围棋AI"AlphaGo"是哪家公司开发的？',
        options: ['微软', '谷歌', 'IBM', '苹果'],
        correctIndex: 1,
        explanation: 'AlphaGo是由谷歌旗下DeepMind公司开发的人工智能围棋程序。',
        category: 'classic',
      },
    ],
  },
  {
    level: 8,
    title: '围棋精神',
    description: '体会围棋蕴含的人生哲理',
    category: '哲理',
    icon: '🧠',
    questions: [
      {
        id: 'q8-1',
        question: '围棋十诀中的"不得贪胜"告诉我们什么道理？',
        options: ['不能太想赢', '不能贪图胜利', '以上都对', '要一直下棋'],
        correctIndex: 2,
        explanation: '"不得贪胜"告诉我们要保持平常心，不要过于执着于胜负。',
        category: 'history',
      },
      {
        id: 'q8-2',
        question: '"胜不骄，败不馁"体现了围棋的什么精神？',
        options: ['竞争精神', '体育精神', '为人处世之道', '技术追求'],
        correctIndex: 2,
        explanation: '围棋教导我们要有正确的人生态度，胜不骄败不馁。',
        category: 'history',
      },
      {
        id: 'q8-3',
        question: '围棋为什么被称为"手谈"？',
        options: ['用手说话', '用手下棋交流', '手的运动', '手的技巧'],
        correctIndex: 1,
        explanation: '"手谈"体现了一种通过棋局进行的无声交流，体现了以棋会友的精神。',
        category: 'history',
      },
      {
        id: 'q8-4',
        question: '围棋中"弃子争先"告诉我们要懂得什么？',
        options: ['放弃', '舍小取大', '不要棋子', '只管自己'],
        correctIndex: 1,
        explanation: '"弃子争先"告诉我们要懂得取舍，有时放弃局部可以换取全局优势。',
        category: 'history',
      },
      {
        id: 'q8-5',
        question: '围棋为什么能培养人的什么品质？',
        options: ['只培养耐心', '只培养计算力', '多方面品质', '只培养记忆力'],
        correctIndex: 2,
        explanation: '围棋可以培养专注力、计算力、决策能力、情绪控制等多方面品质。',
        category: 'history',
      },
    ],
  },
];

// 获取所有关卡
export function getAllCultureQuizLevels(): CultureQuizLevel[] {
  return CULTURE_QUIZ_LEVELS;
}

// 根据关卡获取题目
export function getCultureQuizLevel(level: number): CultureQuizLevel | undefined {
  return CULTURE_QUIZ_LEVELS.find(l => l.level === level);
}

// 获取用户进度（存储在 localStorage）
export interface QuizProgress {
  [level: number]: {
    completed: boolean;
    score: number;
    bestScore: number;
    answers: number[];
  };
}

const PROGRESS_KEY = 'culture-quiz-progress';

export function getQuizProgress(): QuizProgress {
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveQuizProgress(level: number, score: number, answers: number[]): void {
  const progress = getQuizProgress();
  const maxScore = Math.max(progress[level]?.bestScore || 0, score);
  progress[level] = {
    completed: true,
    score,
    bestScore: maxScore,
    answers,
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function resetQuizProgress(): void {
  localStorage.removeItem(PROGRESS_KEY);
}

// 获取通关的关卡数
export function getCompletedLevelsCount(): number {
  const progress = getQuizProgress();
  return Object.values(progress).filter(p => p.completed).length;
}
