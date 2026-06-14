import type { Mode, ImageSize, ChatMessage } from '@/store/useStore';

const API_KEY = 'sk-8fRJIZOlfLqL7G6MjKrJkjU2LRQFs6qrr1x9uSk2N9WnvzbX';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
};

// ============ 图片生成 ============

const IMAGE_API_URL = 'https://apihub.agnes-ai.com/v1/images/generations';
const IMAGE_MODEL = 'agnes-image-2.1-flash';

interface ImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

/**
 * 把前端 ImageSize 翻译成 Agnes API 接受的 size 字段。
 *
 * ⚠️ 关键约束：Agnes 走 LiteLLM 代理，底层 agnes-t2i-general-model 只接受
 * OpenAI 标准的 "WxH" 像素格式（不支持 "4K" 字面量，不支持 aspect_ratio）。
 * 因此这里采用「OpenAI 标准 size 字段 + 目标比例对应的最高像素」策略：
 *
 *   "4K-1:1"  →  "1024x1024"   （最高标准档，因为 4K 字面量会被 LiteLLM 拒）
 *   "4K-16:9" →  "1792x1024"
 *   "4K-9:16" →  "1024x1792"
 *   "4K-3:4"  →  "1024x1536"  (额外 3:4 档，没有具体像素就取最接近的)
 *
 * 如果后续 Agnes 开放原生 4K 支持，只需在这里把映射改成 "4K" 即可。
 */
function resolveImageSize(size: ImageSize): string {
  const map: Record<ImageSize, string> = {
    '4K-1:1':   '1024x1024',
    '4K-16:9':  '1792x1024',
    '4K-9:16':  '1024x1792',
    '4K-3:4':   '1024x1536',
    '1024x1024': '1024x1024',
    '1792x1024': '1792x1024',
    '1024x1792': '1024x1792',
  };
  return map[size] || '1024x1024';
}

export async function generateImage(
  mode: Mode,
  prompt: string,
  size: ImageSize,
  referenceImage?: string | null
): Promise<string> {
  const apiSize = resolveImageSize(size);

  // body 严格只传 OpenAI 标准字段，避免触发 LiteLLM UnsupportedParamsError
  const body: Record<string, unknown> = {
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: apiSize,
  };

  if (mode === 'img2img' && referenceImage) {
    body.image = referenceImage;
  }

  const response = await fetch(IMAGE_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
  }

  const data: ImageResponse = await response.json();

  if (!data.data || data.data.length === 0) {
    throw new Error('API 未返回图片数据');
  }

  const imageData = data.data[0];
  if (imageData.b64_json) {
    return `data:image/png;base64,${imageData.b64_json}`;
  }
  if (imageData.url) return imageData.url;

  throw new Error('API 返回数据格式异常');
}

// ============ 视频生成 ============

const VIDEO_API_URL = 'https://apihub.agnes-ai.com/v1/videos';
const VIDEO_MODEL = 'agnes-video-v2.0';

interface VideoTaskResponse {
  id: string;
  video_id?: string;
  status?: string;
}

interface VideoStatusResponse {
  status: string;
  video_url?: string;
  url?: string;
  output?: string;
  error?: string;
}

export type VideoMode = 'text2video' | 'img2video' | 'multi2video';

export async function createVideoTask(
  mode: VideoMode,
  prompt: string,
  referenceImage?: string | null,
  multiImages?: string[]
): Promise<string> {
  // body 严格只传 OpenAI 标准字段，避免触发 LiteLLM UnsupportedParamsError
  const body: Record<string, unknown> = {
    model: VIDEO_MODEL,
    prompt,
  };

  if (mode === 'img2video' && referenceImage) {
    body.image = referenceImage;
  }

  if (mode === 'multi2video' && multiImages && multiImages.length > 0) {
    body.images = multiImages;
  }

  const response = await fetch(VIDEO_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`视频任务创建失败 (${response.status}): ${errorText}`);
  }

  const data: VideoTaskResponse = await response.json();
  const taskId = data.video_id || data.id;

  if (!taskId) {
    throw new Error('API 未返回任务 ID');
  }

  return taskId;
}

export async function pollVideoResult(
  videoId: string,
  onProgress?: (status: string) => void
): Promise<string> {
  const maxAttempts = 120; // 最多轮询 120 次，约 10 分钟
  const interval = 5000; // 5 秒一次

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    // 优先使用推荐方式查询
    const url = `https://apihub.agnes-ai.com/agnesapi?video_id=${encodeURIComponent(videoId)}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      // 降级到旧版接口
      const fallbackUrl = `https://apihub.agnes-ai.com/v1/videos/${encodeURIComponent(videoId)}`;
      const fallbackResponse = await fetch(fallbackUrl, { headers });
      if (!fallbackResponse.ok) continue;

      const fallbackData: VideoStatusResponse = await fallbackResponse.json();
      onProgress?.(fallbackData.status || 'processing');

      if (fallbackData.status === 'completed' || fallbackData.status === 'success') {
        const videoUrl = fallbackData.video_url || fallbackData.url || fallbackData.output;
        if (videoUrl) return videoUrl;
      }
      if (fallbackData.status === 'failed') {
        throw new Error(fallbackData.error || '视频生成失败');
      }
      continue;
    }

    const data: VideoStatusResponse = await response.json();
    onProgress?.(data.status || 'processing');

    if (data.status === 'completed' || data.status === 'success') {
      const videoUrl = data.video_url || data.url || data.output;
      if (videoUrl) return videoUrl;
    }

    if (data.status === 'failed') {
      throw new Error(data.error || '视频生成失败');
    }
  }

  throw new Error('视频生成超时，请稍后重试');
}

// ============ 聊天对话 ============

const CHAT_API_URL = 'https://apihub.agnes-ai.com/v1/chat/completions';
const CHAT_MODEL = 'agnes-2.0-flash';

// 发送给 API 的最大历史条数（保留最近 N 条，避免 context 爆炸导致响应变慢）
const MAX_HISTORY_MESSAGES = 20;

interface ChatCompletionDelta {
  content?: string;
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: ChatCompletionDelta;
    finish_reason?: string;
  }>;
}

/**
 * rAF 节流 onChunk：把 16ms 内的多次 token 合并成一次 setState。
 * 一次回答 200+ token：原版 200+ 次 setState → 节流后 ≤ 60 次/秒。
 */
function makeThrottledChunk(fn: (text: string) => void): (text: string) => void {
  let pending = '';
  let scheduled = false;
  return (text: string) => {
    pending = text;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      fn(pending);
      scheduled = false;
    });
  };
}

export async function sendChatMessage(
  messages: ChatMessage[],
  chatImage?: string | null,
  onChunk?: (text: string) => void
): Promise<string> {
  // 截断历史：只发最近 N 条 + 当前 user（带图）一起发
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);

  // 构建请求消息
  const apiMessages: Array<Record<string, unknown>> = [];

  for (const msg of recent) {
    const content: Array<Record<string, unknown>> = [];

    if (
      msg.role === 'user' &&
      msg === recent[recent.length - 1] &&
      chatImage
    ) {
      // 最后一条用户消息附带图片
      content.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${chatImage}` },
      });
    }

    content.push({ type: 'text', text: msg.content });

    apiMessages.push({ role: msg.role, content });
  }

  const throttledChunk = onChunk ? makeThrottledChunk(onChunk) : undefined;

  const response = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: apiMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`聊天请求失败 (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const chunk: ChatCompletionChunk = JSON.parse(data);
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          throttledChunk?.(fullContent);
        }
      } catch {
        // 忽略解析错误
      }
    }
  }

  // 流结束后 flush：确保最后一次 setState 把最终内容同步到 React
  // （处理最后一个 token 落在节流窗口内、rAF 未触发的情况）
  if (throttledChunk) {
    throttledChunk(fullContent);
  }

  return fullContent;
}
