/**
 * 下载工具
 *
 * 优先级：
 *   0. File System Access API（用户已授权目录）→ 直接写入选定文件夹，无对话框
 *   1. data URL（API 返回 b64_json）     → atob → Blob → blob URL → <a download>
 *   2. 远端 URL（同源 / 带 CORS 头）     → fetch → Blob → blob URL → <a download>
 *   3. 跨域 CDN 兜底                    → <a href download rel="noopener"> 触发下载
 *
 * 不再静默吞错；调用方 try/catch 后给用户 toast 反馈。
 */

import { loadDirHandle, verifyHandle, writeToDirectory, isFileSystemSupported } from './fileSystem';
import { useSettings, type FilenameFormat } from '@/store/useSettings';

const EXT_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'application/octet-stream': 'bin',
};

function getExtFromUrl(url: string, fallback: string): string {
  const cleanUrl = url.split('?')[0].split('#')[0];
  const match = cleanUrl.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (match) return match[1].toLowerCase();
  return fallback;
}

function getExtFromMime(mime: string): string {
  return EXT_MAP[mime] || 'bin';
}

/** 简短时间戳：0614-1719（月日-时分） */
function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export interface DownloadOptions {
  /** 文件名前缀 */
  filenamePrefix?: string;
  /** 强制指定扩展名 */
  ext?: string;
  /** prompt 摘要（filenameFormat === 'prompt' 时用于生成文件名） */
  prompt?: string;
  /** 自定义命名（优先级最高，有值时直接用作文件名主体，忽略格式设置） */
  title?: string;
}

/** 根据设置生成文件名（简约风格） */
function buildFilename(options: DownloadOptions): string {
  const settings = useSettings.getState();
  const format: FilenameFormat = settings.filenameFormat;
  const ext = options.ext || 'png';

  // 如果有自定义命名，优先用作文件名主体（加时间戳防重名）
  if (options.title && options.title.trim()) {
    const safe = options.title.trim()
      .slice(0, 20)
      .replace(/[<>:"/\\|?*\s]/g, '');
    if (safe) return `${safe}-${timestamp()}.${ext}`;
  }

  switch (format) {
    case 'prompt': {
      // 只取前 12 字，去空格
      const prompt = (options.prompt || '工坊')
        .slice(0, 12)
        .replace(/[<>:"/\\|?*\s]/g, '');
      return `${prompt}-${timestamp()}.${ext}`;
    }
    case 'custom': {
      const prefix = settings.customPrefix || '工坊';
      return `${prefix}-${timestamp()}.${ext}`;
    }
    case 'timestamp':
    default:
      return `${timestamp()}.${ext}`;
  }
}

/**
 * 尝试用 File System Access API 写入选定目录。
 * 成功返回文件名，失败/不支持/未授权返回 null（调用方回退到浏览器下载）。
 */
async function tryWriteToDirectory(url: string, filename: string): Promise<string | null> {
  if (!isFileSystemSupported()) return null;

  const handle = await loadDirHandle();
  if (!handle) return null;

  const ok = await verifyHandle(handle);
  if (!ok) return null;

  // 获取 Blob
  let blob: Blob;
  if (url.startsWith('data:')) {
    const [meta, b64] = url.split(',');
    const mimeMatch = meta.match(/data:([^;]+)/);
    const mime = mimeMatch?.[1] || 'application/octet-stream';
    const byteString = atob(b64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    blob = new Blob([ab], { type: mime });
  } else {
    // 优先尝试直接 fetch（CORS 失败则用代理 fallback）
    let proxyWorked = false;
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (response.ok) {
        blob = await response.blob();
        if (blob && (blob.size > 0 || blob.type)) {
          proxyWorked = true;
        }
      }
    } catch {
      // CORS / 网络错误 → 用代理
    }

    if (!proxyWorked) {
      // 回退到本地代理
      try {
        const proxyUrl = `/api/__download?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, { cache: 'no-cache' });
        if (!response.ok) return null;
        blob = await response.blob();
        if (!blob || blob.size === 0) return null;
      } catch {
        return null;
      }
    }
  }

  return await writeToDirectory(handle, filename, blob);
}

export interface DownloadResult {
  /** 实际保存位置描述（用于提示用户） */
  savedTo: string;
}

export async function downloadFromUrl(url: string, options: DownloadOptions = {}): Promise<DownloadResult> {
  const filename = buildFilename(options);
  const ext = options.ext || getExtFromUrl(url, 'png');
  const settings = useSettings.getState();

  // 0) File System Access API → 直接写入选定目录
  const written = await tryWriteToDirectory(url, filename);
  if (written) {
    return { savedTo: settings.downloadDirName || '授权目录' };
  }

  // 1) data URL → 直接转 blob，零 CORS 风险
  if (url.startsWith('data:')) {
    downloadFromDataUrl(url, filename);
    return { savedTo: '浏览器下载文件夹' };
  }

  // 2) 通过本地代理 fetch（同源，无 CORS 问题）→ blob → <a download>
  try {
    const proxyUrl = `/api/__download?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, { cache: 'no-cache' });
    if (response.ok) {
      const blob = await response.blob();
      if (blob && blob.size > 0) {
        const mime = blob.type || 'application/octet-stream';
        const realExt = options.ext || getExtFromMime(mime) || getExtFromUrl(url, 'bin');
        triggerBlobDownload(blob, buildFilename({ ...options, ext: realExt }));
        return { savedTo: '浏览器下载文件夹' };
      }
    }
  } catch {
    // 代理失败 → 尝试直接 fetch
  }

  // 2b) 直接 fetch 远端 URL（只在服务端允许 CORS 时可用）
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (response.ok) {
      const blob = await response.blob();
      if (blob && (blob.size > 0 || blob.type)) {
        const mime = blob.type || 'application/octet-stream';
        const realExt = options.ext || getExtFromMime(mime) || getExtFromUrl(url, 'bin');
        triggerBlobDownload(blob, buildFilename({ ...options, ext: realExt }));
        return { savedTo: '浏览器下载文件夹' };
      }
    }
  } catch {
    // CORS / 网络错误 → fallback 到第 3 步
  }

  // 3) 兜底：新标签页打开
  triggerDirectDownload(url, buildFilename({ ...options, ext }));
  return { savedTo: '浏览器下载文件夹' };
}

export function downloadFromDataUrl(dataUrl: string, filename: string): void {
  const [meta, b64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] || 'application/octet-stream';
  const ext = getExtFromMime(mime);

  const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(filename);
  const finalName = hasExt ? filename : `${filename}.${ext}`;

  const byteString = atob(b64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  const blob = new Blob([ab], { type: mime });
  triggerBlobDownload(blob, finalName);
}

export function downloadFromBase64(base64: string, mime: string, filenamePrefix: string = '工坊'): void {
  const ext = getExtFromMime(mime);
  const filename = `${filenamePrefix}-${timestamp()}.${ext}`;
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  const blob = new Blob([ab], { type: mime });
  triggerBlobDownload(blob, filename);
}

export function downloadText(content: string, filename: string, mime: string = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  triggerBlobDownload(blob, filename);
}

/** Blob URL + <a download>（100% 走原生下载流） */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.style.display = 'none';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 1500);
}

/** 兜底：用 window.open 在新标签页打开（跨域时 <a download> 会被忽略变成导航） */
function triggerDirectDownload(url: string, filename: string): void {
  // 跨域 URL 的 <a download> 会被浏览器忽略，导致当前页跳转。
  // 改为在新标签页打开，避免离开当前页面。
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function detectMediaKind(url: string): 'image' | 'video' | 'unknown' {
  if (url.startsWith('data:')) {
    if (url.startsWith('data:image/')) return 'image';
    if (url.startsWith('data:video/')) return 'video';
    return 'unknown';
  }
  const ext = getExtFromUrl(url, '');
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (/oss|cdn|storage/i.test(url)) return 'image';
  return 'unknown';
}
