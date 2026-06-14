/**
 * 直接调用浏览器下载 API
 *
 * 三层防御，命中即返回：
 *   1. data URL（API 返回 b64_json）     → atob → Blob → blob URL → <a download>
 *   2. 远端 URL（同源 / 带 CORS 头）     → fetch → Blob → blob URL → <a download>
 *   3. 跨域 CDN 兜底                    → <a href download rel="noopener"> 触发下载
 *      （如果 CDN 有 Content-Disposition: attachment，浏览器会自动下载到默认目录）
 *
 * 不再静默吞错；调用方 try/catch 后给用户 toast 反馈。
 */

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

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export interface DownloadOptions {
  /** 文件名前缀 */
  filenamePrefix?: string;
  /** 强制指定扩展名 */
  ext?: string;
}

export async function downloadFromUrl(url: string, options: DownloadOptions = {}): Promise<void> {
  const { filenamePrefix = '工坊', ext } = options;

  // 1) data URL → 直接转 blob，零 CORS 风险
  if (url.startsWith('data:')) {
    downloadFromDataUrl(url, `${filenamePrefix}-${timestamp()}.${ext || 'png'}`);
    return;
  }

  // 2) 远端 URL → 尝试 fetch + blob（只在服务端允许 CORS 时可用）
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (response.ok) {
      const blob = await response.blob();
      // 如果 body 是 opaque（跨域 no-cors 模式下），size=0 / type=''；跳过
      if (blob && (blob.size > 0 || blob.type)) {
        const mime = blob.type || 'application/octet-stream';
        const realExt = ext || getExtFromMime(mime) || getExtFromUrl(url, 'bin');
        triggerBlobDownload(blob, `${filenamePrefix}-${timestamp()}.${realExt}`);
        return;
      }
    }
  } catch {
    // CORS / 网络错误 → fallback 到第 3 步
  }

  // 3) 兜底：直接用 <a download>，让浏览器按 Content-Disposition 头决定下载还是打开
  //   对大多数带 Content-Disposition: attachment 的 CDN 资源，浏览器会走原生下载
  const fallbackExt = ext || getExtFromUrl(url, 'bin');
  triggerDirectDownload(url, `${filenamePrefix}-${timestamp()}.${fallbackExt}`);
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

/** 兜底：直接 <a href download>，不做 fetch（适合 CORS 严苛的 CDN） */
function triggerDirectDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  // 必须先 append 再 click，否则部分浏览器不触发
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
  }, 1500);
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
