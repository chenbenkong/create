import { useEffect, useState, type CSSProperties } from 'react';

interface GenerationLoaderProps {
  /** 当前模式，决定诗意文字的内容 */
  mode: 'image' | 'video' | 'chat';
}

/**
 * 高端 loading —— "星辰聚拢" 概念
 * 4 层结构（从外到内）：
 *   1. 顶部细线 + 双向暖色光带流动
 *   2. 12x12 视场内 6 颗外圈小光点错峰脉冲（3s 周期，每颗延迟 0.5s）
 *   3. SVG 旋转光弧（1.2px 描边 + dasharray 形成"光弧"绕中心转）
 *   4. 中央 14px 雾化光球（radial-gradient + 多层 box-shadow，4s 呼吸缩放）
 * + 底部诗意文字（衬线斜体，每 2.8s 切换一句）
 * + 已用时间（等宽字 + 暖色 ticker 小点）
 */
const POETRY: Record<GenerationLoaderProps['mode'], string[]> = {
  image: [
    '墨水正在渗入纸面',
    '色彩正在被调配',
    '形态正在凝结',
    '光影正在被捕捉',
  ],
  video: [
    '时间正在被记录',
    '一帧一帧被塑造',
    '镜头正在推拉',
  ],
  chat: [
    '思绪正在被梳理',
    '话语正在被组织',
    '对话正在展开',
  ],
};

const ORBIT_DOTS = 6;
const ORBIT_ANGLES = Array.from({ length: ORBIT_DOTS }, (_, i) => (360 / ORBIT_DOTS) * i);

export default function GenerationLoader({ mode }: GenerationLoaderProps) {
  const lines = POETRY[mode];
  const [lineIdx, setLineIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t1 = setInterval(() => setLineIdx((i) => (i + 1) % lines.length), 2800);
    const t2 = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [lines.length]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-12 select-none">
      {/* 主视觉：旋转光弧 + 外圈光点 + 中央雾球（128x128 画布） */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* 旋转光弧（SVG，2.6s 顺时针一周） */}
        <svg
          className="absolute inset-0 w-full h-full loader-spin"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="rgba(212, 165, 116, 0.65)"
            strokeWidth="1.2"
            strokeDasharray="60 200"
            strokeLinecap="round"
          />
        </svg>

        {/* 6 颗外圈光点（错峰脉冲，每颗延迟 0.4s） */}
        <div className="absolute inset-0 pointer-events-none">
          {ORBIT_ANGLES.map((deg, i) => (
            <span
              key={i}
              className="loader-orbit-dot"
              style={{
                transform: `rotate(${deg}deg)`,
                '--d': `${i * 0.4}s`,
              } as CSSProperties}
            />
          ))}
        </div>

        {/* 中央雾化光球（14px，4s 呼吸） */}
        <div className="loader-orb" />
      </div>

      {/* 细线 + 双向暖色光带流动（更活泼） */}
      <div className="relative w-48 h-px bg-paper-50/15">
        <div className="loader-line-shine absolute top-0 left-0 h-px" />
        <div
          className="loader-line-shine absolute top-0 left-0 h-px"
          style={{ animationDirection: 'reverse', animationDelay: '1.2s' }}
        />
      </div>

      {/* 诗意文字 + 已用时间 */}
      <div className="text-center space-y-3">
        <div className="h-5 flex items-center justify-center">
          <span
            key={lineIdx}
            className="font-display italic text-base text-paper-50/85 tracking-wider animate-fade-up whitespace-nowrap"
          >
            {lines[lineIdx]}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2.5 text-[10px] text-paper-200/70 font-mono tracking-widest">
          <span className="w-1 h-1 rounded-full bg-umber animate-ticker" />
          <span className="tabular-nums">{mm}:{ss}</span>
          <span className="text-paper-200/40">/</span>
          <span>预计 0:30</span>
        </div>
      </div>
    </div>
  );
}
