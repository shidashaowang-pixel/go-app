/**
 * PWA 功能 Hook
 * 支持离线缓存、安装提示等
 */

import { useState, useEffect } from 'react';

export interface PWAState {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  serviceWorkerReady: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isInstallable: false,
    isInstalled: false,
    installPrompt: null,
    serviceWorkerReady: false,
  });

  useEffect(() => {
    // 检查是否已安装 (standalone 模式)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppView = (window.navigator as any).standalone === true;
    
    setState(prev => ({
      ...prev,
      isInstalled: isStandalone || isInWebAppView,
    }));

    // 监听网络状态
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 监听安装提示
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: e as BeforeInstallPromptEvent,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 监听安装完成
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
        installPrompt: null,
      }));
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          setState(prev => ({ ...prev, serviceWorkerReady: true }));
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 安装应用
  const installApp = async () => {
    if (!state.installPrompt) return false;

    try {
      await state.installPrompt.prompt();
      const { outcome } = await state.installPrompt.userChoice;
      
      setState(prev => ({
        ...prev,
        installPrompt: null,
        isInstallable: outcome !== 'accepted',
      }));

      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      return false;
    }
  };

  // 同步离线数据
  const syncOfflineData = async () => {
    // 获取待同步的离线数据
    const pendingGames = localStorage.getItem('pending_games');
    if (pendingGames) {
      try {
        // 这里会调用后端 API 同步数据
        console.log('[PWA] Syncing offline games:', pendingGames);
        // 同步后清除
        localStorage.removeItem('pending_games');
      } catch (error) {
        console.error('[PWA] Sync failed:', error);
      }
    }
  };

  return {
    ...state,
    installApp,
    syncOfflineData,
  };
}

// 保存离线数据
export function saveOfflineGame(gameData: any) {
  const pending = JSON.parse(localStorage.getItem('pending_games') || '[]');
  pending.push({ ...gameData, timestamp: Date.now() });
  localStorage.setItem('pending_games', JSON.stringify(pending));
}

// 检查缓存更新
export function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      (registration as any).update();
    });
  }
}