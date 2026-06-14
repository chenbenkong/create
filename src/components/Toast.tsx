import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Toast() {
  const { toast, setToast } = useStore();

  // 3.5s 自动消失
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;

  const config = {
    success: { icon: CheckCircle2, color: '#7BAE7F' },
    error:   { icon: AlertCircle,  color: '#C97064' },
    info:    { icon: Info,         color: '#D4A574' },
  }[toast.kind];

  const Icon = config.icon;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-down pointer-events-auto"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="flex items-center gap-3 px-5 py-3 min-w-[280px] max-w-[480px] backdrop-blur-md"
        style={{
          background: 'rgba(26, 24, 21, 0.85)',
          border: '1px solid rgba(245, 241, 232, 0.18)',
          borderRadius: 0,
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        }}
      >
        <Icon size={16} strokeWidth={1.5} style={{ color: config.color, flexShrink: 0 }} />
        <span className="font-sans text-xs text-paper-50 leading-relaxed flex-1 tracking-wide">
          {toast.message}
        </span>
        <button
          onClick={() => setToast(null)}
          className="text-paper-50/50 hover:text-paper-50 transition-colors duration-200"
          aria-label="关闭"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
