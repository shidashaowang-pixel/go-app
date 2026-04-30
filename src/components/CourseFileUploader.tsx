/**
 * 课程文件上传组件
 * 支持上传视频、文档等文件到云端存储
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, File, X, Download, Loader2, CheckCircle, Link2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

interface CourseFileUploaderProps {
  /** 当前文件URL（已有链接） */
  currentUrl?: string;
  /** 上传成功回调 */
  onUploadComplete: (url: string, fileName: string) => void;
  /** 文件类型：video | document | any */
  fileType?: 'video' | 'document' | 'any';
  /** 标签文本 */
  label?: string;
  /** 帮助文本 */
  helpText?: string;
}

/** 获取文件类型对应的 MIME 类型 */
function getAcceptedTypes(fileType: 'video' | 'document' | 'any'): string {
  switch (fileType) {
    case 'video':
      return 'video/*,.mp4,.webm,.mov,.avi,.mkv';
    case 'document':
      return '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md';
    default:
      return '*/*';
  }
}

/** 获取文件图标 */
function getFileIcon(type: string): string {
  if (type.startsWith('video/')) return '🎬';
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📽️';
  return '📁';
}

/** 格式化文件大小 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function CourseFileUploader({
  currentUrl,
  onUploadComplete,
  fileType = 'any',
  label = '上传文件',
  helpText,
}: CourseFileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<CourseFile | null>(
    currentUrl ? { name: currentUrl.split('/').pop() || '已上传文件', url: currentUrl } : null
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    try {
      // 生成唯一文件名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = selectedFile.name.split('.').pop();
      const fileName = `courses/${timestamp}_${randomStr}.${ext}`;

      // 上传到 Supabase Storage
      const { data, error } = await supabase.storage
        .from('course-videos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // 获取公开访问URL
      const { data: urlData } = supabase.storage
        .from('course-videos')
        .getPublicUrl(fileName);

      const fileUrl = urlData.publicUrl;
      setUploadedFile({
        name: selectedFile.name,
        url: fileUrl,
        size: selectedFile.size,
        type: selectedFile.type,
      });
      onUploadComplete(fileUrl, selectedFile.name);
      toast.success('文件上传成功！');
    } catch (err: any) {
      console.error('上传失败:', err);
      toast.error(err.message || '上传失败，请重试');
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setProgress(0);
    }
  }, [selectedFile, onUploadComplete]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    onUploadComplete('', '');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium block">{label}</label>
      )}

      {/* 已有上传文件 */}
      {uploadedFile && !selectedFile && (
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getFileIcon(uploadedFile.type || '')}</span>
            <div>
              <p className="font-medium text-sm">{uploadedFile.name}</p>
              {uploadedFile.size && (
                <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
              )}
              <a
                href={uploadedFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <Download className="h-3 w-3" /> 预览/下载
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 待上传文件 */}
      {selectedFile && !uploading && (
        <div className="p-4 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl bg-amber-50/50 dark:bg-amber-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getFileIcon(selectedFile.type)}</span>
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleUpload}>
                <Upload className="h-4 w-4 mr-1" /> 上传到云端
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 上传中 */}
      {uploading && (
        <div className="p-4 border border-primary/30 rounded-xl bg-primary/5">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">正在上传到云端...</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 上传区域 */}
      {!uploadedFile && !selectedFile && !uploading && (
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
            dragOver
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('course-file-input')?.click()}
        >
          <input
            id="course-file-input"
            type="file"
            accept={getAcceptedTypes(fileType)}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">拖拽文件到此处，或点击选择文件</p>
          <p className="text-xs text-muted-foreground">
            {fileType === 'video' && '支持 mp4、webm、mov 等视频格式'}
            {fileType === 'document' && '支持 PDF、Word、PPT、Excel 等文档格式'}
            {fileType === 'any' && '支持所有文件类型'}
          </p>
        </div>
      )}

      {/* 帮助文本 */}
      {helpText && !uploadedFile && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
