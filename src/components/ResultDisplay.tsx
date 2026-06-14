import { useState, useCallback } from 'react';
import { useStore, isVideoMode } from '@/store/useStore';
import { Loader2, ArrowDownToLine } from 'lucide-react';
import GenerationLoader from '@/components/GenerationLoader';
import { downloadFromUrl } from '@/utils/download';

export default function ResultDisplay() {
  const { resultImageUrl, resultVideoUrl, isGenerating, error, mode } = useStore();
  const isVideo = isVideoMode(mode);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async (url: string, kind: 'image' | 'video') => {
    setIsDownloading(true);
    try {
      await downloadFromUrl(url, {
        filenamePrefix: kind === 'video' ? '工坊-影像' : '工坊-图像',
      });
      useStore.getState().setToast({ kind: 'success', message: '已开始下载，请查看浏览器下载文件夹' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      useStore.getState().setToast({ kind: 'error', message: `下载失败：${msg}` });
    } finally {
      setIsDownloading(false);
    }
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-5 animate-fade-in">
        <div className="text-center space-y-3 max-w-sm">
          <span className="label">错误</span>
          <p className="font-display text-2xl text-paper-50 italic">出了点意外。</p>
          <div className="rule" />
          <p className="text-xs text-paper-200 leading-relaxed font-sans">{error}</p>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    const text = isVideo ? '正在生成影像' : mode === 'text2img' ? '正在生成图像' : '正在生成';
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-8">
        <GenerationLoader mode={isVideo ? 'video' : 'image'} />
        <div className="text-center space-y-3">
          <span className="label">正在生成</span>
          <p className="font-display italic text-lg text-paper-50">
            {text}<span className="cursor-blink" />
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="w-1 h-1 rounded-full bg-umber animate-ticker" />
            <span className="text-[10px] text-paper-200 font-mono tracking-widest">
              {isVideo ? '预计 1 ~ 5 分钟' : '预计 10 ~ 30 秒'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isVideo && resultVideoUrl) {
    return (
      <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
        <div className="w-full max-w-2xl">
          <div className="rule mb-3" />
          <div className="flex items-baseline justify-between mb-2">
            <span className="label">影像</span>
            <span className="catalogue">N°{new Date().getTime().toString().slice(-6)}</span>
          </div>
          <video
            src={resultVideoUrl}
            controls
            autoPlay
            loop
            className="w-full block bg-ink"
          />
        </div>
        <button
          onClick={() => handleDownload(resultVideoUrl, 'video')}
          disabled={isDownloading}
          className="btn-primary flex items-center gap-2.5 text-xs tracking-widest"
        >
          {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <ArrowDownToLine size={12} strokeWidth={1.5} />}
          <span>{isDownloading ? '下载中' : '下载到本地'}</span>
        </button>
      </div>
    );
  }

  if (!isVideo && resultImageUrl) {
    return (
      <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
        <div className="w-full max-w-2xl">
          <div className="rule mb-3" />
          <div className="flex items-baseline justify-between mb-2">
            <span className="label">图像</span>
            <span className="catalogue">N°{new Date().getTime().toString().slice(-6)}</span>
          </div>
          <img
            src={resultImageUrl}
            alt="生成结果"
            className="w-full block"
          />
        </div>
        <button
          onClick={() => handleDownload(resultImageUrl, 'image')}
          disabled={isDownloading}
          className="btn-primary flex items-center gap-2.5 text-xs tracking-widest"
        >
          {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <ArrowDownToLine size={12} strokeWidth={1.5} />}
          <span>{isDownloading ? '下载中' : '下载到本地'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-8">
      <div className="text-center space-y-4">
        <span className="label">等待输入</span>
        <p className="font-display italic text-3xl text-paper-50 leading-tight">
          {isVideo ? '开始一段影像。' : '开始一张图像。'}
        </p>
        <div className="rule w-12 mx-auto" />
        <p className="text-xs text-paper-200 font-sans tracking-wide">
          描述你想创作的画面
        </p>
      </div>
    </div>
  );
}
