import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPosts,
  createPost,
  togglePostLike,
  deletePost,
  getComments,
  addComment,
  deleteComment,
  toggleCommentLike,
} from '@/db/api';
import type { Post, Comment } from '@/types/types';
import {
  ArrowLeft,
  Users,
  Heart,
  MessageCircle,
  Pin,
  Plus,
  Send,
  MoreHorizontal,
  Trash2,
  Loader2,
  BookOpen,
  Lightbulb,
  Share2,
  HelpCircle,
  Megaphone,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { getRankInfo } from '@/pages/Home';

const CATEGORIES = [
  { id: 'all', label: '全部', icon: Users },
  { id: 'general', label: '综合', icon: BookOpen },
  { id: 'strategy', label: '棋谱探讨', icon: Lightbulb },
  { id: 'share', label: '心得分享', icon: Share2 },
  { id: 'question', label: '提问求助', icon: HelpCircle },
  { id: 'announcement', label: '公告', icon: Megaphone },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  strategy: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  share: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  question: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  announcement: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function Community() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [selectedCategory]);

  const loadPosts = async () => {
    setLoading(true);
    const category = selectedCategory === 'all' ? undefined : selectedCategory;
    const data = await getPosts(category);
    setPosts(data);
    setLoading(false);
  };

  const handleCreatePost = async () => {
    if (!user || !newTitle.trim() || !newContent.trim()) {
      toast.error('请填写标题和内容');
      return;
    }

    setPosting(true);
    const post = await createPost(user.id, newTitle.trim(), newContent.trim(), newCategory);
    if (post) {
      setPosts(prev => [post, ...prev]);
      setShowPostDialog(false);
      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
      toast.success('发布成功！');
    } else {
      toast.error('发布失败');
    }
    setPosting(false);
  };

  const handleToggleLike = async (postId: string) => {
    if (!user) return;
    const liked = await togglePostLike(postId, user.id);
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, likes_count: p.likes_count + (liked ? 1 : -1) }
          : p
      )
    );
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    const success = await deletePost(postId, user.id);
    if (success) {
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('删除成功');
    } else {
      toast.error('删除失败');
    }
  };

  const handleLoadComments = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(postId);
    if (!comments[postId]) {
      const data = await getComments(postId);
      setComments(prev => ({ ...prev, [postId]: data }));
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !newComment[postId]?.trim()) return;
    setPostingComment(postId);
    const comment = await addComment(postId, user.id, newComment[postId].trim());
    if (comment) {
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment],
      }));
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, comments_count: p.comments_count + 1 }
            : p
        )
      );
    }
    setPostingComment(null);
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

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find(c => c.id === cat)?.label || cat;
  };

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
                <Users className="h-6 w-6 text-primary" />
                社区
              </h1>
              <p className="text-sm text-muted-foreground">与棋友交流心得</p>
            </div>
          </div>

          <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-purple-500">
                <Plus className="h-4 w-4 mr-2" />
                发帖
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>发布新帖子</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">分类</label>
                  <Tabs value={newCategory} onValueChange={setNewCategory}>
                    <TabsList className="grid grid-cols-5 w-full">
                      <TabsTrigger value="general">综合</TabsTrigger>
                      <TabsTrigger value="strategy">棋谱</TabsTrigger>
                      <TabsTrigger value="share">分享</TabsTrigger>
                      <TabsTrigger value="question">提问</TabsTrigger>
                      <TabsTrigger value="announcement">公告</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">标题</label>
                  <Input
                    placeholder="输入帖子标题..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">内容</label>
                  <textarea
                    className="w-full min-h-[150px] px-3 py-2 rounded-lg border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="分享你的围棋心得..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowPostDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreatePost} disabled={posting}>
                    {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    发布
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 分类标签 */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex-shrink-0"
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {cat.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* 帖子列表 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无帖子</p>
              <p className="text-sm mt-1">成为第一个发帖的人吧！</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <Card key={post.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.author?.avatar_url || undefined} />
                        <AvatarFallback>
                          {post.author?.nickname?.[0] || post.author?.username?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {post.author?.nickname || post.author?.username || '未知用户'}
                          </p>
                          {post.author?.role === 'teacher' && (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                              <Trophy className="h-3 w-3 mr-1" />
                              老师
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getRankInfo(post.author?.rating ?? 0).label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${CATEGORY_COLORS[post.category] || ''}`}>
                        {getCategoryLabel(post.category)}
                      </Badge>
                      {post.is_pinned && (
                        <Pin className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-bold text-lg mb-2">{post.title}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Heart className={`h-5 w-5 ${post.likes_count > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                        <span className="text-sm">{post.likes_count}</span>
                      </button>
                      <button
                        onClick={() => handleLoadComments(post.id)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm">{post.comments_count}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(post.created_at)}
                      </span>
                      {user?.id === post.author_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 评论区 */}
                  {expandedPost === post.id && (
                    <div className="mt-4 pt-4 border-t bg-muted/20 rounded-lg p-4">
                      <div className="space-y-3 mb-4">
                        {(comments[post.id] || []).map(comment => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="text-xs">
                                {comment.author?.nickname?.[0] || comment.author?.username?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {comment.author?.nickname || comment.author?.username || '未知'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(comment.created_at)}
                                </span>
                              </div>
                              <p className="text-sm mt-1">{comment.content}</p>
                              {/* 回复列表 */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-2 ml-4 pl-4 border-l-2 space-y-2">
                                  {comment.replies.map(reply => (
                                    <div key={reply.id} className="flex gap-2">
                                      <Avatar className="h-6 w-6 flex-shrink-0">
                                        <AvatarFallback className="text-xs">
                                          {reply.author?.nickname?.[0] || reply.author?.username?.[0] || '?'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium">
                                            {reply.author?.nickname || reply.author?.username || '未知'}
                                          </span>
                                        </div>
                                        <p className="text-xs mt-0.5">{reply.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="写下你的评论..."
                          value={newComment[post.id] || ''}
                          onChange={e => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddComment(post.id)}
                          disabled={postingComment === post.id}
                        >
                          {postingComment === post.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
