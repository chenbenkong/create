import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, isVideoMode, isChatMode } from '@/store/useStore';
import { generateImage, createVideoTask, pollVideoResult } from '@/utils/api';
import { makeThumbnail } from '@/utils/thumbnail';
import ModeSwitch from '@/components/ModeSwitch';
import SizeSelector from '@/components/SizeSelector';
import ImageUpload from '@/components/ImageUpload';
import MultiImageUpload from '@/components/MultiImageUpload';
import ResultDisplay from '@/components/ResultDisplay';
import ChatPanel from '@/components/ChatPanel';
import Wallpaper from '@/components/Wallpaper';
import Toast from '@/components/Toast';
import Logo from '@/components/Logo';
import { ArrowUpRight, Archive } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const {
    mode, prompt, size, referenceImage, multiImages,
    isGenerating, setPrompt, setGenerating,
    setResultImageUrl, setResultVideoUrl, setVideoPollingId,
    setError, addToHistory, history,
  } = useStore();

  const isVideo = isVideoMode(mode);
  const isChat = isChatMode(mode);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    if (mode === 'img2img' && !referenceImage) return;
    if (mode === 'img2video' && !referenceImage) return;
    if (mode === 'multi2video' && multiImages.length === 0) return;

    setGenerating(true);
    setError(null);
    setResultImageUrl(null);
    setResultVideoUrl(null);

    try {
      if (isVideo) {
        const videoId = await createVideoTask(
          mode as 'text2video' | 'img2video' | 'multi2video',
          prompt.trim(),
          referenceImage,
          multiImages.map((img) => img.base64)
        );
        setVideoPollingId(Date.now());
        const videoUrl = await pollVideoResult(videoId);
        setResultVideoUrl(videoUrl);
        setVideoPollingId(null);
        addToHistory({
          id: crypto.randomUUID(), prompt: prompt.trim(), mode, size,
          imageUrl: videoUrl, isVideo: true, starred: false, createdAt: Date.now(),
        });
      } else {
        const imageUrl = await generateImage(mode, prompt.trim(), size, referenceImage);
        setResultImageUrl(imageUrl);
        // 异步生成缩略图（不阻塞主流程，失败也能正常入库）
        const thumbnail = await makeThumbnail(imageUrl);
        addToHistory({
          id: crypto.randomUUID(), prompt: prompt.trim(), mode, size,
          imageUrl, thumbnail: thumbnail || undefined, starred: false, createdAt: Date.now(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试');
      setVideoPollingId(null);
    } finally {
      setGenerating(false);
    }
  }, [mode, prompt, size, referenceImage, multiImages, isVideo, setGenerating, setResultImageUrl, setResultVideoUrl, setVideoPollingId, setError, addToHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isGenerating) {
      handleGenerate();
    }
  }, [handleGenerate, isGenerating]);

  const canGenerate = (() => {
    if (!prompt.trim() || isGenerating) return false;
    if (mode === 'img2img' || mode === 'img2video') return !!referenceImage;
    if (mode === 'multi2video') return multiImages.length > 0;
    return true;
  })();

  const placeholders: Record<string, string> = {
    text2img: '一只漂浮在星云中的猫，戴着宇航员头盔，电影感的光',
    img2img: '把这张照片转成素描风格',
    text2video: '火箭穿过晨雾的慢动作',
    img2video: '让云缓缓飘过，水面泛起涟漪',
    multi2video: '把这些图平滑地连成一段',
  };

  return (
    <div className="min-h-screen text-paper-50 relative">
      <Wallpaper />
      <Toast />

      <div className="relative z-10">
        {/* 顶部信息条 */}
        <div className="border-b border-paper-50/15">
          <div className="max-w-[1400px] mx-auto px-10 h-10 flex items-center justify-between text-[10px] text-paper-200 font-mono tracking-widest uppercase">
            <div className="flex items-center gap-8">
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-umber animate-ticker" />
                <span className="text-paper-50">工作室 · 在线</span>
              </span>
              <span className="hidden md:inline tabular-nums">
                {time.toLocaleTimeString('zh-CN', { hour12: false })} · {time.toLocaleDateString('zh-CN')}
              </span>
            </div>
            <div className="flex items-center gap-8">
              <span className="hidden sm:inline">Agnes API · v2.1.0</span>
              <span>2026 · 创刊</span>
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-10 py-8">
          {/* 头部 */}
          <header className="flex items-end justify-between mb-16 animate-fade-down">
            <div className="flex items-center gap-4">
              <Logo size={36} />
              <div>
                <h1 className="font-display text-3xl font-medium tracking-wide leading-none">
                  <span className="italic-serif text-paper-50">创作工坊</span>
                </h1>
                <span className="block text-[10px] text-paper-200 font-mono tracking-widest uppercase mt-1.5">
                  Atelier · 生成式创作
                </span>
              </div>
            </div>
            <div className="flex items-end gap-10">
              <button
                onClick={() => navigate('/archive')}
                className="group flex flex-col items-end gap-1.5 transition-opacity duration-400 hover:opacity-70"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] tracking-widest text-paper-50/55">N°04</span>
                  <span className="font-display text-base tracking-wider text-paper-50">作品库</span>
                </div>
                <div className="flex items-center gap-2">
                  <Archive size={11} strokeWidth={1.5} className="text-paper-200" />
                  <span className="font-mono text-[10px] tracking-widest text-paper-200/70 tabular-nums">
                    {String(history.length).padStart(3, '0')} 件
                  </span>
                </div>
              </button>
              <ModeSwitch />
            </div>
          </header>

          <div className="rule mb-16" />

          {/* 巨幅标题 */}
          {!isChat && (
            <section className="mb-20 animate-fade-up">
              <div className="grid grid-cols-12 gap-8 items-end">
                <div className="col-span-12 lg:col-span-2">
                  <span className="label">章节</span>
                </div>
                <div className="col-span-12 lg:col-span-10">
                  <div className="flex items-baseline gap-3 mb-6">
                    <span className="label-ink">{isVideo ? '02 · 影像' : '01 · 图像'}</span>
                    <span className="catalogue">{isVideo ? 'MOTION' : 'PLATE'}</span>
                  </div>
                  <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-paper-50 leading-tight tracking-tight">
                    <em className="italic-serif">在</em> 纸上，
                    <em className="italic-serif">在</em> 影像中，
                    <em className="italic-serif">在</em> 话语间。
                  </h2>
                </div>
              </div>
            </section>
          )}

          {/* 聊天模式 */}
          {isChat && (
            <div className="grid grid-cols-12 gap-10 animate-fade-up">
              <div className="col-span-12 lg:col-span-8">
                <div className="flex items-baseline justify-between mb-6">
                  <div className="flex items-baseline gap-3">
                    <span className="label-ink">03 · 对话</span>
                    <span className="catalogue">DIALOGUE</span>
                  </div>
                  <span className="label">全模态 · 流式</span>
                </div>
                <ChatPanel />
              </div>
              <aside className="hidden lg:block lg:col-span-4">
                <div className="space-y-8">
                  <div>
                    <span className="label">关于对话</span>
                    <p className="mt-4 font-display italic text-xl text-paper-50 leading-snug">
                      "对话是最古老的界面，我们只是让它能看见你所展示的一切。"
                    </p>
                  </div>
                  <div className="rule" />
                  <div className="space-y-3">
                    <span className="label">规格</span>
                    {[
                      { k: '模型', v: 'agnes-2.0-flash' },
                      { k: '流式', v: '开启' },
                      { k: '视觉', v: '支持' },
                    ].map((s) => (
                      <div key={s.k} className="flex justify-between items-baseline text-xs font-mono">
                        <span className="text-paper-200 tracking-wider">{s.k}</span>
                        <span className="text-paper-50">{s.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* 图片/视频模式 */}
          {!isChat && (
            <div className="grid grid-cols-12 gap-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              {/* 左侧控制面板 */}
              <div className="col-span-12 lg:col-span-5 space-y-10">
                {/* 提示词 */}
                <div>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="label-ink">01 · 提示词</span>
                    <span className="catalogue">PROMPT</span>
                  </div>
                  <div className="rule mb-6" />
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholders[mode] || ''}
                    rows={6}
                    className="w-full bg-transparent border-b border-paper-50/25 focus:border-paper-50 pb-3 text-base text-paper-50 placeholder:text-paper-50/45 placeholder:font-display placeholder:italic focus:outline-none resize-none leading-relaxed font-sans transition-colors duration-400"
                  />
                  <div className="mt-4 flex items-center justify-between">
                    {!isVideo ? <SizeSelector /> : (
                      <span className="label">格式 · MP4</span>
                    )}
                    <span className="catalogue">{String(prompt.length).padStart(4, '0')} / 2000</span>
                  </div>
                </div>

                {/* 参考图 */}
                {(mode === 'img2img' || mode === 'img2video') && (
                  <div className="animate-fade-in">
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="label-ink">02 · 参考图</span>
                      <span className="catalogue">REFERENCE</span>
                    </div>
                    <div className="rule mb-4" />
                    <ImageUpload />
                  </div>
                )}
                {mode === 'multi2video' && (
                  <div className="animate-fade-in">
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="label-ink">02 · 多图</span>
                      <span className="catalogue">PLATES</span>
                    </div>
                    <div className="rule mb-4" />
                    <MultiImageUpload />
                  </div>
                )}

                {/* 主操作 */}
                <div>
                  <div className="rule mb-6" />
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className={`
                      group w-full flex items-center justify-between py-4 transition-opacity duration-400
                      ${canGenerate ? 'opacity-100 hover:opacity-60' : 'opacity-30 cursor-not-allowed'}
                    `}
                  >
                    <span className="font-display text-xl tracking-wider text-paper-50">
                      {isGenerating
                        ? (isVideo ? '正在生成影像' : '正在生成图像')
                        : (isVideo ? '生成影像' : '生成图像')
                      }
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="catalogue">Ctrl + ↵</span>
                      <ArrowUpRight size={20} className="text-paper-50 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={1} />
                    </span>
                  </button>
                  <div className="rule mt-6" />
                </div>

                {/* 规格 */}
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { k: '模型', v: isVideo ? 'v2.0' : '2.1 Flash' },
                    { k: '速度', v: isVideo ? '约 3 分钟' : '约 15 秒' },
                    { k: '画质', v: isVideo ? '1080P' : '1024P' },
                  ].map((spec) => (
                    <div key={spec.k} className="space-y-2">
                      <span className="label">{spec.k}</span>
                      <p className="font-display italic text-base text-paper-50">{spec.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 右侧结果展示 */}
              <div className="col-span-12 lg:col-span-7 space-y-8">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-3">
                    <span className="label-ink">03 · 画布</span>
                    <span className="catalogue">VIEWPORT</span>
                  </div>
                  <span className="catalogue">
                    {isVideo
                      ? '16:9 · 1080P'
                      : size.startsWith('4K-')
                        ? `${size.slice(3)} · 1024P`  // "1:1 · 1024P"
                        : `${size.split('x')[0]} × ${size.split('x')[1]}`
                    }
                  </span>
                </div>
                <div className="rule" />

                <div className="min-h-[500px] flex items-center justify-center relative">
                  <ResultDisplay />
                </div>
              </div>
            </div>
          )}

          {/* 底部页脚 */}
          <footer className="mt-32 pt-8 border-t border-paper-50/20 flex items-center justify-between text-[10px] text-paper-200 font-mono tracking-widest uppercase">
            <span>© 2026 · 创作工坊 · 为创作者而设计</span>
            <span>Atelier</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
