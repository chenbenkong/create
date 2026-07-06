import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore, type HistoryItem, type Mode } from '@/store/useStore';
import { downloadFromUrl } from '@/utils/download';
import { ArrowLeft, Download, Trash2, Star, Edit2, Check, X } from 'lucide-react';
import Wallpaper from '@/components/Wallpaper';
import Toast from '@/components/Toast';

const MODE_LABELS: Record<Mode, string> = {
  text2img: '文生图',
  img2img: '图生图',
  text2video: '文生视频',
  img2video: '图生视频',
  multi2video: '多图生视频',
  chat: '对话',
};

/** 从 size 推断宽高比 */
function sizeToAspectRatio(size?: string): string {
  if (!size) return '1 / 1';
  const ratioMatch = size.match(/(\d+):(\d+)/);
  if (ratioMatch) {
    const w = parseInt(ratioMatch[1], 10);
    const h = parseInt(ratioMatch[2], 10);
    if (w > 0 && h > 0) return `${w} / ${h}`;
  }
  const pxMatch = size.match(/(\d+)x(\d+)/);
  if (pxMatch) {
    const w = parseInt(pxMatch[1], 10);
    const h = parseInt(pxMatch[2], 10);
    if (w > 0 && h > 0) return `${w} / ${h}`;
  }
  return '1 / 1';
}

/** size 转可读描述 */
function sizeToLabel(size?: string): string {
  if (!size) return '未知';
  // 4K-16:9 → 4K · 16:9
  if (size.startsWith('4K-')) return `4K · ${size.slice(3)}`;
  return size;
}

export default function ArchiveDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { history, removeFromHistory, updateHistoryItem } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const item = history.find((h) => h.id === id);

  if (!item) {
    return (
      <div className="min-h-screen text-paper-50 relative">
        <Wallpaper />
        <Toast />
        <div className="relative z-10 max-w-[1400px] mx-auto px-10 py-20 text-center">
          <p className="font-display italic text-2xl text-paper-200 mb-4">作品不存在</p>
          <button
            onClick={() => navigate('/archive')}
            className="btn-primary text-xs"
          >
            返回作品库
          </button>
        </div>
      </div>
    );
  }

  const aspectRatio = sizeToAspectRatio(item.size);
  const created = new Date(item.createdAt);
  const dateStr = created.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeStr = created.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });

  const handleDownload = async () => {
    useStore.getState().setToast({ kind: 'info', message: '正在下载，请稍候…' });
    try {
      const result = await downloadFromUrl(item.imageUrl, {
        filenamePrefix: item.isVideo ? '工坊-影像' : '工坊-图像',
        prompt: item.prompt,
        title: item.title,
      });
      useStore.getState().setToast({ kind: 'success', message: `下载成功，请查看「${result.savedTo}」` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      useStore.getState().setToast({ kind: 'error', message: `下载失败：${msg}` });
    }
  };

  const handleStartRename = () => {
    setRenameValue(item.title || '');
    setRenaming(true);
  };

  const handleConfirmRename = () => {
    const trimmed = renameValue.trim();
    updateHistoryItem(item.id, { title: trimmed || undefined });
    setRenaming(false);
    if (trimmed) {
      useStore.getState().setToast({ kind: 'success', message: `已重命名为「${trimmed}」` });
    } else {
      useStore.getState().setToast({ kind: 'info', message: '已清除自定义命名' });
    }
  };

  const handleCancelRename = () => {
    setRenaming(false);
    setRenameValue('');
  };

  const handleDelete = () => {
    if (confirm('确定删除这个作品？不可撤销。')) {
      removeFromHistory(item.id);
      navigate('/archive');
    }
  };

  const handleStar = () => {
    updateHistoryItem(item.id, { starred: !item.starred });
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
                <span className="text-paper-50">作品详情 · Detail</span>
              </span>
            </div>
            <span>2026 · 创刊</span>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-10 py-8">
          {/* 头部 */}
          <header className="flex items-end justify-between mb-12 animate-fade-down">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/archive')}
                className="group flex items-center gap-3 text-paper-200 hover:text-paper-50 transition-colors duration-400"
                title="返回作品库"
              >
                <ArrowLeft size={16} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform duration-500" />
                <span className="font-mono text-[10px] tracking-widest uppercase">返回作品库</span>
              </button>
              <div className="w-px h-8 bg-paper-50/15" />
              <div>
                <h1 className="font-display text-3xl font-medium tracking-wide leading-none">
                  <span className="italic-serif text-paper-50">作品详情</span>
                </h1>
                <span className="block text-[10px] text-paper-200 font-mono tracking-widest uppercase mt-1.5">
                  Detail · N°{String(history.indexOf(item) + 1).padStart(3, '0')}
                </span>
              </div>
            </div>
          </header>

          <div className="rule mb-12" />

          {/* 主体：左侧大图 + 右侧信息 */}
          <div className="grid grid-cols-12 gap-10">
            {/* 左侧：作品展示 */}
            <div className="col-span-12 lg:col-span-8">
              <div className="relative overflow-hidden bg-ink/40" style={{ aspectRatio }}>
                {item.isVideo ? (
                  <video
                    src={item.imageUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* 操作栏 */}
              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={handleDownload}
                  className="btn-primary flex items-center gap-2.5 text-xs tracking-widest"
                >
                  <Download size={12} strokeWidth={1.5} />
                  <span>下载到本地</span>
                </button>
                <button
                  onClick={handleStar}
                  className={`flex items-center gap-2 px-4 py-2.5 border text-xs font-mono tracking-wider transition-colors ${
                    item.starred
                      ? 'border-umber bg-umber/10 text-umber'
                      : 'border-paper-50/25 text-paper-50 hover:bg-paper-50/5'
                  }`}
                >
                  <Star size={12} strokeWidth={1.5} fill={item.starred ? 'currentColor' : 'none'} />
                  <span>{item.starred ? '已收藏' : '收藏'}</span>
                </button>
                <button
                  onClick={handleStartRename}
                  className="flex items-center gap-2 px-4 py-2.5 border border-paper-50/25 text-xs text-paper-50 hover:bg-paper-50/5 transition-colors font-mono tracking-wider"
                >
                  <Edit2 size={12} strokeWidth={1.5} />
                  <span>{item.title ? '重命名' : '命名'}</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2.5 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-colors font-mono tracking-wider"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                  <span>删除</span>
                </button>
              </div>
            </div>

            {/* 右侧：元信息 */}
            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div>
                <span className="label">N°01 · 提示词</span>
                <div className="rule mb-4" />
                <p className="font-display italic text-lg text-paper-50 leading-relaxed whitespace-pre-wrap">
                  {item.prompt}
                </p>
              </div>

              <div>
                <span className="label">N°02 · 元信息</span>
                <div className="rule mb-4" />
                <div className="space-y-3">
                  <MetaRow label="类型" value={item.isVideo ? '影像' : '图像'} />
                  <MetaRow label="模式" value={MODE_LABELS[item.mode] || item.mode} />
                  <MetaRow label="尺寸" value={sizeToLabel(item.size)} />
                  <MetaRow label="日期" value={dateStr} />
                  <MetaRow label="时间" value={timeStr} />
                  <MetaRow label="编号" value={`N°${String(history.indexOf(item) + 1).padStart(3, '0')}`} />
                  <div className="flex items-baseline justify-between gap-4 pb-2 border-b border-paper-50/8">
                    <span className="text-[10px] text-paper-200/60 font-mono tracking-widest uppercase">命名</span>
                    {renaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename();
                            if (e.key === 'Escape') handleCancelRename();
                          }}
                          placeholder="输入名称"
                          maxLength={20}
                          className="w-40 px-2 py-1 bg-transparent border border-umber/40 text-sm text-paper-50 placeholder:text-paper-50/30 focus:border-umber focus:outline-none text-right font-sans"
                        />
                        <button
                          onClick={handleConfirmRename}
                          title="确认"
                          className="text-umber hover:text-paper-50 transition-colors"
                        >
                          <Check size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={handleCancelRename}
                          title="取消"
                          className="text-paper-200 hover:text-red-400 transition-colors"
                        >
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={handleStartRename}
                        className="text-sm text-paper-50 font-sans text-right cursor-pointer hover:text-umber transition-colors group"
                        title="点击重命名"
                      >
                        {item.title || <span className="text-paper-200/40 italic">未命名 · 点击添加</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {item.starred && (
                <div className="flex items-center gap-2 text-umber">
                  <Star size={12} fill="currentColor" />
                  <span className="text-[10px] font-mono tracking-widest uppercase">已收藏</span>
                </div>
              )}
            </div>
          </div>

          {/* 底部 */}
          <div className="mt-20 pt-6 border-t border-paper-50/15 flex items-center justify-between text-[10px] text-paper-200 font-mono tracking-widest uppercase">
            <button
              onClick={() => navigate('/archive')}
              className="hover:text-paper-50 transition-colors"
            >
              ← 返回作品库
            </button>
            <span>© 2026 · 创作工坊</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 pb-2 border-b border-paper-50/8">
      <span className="text-[10px] text-paper-200/60 font-mono tracking-widest uppercase">{label}</span>
      <span className="text-sm text-paper-50 font-sans text-right">{value}</span>
    </div>
  );
}
