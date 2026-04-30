import { useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Scroll,
  Star,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  History,
  Users,
  Lightbulb,
  Trophy,
  Swords,
  Palette,
  Sparkles,
  Globe,
  Brain,
  Heart,
  Gamepad2,
  TreePine,
  Moon,
  Crown,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { speak, stopSpeak, playHintSound } from '@/lib/sounds';
import AnimationPlayer from '@/components/AnimationPlayer';
import StoryScene from '@/components/StoryCharacters';
import StoryAnimationPlayer, { availableStories } from '@/components/StoryAnimationPlayer';
import type { AnimationStep, SceneAnimation } from '@/types/types';

/* ──────────── 类型定义 ──────────── */

interface ContentSection {
  title: string;
  content: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  illustration?: string; // 可选的装饰 emoji
  /** 动画微课步骤（可选），展开后可播放棋盘动画演示 */
  animationSteps?: AnimationStep[];
  animationBoardSize?: number;
  /** 故事场景动画（可选），展开后显示角色+场景动画 */
  scene?: SceneAnimation;
  /** 完整故事动画（可选），展开后显示多场景连贯故事动画 */
  storyAnimation?: string;
}

interface CultureModule {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  emoji: string;
  gradient: string;
  sections: ContentSection[];
}

/* ──────────── 数据 ──────────── */

const cultureModules: CultureModule[] = [
  {
    icon: BookOpen,
    title: '文化启蒙',
    description: '了解围棋的起源、历史和文化内涵',
    emoji: '📖',
    gradient: 'from-blue-500/10 to-indigo-500/10',
    sections: [
      {
        title: '围棋是什么？',
        icon: Gamepad2,
        color: 'text-blue-500',
        illustration: '⚫⚪',
        content: `围棋是一种两人对弈的策略棋类游戏，起源于中国，有超过4000年的历史。它是世界上最复杂的棋类游戏之一，也是中华文化的瑰宝。

⚫⚪ 围棋的"围"字道出了游戏的核心——围地。两位棋手分别执黑棋和白棋，在棋盘上交替落子，目标是在棋盘上围出比对手更多的领地。

围棋的规则非常简单，甚至可以说是所有棋类游戏中规则最少的，但正是这种简洁，孕育了无穷的变化和深邃的策略。有人说："围棋的规则一页纸就能写完，但围棋的变化比宇宙中的原子还多。"`,
        animationBoardSize: 9,
        animationSteps: [
          { moves: [], narration: '这是一个9路棋盘，围棋就是在这样的交叉点上落子。', duration: 3 },
          { moves: [{ x: 4, y: 4, color: 'black' }], narration: '黑棋先走，下在天元——棋盘正中央的交叉点。', duration: 3, highlights: [{ x: 4, y: 4, type: 'circle' }] },
          { moves: [{ x: 2, y: 6, color: 'white' }], narration: '白棋后走，两人交替落子。', duration: 3 },
          { moves: [{ x: 6, y: 2, color: 'black' }], narration: '黑棋再下一手，棋盘上渐渐有了布局。', duration: 3 },
          { moves: [{ x: 2, y: 2, color: 'white' }], narration: '白棋占据另一个角，这就是围棋的"金角银边"——角上最容易围地！', duration: 4, highlights: [{ x: 2, y: 6, type: 'square' }, { x: 2, y: 2, type: 'square' }] },
        ],
        scene: {
          background: 'palace',
          characters: [
            { type: 'scholar', position: 'left', action: 'playing', dialog: '黑先白后，围地取胜！', name: '小棋手' },
            { type: 'scholar', position: 'right', action: 'thinking', dialog: '这一步该怎么走呢...', name: '学棋者' },
          ],
          effects: [],
        },
      },
      {
        title: '围棋是怎么来的？',
        icon: History,
        color: 'text-amber-500',
        illustration: '🏛️',
        content: `关于围棋的起源，有一个美丽的传说：

🏛️ 上古时期，尧帝有一位叫丹朱的儿子，他性格暴躁，不太听话。尧帝为了让儿子安静下来、学会思考，就发明了围棋。尧帝在横竖交叉的网格上教丹朱下棋，丹朱在学习围棋的过程中逐渐变得沉稳聪慧。

📜 历史上最早的文字记载出现在春秋时期，《左传》《论语》《孟子》等典籍中都提到了围棋。到了唐宋时期，围棋已成为文人雅士必备的修养，被列为"琴棋书画"四艺之一。

🌏 围棋在隋唐时期传入日本和朝鲜，后来传遍全世界。如今，围棋已成为一项国际性的智力运动，有世界围棋锦标赛等重大赛事。`,
        storyAnimation: 'dan-zhu', // 使用完整故事动画播放器
      },
      {
        title: '为什么人们喜欢围棋？',
        icon: Heart,
        color: 'text-pink-500',
        illustration: '💝',
        content: `人们喜欢围棋的原因有很多：

🧠 锻炼思维：围棋需要全局观和深度思考，可以培养逻辑思维和判断力。
🎨 无穷变化：19×19的棋盘上有约10的170次方种可能的局面，永远不会有完全相同的两盘棋。
🧘 修身养性：下围棋需要安静、专注，有助于培养耐心和平和的心态。
🤝 以棋会友：围棋是一项社交活动，通过下棋可以结交志同道合的朋友。
🏛️ 文化传承：围棋承载着深厚的中华文化底蕴，学习围棋也是传承文化。

💡 对于小朋友来说，学习围棋特别有益：它可以提高专注力、计算能力和空间想象力，还能培养"胜不骄败不馁"的良好心态。`,
        animationBoardSize: 9,
        animationSteps: [
          { moves: [], narration: '围棋的魅力在于无穷的变化...', duration: 2 },
          { moves: [{ x: 2, y: 6, color: 'black' }, { x: 6, y: 2, color: 'white' }], narration: '同样的开局，可以走向完全不同的结局。', duration: 3 },
          { moves: [{ x: 2, y: 2, color: 'black' }, { x: 6, y: 6, color: 'white' }], narration: '每一手棋都需要深思熟虑，锻炼思维能力。', duration: 3 },
          { moves: [{ x: 4, y: 4, color: 'black' }], narration: '围棋让你学会安静思考，修身养性。', duration: 3, highlights: [{ x: 4, y: 4, type: 'circle' }] },
          { moves: [], narration: '这就是围棋的魅力——简单规则，无穷智慧！', duration: 3 },
        ],
        scene: {
          background: 'palace',
          characters: [
            { type: 'scholar', position: 'left', action: 'happy', dialog: '这盘棋下得真痛快！', name: '小明' },
            { type: 'scholar', position: 'right', action: 'happy', dialog: '以棋会友，乐在其中！', name: '小华' },
          ],
          effects: ['sparkles'],
        },
      },
      {
        title: '围棋的礼仪',
        icon: Users,
        color: 'text-emerald-500',
        illustration: '🙏',
        content: `围棋不仅有规则，还有礼仪。学围棋，也要学做有修养的人：

🙏 对局前：双方互相鞠躬或握手，说"请多指教"，表示尊重对手。
🪑 坐姿端正：下棋时要坐好，不要东倒西歪，这既是对对手的尊重，也有助于集中注意力。
🤫 保持安静：对局中不要大声说话或干扰对方思考，安静的环境才能下出好棋。
✊ 落子无悔：棋子落在棋盘上就不能收回，所以要三思而后行——这也是人生的道理。
🤝 对局后：无论胜负，都要说"谢谢指教"，感谢对方的陪伴和切磋。

这些礼仪不仅在棋盘上重要，在日常生活中也同样重要！学围棋的孩子，往往也更懂礼貌、更有修养。`,
        animationBoardSize: 9,
        animationSteps: [
          { moves: [], narration: '对局前，双方互相行礼，说"请多指教"，这是对对手的尊重。', duration: 3 },
          { moves: [{ x: 4, y: 4, color: 'black' }], narration: '坐姿端正后，黑棋先行第一手——天元。', duration: 3, highlights: [{ x: 4, y: 4, type: 'circle' }] },
          { moves: [{ x: 6, y: 6, color: 'white' }], narration: '白棋后行，两人交替落子，对局中保持安静。', duration: 3 },
          { moves: [{ x: 2, y: 6, color: 'black' }, { x: 2, y: 2, color: 'white' }], narration: '落子无悔——棋子落下就不能收回，要三思而后行！', duration: 4 },
          { moves: [], narration: '对局结束，无论胜负都说"谢谢指教"，这才是有修养的棋手！', duration: 3 },
        ],
        scene: {
          background: 'palace',
          characters: [
            { type: 'scholar', position: 'left', action: 'standing', dialog: '请多指教！', name: '小棋手' },
            { type: 'scholar', position: 'right', action: 'standing', dialog: '承让了！', name: '对弈者' },
          ],
          effects: [],
        },
      },
    ],
  },
  {
    icon: Scroll,
    title: '趣味故事',
    description: '围棋相关的有趣故事和传说',
    emoji: '📜',
    gradient: 'from-amber-500/10 to-orange-500/10',
    sections: [
      // 故事动画入口
      {
        title: '故事动画',
        icon: Swords,
        color: 'text-amber-600',
        illustration: '🎬',
        content: '观看完整的故事动画，体验烂柯传说、谢安下棋等经典典故的精彩演绎！',
        storyAnimation: 'lan-ke', // 默认显示烂柯传说
      },
      {
        title: '烂柯传说',
        icon: TreePine,
        color: 'text-green-600',
        illustration: '🪓',
        content: `这是围棋最著名的故事，出自南朝梁任昉的《述异记》：

🪓 晋朝时，有一个叫王质的樵夫，到衢州石室山（今浙江衢州）砍柴。他走进山洞，看到两位童子正在下围棋。王质被棋局吸引，就坐在旁边观看，还吃了童子给他的枣子。

一局棋下完，童子对他说："你该回家了，看看你的斧头吧。"王质低头一看，斧柄竟然已经腐烂了！

🏘️ 等他回到村里，发现已经过去了数十年，认识的人都不在了，连村子都变了样。从此，"烂柯"就成了围棋的代名词，石室山也被改名为"烂柯山"。

✨ 这个故事告诉我们：围棋的魅力可以让人忘记时间的流逝！后人用"烂柯"来比喻时光飞逝，也用来赞美围棋的魅力。`,
        storyAnimation: 'lan-ke', // 完整故事动画播放器
      },
      {
        title: '王积薪遇仙',
        icon: Moon,
        color: 'text-indigo-500',
        illustration: '🌙',
        content: `🌙 唐朝有个叫王积薪的棋手，他是当时的"棋待诏"（专门陪皇帝下棋的官）。

安史之乱时，王积薪跟随唐玄宗逃往四川。一天晚上，他在山中借宿，隔壁住着一位老婆婆和她的儿媳。深夜，他听到婆媳二人隔着房间以口代手下起了围棋——她们不用棋盘棋子，全凭嘴巴说棋步！

王积薪暗暗记下棋局，发现其中深奥无比，自己远不是对手。第二天他请教两位妇人，老婆婆只说了一句："你可以跟人下下娱乐，但不要妄想成为国手。"

✨ 这个故事说明围棋的境界深不可测，即使是最强的棋手，也永远有进步的空间。`,
        storyAnimation: 'wangjixin', // 完整故事动画播放器
      },
      {
        title: '黄龙士与徐星友',
        icon: Crown,
        color: 'text-yellow-600',
        illustration: '👑',
        content: `👑 清朝康熙年间，有两位围棋高手——黄龙士和徐星友。

黄龙士被后人称为"棋圣"，他的棋风大气磅礴，像长江大河一泻千里。徐星友则是大器晚成的代表，他50多岁才开始学棋，但凭借刻苦钻研，最终成为与黄龙士齐名的高手。

他们之间有一段佳话：黄龙士为了让徐星友进步，故意在对局中让他三子，这种教学方式后来被称为"血泪篇"。正是在高手的指导和自己的努力下，徐星友的棋力突飞猛进。

✨ 这个故事告诉我们：学习围棋需要好老师的引导，更需要自己的刻苦努力。不管什么时候开始学，都不算晚！`,
        storyAnimation: 'huanglongshi', // 完整故事动画播放器
      },
      {
        title: '谢安下棋定军心',
        icon: Swords,
        color: 'text-red-500',
        illustration: '⚔️',
        content: `⚔️ 东晋时期，前秦大军南下，号称百万之众，东晋朝野上下一片恐慌。

而丞相谢安却若无其事地与侄子谢玄下围棋。谢玄心里着急，棋下得心不在焉。谢安却从容落子，还邀请谢玄一起到山间别墅游玩。

实际上，谢安早已运筹帷幄，安排好了淝水之战的战略。果然，捷报传来，东晋大胜！当有人问谢安为何如此镇定时，他只是微微一笑。

✨ 这个故事告诉我们：围棋能培养人沉着冷静的品格。越是危急时刻，越需要像下棋一样保持冷静，从容应对。`,
        animationBoardSize: 9,
        animationSteps: [
          { moves: [], narration: '东晋时期，前秦百万大军南下，朝野恐慌...', duration: 3 },
          { moves: [{ x: 4, y: 4, color: 'black' }], narration: '而丞相谢安却在从容地下围棋。', duration: 3 },
          { moves: [{ x: 2, y: 6, color: 'white' }], narration: '谢玄心里着急，棋下得心不在焉...', duration: 3 },
          { moves: [{ x: 6, y: 2, color: 'black' }], narration: '谢安却从容落子，胸有成竹。', duration: 3, highlights: [{ x: 6, y: 2, type: 'circle' }] },
          { moves: [], narration: '捷报传来，东晋大胜！围棋让人沉着冷静，从容应对。', duration: 4 },
        ],
        scene: {
          background: 'palace',
          characters: [
            { type: 'xie-an', position: 'left', action: 'calm', dialog: '不必惊慌，且看此局。' },
            { type: 'xiexuan', position: 'right', action: 'worried', dialog: '前线战事紧急，侄儿心中不安...' },
          ],
          effects: ['wind'],
        },
      },
    ],
  },
  {
    icon: Star,
    title: '经典案例',
    description: '玄玄棋经、三十六计、围棋宝典',
    emoji: '⭐',
    gradient: 'from-purple-500/10 to-pink-500/10',
    sections: [
      {
        title: '《玄玄棋经》',
        icon: Scroll,
        color: 'text-amber-700',
        illustration: '📕',
        content: `📕 《玄玄棋经》是宋代最重要的围棋著作，由严师望等人编写，取名来自老子《道德经》中的"玄之又玄，众妙之门"。

这本书最著名的是它收录的大量"死活题"——判断一块棋是死是活的练习题。这些题目设计精巧，变化深奥，至今仍是围棋训练的重要教材。

🔮 书中还有很多"手筋"——巧妙的战术手段。学习这些手筋，就像练武功学招式一样，可以让你在实战中灵活运用。

🐷 《玄玄棋经》中有一道经典死活题叫"大猪嘴"，是一个角上的死活问题。棋诀说"大猪嘴，扳点死"，白棋先走可以杀死黑棋，但黑棋先走则可以净杀白棋！这类题目锻炼的是计算的精确性和顺序的重要性。`,
        animationBoardSize: 9,
        animationSteps: [
          { moves: [], narration: '《玄玄棋经》——宋代最重要的围棋著作！', duration: 3 },
          { moves: [
            { x: 1, y: 2, color: 'white' }, { x: 0, y: 2, color: 'white' }, { x: 0, y: 1, color: 'white' },
          ], narration: '白棋从三个方向包围角上的黑棋。', duration: 4 },
          { moves: [
            { x: 2, y: 1, color: 'white' }, { x: 1, y: 3, color: 'white' }, { x: 0, y: 3, color: 'white' },
          ], narration: '白棋形成包围圈，黑棋被围在角部，这就是"大猪嘴"形状！', duration: 4 },
          { moves: [
            { x: 2, y: 2, color: 'black' }, { x: 1, y: 1, color: 'black' }, { x: 2, y: 3, color: 'black' },
          ], narration: '黑棋形成角部形状，准备做活。', duration: 3 },
          { moves: [{ x: 1, y: 1, color: 'black' }], narration: '黑1点！这是做活的唯一要点！', duration: 3, highlights: [{ x: 1, y: 1, type: 'circle' }] },
          { moves: [{ x: 0, y: 0, color: 'black' }], narration: '黑3立！成功做出两个真眼，黑棋净活！', duration: 4 },
          { moves: [], narration: '这就是"大猪嘴"：黑先占据[1,1]则活；若白先走"扳点"，则黑死。', duration: 4 },
        ],
        scene: {
          background: 'palace',
          characters: [
            { type: 'scholar', position: 'left', action: 'standing', dialog: '这手筋真是精妙！', name: '研究者' },
            { type: 'scholar', position: 'right', action: 'thinking', dialog: '死活题的精髓在于顺序...', name: '求知者' },
          ],
          effects: [],
        },
      },
      {
        title: '围棋与三十六计',
        icon: Lightbulb,
        color: 'text-violet-500',
        illustration: '💡',
        content: `💡 围棋的策略与中国古代兵法三十六计有很多相通之处：

🎭 瞒天过海：在棋盘一侧佯攻，实则在另一侧发动主攻。
🔀 声东击西：在左边制造威胁，真正目标却在右边。
🎯 围魏救赵：不直接救援被攻的棋，而是攻击对方薄弱处来解围。
⚡ 以逸待劳：巩固自己的地盘，等对方冒险出击时反击。
🕸️ 欲擒故纵：故意让对方几子逃跑，然后在追击中获取更大利益。
🪤 诱敌深入：故意露出破绽，引诱对方深入，然后包围歼灭。

🗣️ 围棋被称为"手谈"，每一步棋都像是在和对手进行无声的对话和博弈。学围棋也是在学智慧！`,
        animationBoardSize: 9,
        animationSteps: [
          { moves: [], narration: '围棋策略与三十六计相通...', duration: 2 },
          { moves: [{ x: 1, y: 1, color: 'black' }, { x: 1, y: 2, color: 'black' }, { x: 2, y: 1, color: 'black' }], narration: '黑棋在左上角佯攻，吸引白棋防守。', duration: 3 },
          { moves: [{ x: 0, y: 1, color: 'white' }, { x: 1, y: 0, color: 'white' }], narration: '白棋被迫在角上应对...', duration: 3 },
          { moves: [{ x: 6, y: 6, color: 'black' }, { x: 7, y: 6, color: 'black' }, { x: 6, y: 7, color: 'black' }], narration: '黑棋突然在右下角发动真正的进攻！声东击西！', duration: 3, highlights: [{ x: 6, y: 6, type: 'circle' }] },
          { moves: [{ x: 7, y: 7, color: 'white' }], narration: '白棋措手不及。围棋就是智慧的博弈。', duration: 4 },
        ],
        scene: {
          background: 'palace',
          characters: [
            { type: 'scholar', position: 'left', action: 'playing', dialog: '声东击西，兵法之妙！', name: '谋略家' },
            { type: 'scholar', position: 'right', action: 'worried', dialog: '这步...我没料到！', name: '对手' },
          ],
          effects: [],
        },
      },
      {
        title: '围棋宝典·名局赏析',
        icon: Trophy,
        color: 'text-yellow-500',
        illustration: '🏆',
        content: `🏆 围棋历史上有许多经典名局，值得反复品鉴：

🏯 "当湖十局"——清代范西屏与施定庵的十番棋，被誉为中国古代围棋的巅峰之作。两位国手你来我往，棋局精彩绝伦。

👂 "耳赤之局"——日本围棋史上的名局。1846年，本因坊秀策执黑对幻庵因硕，秀策下出了一步妙手，令幻庵惊得耳朵都红了。这步棋被后人称为"耳赤之妙手"。

🤖 "世纪之战"——2016年，AlphaGo对战李世石，人工智能首次在正式比赛中击败世界冠军。第四局李世石下出了"神之一手"，是人类对AI的精彩反击。

🇨🇳 "中日围棋擂台赛"——1984年开始的中日围棋擂台赛，聂卫平九段连胜日本多位超一流棋手，掀起了中国的"围棋热"。

✨ 这些名局告诉我们：围棋的魅力不仅在于胜负，更在于其中蕴含的智慧和美感。每一盘棋都是独一无二的艺术品！`,
        animationBoardSize: 9,
        animationSteps: [
          { moves: [], narration: '围棋历史上有许多经典名局...', duration: 2 },
          { moves: [{ x: 3, y: 3, color: 'black' }, { x: 5, y: 3, color: 'white' }, { x: 3, y: 5, color: 'black' }], narration: '范西屏与施定庵的"当湖十局"，落子如飞！', duration: 3 },
          { moves: [{ x: 5, y: 5, color: 'white' }, { x: 3, y: 6, color: 'black' }], narration: '秀策的"耳赤之妙手"——一步棋令对手耳朵都红了！', duration: 3 },
          { moves: [{ x: 4, y: 4, color: 'white' }, { x: 4, y: 6, color: 'black' }], narration: '2016年，AlphaGo对战李世石——人工智能的里程碑。', duration: 3 },
          { moves: [{ x: 2, y: 4, color: 'white' }, { x: 6, y: 4, color: 'black' }], narration: '聂卫平九段在中日擂台赛连胜——掀起中国"围棋热"！', duration: 4 },
          { moves: [], narration: '每一盘棋都是独一无二的艺术品！', duration: 3 },
        ],
        scene: {
          background: 'palace',
          characters: [
            { type: 'scholar', position: 'left', action: 'happy', dialog: '妙手！真是神之一手！', name: '观战者' },
            { type: 'scholar', position: 'right', action: 'standing', dialog: '每一局都是艺术...', name: '棋评家' },
          ],
          effects: ['sparkles'],
        },
      },
      {
        title: '围棋与生活',
        icon: Globe,
        color: 'text-teal-500',
        illustration: '🌍',
        content: `🌍 围棋中的很多道理，在生活中也同样适用：

⚖️ 取舍之道：围棋中常说"弃子争先"，有时候放弃小的才能得到大的。生活中也一样，学会取舍才能走得更远。

🎯 全局观念：围棋讲究"大局观"，不能只盯着一角一地。做事也要有全局意识，不能只见树木不见森林。

⏳ 厚积薄发：围棋中"厚势"的力量不在当下，而在未来。学习也是一样，积累得越厚，爆发力越强。

🤝 合作共赢：围棋虽是对抗，但高手对弈更像对话。生活中，与人为善往往比争强好胜走得更远。

💪 胜不骄败不馁：围棋比赛有输有赢，重要的是从每一局中学到东西。人生也是如此，关键是不断成长！`,
        animationBoardSize: 9,
        animationSteps: [
          { moves: [], narration: '围棋中的道理，在生活中同样适用...', duration: 2 },
          { moves: [{ x: 2, y: 2, color: 'black' }, { x: 6, y: 6, color: 'white' }], narration: '取舍之道——有时放弃小的才能得到大的。', duration: 3 },
          { moves: [{ x: 4, y: 4, color: 'black' }], narration: '全局观念——不能只盯着一角一地。', duration: 3, highlights: [{ x: 2, y: 2, type: 'square' }, { x: 6, y: 6, type: 'square' }, { x: 4, y: 4, type: 'circle' }] },
          { moves: [{ x: 6, y: 2, color: 'white' }], narration: '厚积薄发——积累得越厚，爆发力越强。', duration: 3 },
          { moves: [], narration: '胜不骄败不馁——关键是不断成长！', duration: 3 },
        ],
        scene: {
          background: 'palace',
          characters: [
            { type: 'scholar', position: 'left', action: 'happy', dialog: '胜不骄，败不馁！', name: '小明' },
            { type: 'scholar', position: 'right', action: 'happy', dialog: '以棋会友，乐在其中！', name: '小华' },
          ],
          effects: [],
        },
      },
    ],
  },
];

/* ──────────── 组件 ──────────── */

export default function Culture() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSection = (key: string) => {
    const isExpanding = expandedSection !== key;
    setExpandedSection(isExpanding ? key : null);
    // 停止之前的朗读
    stopSpeak();
    setIsSpeaking(false);
  };

  const handleReadAloud = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopSpeak();
      setIsSpeaking(false);
    } else {
      // 提取纯文本（去除emoji）
      const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').trim();
      speak(cleanText, 1.0);
      setIsSpeaking(true);
      // 朗读结束后重置状态（估算时间）
      const estimatedMs = cleanText.length * 200;
      setTimeout(() => setIsSpeaking(false), estimatedMs);
    }
  };

  const handleStopRead = () => {
    stopSpeak();
    setIsSpeaking(false);
  };

  const currentModule = cultureModules[activeModule];

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-5xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl float-gentle">🐼</span> 围棋文化
            <span className="text-2xl mascot-wiggle">🏛️</span>
          </h1>
          <p className="text-muted-foreground text-lg">了解围棋的历史、故事和经典案例，感受围棋的魅力 ✨</p>
        </div>

        {/* 模块切换标签 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {cultureModules.map((module, idx) => {
            const Icon = module.icon;
            const isActive = activeModule === idx;
            return (
              <button
                key={module.title}
                onClick={() => {
                  setActiveModule(idx);
                  setExpandedSection(null);
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{module.emoji} {module.title}</span>
              </button>
            );
          })}
        </div>

        {/* 当前模块内容 */}
        <div className="animate-fade-in">
          {/* 模块介绍卡片 */}
          <Card className={`overflow-hidden mb-6 border-0 shadow-md`}>
            <div className={`bg-gradient-to-r ${currentModule.gradient} p-6`}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/80 shadow-sm">
                  <span className="text-3xl">{currentModule.emoji}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{currentModule.title}</h2>
                  <p className="text-muted-foreground">{currentModule.description}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 内容列表 */}
          <div className="space-y-3">
            {currentModule.sections.map((section, sIdx) => {
              const key = `${activeModule}-${sIdx}`;
              const isExpanded = expandedSection === key;
              const SectionIcon = section.icon;

              return (
                <Card
                  key={sIdx}
                  className={`overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'shadow-lg ring-1 ring-primary/20' : 'shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* 标题栏 */}
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors text-left"
                    onClick={() => toggleSection(key)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl bg-muted/50 ${section.color}`}
                      >
                        <SectionIcon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-bold">
                          {sIdx + 1}
                        </Badge>
                        <span className="font-semibold text-base">{section.title}</span>
                        {section.illustration && (
                          <span className="text-lg">{section.illustration}</span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </button>

                  {/* 展开内容 */}
                  <div
                    className={`transition-all duration-300 overflow-hidden ${
                      isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-5 pb-5 pt-1">
                      {/* 故事场景动画 */}
                      {section.scene && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Palette className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">故事场景</span>
                          </div>
                          <StoryScene scene={section.scene} />
                        </div>
                      )}
                      {/* 完整故事动画播放器 */}
                      {section.storyAnimation && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">完整故事动画</span>
                          </div>
                          <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-800/30">
                            <StoryAnimationPlayer
                              storyId={section.storyAnimation}
                              title={availableStories.find(s => s.id === section.storyAnimation)?.title || '故事动画'}
                            />
                          </div>
                        </div>
                      )}
                      {/* 棋盘动画演示 */}
                      {section.animationSteps && section.animationSteps.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">棋盘动画演示</span>
                          </div>
                          <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl p-4 border border-purple-200/50 dark:border-purple-800/30">
                            <AnimationPlayer
                              steps={section.animationSteps}
                              boardSize={section.animationBoardSize || 9}
                            />
                          </div>
                        </div>
                      )}

                      <div className="bg-gradient-to-r from-primary/5 to-accent/30 rounded-2xl p-5 border border-primary/10">
                        {/* 朗读按钮 */}
                        <div className="flex items-center justify-end mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleReadAloud(section.content, e)}
                            className="text-xs gap-1 text-primary hover:text-primary/80"
                          >
                            {isSpeaking ? (
                              <><VolumeX className="h-3.5 w-3.5" /> 停止朗读</>
                            ) : (
                              <><Volume2 className="h-3.5 w-3.5" /> 朗读给我听</>
                            )}
                          </Button>
                        </div>
                        {/* 卡通对话气泡样式的内容 */}
                        <div className="relative">
                          <div className="prose prose-sm max-w-none text-foreground/85 whitespace-pre-line leading-relaxed bg-white/60 dark:bg-card/60 rounded-xl p-4 bubble-pop">
                            <span className="absolute -top-2 -left-2 text-xl">💬</span>
                            {section.content}
                          </div>
                        </div>
                      </div>

                      {/* 底部导航提示 */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <span className="text-xs text-muted-foreground">
                          {currentModule.emoji} {currentModule.title} · 第 {sIdx + 1}/{currentModule.sections.length} 节
                        </span>
                        <div className="flex gap-2">
                          {sIdx > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSection(`${activeModule}-${sIdx - 1}`);
                              }}
                              className="text-xs"
                            >
                              ← 上一节
                            </Button>
                          )}
                          {sIdx < currentModule.sections.length - 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSection(`${activeModule}-${sIdx + 1}`);
                              }}
                              className="text-xs"
                            >
                              下一节 →
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* 底部模块快速切换 */}
          <div className="flex items-center justify-center gap-4 mt-8">
            {activeModule > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setActiveModule(activeModule - 1);
                  setExpandedSection(null);
                }}
                className="gap-2"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                {cultureModules[activeModule - 1].emoji} {cultureModules[activeModule - 1].title}
              </Button>
            )}
            {activeModule < cultureModules.length - 1 && (
              <Button
                variant="outline"
                onClick={() => {
                  setActiveModule(activeModule + 1);
                  setExpandedSection(null);
                }}
                className="gap-2"
              >
                {cultureModules[activeModule + 1].emoji} {cultureModules[activeModule + 1].title}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 围棋小知识闯关入口 */}
        <div className="mt-8">
          <Link to="/learn/culture-quiz">
            <Card className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white border-0 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">🏆</div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">围棋文化小知识闯关</h3>
                      <p className="text-white/80 text-sm">
                        8个关卡 · 测试你的围棋文化知识！
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <span className="text-sm">开始挑战</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
