import { useState, useEffect } from 'react';
import { getSyncQueue, addNetworkListener, processSyncQueue, loadSyncQueueFromStorage } from '@/db/api';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SyncStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // 加载队列状态
    loadSyncQueueFromStorage();
    setQueueCount(getSyncQueue().length);

    // 监听网络状态变化
    const unsubscribe = addNetworkListener((online) => {
      setIsOnline(online);
      if (online) {
        setQueueCount(getSyncQueue().length);
      }
    });

    // 监听在线状态
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 定期检查队列状态
    const interval = setInterval(() => {
      setQueueCount(getSyncQueue().length);
    }, 5000);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await processSyncQueue();
    setQueueCount(getSyncQueue().length);
    setIsSyncing(false);
  };

  // 只在有待同步项时显示
  if (queueCount === 0 && isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant={isOnline ? "default" : "destructive"}
        className="flex items-center gap-2 px-3 py-2 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
        onClick={handleManualSync}
      >
        {!isOnline ? (
          <>
            <CloudOff className="h-4 w-4" />
            <span>离线模式</span>
          </>
        ) : queueCount > 0 ? (
          <>
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{queueCount} 项待同步</span>
          </>
        ) : (
          <>
            <Cloud className="h-4 w-4" />
            <span>已同步</span>
          </>
        )}
      </Badge>
    </div>
  );
}
