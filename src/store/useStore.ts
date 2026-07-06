import { create } from 'zustand';

export type Mode = 'text2img' | 'img2img' | 'text2video' | 'img2video' | 'multi2video' | 'chat';

/**
 * 图片尺寸
 * - "4K-1:1" / "4K-16:9" / "4K-9:16" / "4K-3:4"  →  4K 超高清档（4096×4096 / 5248×2944 等）
 * - "1024x1024" / "1792x1024" / "1024x1792"        →  普通高清档
 * Agnes API 接收 size 字段为 "4K" 时按请求中的 aspect_ratio 分配像素
 */
export type ImageSize =
  | '4K-1:1'
  | '4K-16:9'
  | '4K-9:16'
  | '4K-3:4'
  | '1024x1024'
  | '1792x1024'
  | '1024x1792';

export type ModeGroup = 'image' | 'video' | 'chat';

/**
 * 作品库条目
 * - imageUrl：原图 URL（http/https/data: 三种）
 * - thumbnail：200px JPEG base64（作品库卡片展示用，节省 localStorage 容量）
 * - title：可选自定义命名
 * - starred：是否收藏
 */
export interface HistoryItem {
  id: string;
  prompt: string;
  mode: Mode;
  size: ImageSize;
  imageUrl: string;
  thumbnail?: string;
  title?: string;
  starred?: boolean;
  isVideo?: boolean;
  createdAt: number;
}

export interface ReferenceImageItem {
  base64: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  createdAt: number;
}

interface AppState {
  mode: Mode;
  prompt: string;
  size: ImageSize;
  referenceImage: string | null;
  referenceImageName: string | null;
  multiImages: ReferenceImageItem[];
  isGenerating: boolean;
  resultImageUrl: string | null;
  resultVideoUrl: string | null;
  videoPollingId: number | null;
  /** 视频生成进度（0-100），用于 UI 显示 */
  videoProgress: number | null;
  /** 视频生成状态文本（queued/in_progress/completed/failed） */
  videoStatus: string | null;
  error: string | null;
  /** 作品库：所有生成过的作品都进入这里（持久化到 localStorage） */
  history: HistoryItem[];

  // 作品库侧边栏开关
  isArchiveOpen: boolean;

  // 聊天相关
  chatMessages: ChatMessage[];
  chatInput: string;
  chatImage: string | null;
  chatImageName: string | null;
  isChatStreaming: boolean;

  // 轻量 toast
  toast: { kind: 'success' | 'error' | 'info'; message: string } | null;
  setToast: (t: { kind: 'success' | 'error' | 'info'; message: string } | null) => void;

  setMode: (mode: Mode) => void;
  setPrompt: (prompt: string) => void;
  setSize: (size: ImageSize) => void;
  setReferenceImage: (image: string | null, name: string | null) => void;
  setMultiImages: (images: ReferenceImageItem[]) => void;
  addMultiImage: (image: ReferenceImageItem) => void;
  removeMultiImage: (index: number) => void;
  setGenerating: (v: boolean) => void;
  setResultImageUrl: (url: string | null) => void;
  setResultVideoUrl: (url: string | null) => void;
  setVideoPollingId: (id: number | null) => void;
  setVideoProgress: (progress: number | null, status: string | null) => void;
  setError: (err: string | null) => void;

  // 作品库相关
  addToHistory: (item: HistoryItem) => void;
  loadHistory: () => void;
  removeFromHistory: (id: string) => void;
  updateHistoryItem: (id: string, partial: Partial<HistoryItem>) => void;
  clearHistory: () => void;

  // 聊天相关
  setChatInput: (input: string) => void;
  setChatImage: (image: string | null, name: string | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsChatStreaming: (v: boolean) => void;
  clearChat: () => void;
}

const HISTORY_KEY = 'ai-image-history';
const CHAT_KEY = 'ai-chat-messages';
/** 作品库容量上限（500 张缩略图约 5-10MB，localStorage 通常 5-10MB 限制）。
 *  超出时按时间倒序淘汰最旧的（保留用户主动 starred 的） */
const MAX_HISTORY = 500;

/**
 * 同步从 localStorage 读取 history 初始值。
 *
 * 关键修复：原版 loadHistory() 是 store action，从未在 App 启动时调用，
 * 导致 history 永远是空数组，刷新页面后作品库显示 0 件。
 * 修法：把 localStorage.getItem 直接放在 create 工厂里执行（localStorage
 *       是同步 API），store 初始化时就有数据。
 */
function loadInitialHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as HistoryItem[];
  } catch { /* ignore */ }
  return [];
}

const isVideoMode = (mode: Mode) => ['text2video', 'img2video', 'multi2video'].includes(mode);
const isChatMode = (mode: Mode) => mode === 'chat';
const getModeGroup = (mode: Mode): ModeGroup => {
  if (isChatMode(mode)) return 'chat';
  if (isVideoMode(mode)) return 'video';
  return 'image';
};

export const useStore = create<AppState>((set) => ({
  mode: 'text2img',
  prompt: '',
  size: '4K-1:1',
  referenceImage: null,
  referenceImageName: null,
  multiImages: [],
  isGenerating: false,
  resultImageUrl: null,
  resultVideoUrl: null,
  videoPollingId: null,
  videoProgress: null,
  videoStatus: null,
  error: null,
  /** 作品库：store 初始化时同步从 localStorage 读取，避免刷新后变 0 件 */
  history: loadInitialHistory(),
  isArchiveOpen: false,

  chatMessages: [],
  chatInput: '',
  chatImage: null,
  chatImageName: null,
  isChatStreaming: false,
  toast: null,
  setToast: (t) => set({ toast: t }),

  setMode: (mode) => set({ mode, error: null }),
  setPrompt: (prompt) => set({ prompt }),
  setSize: (size) => set({ size }),
  setReferenceImage: (image, name) => set({ referenceImage: image, referenceImageName: name }),
  setMultiImages: (images) => set({ multiImages: images }),
  addMultiImage: (image) => set((state) => ({ multiImages: [...state.multiImages, image] })),
  removeMultiImage: (index) => set((state) => ({
    multiImages: state.multiImages.filter((_, i) => i !== index),
  })),
  setGenerating: (v) => set({ isGenerating: v }),
  setResultImageUrl: (url) => set({ resultImageUrl: url }),
  setResultVideoUrl: (url) => set({ resultVideoUrl: url }),
  setVideoPollingId: (id) => set({ videoPollingId: id }),
  setVideoProgress: (progress, status) => set({ videoProgress: progress, videoStatus: status }),
  setError: (err) => set({ error: err }),

  addToHistory: (item) =>
    set((state) => {
      // 新条目置顶
      const next = [item, ...state.history];
      // 超出上限时优先淘汰：非 starred + 最旧
      const trimmed = next.length > MAX_HISTORY
        ? [
            ...next.filter((i) => i.starred),
            ...next.filter((i) => !i.starred).slice(0, MAX_HISTORY - next.filter((i) => i.starred).length),
          ]
        : next;
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      } catch {
        // 配额超限：再砍一半非 starred 旧条目
        try {
          const starredCount = trimmed.filter((i) => i.starred).length;
          const nonStarredKeep = Math.max(0, Math.floor((MAX_HISTORY / 2)) - starredCount);
          const reduced = [
            ...trimmed.filter((i) => i.starred),
            ...trimmed.filter((i) => !i.starred).slice(0, nonStarredKeep),
          ];
          localStorage.setItem(HISTORY_KEY, JSON.stringify(reduced));
          return { history: reduced };
        } catch { /* ignore */ }
      }
      return { history: trimmed };
    }),

  loadHistory: () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryItem[];
        set({ history: parsed });
      }
    } catch { /* ignore */ }
  },

  removeFromHistory: (id) =>
    set((state) => {
      const next = state.history.filter((i) => i.id !== id);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return { history: next };
    }),

  updateHistoryItem: (id, partial) =>
    set((state) => {
      const next = state.history.map((i) => (i.id === id ? { ...i, ...partial } : i));
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return { history: next };
    }),

  clearHistory: () => {
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
    set({ history: [] });
  },

  // 聊天相关
  setChatInput: (input) => set({ chatInput: input }),
  setChatImage: (image, name) => set({ chatImage: image, chatImageName: name }),
  addChatMessage: (msg) =>
    set((state) => {
      const newMessages = [...state.chatMessages, msg];
      try {
        localStorage.setItem(CHAT_KEY, JSON.stringify(newMessages.slice(-100)));
      } catch { /* ignore */ }
      return { chatMessages: newMessages };
    }),
  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.chatMessages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
        messages[lastIdx] = { ...messages[lastIdx], content };
      }
      return { chatMessages: messages };
    }),
  setIsChatStreaming: (v) => set({ isChatStreaming: v }),
  clearChat: () => {
    set({ chatMessages: [], chatInput: '', chatImage: null, chatImageName: null });
    try { localStorage.removeItem(CHAT_KEY); } catch { /* ignore */ }
  },
}));

export { isVideoMode, isChatMode, getModeGroup };
