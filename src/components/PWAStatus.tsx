import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Download, Check } from 'lucide-react';

export function PWAStatus() {
  const { isOnline, isInstallable, isInstalled, installApp } = usePWA();

  // 如果已安装且在线，不显示任何内容
  if (isInstalled && isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {/* 离线状态提示 */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm">离线模式</span>
        </div>
      )}

      {/* 安装提示 */}
      {isInstallable && (
        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">添加到主屏幕</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={installApp}
            className="w-full"
          >
            安装 App
          </Button>
        </div>
      )}

      {/* 已安装提示 */}
      {isInstalled && !isOnline && (
        <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span className="text-sm">已安装，可离线使用</span>
        </div>
      )}
    </div>
  );
}

// 简单的离线/在线状态指示器
export function NetworkStatus() {
  const { isOnline } = usePWA();

  return (
    <Badge
      variant={isOnline ? 'secondary' : 'destructive'}
      className="fixed top-4 right-4 z-50"
    >
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3 mr-1" />
          在线
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 mr-1" />
          离线
        </>
      )}
    </Badge>
  );
}
