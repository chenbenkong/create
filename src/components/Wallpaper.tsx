import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/store/useSettings';

/**
 * 每日壁纸背景
 * 设计参考 dmego/home.github.io —— 用 Picsum 高清风景图作静态底图（dmego 走 GitHub Action 预抓 Bing URL，
 * 前端只读静态 json。我们这里走更轻的方案：Picsum seed 固定，每张 1920x1080，sessionStorage 索引轮换）。
 * background-size: cover 居中铺满，鼠标只做 8px 极轻视差（直接改 ref，不触发 React 重渲染）。
 * 不使用 backdrop-filter、不使用液态变形、不使用高频重绘，丝滑不卡。
 */

// 预置一组高质量 1920x1080 风景图（Picsum 固定 ID 不会变）
const WALLPAPERS = [
  'https://picsum.photos/seed/atelier-mist/1920/1080',
  'https://picsum.photos/seed/atelier-aurora/1920/1080',
  'https://picsum.photos/seed/atelier-cedar/1920/1080',
  'https://picsum.photos/seed/atelier-tide/1920/1080',
  'https://picsum.photos/seed/atelier-ridge/1920/1080',
  'https://picsum.photos/seed/atelier-mono/1920/1080',
  'https://picsum.photos/seed/atelier-cliff/1920/1080',
  'https://picsum.photos/seed/atelier-vale/1920/1080',
];

function pickToday(): string {
  // 参考 dmego：sessionStorage 索引 + 1，每次进入页面轮换一张
  const key = 'atelier-wallpaper-index';
  const last = parseInt(sessionStorage.getItem(key) || '-1', 10);
  const next = (Number.isFinite(last) ? last + 1 : 0) % WALLPAPERS.length;
  sessionStorage.setItem(key, String(next));
  return WALLPAPERS[next];
}

export default function Wallpaper() {
  const bgRef = useRef<HTMLDivElement>(null);
  const { wallpaperEnabled, reduceMotion } = useSettings();
  // 初始即给一个 URL，避免首屏空白；后续 <img> 预加载失败时降级到下一张
  const [bgUrl, setBgUrl] = useState<string>(() => pickToday());

  // 壁纸开关关闭时不渲染任何内容
  if (!wallpaperEnabled) return null;

  // 预加载：若当前图加载失败，自动切到下一张（控制台无错误噪音）
  useEffect(() => {
    const img = new Image();
    img.onerror = () => {
      // 切到下一张兜底
      setBgUrl(prev => {
        const i = WALLPAPERS.indexOf(prev);
        return WALLPAPERS[(i + 1) % WALLPAPERS.length];
      });
    };
    img.src = bgUrl;
  }, [bgUrl]);

  // 极轻鼠标视差：8px 内移动，仅修改 backgroundPosition，不触发 React 重渲染
  // reduceMotion 开启时禁用
  useEffect(() => {
    if (reduceMotion) return;
    const el = bgRef.current;
    if (!el) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 8;
      ty = (e.clientY / window.innerHeight - 0.5) * 8;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      // 阻尼缓动到目标值
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.backgroundPosition = `calc(50% + ${cx.toFixed(2)}px) calc(50% + ${cy.toFixed(2)}px)`;
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-ink">
      {/* 1. 每日壁纸底图（GPU 友好：纯 CSS background-image + 极轻视差） */}
      <div
        ref={bgRef}
        className="absolute inset-0 will-change-background-position"
        style={{
          backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1a1815',
        }}
      />

      {/* 2. 暗化层（让图片清晰可读，统一色温，前景用浅色字） */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.40) 50%, rgba(10,9,8,0.70) 100%)',
        }}
      />

      {/* 3. 顶部 / 底部渐隐（让导航和页脚更稳） */}
      <div
        className="absolute top-0 inset-x-0 h-40"
        style={{ background: 'linear-gradient(180deg, rgba(10,9,8,0.65) 0%, transparent 100%)' }}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-40"
        style={{ background: 'linear-gradient(0deg, rgba(10,9,8,0.65) 0%, transparent 100%)' }}
      />
    </div>
  );
}
