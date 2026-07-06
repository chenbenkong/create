import type { Mode, ImageSize, ChatMessage } from '@/store/useStore';

/**
 * 部署到 Cloudflare Pages 后，所有 Agnes API 请求都走同源反向代理：
 *   /api/agnes/*  →  functions/api/agnes/[[path]].ts
 *                    →  https://apihub.agnes-ai.com/*
 *
 * 优点：
 *   - API key 不在前端 bundle（安全）
 *   - 避开浏览器 CORS 限制
 *   - 支持流式响应透传
 *
 * 本地 dev（无 CF 反代）会直接打 404；如需本地调试，把 BASE_URL 改回
 *   'https://apihub.agnes-ai.com' 即可。
 */
const BASE_URL = '/api/agnes';

// 客户端不再持有 API key（key 在 CF Pages Function 环境变量中注入）
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};

// ============ 图片生成 ============

const IMAGE_API_URL = `${BASE_URL}/v1/images/generations`;
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

const VIDEO_API_URL = `${BASE_URL}/v1/videos`;
const VIDEO_MODEL = 'agnes-video-v2.0';

interface VideoTaskResponse {
  id: string;
  task_id?: string;
  video_id?: string;
  status?: string;
}

interface VideoStatusResponse {
  status: string;
  progress?: number;
  video_url?: string;
  url?: string;
  output?: string;
  error?: string;
  remixed_from_video_id?: string;
}

export type VideoMode = 'text2video' | 'img2video' | 'multi2video';

const fetchWithTimeout = (url: string, opts: RequestInit, timeoutMs: number) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
};

export async function createVideoTask(
  mode: VideoMode,
  prompt: string,
  referenceImage?: string | null,
  multiImages?: string[],
  resolution?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    model: VIDEO_MODEL,
    prompt,
  };

  if (resolution) {
    // 预留：未来 API 支持 resolution 时直接传
  }

  if (mode === 'img2video' && referenceImage) {
    body.image = referenceImage;
  }

  if (mode === 'multi2video' && multiImages && multiImages.length > 0) {
    body.images = multiImages;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchWithTimeout(VIDEO_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }, 30000);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');

        if (response.status === 429) {
          throw new Error('视频生成请求过于频繁，请等待 1 分钟后重试');
        }

        if (response.status >= 500 && attempt === 0) {
          lastError = new Error(`上游服务暂不可用 (${response.status})，请稍后重试`);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        throw new Error(`视频任务创建失败 (${response.status}): ${errorText}`);
      }

      const data: VideoTaskResponse = await response.json();
      const taskId = data.task_id || data.id;

      if (!taskId) {
        throw new Error('API 未返回任务 ID');
      }

      return taskId;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('上游响应超时（30s 无响应），请稍后重试');
      }
      if (e instanceof Error && (e.message.includes('频繁') || e.message.includes('超时'))) {
        throw e;
      }
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError || new Error('视频任务创建失败');
}

export async function pollVideoResult(
  taskId: string,
  onProgress?: (status: string, progress?: number) => void
): Promise<string> {
  const maxAttempts = 100;
  const interval = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    // 主查询：/v1/videos/{task_id}
    const url = `${BASE_URL}/v1/videos/${encodeURIComponent(taskId)}`;
    let response: Response;
    try {
      response = await fetchWithTimeout(url, { headers }, 15000);
    } catch {
      continue;
    }

    if (!response.ok) {
      // 降级到 /agnesapi?video_id=
      try {
        const fallbackUrl = `${BASE_URL}/agnesapi?video_id=${encodeURIComponent(taskId)}`;
        const fallbackResponse = await fetchWithTimeout(fallbackUrl, { headers }, 15000);
        if (!fallbackResponse.ok) continue;

        const fallbackData: VideoStatusResponse = await fallbackResponse.json();
        onProgress?.(fallbackData.status || 'processing', fallbackData.progress);

        if (fallbackData.status === 'completed' || fallbackData.status === 'success') {
          const videoUrl = fallbackData.video_url || fallbackData.url || fallbackData.output || fallbackData.remixed_from_video_id;
          if (videoUrl) return videoUrl;
        }
        if (fallbackData.status === 'failed') {
          throw new Error(fallbackData.error || '视频生成失败');
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('视频生成失败')) throw e;
      }
      continue;
    }

    const data: VideoStatusResponse = await response.json();
    onProgress?.(data.status || 'processing', data.progress);

    if (data.status === 'completed' || data.status === 'success') {
      const videoUrl = data.remixed_from_video_id || data.video_url || data.url || data.output;
      if (videoUrl) return videoUrl;
    }

    if (data.status === 'failed') {
      throw new Error(data.error || '视频生成失败');
    }
  }

  throw new Error('视频生成超时，请稍后重试');
}

// ============ 聊天对话 ============

const CHAT_API_URL = `${BASE_URL}/v1/chat/completions`;

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
  onChunk?: (text: string) => void,
  options?: {
    model?: string;
    systemPrompt?: string;
  }
): Promise<string> {
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  const apiMessages: Array<Record<string, unknown>> = [];

  const systemPrompt = options?.systemPrompt?.trim();
  if (systemPrompt) {
    apiMessages.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of recent) {
    const content: Array<Record<string, unknown>> = [];

    if (
      msg.role === 'user' &&
      msg === recent[recent.length - 1] &&
      chatImage
    ) {
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
      model: options?.model || 'agnes-2.0-flash',
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

  if (throttledChunk) {
    throttledChunk(fullContent);
  }

  return fullContent;
}
