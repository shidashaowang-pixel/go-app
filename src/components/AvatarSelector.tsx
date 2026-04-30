import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Upload, Check, X } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { playCorrectSound } from '@/lib/sounds';

// ========== 系统头像库 ==========
// 为中小学生设计的可爱头像
export const AVATAR_LIBRARY = [
  // 动物系列 1
  { id: 'panda', emoji: '🐼', name: '熊猫', category: 'animal' },
  { id: 'rabbit', emoji: '🐰', name: '兔子', category: 'animal' },
  { id: 'cat', emoji: '🐱', name: '猫咪', category: 'animal' },
  { id: 'dog', emoji: '🐶', name: '狗狗', category: 'animal' },
  { id: 'fox', emoji: '🦊', name: '狐狸', category: 'animal' },
  { id: 'bear', emoji: '🐻', name: '小熊', category: 'animal' },
  { id: 'koala', emoji: '🐨', name: '考拉', category: 'animal' },
  { id: 'tiger', emoji: '🐯', name: '老虎', category: 'animal' },
  { id: 'lion', emoji: '🦁', name: '狮子', category: 'animal' },
  { id: 'pig', emoji: '🐷', name: '小猪', category: 'animal' },
  { id: 'cow', emoji: '🐮', name: '奶牛', category: 'animal' },
  { id: 'mouse', emoji: '🐭', name: '小鼠', category: 'animal' },
  
  // 动物系列 2
  { id: 'unicorn', emoji: '🦄', name: '独角兽', category: 'animal' },
  { id: 'dragon', emoji: '🐲', name: '小龙', category: 'animal' },
  { id: 'frog', emoji: '🐸', name: '青蛙', category: 'animal' },
  { id: 'owl', emoji: '🦉', name: '猫头鹰', category: 'animal' },
  { id: 'chick', emoji: '🐥', name: '小鸡', category: 'animal' },
  { id: 'penguin', emoji: '🐧', name: '企鹅', category: 'animal' },
  { id: 'whale', emoji: '🐳', name: '鲸鱼', category: 'animal' },
  { id: 'fish', emoji: '🐟', name: '小鱼', category: 'animal' },
  { id: 'butterfly', emoji: '🦋', name: '蝴蝶', category: 'animal' },
  { id: 'bee', emoji: '🐝', name: '蜜蜂', category: 'animal' },
  { id: 'snake', emoji: '🐍', name: '小蛇', category: 'animal' },
  { id: 'turtle', emoji: '🐢', name: '乌龟', category: 'animal' },
  
  // 围棋主题头像
  { id: 'go-black', emoji: '⚫', name: '黑棋', category: 'go' },
  { id: 'go-white', emoji: '⚪', name: '白棋', category: 'go' },
  { id: 'go-bamboo', emoji: '🎋', name: '竹子', category: 'go' },
  { id: 'go-mountain', emoji: '⛰️', name: '青山', category: 'go' },
  { id: 'go-wave', emoji: '🌊', name: '海浪', category: 'go' },
  { id: 'go-tree', emoji: '🌳', name: '古树', category: 'go' },
  { id: 'go-flower', emoji: '🌸', name: '樱花', category: 'go' },
  { id: 'go-moon', emoji: '🌙', name: '明月', category: 'go' },
  
  // 趣味表情
  { id: 'star', emoji: '⭐', name: '星星', category: 'emoji' },
  { id: 'rocket', emoji: '🚀', name: '火箭', category: 'emoji' },
  { id: 'crown', emoji: '👑', name: '皇冠', category: 'emoji' },
  { id: 'gem', emoji: '💎', name: '宝石', category: 'emoji' },
  { id: 'sun', emoji: '🌞', name: '太阳', category: 'emoji' },
  { id: 'rainbow', emoji: '🌈', name: '彩虹', category: 'emoji' },
  { id: 'fire', emoji: '🔥', name: '火焰', category: 'emoji' },
  { id: 'sparkle', emoji: '✨', name: '闪光', category: 'emoji' },
  { id: 'heart', emoji: '❤️', name: '爱心', category: 'emoji' },
  { id: 'lightning', emoji: '⚡', name: '闪电', category: 'emoji' },
  { id: 'cloud', emoji: '☁️', name: '云朵', category: 'emoji' },
  { id: 'snow', emoji: '❄️', name: '雪花', category: 'emoji' },
  
  // 人物/角色
  { id: 'boy', emoji: '👦', name: '男孩', category: 'person' },
  { id: 'girl', emoji: '👧', name: '女孩', category: 'person' },
  { id: 'man', emoji: '👨', name: '大叔', category: 'person' },
  { id: 'woman', emoji: '👩', name: '阿姨', category: 'person' },
  { id: 'sage', emoji: '🧙', name: '智者', category: 'person' },
  { id: 'ninja', emoji: '🥷', name: '忍者', category: 'person' },
  { id: 'astronaut', emoji: '👨‍🚀', name: '宇航员', category: 'person' },
  { id: 'chef', emoji: '👨‍🍳', name: '厨师', category: 'person' },
  
  // 物品
  { id: 'book', emoji: '📚', name: '书本', category: 'object' },
  { id: 'pencil', emoji: '✏️', name: '铅笔', category: 'object' },
  { id: 'gamepad', emoji: '🎮', name: '游戏', category: 'object' },
  { id: 'trophy', emoji: '🏆', name: '奖杯', category: 'object' },
  { id: 'medal', emoji: '🏅', name: '奖牌', category: 'object' },
  { id: 'ball', emoji: '⚽', name: '足球', category: 'object' },
  { id: 'guitar', emoji: '🎸', name: '吉他', category: 'object' },
  { id: 'camera', emoji: '📷', name: '相机', category: 'object' },
];

interface AvatarSelectorProps {
  currentAvatarUrl?: string | null;
  currentAvatarEmoji?: string | null;
  onSelect: (avatarUrl: string | null) => Promise<void>;
}

export default function AvatarSelector({
  currentAvatarUrl,
  currentAvatarEmoji,
  onSelect,
}: AvatarSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    currentAvatarEmoji && !currentAvatarUrl 
      ? AVATAR_LIBRARY.find(a => a.emoji === currentAvatarEmoji)?.id || null 
      : null
  );
  const [activeCategory, setActiveCategory] = useState<string>('animal');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 按分类过滤头像
  const filteredAvatars = AVATAR_LIBRARY.filter(a => a.category === activeCategory);

  // 选择系统头像
  const handleSelectEmoji = async (emoji: string, id: string) => {
    if (saving) return;
    setSelectedId(id);
    setSaving(true);
    try {
      // 清除自定义头像，使用 emoji 作为头像
      await onSelect(null); // 传递 null 表示使用 emoji
      // 实际保存 emoji 的逻辑需要在父组件处理
      playCorrectSound();
    } finally {
      setSaving(false);
    }
  };

  // 上传自定义头像
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 校验文件大小（最大2MB）
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过2MB');
      return;
    }

    // 校验文件类型
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('仅支持 JPG/PNG/GIF/WebP 格式');
      return;
    }

    setUploading(true);
    try {
      // 生成唯一文件名
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `avatars/custom/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await onSelect(publicUrl + '?t=' + Date.now());
      setSelectedId(null);
      playCorrectSound();
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* 当前头像预览 */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
        <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
          {currentAvatarUrl ? (
            <AvatarImage src={currentAvatarUrl} />
          ) : null}
          <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-100 to-purple-100">
            {currentAvatarEmoji || '👤'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-bold text-sm">选择你的头像</p>
          <p className="text-xs text-gray-500 mt-1">从下方选择系统头像或上传自定义图片</p>
        </div>
      </div>

      {/* 上传自定义头像按钮 */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              上传中...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              上传自定义头像
            </>
          )}
        </Button>
      </div>

      {/* 系统头像库 */}
      <div>
        <p className="font-bold text-sm mb-3 flex items-center gap-2">
          <span className="text-lg">🎨</span>
          系统头像
        </p>
        
        {/* 分类标签 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {AVATAR_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${activeCategory === cat.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        
        {/* 头像网格 */}
        <div className="grid grid-cols-8 gap-2 max-h-56 overflow-y-auto p-1">
          {filteredAvatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleSelectEmoji(avatar.emoji, avatar.id)}
              disabled={saving}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl 
                transition-all duration-200 hover:scale-110 hover:shadow-lg
                ${selectedId === avatar.id 
                  ? 'bg-primary/20 ring-3 ring-primary scale-110' 
                  : 'bg-gray-100 hover:bg-gray-200'
                }`}
              title={avatar.name}
            >
              {avatar.emoji}
              {selectedId === avatar.id && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
        
        <p className="text-xs text-gray-400 mt-2 text-center">
          共 {filteredAvatars.length} 个头像 · 共 {AVATAR_LIBRARY.length} 个可选
        </p>
      </div>
    </div>
  );
}

// 简化版头像选择器（用于首页卡片上快速切换）
export function QuickAvatarPicker({
  currentEmoji,
  onSelect,
}: {
  currentEmoji?: string | null;
  onSelect: (emoji: string) => void;
}) {
  // 常用头像（简化版）
  const quickAvatars = AVATAR_LIBRARY.slice(0, 12);
  
  return (
    <div className="flex gap-1">
      {quickAvatars.map((avatar) => (
        <button
          key={avatar.id}
          onClick={() => onSelect(avatar.emoji)}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110
            ${currentEmoji === avatar.emoji 
              ? 'bg-primary/20 ring-2 ring-primary' 
              : 'bg-gray-100 hover:bg-gray-200'
            }`}
          title={avatar.name}
        >
          {avatar.emoji}
        </button>
      ))}
    </div>
  );
}

// 头像分类
export const AVATAR_CATEGORIES = [
  { id: 'animal', name: '🐾 动物', emoji: '🐼' },
  { id: 'go', name: '🎯 围棋', emoji: '⚫' },
  { id: 'emoji', name: '😊 表情', emoji: '⭐' },
  { id: 'person', name: '👤 人物', emoji: '👦' },
  { id: 'object', name: '📦 物品', emoji: '🏆' },
] as const;
