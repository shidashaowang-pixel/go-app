import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getCourse, updateProgress } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import AnimationPlayer from '@/components/AnimationPlayer';
import type { Course } from '@/types/types';
import { ArrowLeft, Video, FileText, Clock, CheckCircle2, BookOpen, Sparkles, Download, ExternalLink, File } from 'lucide-react';
import { toast } from 'sonner';
import { builtinCourses } from '@/data/builtin-courses';

/** 判断是否为云端上传的文件URL（Supabase Storage） */
function isCloudFile(url: string): boolean {
  return url.includes('supabase.co/storage') || url.includes('course-files');
}

/** 获取文件名 */
function getFileName(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1] || '下载文件';
}

/** 将 Bilibili 分享链接转换为嵌入播放器 URL */
function getBilibiliEmbedUrl(url: string): string {
  // 如果已经是嵌入链接，直接返回
  if (url.includes('player.bilibili.com')) return url;
  
  // 从分享链接提取 BVID
  // 支持格式:
  // - https://www.bilibili.com/video/BV1xx411c7mD
  // - https://b23.tv/xxxxx (短链接)
  // - https://bilibili.com/video/BV1xx411c7mD
  const bvMatch = url.match(/\/video\/(BV[\w]+)/);
  if (bvMatch && bvMatch[1]) {
    return `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&page=1&high_quality=1`;
  }
  
  // 如果无法识别，返回原始链接
  return url;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (id) loadCourse();
  }, [id]);

  const loadCourse = async () => {
    if (!id) return;
    // 内置课程直接使用本地数据
    if (id.startsWith('builtin-')) {
      const builtin = builtinCourses.find(c => c.id === id);
      if (builtin) { setCourse(builtin); return; }
    }
    const data = await getCourse(id);
    if (data) {
      setCourse(data);
    } else {
      toast.error('课程不存在');
      navigate('/learn/courses');
    }
  };

  const handleMarkComplete = async () => {
    if (!user || !id) return;
    const result = await updateProgress(user.id, id, null, 100, true);
    setProgress(100);
    setCompleted(true);
    if (result.synced) {
      toast.success('学习完成！获得积分奖励 +10');
    } else {
      toast.success('学习完成！进度已保存本地');
    }
  };

  if (!course) {
    return (
      <MainLayout>
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </MainLayout>
    );
  }

  const isVideo = course.type === 'video';
  const isAnimation = course.type === 'animation';

  return (
    <MainLayout>
      <div className="container px-4 py-6 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/learn/courses')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回课程列表
        </Button>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* 课程内容区 */}
          <div className="lg:col-span-3 space-y-4">
            {/* 动画微课播放器 */}
            {isAnimation ? (
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  {course.animation_steps && course.animation_steps.length > 0 ? (
                    <AnimationPlayer
                      steps={course.animation_steps}
                      title={course.title}
                      onComplete={handleMarkComplete}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <Sparkles className="w-16 h-16 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">动画步骤加载中...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : isVideo ? (
              /* 视频播放器 */
              <Card className="overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative">
                  {course.content_url ? (
                    <>
                      {/* 检测是否是 Bilibili 链接 */}
                      {course.content_url.includes('bilibili.com') ? (
                        /* Bilibili 嵌入播放器 */
                        <iframe
                          src={getBilibiliEmbedUrl(course.content_url)}
                          className="w-full h-full"
                          allowFullScreen
                          frameBorder={0}
                          scrolling="no"
                        />
                      ) : (
                        /* 普通视频播放器 */
                        <>
                          <video
                            src={course.content_url}
                            controls
                            className="w-full h-full"
                            poster={course.cover_image_url || undefined}
                          >
                            您的浏览器不支持视频播放
                          </video>
                          {/* 云端文件下载按钮 */}
                          {isCloudFile(course.content_url) && (
                            <div className="absolute top-3 right-3">
                              <Button
                                size="sm"
                                variant="secondary"
                                asChild
                                className="gap-1 shadow-lg"
                              >
                                <a href={course.content_url} download={getFileName(course.content_url)} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" /> 下载视频
                                </a>
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-white/80">
                      <Video className="w-16 h-16 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">视频课程</p>
                      <p className="text-sm text-white/50 mt-1">
                        {course.duration ? `时长 ${course.duration} 分钟` : '视频加载中...'}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              /* 图文/文档课程 */
              <Card className="overflow-hidden">
                {course.cover_image_url && (
                  <img src={course.cover_image_url} alt={course.title} className="w-full h-48 object-cover" />
                )}
                <CardContent className="p-6">
                  {course.content_url ? (
                    <div className="space-y-4">
                      {/* 云端文件入口 */}
                      {isCloudFile(course.content_url) ? (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center">
                              <File className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">文档课程</h3>
                              <p className="text-sm text-muted-foreground">点击下方按钮查看或下载课程文档</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button asChild className="gap-2">
                              <a href={course.content_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" /> 在线预览
                              </a>
                            </Button>
                            <Button variant="outline" asChild className="gap-2">
                              <a href={course.content_url} download={getFileName(course.content_url)} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" /> 下载到本地
                              </a>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* 外部链接 */
                        <div className="text-center">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground mb-4">图文课程内容</p>
                          <Button variant="outline" asChild className="gap-2">
                            <a href={course.content_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" /> 打开链接
                            </a>
                          </Button>
                        </div>
                      )}
                      {course.description && (
                        <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
                          <p>{course.description}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-center text-muted-foreground">图文课程内容</p>
                      {course.description && (
                        <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
                          <p>{course.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 课程描述 */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold mb-3">课程简介</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {course.description || '暂无课程简介'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 课程信息侧栏 */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {isAnimation ? (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                      <Sparkles className="h-3 w-3 mr-1" />动画微课
                    </Badge>
                  ) : isVideo ? (
                    <Badge><Video className="h-3 w-3 mr-1" />视频课程</Badge>
                  ) : (
                    <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />图文课程</Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{course.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.duration && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>时长 {course.duration} 分钟</span>
                  </div>
                )}

                {isAnimation && course.animation_steps && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    <span>共 {course.animation_steps.length} 个动画步骤</span>
                  </div>
                )}

                {/* 学习进度 */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>学习进度</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>

                {completed ? (
                  <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">已完成学习</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button onClick={handleMarkComplete} className="w-full">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      标记为已学完
                    </Button>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => navigate('/learn/courses')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  继续学习其他课程
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
