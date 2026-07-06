import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings, type FilenameFormat, type VideoResolution, type ChatModel } from '@/store/useSettings';
import {
  pickDirectory, loadDirHandle, verifyHandle, clearDirHandle, isFileSystemSupported,
} from '@/utils/fileSystem';
import { useStore, type ImageSize } from '@/store/useStore';
import { ArrowLeft, FolderOpen, Check, X, AlertCircle, Trash2 } from 'lucide-react';
import Wallpaper from '@/components/Wallpaper';
import Toast from '@/components/Toast';

const IMAGE_SIZES: { value: ImageSize; label: string }[] = [
  { value: '4K-1:1', label: '4K · 1:1 正方' },
  { value: '4K-16:9', label: '4K · 16:9 横版' },
  { value: '4K-9:16', label: '4K · 9:16 竖版' },
  { value: '4K-3:4', label: '4K · 3:4 竖版' },
  { value: '1024x1024', label: '1024 · 正方' },
  { value: '1792x1024', label: '1792 · 横版' },
  { value: '1024x1792', label: '1024 · 竖版' },
];

const VIDEO_RESOLUTIONS: { value: VideoResolution; label: string; desc: string }[] = [
  { value: '720p', label: '720p', desc: '生成快 · 适合预览' },
  { value: '1080p', label: '1080p', desc: '高清 · 适合成片' },
];

const CHAT_MODELS: { value: ChatModel; label: string; desc: string }[] = [
  { value: 'agnes-2.0-flash', label: 'Agnes 2.0 Flash', desc: '快速响应 · 日常对话' },
  { value: 'agnes-2.0', label: 'Agnes 2.0', desc: '深度思考 · 复杂问题' },
  { value: 'agnes-2.0-mini', label: 'Agnes 2.0 Mini', desc: '轻量级 · 简单问答' },
];

const FILENAME_FORMATS: { value: FilenameFormat; label: string; example: string }[] = [
  { value: 'timestamp', label: '时间戳', example: '0614-1719.png' },
  { value: 'prompt', label: 'Prompt 摘要', example: '一只猫坐在窗台上-0614.png' },
  { value: 'custom', label: '自定义前缀', example: '工坊-0614-1719.png' },
];

type SettingsTab = 'image' | 'video' | 'chat';

const TABS: { key: SettingsTab; label: string; subtitle: string }[] = [
  { key: 'image', label: '图像', subtitle: 'IMAGE' },
  { key: 'video', label: '视频', subtitle: 'VIDEO' },
  { key: 'chat', label: '对话', subtitle: 'CHAT' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettings();
  const { setToast } = useStore();
  const [dirName, setDirName] = useState<string | null>(settings.downloadDirName);
  const [supported] = useState(isFileSystemSupported());
  const [tab, setTab] = useState<SettingsTab>('image');

  const handlePickDir = async () => {
    const handle = await pickDirectory();
    if (handle) {
      setDirName(handle.name);
      settings.setDownloadDir(handle.name);
      setToast({ kind: 'success', message: `已设置下载目录：${handle.name}` });
    }
  };

  const handleClearDir = async () => {
    await clearDirHandle();
    setDirName(null);
    settings.setDownloadDir(null);
    setToast({ kind: 'info', message: '已清除下载目录，将使用浏览器默认下载' });
  };

  const handleTestPermission = async () => {
    const handle = await loadDirHandle();
    if (!handle) {
      setToast({ kind: 'error', message: '未找到已保存的目录' });
      return;
    }
    const ok = await verifyHandle(handle);
    if (ok) {
      setToast({ kind: 'success', message: `权限正常：${handle.name}` });
    } else {
      setToast({ kind: 'error', message: '权限被拒绝，请重新选择目录' });
    }
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
                <span className="text-paper-50">设置 · Settings</span>
              </span>
            </div>
            <span>2026 · 创刊</span>
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
                  <span className="italic-serif text-paper-50">设置</span>
                </h1>
                <span className="block text-[10px] text-paper-200 font-mono tracking-widest uppercase mt-1.5">
                  Settings · 自定义你的工坊
                </span>
              </div>
            </div>
          </header>

          <div className="rule mb-8" />

          {/* Tab 切换 */}
          <div className="mb-12 flex items-center gap-8">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`group flex items-baseline gap-2 pb-2 border-b-2 transition-all duration-400 ${
                  tab === t.key
                    ? 'border-umber'
                    : 'border-transparent hover:border-paper-50/25'
                }`}
              >
                <span className={`font-display text-lg tracking-wider transition-colors ${
                  tab === t.key ? 'text-paper-50' : 'text-paper-200/60'
                }`}>{t.label}</span>
                <span className={`text-[9px] font-mono tracking-widest uppercase transition-colors ${
                  tab === t.key ? 'text-umber' : 'text-paper-200/40'
                }`}>{t.subtitle}</span>
              </button>
            ))}
          </div>

          <div className="max-w-3xl space-y-20">
            {/* ============ 通用·下载设置 ============ */}
            <SettingsSection
              num="01"
              title="下载"
              subtitle="DOWNLOAD"
              desc="配置文件保存位置和命名规则。授权目录后，下载时不再弹出另存为对话框。"
            >
              {/* 浏览器兼容性提示 */}
              {!supported && (
                <div className="mb-6 flex items-start gap-3 p-4 border border-umber/30 bg-umber/5">
                  <AlertCircle size={14} className="text-umber flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-paper-50/85 font-sans">
                      当前浏览器不支持 File System Access API，无法自定义下载目录。
                    </p>
                    <p className="text-[10px] text-paper-200/60 font-mono mt-1">
                      请使用 Chrome / Edge 86+ 以获得完整体验。当前将使用浏览器默认下载。
                    </p>
                  </div>
                </div>
              )}

              {/* 下载目录 */}
              <Field label="下载目录" hint="授权后文件直接保存到此文件夹，无需对话框">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePickDir}
                    disabled={!supported}
                    className="flex items-center gap-2 px-4 py-2.5 border border-paper-50/25 text-xs text-paper-50 hover:bg-paper-50/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-mono tracking-wider"
                  >
                    <FolderOpen size={13} strokeWidth={1.5} />
                    <span>{dirName ? '更换目录' : '选择目录'}</span>
                  </button>
                  {dirName && (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-paper-50/5 border border-paper-50/15">
                        <Check size={13} className="text-umber" strokeWidth={2} />
                        <span className="text-xs text-paper-50 font-mono">{dirName}</span>
                      </div>
                      <button
                        onClick={handleTestPermission}
                        className="text-[10px] text-paper-200 hover:text-paper-50 font-mono tracking-widest uppercase transition-colors"
                      >
                        测试权限
                      </button>
                      <button
                        onClick={handleClearDir}
                        className="flex items-center gap-1 text-[10px] text-paper-200 hover:text-red-400 font-mono tracking-widest uppercase transition-colors"
                      >
                        <X size={11} strokeWidth={1.5} />
                        清除
                      </button>
                    </>
                  )}
                </div>
                {!dirName && supported && (
                  <p className="mt-2 text-[10px] text-paper-200/50 font-mono">
                    未设置 → 使用浏览器默认下载（会弹另存为）
                  </p>
                )}
                {!dirName && !supported && (
                  <p className="mt-2 text-[10px] text-paper-200/50 font-mono">
                    当前浏览器 → 使用浏览器默认下载
                  </p>
                )}
              </Field>

              {/* 文件名格式 */}
              <Field label="文件名格式" hint="下载文件的命名规则">
                <div className="space-y-2">
                  {FILENAME_FORMATS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => settings.setFilenameFormat(f.value)}
                      className={`w-full flex items-center justify-between px-4 py-3 border transition-colors ${
                        settings.filenameFormat === f.value
                          ? 'border-umber bg-umber/10'
                          : 'border-paper-50/15 hover:border-paper-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full border ${
                          settings.filenameFormat === f.value
                            ? 'border-umber bg-umber'
                            : 'border-paper-50/30'
                        }`} />
                        <span className="text-sm text-paper-50">{f.label}</span>
                      </div>
                      <span className="text-[10px] text-paper-200/50 font-mono">{f.example}</span>
                    </button>
                  ))}
                </div>
              </Field>

              {/* 自定义前缀 */}
              {settings.filenameFormat === 'custom' && (
                <Field label="自定义前缀" hint="用于文件名开头的标识">
                  <input
                    type="text"
                    value={settings.customPrefix}
                    onChange={(e) => settings.setCustomPrefix(e.target.value)}
                    placeholder="创作工坊"
                    className="w-full px-4 py-2.5 bg-transparent border border-paper-50/20 text-sm text-paper-50 placeholder:text-paper-50/30 focus:border-paper-50/50 focus:outline-none transition-colors font-sans"
                  />
                </Field>
              )}

              {/* 自动下载 */}
              <Field label="自动下载" hint="生成完成后自动保存到下载目录">
                <Toggle
                  checked={settings.autoDownload}
                  onChange={settings.setAutoDownload}
                />
              </Field>
            </SettingsSection>

            {/* ============ 图像设置（仅 image tab） ============ */}
            {tab === 'image' && (
            <SettingsSection
              num="02"
              title="图像"
              subtitle="IMAGE"
              desc="配置文生图、图生图的默认尺寸。"
            >
              <Field label="默认图像尺寸" hint="打开页面时默认选中的尺寸">
                <div className="space-y-2">
                  {IMAGE_SIZES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => {
                        settings.setDefaultImageSize(s.value);
                        useStore.getState().setSize(s.value);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 border transition-colors ${
                        settings.defaultImageSize === s.value
                          ? 'border-umber bg-umber/10'
                          : 'border-paper-50/15 hover:border-paper-50/30'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full border ${
                        settings.defaultImageSize === s.value
                          ? 'border-umber bg-umber'
                          : 'border-paper-50/30'
                      }`} />
                      <span className="text-sm text-paper-50">{s.label}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </SettingsSection>
            )}

            {/* ============ 视频设置（仅 video tab） ============ */}
            {tab === 'video' && (
            <SettingsSection
              num="02"
              title="视频"
              subtitle="VIDEO"
              desc="配置文生视频、图生视频的默认分辨率。"
            >
              <Field label="默认视频分辨率" hint="影响生成速度和画质">
                <div className="space-y-2">
                  {VIDEO_RESOLUTIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => settings.setDefaultVideoResolution(r.value)}
                      className={`w-full flex items-center justify-between px-4 py-3 border transition-colors ${
                        settings.defaultVideoResolution === r.value
                          ? 'border-umber bg-umber/10'
                          : 'border-paper-50/15 hover:border-paper-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full border ${
                          settings.defaultVideoResolution === r.value
                            ? 'border-umber bg-umber'
                            : 'border-paper-50/30'
                        }`} />
                        <span className="text-sm text-paper-50">{r.label}</span>
                      </div>
                      <span className="text-[10px] text-paper-200/50 font-mono">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </SettingsSection>
            )}

            {/* ============ 对话设置（仅 chat tab） ============ */}
            {tab === 'chat' && (
            <SettingsSection
              num="02"
              title="对话"
              subtitle="CHAT"
              desc="配置 AI 对话的模型和人设。系统提示词用于设定 AI 的角色和行为。"
            >
              <Field label="对话模型" hint="不同模型在速度和深度上有差异">
                <div className="space-y-2">
                  {CHAT_MODELS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => settings.setChatModel(m.value)}
                      className={`w-full flex items-center justify-between px-4 py-3 border transition-colors ${
                        settings.chatModel === m.value
                          ? 'border-umber bg-umber/10'
                          : 'border-paper-50/15 hover:border-paper-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full border ${
                          settings.chatModel === m.value
                            ? 'border-umber bg-umber'
                            : 'border-paper-50/30'
                        }`} />
                        <span className="text-sm text-paper-50">{m.label}</span>
                      </div>
                      <span className="text-[10px] text-paper-200/50 font-mono">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="系统提示词" hint="设定 AI 的角色和行为（留空则不设定）">
                <textarea
                  value={settings.chatSystemPrompt}
                  onChange={(e) => settings.setChatSystemPrompt(e.target.value)}
                  placeholder="例：你是一位专业的摄影师，擅长用诗意的语言描述画面…"
                  rows={3}
                  className="w-full px-4 py-3 bg-transparent border border-paper-50/20 text-sm text-paper-50 placeholder:text-paper-50/30 focus:border-paper-50/50 focus:outline-none transition-colors font-sans resize-none"
                  style={{ minHeight: '80px', maxHeight: '160px' }}
                />
                <p className="mt-2 text-[10px] text-paper-200/50 font-mono">
                  将作为 system message 发送给模型，影响所有对话的风格和角色
                </p>
              </Field>
            </SettingsSection>
            )}

            {/* ============ 通用·界面设置 ============ */}
            <SettingsSection
              num="03"
              title="界面"
              subtitle="APPEARANCE"
              desc="调整视觉和动效偏好。"
            >
              <Field label="背景壁纸" hint="显示/隐藏背景动态壁纸">
                <Toggle
                  checked={settings.wallpaperEnabled}
                  onChange={settings.setWallpaperEnabled}
                />
              </Field>

              <Field label="减弱动效" hint="降低动画强度（无障碍）">
                <Toggle
                  checked={settings.reduceMotion}
                  onChange={settings.setReduceMotion}
                />
              </Field>
            </SettingsSection>

            {/* ============ 通用·数据管理 ============ */}
            <SettingsSection
              num="04"
              title="数据"
              subtitle="DATA"
              desc="管理本地存储的数据。"
            >
              <Field label="清空作品库" hint="删除所有已保存的创作记录（不可撤销）">
                <button
                  onClick={() => {
                    if (confirm('确定清空作品库？所有创作记录将被永久删除。')) {
                      useStore.getState().clearHistory();
                      setToast({ kind: 'info', message: '作品库已清空' });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-colors font-mono tracking-wider"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                  <span>清空全部</span>
                </button>
              </Field>

              <Field label="清空聊天记录" hint="删除所有对话历史">
                <button
                  onClick={() => {
                    if (confirm('确定清空聊天记录？')) {
                      useStore.getState().clearChat();
                      setToast({ kind: 'info', message: '聊天记录已清空' });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-colors font-mono tracking-wider"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                  <span>清空全部</span>
                </button>
              </Field>

              <Field label="重置设置" hint="恢复所有设置到默认值">
                <button
                  onClick={() => {
                    if (confirm('确定重置所有设置？')) {
                      localStorage.removeItem('atelier-settings');
                      settings.loadSettings();
                      setToast({ kind: 'info', message: '设置已重置' });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-paper-50/25 text-xs text-paper-50 hover:bg-paper-50/5 transition-colors font-mono tracking-wider"
                >
                  <span>重置</span>
                </button>
              </Field>
            </SettingsSection>
          </div>

          {/* 底部 */}
          <div className="mt-20 pt-6 border-t border-paper-50/15 flex items-center justify-between text-[10px] text-paper-200 font-mono tracking-widest uppercase">
            <span>设置已自动保存</span>
            <span>© 2026 · 创作工坊</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 子组件 ============

function SettingsSection({
  num, title, subtitle, desc, children,
}: {
  num: string;
  title: string;
  subtitle: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-up">
      <div className="grid grid-cols-12 gap-8 mb-8">
        <div className="col-span-12 lg:col-span-2">
          <span className="label">N°{num}</span>
        </div>
        <div className="col-span-12 lg:col-span-10">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="label-ink">{num} · {title}</span>
            <span className="catalogue">{subtitle}</span>
          </div>
          <p className="font-display italic text-base text-paper-200/70 max-w-xl leading-relaxed mb-8">
            {desc}
          </p>
          <div className="space-y-8">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm text-paper-50 font-sans">{label}</span>
        {hint && <span className="text-[10px] text-paper-200/50 font-mono">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked, onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full border transition-colors duration-300 ${
        checked
          ? 'bg-umber/30 border-umber'
          : 'bg-paper-50/5 border-paper-50/25'
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
          checked
            ? 'left-7 bg-umber shadow-[0_0_8px_rgba(212,165,116,0.5)]'
            : 'left-0.5 bg-paper-200/60'
        }`}
      />
    </button>
  );
}
