import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, type HistoryItem } from '@/store/useStore';
import { downloadFromUrl } from '@/utils/download';
import { ArrowLeft, Download, Trash2, Star, Film, Search } from 'lucide-react';
import Wallpaper from '@/components/Wallpaper';
import Toast from '@/components/Toast';

type Filter = 'all' | 'image' | 'video' | 'starred';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '图像' },
  { key: 'video', label: '影像' },
  { key: 'starred', label: '★ 收藏' },
];

/**
 * 作品库全屏页面（/archive 路由）
 * 替代之前的 HistoryBar（横条）+ ArchivePanel（侧抽屉），统一为独立路由页面。
 * 布局：
 *   - 顶部 header：返回 / 标题 / 总数 / 清空
 *   - 筛选条 + 搜索
 *   - 主体：响应式 3-4 列网格
 *   - 卡片操作：点击打开到结果区 / 收藏 / 重命名 / 下载 / 删除
 */
export default function ArchivePage() {
  const navigate = useNavigate();
  const {
    history,
    setResultImageUrl, setResultVideoUrl,
    removeFromHistory, updateHistoryItem, clearHistory,
  } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return history.filter((item) => {
      if (filter === 'starred' && !item.starred) return false;
      if (filter === 'image' && item.isVideo) return false;
      if (filter === 'video' && !item.isVideo) return false;
      if (query) {
        const q = query.toLowerCase();
        const text = (item.title || item.prompt).toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [history, filter, query]);

  const counts = useMemo(() => ({
    all: history.length,
    image: history.filter((i) => !i.isVideo).length,
    video: history.filter((i) => i.isVideo).length,
    starred: history.filter((i) => i.starred).length,
  }), [history]);

  const handleOpen = (item: HistoryItem) => {
    if (item.isVideo) setResultVideoUrl(item.imageUrl);
    else setResultImageUrl(item.imageUrl);
    navigate('/');
  };

  const handleDownload = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    try {
      await downloadFromUrl(item.imageUrl, {
        filenamePrefix: item.isVideo ? '工坊-影像' : '工坊-图像',
      });
      useStore.getState().setToast({ kind: 'success', message: '已开始下载' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      useStore.getState().setToast({ kind: 'error', message: `下载失败：${msg}` });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定从作品库中删除此作品？')) {
      removeFromHistory(id);
      useStore.getState().setToast({ kind: 'info', message: '已删除' });
    }
  };

  const handleStar = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    updateHistoryItem(item.id, { starred: !item.starred });
  };

  const handleRename = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    const next = prompt('为此作品命名（留空则使用 prompt 摘要）', item.title || '');
    if (next !== null) {
      updateHistoryItem(item.id, { title: next.trim() || undefined });
    }
  };

  const handleClearAll = () => {
    if (history.length === 0) return;
    if (confirm(`确定清空作品库（共 ${history.length} 个作品）？此操作不可撤销。`)) {
      clearHistory();
      useStore.getState().setToast({ kind: 'info', message: '作品库已清空' });
    }
  };

  return (
    <div className="min-h-screen text-paper-50 relative">
      <Wallpaper />
      <Toast />

      <div className="relative z-10">
        {/* 顶部信息条（与 Home 风格一致） */}
        <div className="border-b border-paper-50/15">
          <div className="max-w-[1400px] mx-auto px-10 h-10 flex items-center justify-between text-[10px] text-paper-200 font-mono tracking-widest uppercase">
            <div className="flex items-center gap-8">
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-umber animate-ticker" />
                <span className="text-paper-50">作品库 · Archive</span>
              </span>
              <span className="hidden md:inline tabular-nums">
                永久保留 · 跨刷新持久化
              </span>
            </div>
            <div className="flex items-center gap-8">
              <span>共 {String(history.length).padStart(3, '0')} 件</span>
              <span>2026 · 创刊</span>
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-10 py-8">
          {/* 头部 */}
          <header className="flex items-end justify-between mb-16 animate-fade-down">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/')}
                className="group flex items-center gap-3 text-paper-200 hover:text-paper-50 transition-colors duration-400"
                title="返回创作工坊"
              >
                <ArrowLeft size={16} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform duration-500" />
                <span className="font-mono text-[10px] tracking-widest uppercase">返回</span>
              </button>
              <div className="w-px h-8 bg-paper-50/15" />
              <div>
                <h1 className="font-display text-3xl font-medium tracking-wide leading-none">
                  <span className="italic-serif text-paper-50">作品库</span>
                </h1>
                <span className="block text-[10px] text-paper-200 font-mono tracking-widest uppercase mt-1.5">
                  Archive · 所有创作记录
                </span>
              </div>
            </div>
            <button
              onClick={handleClearAll}
              disabled={history.length === 0}
              className="flex items-center gap-2 text-[10px] text-paper-200 hover:text-paper-50 font-mono tracking-widest uppercase transition-colors duration-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={11} strokeWidth={1.5} />
              <span>清空作品库</span>
            </button>
          </header>

          <div className="rule mb-12" />

          {/* 巨幅标题 */}
          <section className="mb-16 animate-fade-up">
            <div className="grid grid-cols-12 gap-8 items-end">
              <div className="col-span-12 lg:col-span-2">
                <span className="label">章节</span>
              </div>
              <div className="col-span-12 lg:col-span-10">
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="label-ink">04 · 作品</span>
                  <span className="catalogue">ARCHIVE</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-paper-50 leading-tight tracking-tight">
                  <em className="italic-serif">每一</em> 次生成，
                  <em className="italic-serif">都</em> 在此留存。
                </h2>
                <p className="mt-6 font-display italic text-lg text-paper-200/80 max-w-2xl leading-relaxed">
                  点击任意作品可重新打开到画布；hover 卡片可收藏、重命名、下载或删除。
                </p>
              </div>
            </div>
          </section>

          {/* 搜索 + 筛选 */}
          <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-6 text-[10px] tracking-widest font-mono uppercase">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`pb-1.5 border-b transition-colors ${
                    filter === f.key
                      ? 'border-paper-50 text-paper-50'
                      : 'border-transparent text-paper-200/60 hover:text-paper-200'
                  }`}
                >
                  {f.label}
                  <span className="ml-2 opacity-60 tabular-nums">
                    {String(counts[f.key]).padStart(3, '0')}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border-b border-paper-50/20 pb-1.5 md:w-72 focus-within:border-paper-50/60 transition-colors">
              <Search size={12} className="text-paper-200" strokeWidth={1.5} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索 prompt 关键词..."
                className="flex-1 bg-transparent text-sm text-paper-50 placeholder:text-paper-50/40 placeholder:font-display placeholder:italic focus:outline-none"
              />
            </div>
          </div>

          {/* 网格 */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <span className="label">空</span>
              <p className="font-display italic text-2xl text-paper-50 mt-4">
                {query ? '没有匹配的作品' : '作品库尚无内容'}
              </p>
              <div className="rule w-12 mx-auto my-6" />
              <button
                onClick={() => navigate('/')}
                className="text-[10px] text-paper-200 hover:text-paper-50 font-mono tracking-widest uppercase transition-colors"
              >
                返回创作 →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.map((item, idx) => (
                <ArchiveCard
                  key={item.id}
                  item={item}
                  idx={idx}
                  onOpen={handleOpen}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onStar={handleStar}
                  onRename={handleRename}
                />
              ))}
            </div>
          )}

          {/* 底部信息 */}
          <div className="mt-16 pt-6 border-t border-paper-50/15 flex items-center justify-between text-[10px] text-paper-200 font-mono tracking-widest uppercase">
            <span>
              已筛选 <span className="text-paper-50 tabular-nums">{String(filtered.length).padStart(3, '0')}</span>
              <span className="ml-1.5">/ 共 {String(history.length).padStart(3, '0')}</span>
            </span>
            <span>© 2026 · 创作工坊</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 卡片 ============

interface ArchiveCardProps {
  item: HistoryItem;
  idx: number;
  onOpen: (item: HistoryItem) => void;
  onDownload: (e: React.MouseEvent, item: HistoryItem) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onStar: (e: React.MouseEvent, item: HistoryItem) => void;
  onRename: (e: React.MouseEvent, item: HistoryItem) => void;
}

function ArchiveCard({
  item, idx, onOpen, onDownload, onDelete, onStar, onRename,
}: ArchiveCardProps) {
  return (
    <div
      className="group cursor-pointer animate-fade-up"
      style={{ animationDelay: `${idx * 30}ms` }}
      onClick={() => onOpen(item)}
    >
      <div className="relative aspect-square overflow-hidden">
        {item.isVideo ? (
          <div className="w-full h-full bg-paper-200/10 flex items-center justify-center">
            <Film size={36} className="text-paper-200" strokeWidth={1} />
          </div>
        ) : (
          <img
            src={item.thumbnail || item.imageUrl}
            alt={item.prompt}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors duration-500" />

        {item.isVideo && (
          <div className="absolute top-3 left-3 px-2 py-0.5 bg-ink/80 text-paper text-[9px] font-mono tracking-widest">
            MP4
          </div>
        )}

        {item.starred && (
          <div className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-umber shadow-[0_0_6px_rgba(212,165,116,0.6)]" />
        )}

        {/* hover 操作（右上） */}
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <IconBtn
            onClick={(e) => onStar(e, item)}
            title={item.starred ? '取消收藏' : '收藏'}
            active={!!item.starred}
          >
            <Star size={12} strokeWidth={1.5} fill={item.starred ? 'currentColor' : 'none'} />
          </IconBtn>
          <IconBtn onClick={(e) => onRename(e, item)} title="命名">
            <span className="text-[11px] font-display italic leading-none">T</span>
          </IconBtn>
          <IconBtn onClick={(e) => onDownload(e, item)} title="下载">
            <Download size={12} strokeWidth={1.5} />
          </IconBtn>
          <IconBtn onClick={(e) => onDelete(e, item.id)} title="删除" danger>
            <Trash2 size={12} strokeWidth={1.5} />
          </IconBtn>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-xs text-paper-50/85 line-clamp-2 leading-snug font-sans min-h-[32px]">
          {item.title || item.prompt}
        </p>
        <div className="flex items-baseline justify-between text-[9px] text-paper-200/55 font-mono">
          <span>
            {new Date(item.createdAt).toLocaleDateString('zh-CN', { year: '2-digit', month: '2-digit', day: '2-digit' })}
          </span>
          <span className="text-paper-200/40">
            {item.isVideo ? '1080P' : item.size}
          </span>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children, onClick, title, danger, active,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  danger?: boolean;
  active?: boolean;
}) {
  const base = 'w-7 h-7 flex items-center justify-center backdrop-blur-md transition-colors';
  const color = danger
    ? 'bg-ink/70 text-paper-50 hover:bg-red-700'
    : active
      ? 'bg-umber text-paper'
      : 'bg-ink/70 text-paper-50 hover:bg-umber';
  return (
    <button onClick={onClick} className={`${base} ${color}`} title={title}>
      {children}
    </button>
  );
}
