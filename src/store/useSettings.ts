import { create } from 'zustand';

/** 文件名格式 */
export type FilenameFormat = 'timestamp' | 'prompt' | 'custom';

/** 视频分辨率 */
export type VideoResolution = '720p' | '1080p';

/** 对话模型 */
export type ChatModel = 'agnes-2.0-flash' | 'agnes-2.0' | 'agnes-2.0-mini';

export interface Settings {
  // ============ 下载 ============
  /** 下载目录显示名（实际 handle 存在 IndexedDB） */
  downloadDirName: string | null;
  /** 文件名格式 */
  filenameFormat: FilenameFormat;
  /** 自定义文件名前缀（filenameFormat === 'custom' 时使用） */
  customPrefix: string;
  /** 生成完成后自动下载 */
  autoDownload: boolean;

  // ============ 图像 ============
  /** 默认图片尺寸 */
  defaultImageSize: string;

  // ============ 视频 ============
  /** 默认视频分辨率 */
  defaultVideoResolution: VideoResolution;

  // ============ 对话 ============
  /** 对话模型 */
  chatModel: ChatModel;
  /** 系统提示词（设定 AI 角色和行为） */
  chatSystemPrompt: string;

  // ============ 界面 ============
  /** 壁纸开关 */
  wallpaperEnabled: boolean;
  /** 减弱动效（无障碍） */
  reduceMotion: boolean;
}

interface SettingsState extends Settings {
  setDownloadDir: (name: string | null) => void;
  setFilenameFormat: (f: FilenameFormat) => void;
  setCustomPrefix: (p: string) => void;
  setAutoDownload: (v: boolean) => void;
  setDefaultImageSize: (s: string) => void;
  setDefaultVideoResolution: (r: VideoResolution) => void;
  setChatModel: (m: ChatModel) => void;
  setChatSystemPrompt: (p: string) => void;
  setWallpaperEnabled: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  loadSettings: () => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SETTINGS_KEY = 'atelier-settings';

const DEFAULTS: Settings = {
  downloadDirName: null,
  filenameFormat: 'timestamp',
  customPrefix: '工坊',
  autoDownload: false,
  defaultImageSize: '4K-1:1',
  defaultVideoResolution: '1080p',
  chatModel: 'agnes-2.0-flash',
  chatSystemPrompt: '',
  wallpaperEnabled: true,
  reduceMotion: false,
};

function loadFromStorage(): Partial<Settings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveToStorage(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  ...loadFromStorage(),

  setDownloadDir: (name) => get().updateSetting('downloadDirName', name),
  setFilenameFormat: (f) => get().updateSetting('filenameFormat', f),
  setCustomPrefix: (p) => get().updateSetting('customPrefix', p),
  setAutoDownload: (v) => get().updateSetting('autoDownload', v),
  setDefaultImageSize: (s) => get().updateSetting('defaultImageSize', s),
  setDefaultVideoResolution: (r) => get().updateSetting('defaultVideoResolution', r),
  setChatModel: (m) => get().updateSetting('chatModel', m),
  setChatSystemPrompt: (p) => get().updateSetting('chatSystemPrompt', p),
  setWallpaperEnabled: (v) => get().updateSetting('wallpaperEnabled', v),
  setReduceMotion: (v) => get().updateSetting('reduceMotion', v),

  loadSettings: () => {
    const stored = loadFromStorage();
    set({ ...DEFAULTS, ...stored });
  },

  updateSetting: (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    const current = get();
    const settings: Settings = {
      downloadDirName: current.downloadDirName,
      filenameFormat: current.filenameFormat,
      customPrefix: current.customPrefix,
      autoDownload: current.autoDownload,
      defaultImageSize: current.defaultImageSize,
      defaultVideoResolution: current.defaultVideoResolution,
      chatModel: current.chatModel,
      chatSystemPrompt: current.chatSystemPrompt,
      wallpaperEnabled: current.wallpaperEnabled,
      reduceMotion: current.reduceMotion,
    };
    saveToStorage(settings);
  },
}));
