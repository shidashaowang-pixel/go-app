import { useState, useEffect } from 'react';
import { ChevronRight, Sparkles, Trophy, BookOpen, Swords } from 'lucide-react';

interface MascotMessage {
  text: string;
  icon: 'sparkles' | 'trophy' | 'book' | 'swords';
}

/**
 * 熊猫吉祥物组件
 * 带有对话气泡和交互提示
 */
export default function Mascot() {
  const [showBubble, setShowBubble] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  const tips: MascotMessage[] = [
    { text: '欢迎来到围棋乐园！🎮', icon: 'sparkles' },
    { text: '快去学习中心学习围棋吧！📚', icon: 'book' },
    { text: '来一局精彩的对弈吧！⚔️', icon: 'swords' },
    { text: '看看你在排行榜上的位置吧！🏆', icon: 'trophy' },
  ];

  useEffect(() => {
    // 首次加载时显示提示
    const timer = setTimeout(() => setShowBubble(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 每10秒切换一条提示
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [tips.length]);

  const getIcon = (iconName: MascotMessage['icon']) => {
    switch (iconName) {
      case 'sparkles': return Sparkles;
      case 'trophy': return Trophy;
      case 'book': return BookOpen;
      case 'swords': return Swords;
    }
  };

  const Icon = getIcon(tips[currentTip].icon);

  return (
    <div className="relative">
      {/* 对话气泡 */}
      <div
        className={`absolute -top-16 left-1/2 -translate-x-1/2 transition-all duration-500 ${
          showBubble ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <div className="bg-white rounded-2xl shadow-lg p-3 px-4 min-w-[200px] text-center relative">
          {/* 气泡三角 */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white" />
          </div>

          <div className="flex items-center justify-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{tips[currentTip].text}</span>
          </div>
        </div>
      </div>

      {/* 熊猫本体 */}
      <div className="relative">
        <div className="w-20 h-20 md:w-24 md:h-24 animate-float-slow">
          {/* 使用 SVG 绘制可爱熊猫 */}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
            {/* 身体 */}
            <ellipse cx="50" cy="70" rx="30" ry="25" fill="#1f2937" />
            {/* 肚子 */}
            <ellipse cx="50" cy="75" rx="18" ry="15" fill="white" />
            {/* 头 */}
            <circle cx="50" cy="35" r="28" fill="white" />
            {/* 耳朵 */}
            <circle cx="25" cy="15" r="10" fill="#1f2937" />
            <circle cx="75" cy="15" r="10" fill="#1f2937" />
            {/* 眼睛 */}
            <circle cx="38" cy="32" r="8" fill="#1f2937" />
            <circle cx="62" cy="32" r="8" fill="#1f2937" />
            {/* 眼睛高光 */}
            <circle cx="40" cy="30" r="3" fill="white" />
            <circle cx="64" cy="30" r="3" fill="white" />
            {/* 鼻子 */}
            <ellipse cx="50" cy="42" rx="5" ry="3" fill="#1f2937" />
            {/* 嘴巴 */}
            <path d="M45 48 Q50 52 55 48" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* 腮红 */}
            <circle cx="30" cy="40" r="5" fill="#fca5a5" fillOpacity="0.5" />
            <circle cx="70" cy="40" r="5" fill="#fca5a5" fillOpacity="0.5" />
            {/* 手臂 */}
            <ellipse cx="25" cy="70" rx="8" ry="12" fill="#1f2937" />
            <ellipse cx="75" cy="70" rx="8" ry="12" fill="#1f2937" />
          </svg>
        </div>

        {/* 围棋棋子装饰 */}
        <div className="absolute -top-2 -right-2 w-8 h-8 animate-bounce-subtle">
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="18" fill="white" stroke="#1f2937" strokeWidth="2" />
            <circle cx="20" cy="20" r="6" fill="#1f2937" />
          </svg>
        </div>

        <div className="absolute -bottom-1 -left-2 w-6 h-6 animate-bounce-subtle" style={{ animationDelay: '0.5s' }}>
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="18" fill="#1f2937" />
            <circle cx="20" cy="20" r="6" fill="white" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * 简化版熊猫（用于顶部导航）
 */
export function MiniMascot({ className = '' }: { className?: string }) {
  return (
    <div className={`w-10 h-10 ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* 简化版熊猫头 */}
        <circle cx="50" cy="50" r="40" fill="white" />
        <circle cx="25" cy="25" r="12" fill="#1f2937" />
        <circle cx="75" cy="25" r="12" fill="#1f2937" />
        <circle cx="35" cy="45" r="8" fill="#1f2937" />
        <circle cx="65" cy="45" r="8" fill="#1f2937" />
        <circle cx="37" cy="43" r="3" fill="white" />
        <circle cx="67" cy="43" r="3" fill="white" />
        <ellipse cx="50" cy="58" rx="6" ry="4" fill="#1f2937" />
        <path d="M44 64 Q50 68 56 64" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
