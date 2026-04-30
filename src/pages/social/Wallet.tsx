import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUserCoins, ensureUserCoins, dailyCheckin, getCheckinStreak, getCoinTransactions, getTasks, getUserTasks, getShopItems, purchaseItem, getUserInventory, updateTaskProgress, type UserCoins, type CoinTransaction, type ShopItem } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Coin, Gift, ShoppingBag, ListChecks, Calendar, ArrowRight, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function Wallet() {
  const { user } = useAuth();
  const [coins, setCoins] = useState<UserCoins | null>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0, checkedInToday: false });
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      await ensureUserCoins(user.id);
      const [coinsData, transactionsData, tasksData, userTasksData, shopItemsData, inventoryData, streakData] = await Promise.all([
        getUserCoins(user.id),
        getCoinTransactions(user.id),
        getTasks(),
        getUserTasks(user.id),
        getShopItems(),
        getUserInventory(user.id),
        getCheckinStreak(user.id),
      ]);
      setCoins(coinsData);
      setTransactions(transactionsData);
      setTasks(tasksData);
      setUserTasks(userTasksData);
      setShopItems(shopItemsData);
      setInventory(inventoryData);
      setStreak(streakData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    if (!user) return;
    setCheckingIn(true);
    try {
      const result = await dailyCheckin(user.id);
      if (result.success) {
        toast.success(result.message);
        loadData();
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      toast.error('签到失败');
    } finally {
      setCheckingIn(false);
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!user) return;
    setPurchasingId(item.id);
    try {
      const result = await purchaseItem(user.id, item.id);
      if (result.success) {
        toast.success(result.message);
        loadData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('购买失败');
    } finally {
      setPurchasingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'daily_login': return '📅';
      case 'game_win': return '🏆';
      case 'game_lose': return '😢';
      case 'task_reward': return '📋';
      case 'purchase': return '🛒';
      case 'club_join_bonus': return '🏛️';
      default: return '💰';
    }
  };

  const filteredItems = selectedCategory === 'all'
    ? shopItems
    : shopItems.filter(item => item.category === selectedCategory);

  const userTaskMap = new Map(userTasks.map(t => [t.task_type, t]));

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-4xl float-gentle">💰</span> 我的钱包
          </h1>
          <p className="text-muted-foreground mt-1">管理你的金币、任务和商城</p>
        </div>

        {/* 金币余额卡片 */}
        <Card className="mb-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">金币余额</p>
                <p className="text-4xl font-bold mt-1">{coins?.balance?.toLocaleString() || 0}</p>
                <div className="flex gap-4 mt-2 text-sm opacity-80">
                  <span>累计获得: {(coins?.total_earned || 0).toLocaleString()}</span>
                  <span>累计消费: {(coins?.total_spent || 0).toLocaleString()}</span>
                </div>
              </div>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleCheckin}
                disabled={checkingIn || streak.checkedInToday}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                {checkingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : streak.checkedInToday ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    已签到
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5 mr-2" />
                    每日签到
                  </>
                )}
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge className="bg-white/20 text-white">
                连续签到: {streak.current} 天
              </Badge>
              <Badge className="bg-white/20 text-white">
                最长: {streak.longest} 天
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="tasks" className="flex items-center gap-1">
              <ListChecks className="w-4 h-4" />
              任务
            </TabsTrigger>
            <TabsTrigger value="shop" className="flex items-center gap-1">
              <ShoppingBag className="w-4 h-4" />
              商城
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <ArrowRight className="w-4 h-4 rotate-180" />
              记录
            </TabsTrigger>
          </TabsList>

          {/* 任务 */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>每日任务</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const userTask = userTaskMap.get(task.type);
                    const progress = userTask?.current_progress || 0;
                    const completed = userTask?.is_completed || false;
                    const percentage = Math.min((progress / task.target_count) * 100, 100);

                    return (
                      <div key={task.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          completed ? 'bg-green-100 text-green-600' : 'bg-muted'
                        }`}>
                          {completed ? <Check className="w-5 h-5" /> : <ListChecks className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.title}</span>
                            {completed && <Badge className="bg-green-500">已完成</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {progress}/{task.target_count}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            +{task.coins_reward} 💰
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 商城 */}
          <TabsContent value="shop">
            <Card>
              <CardHeader>
                <CardTitle>商城</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory('all')}
                  >
                    全部
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedCategory === 'avatar_frame' ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory('avatar_frame')}
                  >
                    头像框
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedCategory === 'board_theme' ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory('board_theme')}
                  >
                    棋盘
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedCategory === 'piece_style' ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory('piece_style')}
                  >
                    棋子
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredItems.map((item) => {
                    const owned = inventory.some(i => i.item_id === item.id);

                    return (
                      <div key={item.id} className="p-4 border rounded-lg">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-3xl mb-3">
                          {item.category === 'avatar_frame' && '🖼️'}
                          {item.category === 'board_theme' && '🎮'}
                          {item.category === 'piece_style' && '⚫'}
                          {item.category === 'membership' && '👑'}
                          {item.category === 'profile_badge' && '🏅'}
                        </div>
                        <h3 className="font-medium text-center">{item.name}</h3>
                        <p className="text-sm text-muted-foreground text-center mt-1">
                          {item.description}
                        </p>
                        <div className="mt-4 flex items-center justify-between">
                          <Badge variant="outline" className="text-yellow-600">
                            {item.price} 💰
                          </Badge>
                          {owned ? (
                            <Badge className="bg-green-500">已拥有</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePurchase(item)}
                              disabled={purchasingId === item.id || (coins?.balance || 0) < item.price}
                            >
                              {purchasingId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                '购买'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 交易记录 */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>交易记录</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArrowRight className="w-12 h-12 mx-auto mb-3 opacity-50 rotate-180" />
                    <p>暂无交易记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="text-2xl">{getTransactionIcon(tx.type)}</div>
                        <div className="flex-1">
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(tx.created_at)}</p>
                        </div>
                        <div className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
