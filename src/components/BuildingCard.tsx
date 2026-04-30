import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface BuildingCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
  gradient: string;
  accentColor: string;
  badge?: string;
}

/**
 * 建筑风格导航卡片组件
 * 每个卡片像一个独立的"建筑"，有屋顶和装饰
 */
export function BuildingCard({
  icon: Icon,
  title,
  description,
  link,
  gradient,
  accentColor,
  badge,
}: BuildingCardProps) {
  return (
    <Link to={link} className="block group">
      <Card className="overflow-hidden border-0 shadow-lg card-kid transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]">
        <CardContent className="p-0">
          {/* 建筑屋顶 */}
          <div className={`h-3 bg-gradient-to-r ${gradient} relative overflow-hidden`}>
            {/* 屋顶装饰线 */}
            <div className="absolute inset-0 opacity-30">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-2"
                  style={{
                    left: `${i * 12.5}%`,
                    height: '100%',
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)',
                  }}
                />
              ))}
            </div>
            {/* 烟囱装饰 */}
            <div className="absolute right-4 top-0 w-3 h-4 bg-white/30 rounded-t-sm" />
          </div>

          {/* 建筑内容 */}
          <div className="p-4 bg-white">
            <div className="flex items-start gap-3">
              {/* 图标区域 */}
              <div className={`shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-7 h-7 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">{title}</h3>
                  {badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${accentColor} text-white font-medium`}>
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
              </div>

              {/* 箭头指示 */}
              <div className={`shrink-0 w-8 h-8 rounded-full ${accentColor}/10 flex items-center justify-center group-hover:${accentColor}/20 transition-colors`}>
                <ChevronRight className={`w-4 h-4 ${accentColor}`} />
              </div>
            </div>
          </div>

          {/* 建筑地基 */}
          <div className="h-2 bg-gradient-to-r from-gray-200 to-gray-100 relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gray-300/50" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * 大型建筑卡片（用于主要入口）
 */
export function BigBuildingCard({
  icon: Icon,
  title,
  description,
  link,
  gradient,
  ctaText,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
  gradient: string;
  ctaText: string;
}) {
  return (
    <Link to={link} className="block group">
      <Card className="overflow-hidden border-0 shadow-lg card-kid transition-all duration-300 hover:scale-[1.01] hover:shadow-xl active:scale-[0.99]">
        <CardContent className="p-0">
          {/* 主背景 */}
          <div className={`relative bg-gradient-to-br ${gradient} p-5 overflow-hidden`}>
            {/* 装饰元素 */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

            <div className="relative z-10 flex items-center gap-4">
              {/* 大图标 */}
              <div className="shrink-0 w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-10 h-10 text-white" />
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
                <p className="text-white/90 text-sm">{description}</p>
              </div>

              {/* CTA 按钮 */}
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * 小型图标卡片（用于快速入口网格）
 */
export function SmallBuildingCard({
  icon: Icon,
  title,
  link,
  gradient,
}: {
  icon: LucideIcon;
  title: string;
  link: string;
  gradient: string;
}) {
  return (
    <Link to={link} className="block group">
      <Card className="overflow-hidden border-0 shadow-md card-kid transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95">
        <CardContent className="p-4 text-center">
          <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 transition-transform duration-200`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h4 className="font-bold text-sm">{title}</h4>
        </CardContent>
      </Card>
    </Link>
  );
}
