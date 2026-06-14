/**
 * 缩略图生成 —— Canvas resize 到 200px JPEG
 *
 * 目的：作品库里展示图片卡片，但 localStorage 容量有限（~5MB），
 *      如果直接存 4K 原图 base64（每张 1-3MB），50 张就会爆。
 *      缩略图每张 5-15KB，500 张也才几 MB，足够用。
 *
 * 策略：
 *   - 输入 URL（http/https/data: 三种）
 *   - 加载图片到 Image，等 onload
 *   - canvas drawImage resize 到 200×200 cover
 *   - canvas.toDataURL('image/jpeg', 0.7) 输出 base64
 *   - 任何步骤失败返回 null（不阻塞主流程）
 */
export async function makeThumbnail(
  src: string,
  size = 200,
  quality = 0.7
): Promise<string | null> {
  if (!src) return null;
  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // cover 模式：保持比例，裁剪中心
    const ratio = Math.max(size / img.width, size / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.fillStyle = '#1a1815';  // ink 底色，避免透明 JPEG 变白
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, x, y, w, h);

    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
    // data: URL 不会触发 CORS
    if (src.startsWith('data:')) img.crossOrigin = null as unknown as string;
    // 5 秒超时
    setTimeout(() => reject(new Error('image load timeout')), 5000);
  });
}
