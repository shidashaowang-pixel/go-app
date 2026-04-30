import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import {
  getConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getOrCreateConversation,
  getTotalUnreadCount,
  getFriends,
} from '@/db/api';
import type { Conversation, Message, Profile } from '@/types/types';
import {
  ArrowLeft,
  Send,
  MessageCircle,
  Search,
  UserPlus,
  Circle,
  Loader2,
  Crown,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { getRankInfo } from '@/pages/Home';

export default function Messages() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [showNewConv, setShowNewConv] = useState(false);
  const [friends, setFriends] = useState<Profile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载会话列表
  useEffect(() => {
    if (user) {
      loadConversations();
      loadUnreadCount();
      loadFriends();
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    const data = await getFriends(user.id);
    setFriends(data);
  };

  // 发起新会话
  const handleStartConversation = async (friend: Profile) => {
    if (!user) return;
    try {
      const conv = await getOrCreateConversation(user.id, friend.id);
      setShowNewConv(false);
      setSelectedConv(conv);
      loadConversations();
    } catch (error) {
      toast.error('发起会话失败');
    }
  };

  // 加载选中的会话消息
  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
      markMessagesAsRead(selectedConv.id, user!.id).then(() => {
        loadConversations(); // 更新未读数
        loadUnreadCount();
      });
    }
  }, [selectedConv]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    const data = await getConversations(user.id);
    setConversations(data);
    setLoading(false);
  };

  const loadUnreadCount = async () => {
    if (!user) return;
    const count = await getTotalUnreadCount(user.id);
    setTotalUnread(count);
  };

  const loadMessages = async (conversationId: string) => {
    const data = await getMessages(conversationId);
    setMessages(data);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    setSending(true);

    const msg = await sendMessage(selectedConv.id, user.id, newMessage.trim());
    if (msg) {
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      loadConversations();
    } else {
      toast.error('发送失败');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isOnline = (updatedAt?: string) => {
    if (!updatedAt) return false;
    return new Date(updatedAt).getTime() > Date.now() - 5 * 60 * 1000;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-primary" />
                私信
              </h1>
              {totalUnread > 0 && (
                <Badge variant="destructive" className="mt-1">
                  {totalUnread} 条未读
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 选择好友发起会话弹窗 */}
        {showNewConv && (
          <Card className="mb-4 border-primary/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">选择好友发起会话</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowNewConv(false)}>
                  关闭
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  还没有好友，去添加一些吧！
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {friends.map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => handleStartConversation(friend)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <Avatar>
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>{friend.nickname?.[0] || friend.username[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{friend.nickname || friend.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {friend.role === 'child' ? '小棋手' : friend.role === 'teacher' ? '老师' : '家长'} · 积分 {friend.rating}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        点击发起
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="flex h-[calc(100vh-220px)] min-h-[500px]">
            {/* 会话列表 */}
            <div className={`w-full md:w-80 border-r flex-shrink-0 bg-muted/20 ${selectedConv ? 'hidden md:block' : 'block'}`}>
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="搜索会话..." className="pl-9" />
                </div>
              </div>
              <ScrollArea className="h-[calc(100%-72px)]">
                {/* 发起新会话按钮 */}
                <div className="p-3 border-b">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowNewConv(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    发起新会话
                  </Button>
                </div>

                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>暂无会话</p>
                    <p className="text-sm">点击上方按钮找好友聊天吧！</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversations.map(conv => {
                      const other = conv.other_user;
                      const online = isOnline(other?.updated_at);
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConv(conv)}
                          className={`w-full p-4 flex items-start gap-3 hover:bg-accent transition-colors text-left ${
                            selectedConv?.id === conv.id ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={other?.avatar_url || undefined} />
                              <AvatarFallback>{other?.nickname?.[0] || other?.username?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <Circle
                              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 ${
                                online ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">
                                {other?.nickname || other?.username || '未知用户'}
                              </p>
                              {conv.last_message && (
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(conv.last_message.created_at)}
                                </span>
                              )}
                            </div>
                            {conv.last_message && (
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {conv.last_message.sender_id === user?.id ? '我: ' : ''}
                                {conv.last_message.content}
                              </p>
                            )}
                            {conv.unread_count && conv.unread_count > 0 && (
                              <Badge variant="destructive" className="mt-1 text-xs">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* 聊天区域 */}
            <div className={`flex-1 flex flex-col ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
              {selectedConv ? (
                <>
                  {/* 聊天头部 */}
                  <div className="p-4 border-b flex items-center gap-3 bg-card">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConv.other_user?.avatar_url || undefined} />
                      <AvatarFallback>
                        {selectedConv.other_user?.nickname?.[0] || selectedConv.other_user?.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {selectedConv.other_user?.nickname || selectedConv.other_user?.username || '未知用户'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isOnline(selectedConv.other_user?.updated_at) ? (
                          <span className="text-green-500">在线</span>
                        ) : (
                          '离线'
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/game/human?invite=${selectedConv.other_user?.id}`)}
                    >
                      邀请对弈
                    </Button>
                  </div>

                  {/* 消息列表 */}
                  <ScrollArea className="flex-1 p-4 bg-muted/10">
                    <div className="space-y-4">
                      {messages.map((msg, i) => {
                        const isMe = msg.sender_id === user?.id;
                        const showAvatar = !isMe && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);
                        return (
                          <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                            {showAvatar ? (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="text-xs">
                                  {msg.sender?.nickname?.[0] || msg.sender?.username?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="h-8 w-8 flex-shrink-0" />
                            )}
                            <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                              <div
                                className={`px-4 py-2 rounded-2xl ${
                                  isMe
                                    ? 'bg-primary text-primary-foreground rounded-br-md'
                                    : 'bg-muted rounded-bl-md'
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 px-1">
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* 输入框 */}
                  <div className="p-4 border-t bg-card">
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入消息..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={sending}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending}>
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>选择一个会话开始聊天</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
