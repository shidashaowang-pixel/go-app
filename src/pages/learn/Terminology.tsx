import { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GO_TERMS,
  TERMS_BY_CATEGORY,
  CATEGORY_NAMES,
  DIFFICULTY_NAMES,
  type GoTerm,
  type TermCategory,
} from '@/data/terms';
import { useAuth } from '@/contexts/AuthContext';
import { updateProgress } from '@/db/api';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Eye,
  Shuffle,
  Star,
} from 'lucide-react';

const STORAGE_KEY = 'go-terminology-progress';

interface TerminologyProgress {
  knownTerms: string[]; // 已认识的术语ID列表
  lastPlayedAt: string;
}

function loadTerminologyProgress(): TerminologyProgress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[Terminology] 加载进度失败:', e);
  }
  return { knownTerms: [], lastPlayedAt: '' };
}

function saveTerminologyProgress(progress: TerminologyProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('[Terminology] 保存进度失败:', e);
  }
}

interface FlashCard {
  term: GoTerm;
  known: boolean;
  flipped: boolean;
}

function FlashCardView({
  cards,
  currentIndex,
  setCurrentIndex,
  onKnow,
  onDontKnow,
}: {
  cards: FlashCard[];
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  onKnow: () => void;
  onDontKnow: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const card = cards[currentIndex];

  useEffect(() => {
    setFlipped(false);
  }, [currentIndex]);

  const handleKnow = () => {
    onKnow();
    if (currentIndex < cards.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleDontKnow = () => {
    onDontKnow();
    if (currentIndex < cards.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {cards.length}
        </span>
        <Progress value={progress} className="flex-1 mx-4 h-2" />
        <Badge variant="outline">{DIFFICULTY_NAMES[card.term.difficulty]}</Badge>
      </div>

      {/* 卡片主体 */}
      <div
        className="relative h-64 cursor-pointer perspective-1000"
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className={`absolute inset-0 transition-transform duration-500 transform-style-preserve-3d ${
            flipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* 正面 - 术语 */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-lg backface-hidden ${
              flipped ? 'rotate-y-180 invisible' : ''
            }`}
          >
            <Badge className="mb-4" variant="secondary">
              {CATEGORY_NAMES[card.term.category].name}
            </Badge>
            <h2 className="text-4xl font-bold mb-4">{card.term.term}</h2>
            {card.term.reading && (
              <p className="text-lg text-muted-foreground">{card.term.reading}</p>
            )}
            <p className="text-sm text-muted-foreground mt-6">点击翻转查看解释</p>
          </div>

          {/* 背面 - 解释 */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-xl border bg-gradient-to-br from-card to-card/80 p-6 shadow-lg backface-hidden rotate-y-180 ${
              flipped ? '' : 'rotate-y-180 invisible'
            }`}
          >
            <h3 className="text-lg font-medium mb-4 text-center">{card.term.term}</h3>
            <p className="text-center text-base leading-relaxed">{card.term.chinese}</p>
            {card.term.example && (
              <p className="text-sm text-muted-foreground mt-4 text-center italic">
                "{card.term.example}"
              </p>
            )}
            {card.term.relatedTerms && card.term.relatedTerms.length > 0 && (
              <div className="flex gap-2 mt-4">
                {card.term.relatedTerms.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1 h-12 text-red-500 border-red-200 hover:bg-red-50"
          onClick={handleDontKnow}
        >
          <X className="w-5 h-5 mr-2" />
          不认识
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-12 text-green-500 border-green-200 hover:bg-green-50"
          onClick={handleKnow}
        >
          <Check className="w-5 h-5 mr-2" />
          认识
        </Button>
      </div>
    </div>
  );
}

function TermCard({ term, isKnown }: { term: GoTerm; isKnown?: boolean }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow ${isKnown ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' : ''}`} onClick={() => setShowDetail(!showDetail)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isKnown && <Check className="w-5 h-5 text-green-500" />}
            <div>
              <h3 className="font-bold text-lg">{term.term}</h3>
              {term.reading && <p className="text-sm text-muted-foreground">{term.reading}</p>}
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {DIFFICULTY_NAMES[term.difficulty]}
          </Badge>
        </div>
        
        {showDetail && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <p className="text-sm">{term.chinese}</p>
            {term.example && (
              <p className="text-xs text-muted-foreground italic">"{term.example}"</p>
            )}
            {term.relatedTerms && term.relatedTerms.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">相关：</span>
                {term.relatedTerms.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TerminologyPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'list' | 'flashcard'>('list');
  const [selectedCategory, setSelectedCategory] = useState<TermCategory | 'all'>('all');
  const [flashcards, setFlashcards] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knownCount, setKnownCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [knownTerms, setKnownTerms] = useState<string[]>(() => loadTerminologyProgress().knownTerms);

  // 已知术语变化时保存进度
  useEffect(() => {
    saveTerminologyProgress({
      knownTerms,
      lastPlayedAt: new Date().toISOString(),
    });
  }, [knownTerms]);

  // 初始化闪卡
  const initFlashcards = useCallback((category: TermCategory | 'all') => {
    const terms = category === 'all' 
      ? GO_TERMS 
      : TERMS_BY_CATEGORY[category] || [];
    
    // 随机打乱
    const shuffled = [...terms].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled.map(term => ({ term, known: false, flipped: false })));
    setCurrentIndex(0);
    setKnownCount(0);
    setSessionDone(false);
    setMode('flashcard');
  }, []);

  const handleKnow = () => {
    const currentCard = flashcards[currentIndex];
    setFlashcards(prev => {
      const updated = [...prev];
      updated[currentIndex].known = true;
      return updated;
    });
    setKnownCount(prev => prev + 1);
    // 保存已认识的术语
    if (currentCard && !knownTerms.includes(currentCard.term.id)) {
      setKnownTerms(prev => [...prev, currentCard.term.id]);
    }
    
    if (currentIndex >= flashcards.length - 1) {
      setSessionDone(true);
    }
  };

  const handleDontKnow = () => {
    if (currentIndex >= flashcards.length - 1) {
      setSessionDone(true);
    }
  };

  // 过滤后的术语列表
  const filteredTerms = selectedCategory === 'all'
    ? GO_TERMS
    : TERMS_BY_CATEGORY[selectedCategory] || [];

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">围棋术语</h1>
          <p className="text-sm text-muted-foreground">学习围棋专业术语</p>
        </div>

        {/* 模式切换 */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={mode === 'list' ? 'default' : 'outline'}
            onClick={() => setMode('list')}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            术语列表
          </Button>
          <Button
            variant={mode === 'flashcard' ? 'default' : 'outline'}
            onClick={() => initFlashcards(selectedCategory)}
          >
            <Star className="w-4 h-4 mr-2" />
            闪卡学习
          </Button>
        </div>

        {mode === 'list' ? (
          <>
            {/* 分类筛选 */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <Button
                size="sm"
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
              >
                全部 ({GO_TERMS.length})
              </Button>
              {Object.entries(CATEGORY_NAMES).map(([key, { name }]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={selectedCategory === key ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(key as TermCategory)}
                >
                  {name} ({(TERMS_BY_CATEGORY[key as TermCategory] || []).length})
                </Button>
              ))}
            </div>

            {/* 术语卡片列表 */}
            <div className="grid gap-3">
              {filteredTerms.map((term) => (
                <TermCard key={term.id} term={term} isKnown={knownTerms.includes(term.id)} />
              ))}
            </div>
          </>
        ) : (
          <>
            {flashcards.length > 0 ? (
              <>
                {sessionDone ? (
                  <Card className="text-center py-8">
                    <CardContent>
                      <div className="text-6xl mb-4">🎉</div>
                      <h2 className="text-2xl font-bold mb-2">学习完成！</h2>
                      <p className="text-muted-foreground mb-4">
                        本轮学习了 {flashcards.length} 个术语
                      </p>
                      <div className="flex justify-center gap-6 mb-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-500">{knownCount}</p>
                          <p className="text-sm text-muted-foreground">认识</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-red-500">{flashcards.length - knownCount}</p>
                          <p className="text-sm text-muted-foreground">不认识</p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-center">
                        <Button
                          variant="outline"
                          onClick={() => initFlashcards(selectedCategory)}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          再学一遍
                        </Button>
                        <Button onClick={() => setMode('list')}>
                          <BookOpen className="w-4 h-4 mr-2" />
                          返回列表
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <FlashCardView
                    cards={flashcards}
                    currentIndex={currentIndex}
                    setCurrentIndex={setCurrentIndex}
                    onKnow={handleKnow}
                    onDontKnow={handleDontKnow}
                  />
                )}
              </>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">该分类暂无术语</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSelectedCategory('all')}
                  >
                    查看全部术语
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 切换学习分类 */}
            {!sessionDone && flashcards.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-3">切换学习范围：</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => initFlashcards('all')}
                  >
                    全部
                  </Button>
                  {Object.keys(CATEGORY_NAMES).map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant="ghost"
                      onClick={() => initFlashcards(key as TermCategory)}
                    >
                      {CATEGORY_NAMES[key as TermCategory].name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
