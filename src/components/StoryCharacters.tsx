/**
 * 围棋文化故事场景角色 SVG 组件
 * 用于文化页面的故事动画展示
 */
import type { SceneCharacter, SceneAnimation } from '@/types/types';

/* ──────────── 单个角色 SVG ──────────── */

export function EmperorYao({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 120 180" className="w-28 h-40 story-character-enter">
        {/* 龙袍帝王 - 尧帝 */}
        {/* 头 */}
        <circle cx="60" cy="38" r="24" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 冕旒冠 */}
        <rect x="30" y="10" width="60" height="12" rx="3" fill="#1a1a6e" />
        <rect x="35" y="8" width="50" height="6" rx="2" fill="#2a2a8e" />
        {/* 冕旒珠帘 */}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={i} x1={35 + i * 7.5} y1={22} x2={35 + i * 7.5} y2={32}
            stroke="#FFD700" strokeWidth="1.5" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <circle key={`b${i}`} cx={40 + i * 10} cy={30} r="2" fill="#FFD700" />
        ))}
        {/* 眼睛 */}
        <ellipse cx="50" cy="36" rx="3" ry="3.5" fill="#1a1a1a" />
        <ellipse cx="70" cy="36" rx="3" ry="3.5" fill="#1a1a1a" />
        <circle cx="51" cy="35" r="1" fill="white" />
        <circle cx="71" cy="35" r="1" fill="white" />
        {/* 胡须 */}
        <path d="M55 48 Q60 58 65 48" stroke="#333" strokeWidth="1.5" fill="none" />
        {/* 微笑 */}
        {action === 'teaching' ? (
          <path d="M50 46 Q60 54 70 46" stroke="#C06040" strokeWidth="1.5" fill="none" />
        ) : (
          <path d="M52 47 Q60 52 68 47" stroke="#C06040" strokeWidth="1.5" fill="none" />
        )}
        {/* 龙袍身体 */}
        <path d="M36 62 L30 150 L90 150 L84 62 Q60 72 36 62Z" fill="#1a1a6e" />
        {/* 龙纹装饰 */}
        <path d="M48 80 Q55 75 62 80 Q55 85 48 80Z" fill="#FFD700" opacity="0.7" />
        <path d="M58 100 Q65 95 72 100 Q65 105 58 100Z" fill="#FFD700" opacity="0.7" />
        <path d="M50 120 Q57 115 64 120 Q57 125 50 120Z" fill="#FFD700" opacity="0.7" />
        {/* 腰带 */}
        <rect x="32" y="90" width="56" height="8" rx="2" fill="#FFD700" />
        {/* 手臂 */}
        {action === 'teaching' ? (
          <>
            <path d="M36 75 L12 60 L8 55" stroke="#1a1a6e" strokeWidth="10" fill="none" strokeLinecap="round" />
            <circle cx="8" cy="55" r="6" fill="#FDBCB4" />
            {/* 手中棋子 */}
            <circle cx="8" cy="52" r="5" fill="#1a1a1a" />
          </>
        ) : (
          <>
            <path d="M36 80 L20 110" stroke="#1a1a6e" strokeWidth="10" fill="none" strokeLinecap="round" />
            <circle cx="20" cy="110" r="6" fill="#FDBCB4" />
            <path d="M84 80 L100 110" stroke="#1a1a6e" strokeWidth="10" fill="none" strokeLinecap="round" />
            <circle cx="100" cy="110" r="6" fill="#FDBCB4" />
          </>
        )}
        {/* 鞋子 */}
        <rect x="38" y="148" width="18" height="8" rx="4" fill="#2a1a00" />
        <rect x="64" y="148" width="18" height="8" rx="4" fill="#2a1a00" />
      </svg>
      {/* 名字 */}
      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-1">尧帝</span>
      {/* 对话气泡 */}
      {dialog && (
        <div className="absolute -top-8 -right-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

export function DanZhu({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36 story-character-enter" style={{ animationDelay: '0.2s' }}>
        {/* 丹朱 - 小男孩 */}
        {/* 头 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 头发（发髻） */}
        <ellipse cx="50" cy="16" rx="14" ry="10" fill="#1a1a1a" />
        <circle cx="50" cy="8" r="6" fill="#1a1a1a" />
        {/* 眼睛 */}
        {action === 'thinking' ? (
          <>
            <line x1="38" y1="33" x2="46" y2="33" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="62" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
            <circle cx="63" cy="32" r="1" fill="white" />
          </>
        ) : action === 'happy' ? (
          <>
            <path d="M38 32 Q42 28 46 32" stroke="#1a1a1a" strokeWidth="2" fill="none" />
            <path d="M54 32 Q58 28 62 32" stroke="#1a1a1a" strokeWidth="2" fill="none" />
          </>
        ) : (
          <>
            <ellipse cx="40" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
            <ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
            <circle cx="41" cy="32" r="1" fill="white" />
            <circle cx="61" cy="32" r="1" fill="white" />
          </>
        )}
        {/* 嘴巴 */}
        {action === 'happy' ? (
          <path d="M42 44 Q50 52 58 44" stroke="#C06040" strokeWidth="1.5" fill="#E87060" fillOpacity="0.3" />
        ) : action === 'thinking' ? (
          <ellipse cx="50" cy="46" rx="3" ry="2" fill="#C06040" opacity="0.6" />
        ) : (
          <path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        )}
        {/* 思考泡泡 */}
        {action === 'thinking' && (
          <g>
            <circle cx="78" cy="18" r="3" fill="#ddd" opacity="0.7" />
            <circle cx="82" cy="12" r="2" fill="#ddd" opacity="0.5" />
          </g>
        )}
        {/* 身体（汉服） */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#e84040" />
        {/* 衣领 */}
        <path d="M40 57 L50 75 L60 57" stroke="#c03030" strokeWidth="2" fill="none" />
        {/* 腰带 */}
        <rect x="28" y="85" width="44" height="6" rx="2" fill="#FFD700" />
        {/* 手臂 */}
        {action === 'happy' ? (
          <>
            <path d="M30 70 L8 55" stroke="#e84040" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="8" cy="55" r="5" fill="#FDBCB4" />
            <path d="M70 70 L92 55" stroke="#e84040" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="92" cy="55" r="5" fill="#FDBCB4" />
          </>
        ) : action === 'thinking' ? (
          <>
            <path d="M30 70 L18 55" stroke="#e84040" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="18" cy="55" r="5" fill="#FDBCB4" />
            <path d="M70 70 L78 45" stroke="#e84040" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="78" cy="45" r="5" fill="#FDBCB4" />
          </>
        ) : (
          <>
            <path d="M30 75 L15 100" stroke="#e84040" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="15" cy="100" r="5" fill="#FDBCB4" />
            <path d="M70 75 L85 100" stroke="#e84040" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="85" cy="100" r="5" fill="#FDBCB4" />
          </>
        )}
        {/* 鞋子 */}
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a00" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a00" />
      </svg>
      <span className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">丹朱</span>
      {dialog && (
        <div className="absolute -top-8 -left-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 right-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

function Woodcutter({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36 story-character-enter" style={{ animationDelay: '0.2s' }}>
        {/* 王质 - 樵夫 */}
        {/* 头 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 斗笠 */}
        <path d="M20 25 Q50 0 80 25" fill="#c8a050" stroke="#a08030" strokeWidth="1.5" />
        <rect x="35" y="22" width="30" height="5" rx="2" fill="#b09040" />
        {/* 眼睛 */}
        {action === 'surprised' ? (
          <>
            <circle cx="40" cy="33" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1" />
            <circle cx="40" cy="33" r="3" fill="#1a1a1a" />
            <circle cx="60" cy="33" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1" />
            <circle cx="60" cy="33" r="3" fill="#1a1a1a" />
          </>
        ) : action === 'watching' ? (
          <>
            <ellipse cx="40" cy="33" rx="3" ry="4" fill="#1a1a1a" />
            <ellipse cx="60" cy="33" rx="3" ry="4" fill="#1a1a1a" />
          </>
        ) : (
          <>
            <ellipse cx="40" cy="33" rx="3" ry="3" fill="#1a1a1a" />
            <ellipse cx="60" cy="33" rx="3" ry="3" fill="#1a1a1a" />
          </>
        )}
        {/* 嘴巴 */}
        {action === 'surprised' ? (
          <circle cx="50" cy="46" r="4" fill="#C06040" opacity="0.6" />
        ) : (
          <path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        )}
        {/* 身体（粗布衣） */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#8B7355" />
        <path d="M40 57 L50 75 L60 57" stroke="#6B5335" strokeWidth="2" fill="none" />
        {/* 绳带 */}
        <rect x="28" y="85" width="44" height="5" rx="2" fill="#6B5335" />
        {/* 手臂+斧头 */}
        {action === 'chopping' ? (
          <>
            <path d="M30 70 L5 40" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="5" cy="40" r="5" fill="#FDBCB4" />
            {/* 斧头 */}
            <rect x="2" y="20" width="4" height="25" rx="1" fill="#8B5A2B" />
            <path d="M6 20 L16 25 L6 30Z" fill="#888" stroke="#666" strokeWidth="1" />
          </>
        ) : action === 'watching' ? (
          <>
            <path d="M30 70 L15 90" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="15" cy="90" r="5" fill="#FDBCB4" />
            <path d="M70 65 L85 55" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="85" cy="55" r="5" fill="#FDBCB4" />
            {/* 斧头在身后 */}
            <rect x="82" y="40" width="3" height="20" rx="1" fill="#8B5A2B" />
          </>
        ) : action === 'surprised' ? (
          <>
            <path d="M30 70 L10 60" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="10" cy="60" r="5" fill="#FDBCB4" />
            <path d="M70 70 L90 60" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="90" cy="60" r="5" fill="#FDBCB4" />
            {/* 烂掉的斧柄 */}
            <rect x="86" y="48" width="3" height="15" rx="1" fill="#5a3a1a" opacity="0.6" />
            <path d="M89 48 Q92 45 89 42" stroke="#5a3a1a" strokeWidth="1" fill="none" opacity="0.6" />
          </>
        ) : (
          <>
            <path d="M30 75 L15 100" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="15" cy="100" r="5" fill="#FDBCB4" />
            <path d="M70 75 L85 100" stroke="#8B7355" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="85" cy="100" r="5" fill="#FDBCB4" />
          </>
        )}
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#3a2a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#3a2a1a" />
      </svg>
      <span className="text-xs font-bold text-amber-800 dark:text-amber-400 mt-1">王质</span>
      {dialog && (
        <div className="absolute -top-8 -right-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

export function ImmortalBoy({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 80 140" className="w-20 h-32 story-character-enter" style={{ animationDelay: '0.3s' }}>
        {/* 仙童 */}
        <circle cx="40" cy="30" r="18" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1" />
        {/* 双髻 */}
        <circle cx="30" cy="12" r="8" fill="#2a2a6e" />
        <circle cx="50" cy="12" r="8" fill="#2a2a6e" />
        {/* 眼睛 */}
        <path d="M33 28 Q36 25 39 28" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
        <path d="M41 28 Q44 25 47 28" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
        {/* 微笑 */}
        <path d="M34 36 Q40 42 46 36" stroke="#C06040" strokeWidth="1.5" fill="none" />
        {/* 道袍 */}
        <path d="M22 48 L20 110 L60 110 L58 48 Q40 55 22 48Z" fill="#6a5acd" />
        <path d="M32 48 L40 65 L48 48" stroke="#5a4abd" strokeWidth="1.5" fill="none" />
        {/* 手臂+棋子 */}
        {action === 'standing' ? (
          <>
            <path d="M22 55 L8 70" stroke="#6a5acd" strokeWidth="6" fill="none" strokeLinecap="round" />
            <circle cx="8" cy="70" r="4" fill="#FDBCB4" />
            <path d="M58 55 L72 70" stroke="#6a5acd" strokeWidth="6" fill="none" strokeLinecap="round" />
            <circle cx="72" cy="70" r="4" fill="#FDBCB4" />
            {/* 手中棋子 */}
            <circle cx="72" cy="67" r="4" fill="white" stroke="#ccc" strokeWidth="0.5" />
          </>
        ) : (
          <>
            <path d="M22 60 L8 80" stroke="#6a5acd" strokeWidth="6" fill="none" strokeLinecap="round" />
            <circle cx="8" cy="80" r="4" fill="#FDBCB4" />
            <path d="M58 60 L72 80" stroke="#6a5acd" strokeWidth="6" fill="none" strokeLinecap="round" />
            <circle cx="72" cy="80" r="4" fill="#FDBCB4" />
          </>
        )}
        <rect x="25" y="108" width="12" height="5" rx="2" fill="#3a2a1a" />
        <rect x="43" y="108" width="12" height="5" rx="2" fill="#3a2a1a" />
      </svg>
      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">仙童</span>
      {dialog && (
        <div className="absolute -top-8 left-0 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[120px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 right-3 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

function Scholar({ action, dialog, name }: { action?: string; dialog?: string; name?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36 story-character-enter" style={{ animationDelay: '0.2s' }}>
        {/* 文人 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 文人帽 */}
        <path d="M28 20 L50 8 L72 20" fill="#1a1a1a" />
        <rect x="32" y="18" width="36" height="6" rx="2" fill="#2a2a2a" />
        {/* 眼睛 */}
        <ellipse cx="40" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
        <ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
        <circle cx="41" cy="32" r="1" fill="white" />
        <circle cx="61" cy="32" r="1" fill="white" />
        {/* 微笑/从容 */}
        <path d="M44 44 Q50 49 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        {/* 胡须 */}
        <path d="M46 47 Q50 55 54 47" stroke="#555" strokeWidth="1" fill="none" />
        {/* 青衫身体 */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#2a6a4a" />
        <path d="M40 57 L50 75 L60 57" stroke="#1a5a3a" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="6" rx="2" fill="#1a5a3a" />
        {/* 手臂 */}
        <path d="M30 75 L15 100" stroke="#2a6a4a" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="15" cy="100" r="5" fill="#FDBCB4" />
        <path d="M70 75 L85 100" stroke="#2a6a4a" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="85" cy="100" r="5" fill="#FDBCB4" />
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-green-700 dark:text-green-400 mt-1">{name || '文人'}</span>
      {dialog && (
        <div className="absolute -top-8 -left-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 right-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

// 谢安 - 东晋丞相，沉着冷静的智者
function XieAn({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36 story-character-enter" style={{ animationDelay: '0.1s' }}>
        {/* 头 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 纶巾（古代文人头巾） */}
        <path d="M28 22 Q50 5 72 22" fill="#3a5a8a" />
        <rect x="35" y="18" width="30" height="8" rx="3" fill="#4a6a9a" />
        {/* 眼睛 - 从容淡定 */}
        <ellipse cx="40" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
        <ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
        <circle cx="41" cy="32" r="1" fill="white" />
        <circle cx="61" cy="32" r="1" fill="white" />
        {/* 微笑/从容 */}
        {action === 'calm' || action === 'standing' ? (
          <path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        ) : (
          <path d="M44 44 Q50 49 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        )}
        {/* 胡须 - 成熟稳重 */}
        <path d="M44 48 Q50 58 56 48" stroke="#555" strokeWidth="1.5" fill="none" />
        {/* 锦袍身体 - 丞相服饰 */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#8B0000" />
        <path d="M40 57 L50 75 L60 57" stroke="#6a0000" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="6" rx="2" fill="#FFD700" />
        {/* 手臂 - 优雅从容 */}
        {action === 'standing' || action === 'calm' ? (
          <>
            <path d="M30 75 L15 95" stroke="#8B0000" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="15" cy="95" r="5" fill="#FDBCB4" />
            <path d="M70 75 L85 95" stroke="#8B0000" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="85" cy="95" r="5" fill="#FDBCB4" />
          </>
        ) : (
          <>
            <path d="M30 70 L10 50" stroke="#8B0000" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="10" cy="50" r="5" fill="#FDBCB4" />
            {/* 手中棋子 */}
            <circle cx="10" cy="47" r="5" fill="#1a1a1a" />
            <path d="M70 70 L90 50" stroke="#8B0000" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="90" cy="50" r="5" fill="#FDBCB4" />
          </>
        )}
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-red-700 dark:text-red-400 mt-1">谢安</span>
      {dialog && (
        <div className="absolute -top-8 -right-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

// 谢玄 - 谢安之侄，年轻将领
function XieXuan({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36 story-character-enter" style={{ animationDelay: '0.2s' }}>
        {/* 头 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 年轻将领头饰 */}
        <path d="M30 18 L50 8 L70 18" fill="#2a4a2a" />
        <rect x="35" y="15" width="30" height="5" rx="2" fill="#3a5a3a" />
        {/* 眼睛 - 年轻有神 */}
        {action === 'worried' || action === 'thinking' ? (
          <>
            <ellipse cx="40" cy="33" rx="3" ry="4" fill="#1a1a1a" />
            <ellipse cx="60" cy="33" rx="3" ry="4" fill="#1a1a1a" />
          </>
        ) : (
          <>
            <ellipse cx="40" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
            <ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
          </>
        )}
        <circle cx="41" cy="32" r="1" fill="white" />
        <circle cx="61" cy="32" r="1" fill="white" />
        {/* 表情 */}
        {action === 'worried' ? (
          <path d="M44 46 Q50 43 56 46" stroke="#C06040" strokeWidth="1.5" fill="none" />
        ) : action === 'thinking' ? (
          <>
            <path d="M44 45 Q50 47 56 45" stroke="#C06040" strokeWidth="1.5" fill="none" />
            {/* 思考泡泡 */}
            <g>
              <circle cx="75" cy="15" r="4" fill="#ddd" opacity="0.7" />
              <circle cx="80" cy="10" r="3" fill="#ddd" opacity="0.5" />
            </g>
          </>
        ) : (
          <path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        )}
        {/* 盔甲身体 - 年轻将领 */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#2a4a6a" />
        <path d="M40 57 L50 75 L60 57" stroke="#1a3a5a" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="6" rx="2" fill="#FFD700" />
        {/* 手臂 */}
        {action === 'worried' || action === 'thinking' ? (
          <>
            <path d="M30 70 L15 90" stroke="#2a4a6a" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="15" cy="90" r="5" fill="#FDBCB4" />
            <path d="M70 70 L80 55" stroke="#2a4a6a" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="80" cy="55" r="5" fill="#FDBCB4" />
          </>
        ) : (
          <>
            <path d="M30 70 L10 55" stroke="#2a4a6a" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="10" cy="55" r="5" fill="#FDBCB4" />
            <path d="M70 70 L90 55" stroke="#2a4a6a" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="90" cy="55" r="5" fill="#FDBCB4" />
          </>
        )}
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-1">谢玄</span>
      {dialog && (
        <div className="absolute -top-8 -left-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 right-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

// 黄龙士 - 清朝棋圣
function HuangLongShi({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36 story-character-enter" style={{ animationDelay: '0.1s' }}>
        {/* 头 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 清代帽子 */}
        <path d="M30 20 L50 10 L70 20" fill="#1a1a1a" />
        <rect x="35" y="18" width="30" height="4" rx="2" fill="#2a2a2a" />
        {/* 眼睛 - 睿智深邃 */}
        <ellipse cx="40" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
        <ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
        <circle cx="41" cy="32" r="1" fill="white" />
        <circle cx="61" cy="32" r="1" fill="white" />
        {/* 微笑 */}
        <path d="M44 44 Q50 49 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        {/* 胡须 - 飘逸 */}
        <path d="M42 48 Q50 62 58 48" stroke="#666" strokeWidth="1.5" fill="none" />
        {/* 长袍身体 */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#4a3a6a" />
        <path d="M40 57 L50 75 L60 57" stroke="#3a2a5a" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="6" rx="2" fill="#FFD700" />
        {/* 手臂 */}
        <path d="M30 70 L10 50" stroke="#4a3a6a" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="10" cy="50" r="5" fill="#FDBCB4" />
        {/* 手中棋子 */}
        <circle cx="10" cy="47" r="5" fill="#1a1a1a" />
        <path d="M70 70 L90 50" stroke="#4a3a6a" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="90" cy="50" r="5" fill="#FDBCB4" />
        <circle cx="90" cy="47" r="5" fill="white" stroke="#ccc" strokeWidth="0.5" />
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-purple-700 dark:text-purple-400 mt-1">黄龙士</span>
      {dialog && (
        <div className="absolute -top-8 -right-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

// 徐星友 - 清朝围棋高手
function XuXingYou({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36 story-character-enter" style={{ animationDelay: '0.2s' }}>
        {/* 头 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 文人帽 */}
        <path d="M28 22 L50 10 L72 22" fill="#1a1a1a" />
        <rect x="33" y="20" width="34" height="5" rx="2" fill="#2a2a2a" />
        {/* 眼睛 */}
        {action === 'thinking' ? (
          <>
            <ellipse cx="40" cy="33" rx="3" ry="4" fill="#1a1a1a" />
            <ellipse cx="60" cy="33" rx="3" ry="4" fill="#1a1a1a" />
            {/* 思考泡泡 */}
            <g>
              <circle cx="75" cy="15" r="4" fill="#ddd" opacity="0.7" />
              <circle cx="80" cy="10" r="3" fill="#ddd" opacity="0.5" />
            </g>
          </>
        ) : (
          <>
            <ellipse cx="40" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
            <ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
          </>
        )}
        <circle cx="41" cy="32" r="1" fill="white" />
        <circle cx="61" cy="32" r="1" fill="white" />
        {/* 表情 */}
        {action === 'thinking' ? (
          <path d="M44 46 Q50 43 56 46" stroke="#C06040" strokeWidth="1.5" fill="none" />
        ) : (
          <path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        )}
        {/* 胡须 */}
        <path d="M44 48 Q50 56 56 48" stroke="#555" strokeWidth="1.5" fill="none" />
        {/* 布衣身体 */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#6a5a4a" />
        <path d="M40 57 L50 75 L60 57" stroke="#5a4a3a" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="5" rx="2" fill="#8a7a6a" />
        {/* 手臂 */}
        {action === 'thinking' ? (
          <>
            <path d="M30 70 L15 90" stroke="#6a5a4a" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="15" cy="90" r="5" fill="#FDBCB4" />
            <path d="M70 70 L85 55" stroke="#6a5a4a" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="85" cy="55" r="5" fill="#FDBCB4" />
          </>
        ) : (
          <>
            <path d="M30 70 L10 55" stroke="#6a5a4a" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="10" cy="55" r="5" fill="#FDBCB4" />
            <path d="M70 70 L90 55" stroke="#6a5a4a" strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx="90" cy="55" r="5" fill="#FDBCB4" />
          </>
        )}
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-1">徐星友</span>
      {dialog && (
        <div className="absolute -top-8 -left-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 right-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

// 王积薪 - 唐朝棋待诏
function WangJiXin({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36 story-character-enter" style={{ animationDelay: '0.1s' }}>
        {/* 头 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 唐代官帽 */}
        <path d="M25 22 Q50 5 75 22" fill="#8B0000" />
        <rect x="35" y="18" width="30" height="6" rx="2" fill="#a00000" />
        {/* 眼睛 */}
        {action === 'surprised' ? (
          <>
            <circle cx="40" cy="33" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1" />
            <circle cx="40" cy="33" r="3" fill="#1a1a1a" />
            <circle cx="60" cy="33" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1" />
            <circle cx="60" cy="33" r="3" fill="#1a1a1a" />
          </>
        ) : (
          <>
            <ellipse cx="40" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
            <ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
            <circle cx="41" cy="32" r="1" fill="white" />
            <circle cx="61" cy="32" r="1" fill="white" />
          </>
        )}
        {/* 表情 */}
        {action === 'surprised' ? (
          <circle cx="50" cy="46" r="4" fill="#C06040" opacity="0.6" />
        ) : (
          <path d="M44 44 Q50 48 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        )}
        {/* 胡须 */}
        <path d="M44 48 Q50 56 56 48" stroke="#555" strokeWidth="1.5" fill="none" />
        {/* 官服身体 */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#2a4a2a" />
        <path d="M40 57 L50 75 L60 57" stroke="#1a3a1a" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="6" rx="2" fill="#FFD700" />
        {/* 手臂 */}
        <path d="M30 70 L10 55" stroke="#2a4a2a" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="10" cy="55" r="5" fill="#FDBCB4" />
        <path d="M70 70 L90 55" stroke="#2a4a2a" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="90" cy="55" r="5" fill="#FDBCB4" />
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-green-700 dark:text-green-400 mt-1">王积薪</span>
      {dialog && (
        <div className="absolute -top-8 -right-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

// 老妇人 - 仙风道骨的老婆婆
function ElderlyWoman({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36 story-character-enter" style={{ animationDelay: '0.2s' }}>
        {/* 头 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 白发 */}
        <ellipse cx="50" cy="18" rx="16" ry="10" fill="#ddd" />
        {/* 发髻 */}
        <circle cx="50" cy="10" r="6" fill="#ccc" />
        {/* 眼睛 - 睿智深邃 */}
        <ellipse cx="40" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
        <ellipse cx="60" cy="33" rx="3" ry="3.5" fill="#1a1a1a" />
        <circle cx="41" cy="32" r="1" fill="white" />
        <circle cx="61" cy="32" r="1" fill="white" />
        {/* 微笑 */}
        <path d="M44 44 Q50 49 56 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        {/* 道袍身体 */}
        <path d="M30 57 L26 130 L74 130 L70 57 Q50 65 30 57Z" fill="#6a5acd" />
        <path d="M40 57 L50 75 L60 57" stroke="#5a4abd" strokeWidth="2" fill="none" />
        {/* 手臂 */}
        <path d="M30 70 L10 55" stroke="#6a5acd" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="10" cy="55" r="5" fill="#FDBCB4" />
        <path d="M70 70 L90 55" stroke="#6a5acd" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="90" cy="55" r="5" fill="#FDBCB4" />
        <rect x="33" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="14" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mt-1">老婆婆</span>
      {dialog && (
        <div className="absolute -top-8 -right-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

// 年轻女子 - 仙女的儿媳
function YoungWoman({ action, dialog }: { action?: string; dialog?: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 160" className="w-24 h-36 story-character-enter" style={{ animationDelay: '0.3s' }}>
        {/* 头 */}
        <circle cx="50" cy="35" r="22" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.5" />
        {/* 发髻 */}
        <ellipse cx="50" cy="18" rx="14" ry="10" fill="#1a1a1a" />
        <circle cx="50" cy="8" r="5" fill="#1a1a1a" />
        {/* 眼睛 */}
        <path d="M35 32 Q38 29 41 32" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
        <path d="M59 32 Q62 29 65 32" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
        {/* 微笑 */}
        <path d="M42 44 Q50 52 58 44" stroke="#C06040" strokeWidth="1.5" fill="none" />
        {/* 裙裳身体 */}
        <path d="M30 57 L20 130 L80 130 L70 57 Q50 65 30 57Z" fill="#ff69b4" />
        <path d="M40 57 L50 80 L60 57" stroke="#ff1493" strokeWidth="2" fill="none" />
        <rect x="28" y="85" width="44" height="5" rx="2" fill="#ffd700" />
        {/* 手臂 */}
        <path d="M30 65 L15 50" stroke="#ff69b4" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="15" cy="50" r="4" fill="#FDBCB4" />
        <path d="M70 65 L85 50" stroke="#ff69b4" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="85" cy="50" r="4" fill="#FDBCB4" />
        <rect x="27" y="128" width="12" height="6" rx="3" fill="#2a1a1a" />
        <rect x="53" y="128" width="12" height="6" rx="3" fill="#2a1a1a" />
      </svg>
      <span className="text-xs font-bold text-pink-700 dark:text-pink-400 mt-1">儿媳</span>
      {dialog && (
        <div className="absolute -top-8 -left-4 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 shadow-lg border text-xs max-w-[140px] story-dialog-pop">
          {dialog}
          <div className="absolute bottom-0 right-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 translate-y-full" />
        </div>
      )}
    </div>
  );
}

/* ──────────── 场景背景 ──────────── */

function SceneBackground({ type }: { type: SceneAnimation['background'] }) {
  switch (type) {
    case 'mountain':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-200 to-green-200" />
          <svg className="absolute bottom-0 w-full" viewBox="0 0 400 200">
            <path d="M0 200 L0 120 L80 60 L160 100 L240 40 L320 90 L400 70 L400 200Z" fill="#4a8c3f" opacity="0.6" />
            <path d="M0 200 L0 140 L100 80 L200 120 L300 70 L400 100 L400 200Z" fill="#3a7c2f" opacity="0.8" />
            <path d="M0 200 L0 160 L120 120 L240 150 L360 110 L400 130 L400 200Z" fill="#2a6c1f" />
            {/* 太阳 */}
            <circle cx="350" cy="40" r="25" fill="#FFD700" opacity="0.8" />
            <circle cx="350" cy="40" r="20" fill="#FFEC80" />
          </svg>
        </div>
      );
    case 'cave':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-stone-700 via-stone-600 to-stone-800" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
            {/* 洞口 */}
            <path d="M50 300 L50 80 Q200 20 350 80 L350 300Z" fill="#1a1510" />
            <path d="M70 300 L70 90 Q200 35 330 90 L330 300Z" fill="#2a2518" />
            {/* 神秘光芒 */}
            <ellipse cx="200" cy="100" rx="60" ry="30" fill="#FFD700" opacity="0.1" />
            <ellipse cx="200" cy="120" rx="80" ry="20" fill="#FFD700" opacity="0.05" />
            {/* 石钟乳 */}
            <path d="M100 80 L105 110 L110 80" fill="#3a3528" />
            <path d="M180 60 L183 90 L186 60" fill="#3a3528" />
            <path d="M260 70 L263 100 L266 70" fill="#3a3528" />
          </svg>
        </div>
      );
    case 'palace':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-100 via-amber-50 to-red-100" />
          <svg className="absolute bottom-0 w-full" viewBox="0 0 400 200">
            {/* 宫殿地面 */}
            <rect x="0" y="150" width="400" height="50" fill="#c8a060" />
            {/* 柱子 */}
            <rect x="60" y="40" width="20" height="110" fill="#c03030" />
            <rect x="160" y="40" width="20" height="110" fill="#c03030" />
            <rect x="220" y="40" width="20" height="110" fill="#c03030" />
            <rect x="320" y="40" width="20" height="110" fill="#c03030" />
            {/* 屋顶 */}
            <path d="M30 40 L200 5 L370 40Z" fill="#1a1a6e" />
            <path d="M50 40 L200 15 L350 40Z" fill="#2a2a8e" />
            {/* 横梁 */}
            <rect x="60" y="38" width="280" height="8" fill="#FFD700" />
          </svg>
        </div>
      );
    case 'village':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-green-100" />
          <svg className="absolute bottom-0 w-full" viewBox="0 0 400 200">
            {/* 小屋 */}
            <rect x="40" y="100" width="80" height="60" fill="#c8a060" />
            <path d="M30 100 L80 60 L130 100Z" fill="#8B4513" />
            <rect x="65" y="120" width="20" height="30" fill="#5a3a1a" />
            {/* 小屋2 */}
            <rect x="260" y="110" width="70" height="50" fill="#c8a060" />
            <path d="M250 110 L295 75 L340 110Z" fill="#8B4513" />
            {/* 地面 */}
            <rect x="0" y="160" width="400" height="40" fill="#5a8a3a" />
            {/* 小路 */}
            <path d="M80 160 Q200 170 295 160" stroke="#c8a060" strokeWidth="8" fill="none" />
          </svg>
        </div>
      );
    case 'forest':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-green-200 via-green-100 to-green-300" />
          <svg className="absolute bottom-0 w-full" viewBox="0 0 400 200">
            {/* 大树 */}
            <rect x="80" y="80" width="20" height="120" fill="#5a3a1a" />
            <circle cx="90" cy="50" r="45" fill="#2a6a1a" />
            <circle cx="70" cy="70" r="30" fill="#3a7a2a" />
            <circle cx="110" cy="65" r="35" fill="#2a6a1a" />
            {/* 小树 */}
            <rect x="280" y="100" width="12" height="80" fill="#5a3a1a" />
            <circle cx="286" cy="75" r="30" fill="#3a7a2a" />
            {/* 地面 */}
            <rect x="0" y="180" width="400" height="20" fill="#2a5a1a" />
          </svg>
        </div>
      );
    case 'night':
      return (
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-indigo-800 to-slate-900" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
            {/* 月亮 */}
            <circle cx="320" cy="60" r="30" fill="#FFEC80" opacity="0.9" />
            <circle cx="330" cy="55" r="25" fill="indigo-800" opacity="0.5" />
            {/* 星星 */}
            <circle cx="50" cy="30" r="2" fill="white" opacity="0.8" />
            <circle cx="120" cy="50" r="1.5" fill="white" opacity="0.6" />
            <circle cx="200" cy="20" r="2" fill="white" opacity="0.7" />
            <circle cx="260" cy="40" r="1.5" fill="white" opacity="0.5" />
            <circle cx="80" cy="70" r="1" fill="white" opacity="0.4" />
            {/* 远山 */}
            <path d="M0 250 L100 180 L200 220 L300 170 L400 200 L400 300 L0 300Z" fill="#1a1a3a" opacity="0.6" />
          </svg>
        </div>
      );
    default:
      return null;
  }
}

/* ──────────── 场景特效 ──────────── */

function SceneEffects({ effects }: { effects: SceneAnimation['effects'] }) {
  if (!effects || effects.length === 0) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {effects.includes('leaves') && <FloatingLeaves />}
      {effects.includes('sparkles') && <SparkleEffect />}
      {effects.includes('decay') && <DecayEffect />}
      {effects.includes('time-lapse') && <TimeLapseEffect />}
      {effects.includes('wind') && <WindEffect />}
    </div>
  );
}

function FloatingLeaves() {
  return (
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
  );
}

function SparkleEffect() {
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="absolute text-sm sparkle-float"
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
  );
}

function DecayEffect() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-6xl decay-animate opacity-0">🪵➡️🪵💀</div>
    </div>
  );
}

function TimeLapseEffect() {
  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
      {/* 时光流转效果 */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-200 via-orange-300 to-red-400 opacity-0 animate-time-lapse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/60 text-white px-6 py-3 rounded-2xl text-center animate-pulse shadow-xl">
          <div className="text-2xl mb-1">⏳</div>
          <div className="text-sm font-bold">时光飞逝</div>
          <div className="text-xs opacity-80 mt-1">斧柄已腐烂...</div>
        </div>
      </div>
    </div>
  );
}

function WindEffect() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="absolute h-px bg-white/30 wind-blow"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: '-10%',
            width: `${40 + Math.random() * 60}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      ))}
    </>
  );
}

/* ──────────── 渲染角色组件 ──────────── */

function CharacterRenderer({ character }: { character: SceneCharacter }) {
  const commonProps = { action: character.action, dialog: character.dialog, name: character.name };
  switch (character.type) {
    case 'emperor-yao':
      return <EmperorYao {...commonProps} />;
    case 'dan-zhu':
      return <DanZhu {...commonProps} />;
    case 'woodcutter':
      return <Woodcutter {...commonProps} />;
    case 'immortal-boy':
      return <ImmortalBoy {...commonProps} />;
    case 'scholar':
      return <Scholar {...commonProps} />;
    case 'xie-an':
      return <XieAn {...commonProps} />;
    case 'xiexuan':
      return <XieXuan {...commonProps} />;
    case 'wangjixin':
      return <WangJiXin {...commonProps} />;
    case 'elderly-woman':
      return <ElderlyWoman {...commonProps} />;
    case 'young-woman':
      return <YoungWoman {...commonProps} />;
    case 'huanglongshi':
      return <HuangLongShi {...commonProps} />;
    case 'xuxingyou':
      return <XuXingYou {...commonProps} />;
    default:
      return <Scholar {...commonProps} />;
  }
}

/* ──────────── 场景动画整体组件 ──────────── */

export default function StoryScene({ scene }: { scene: SceneAnimation }) {
  return (
    <div className="relative w-full h-72 md:h-96 rounded-2xl overflow-hidden border-2 border-amber-200 dark:border-amber-800 shadow-xl bg-gradient-to-b from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20">
      {/* 顶部标题栏 */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white px-4 py-2 z-20 flex items-center gap-2">
        <span className="text-lg">🎭</span>
        <span className="text-sm font-bold">故事场景</span>
        {scene.effects?.includes('time-lapse') && (
          <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full animate-pulse">⏳ 时光流转</span>
        )}
      </div>
      
      {/* 背景 */}
      {scene.background && <SceneBackground type={scene.background} />}

      {/* 特效 */}
      <SceneEffects effects={scene.effects} />

      {/* 角色区域 */}
      <div className="absolute inset-0 flex items-end justify-center gap-4 md:gap-8 pb-8 z-10 pt-12">
        {scene.characters?.map((char, i) => (
          <div key={i} className={`transform transition-all duration-500 ${
            char.position === 'left' ? '-translate-x-2' : char.position === 'right' ? 'translate-x-2' : ''
          } hover:scale-105 hover:-translate-y-1`}>
            <CharacterRenderer character={char} />
          </div>
        ))}
      </div>
      
      {/* 底部装饰 */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-amber-200/50 to-transparent z-5" />
    </div>
  );
}
