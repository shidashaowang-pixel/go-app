import { useState, useEffect } from 'react';

/**
 * 简洁风格背景组件
 */
export default function IllustrationBackground() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 0 }}
    >
      {/* 渐变天空 */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)'
        }}
      />
      
      {/* 简洁山丘轮廓 */}
      <svg 
        className="absolute bottom-0 w-full h-80 opacity-40"
        viewBox="0 0 1440 320" 
        preserveAspectRatio="none"
      >
        <path 
          d="M0 320 Q360 180 720 220 Q1080 160 1440 200 L1440 320 L0 320 Z" 
          fill="#86efac"
        />
        <path 
          d="M0 320 Q240 240 480 270 Q720 220 960 250 Q1200 210 1440 240 L1440 320 L0 320 Z" 
          fill="#4ade80"
          opacity="0.5"
        />
      </svg>
      
      {/* 简洁云朵 */}
      {isMounted && (
        <>
          <div className="absolute top-16 left-20">
            <div className="relative">
              <div className="w-32 h-12 bg-white rounded-full opacity-60" />
              <div className="absolute -top-3 -left-4 w-16 h-10 bg-white rounded-full opacity-60" />
              <div className="absolute -top-2 right-0 w-14 h-8 bg-white rounded-full opacity-60" />
            </div>
          </div>
          
          <div className="absolute top-24 right-32">
            <div className="relative">
              <div className="w-40 h-14 bg-white rounded-full opacity-50" />
              <div className="absolute -top-4 left-6 w-20 h-12 bg-white rounded-full opacity-50" />
              <div className="absolute -top-2 right-4 w-16 h-10 bg-white rounded-full opacity-50" />
            </div>
          </div>
          
          <div className="absolute top-40 left-1/2">
            <div className="relative">
              <div className="w-24 h-10 bg-white rounded-full opacity-40" />
              <div className="absolute -top-2 left-3 w-12 h-7 bg-white rounded-full opacity-40" />
              <div className="absolute -top-1 right-2 w-10 h-6 bg-white rounded-full opacity-40" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
