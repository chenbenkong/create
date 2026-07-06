/**
 * Cloudflare Pages Function: Agnes API 反向代理
 *
 * 端点（catch-all）: /api/agnes/*
 *   客户端调用:  /api/agnes/v1/images/generations
 *   实际转发到:  https://apihub.agnes-ai.com/v1/images/generations
 *
 * 作用：
 *   1. API key 不再出现在前端 bundle（从环境变量 AGNES_API_KEY 注入）
 *   2. 同源调用，避开浏览器 CORS 限制
 *   3. 支持流式响应（chat completions）
 *   4. 简单限流（防止 key 滥用）：按 IP 计数
 *
 * 环境变量（在 CF Pages 控制台配置）：
 *   AGNES_API_KEY   Agnes 平台的 API 密钥
 *   ALLOWED_ORIGIN  允许的来源（可选，多个用逗号分隔；留空则放行所有）
 *
 * 部署位置: functions/api/agnes/[[path]].ts（Pages catch-all 写法）
 */

interface Env {
  AGNES_API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

const UPSTREAM_BASE = 'https://apihub.agnes-ai.com';

// ========== 简易内存限流（每实例 1 分钟窗口）==========
// 注意：CF Pages Function 每个请求可能命中不同 isolate，仅作软限流。
// 生产严格限流建议用 Durable Object 或 KV。
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_PER_MIN = 60;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (record.count >= RATE_LIMIT_PER_MIN) return false;
  record.count += 1;
  return true;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function corsHeaders(origin: string | null, allowed: string): Headers {
  const h = new Headers();
  const allowOrigin = !allowed || allowed === '*'
    ? '*'
    : (allowed.split(',').map((s) => s.trim()).includes(origin || '') ? (origin || '*') : 'null');
  h.set('Access-Control-Allow-Origin', allowOrigin);
  h.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  h.set('Access-Control-Max-Age', '86400');
  h.set('Vary', 'Origin');
  return h;
}

async function handleProxy(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // 0) 基础校验
  if (!env.AGNES_API_KEY) {
    return new Response(JSON.stringify({ error: 'Server misconfigured: missing API key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin, env.ALLOWED_ORIGIN || '');

  // 1) 限流
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded, please slow down' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(cors) },
    });
  }

  // 2) 拼接上游 URL
  // path 由 catch-all 注入：[...path]
  // request.url: /api/agnes/v1/images/generations
  // 提取 /v1/images/generations 作为上游路径
  const url = new URL(request.url);
  const upstreamPath = url.pathname.replace(/^\/api\/agnes/, '');
  const upstreamUrl = UPSTREAM_BASE + upstreamPath + url.search;

  // 3) 构造上游请求：剥掉 Host/Origin/Referer 等浏览器头，注入 Authorization
  const upstreamHeaders = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const lower = k.toLowerCase();
    if (
      lower === 'host' ||
      lower === 'origin' ||
      lower === 'referer' ||
      lower === 'authorization' || // 客户端不允许传自己的 key
      lower === 'cf-connecting-ip' ||
      lower === 'x-forwarded-for' ||
      lower === 'x-real-ip'
    ) {
      continue;
    }
    upstreamHeaders.set(k, v);
  }
  upstreamHeaders.set('Authorization', `Bearer ${env.AGNES_API_KEY}`);
  upstreamHeaders.set('Accept-Encoding', 'identity'); // 避免 CF 双层压缩

  // 4) 转发请求体（流式透传）
  const init: RequestInit = {
    method: request.method,
    headers: upstreamHeaders,
    redirect: 'follow',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return new Response(JSON.stringify({ error: `Upstream fetch failed: ${msg}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(cors) },
    });
  }

  // 5) 透传上游响应 + CORS
  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const [k, v] of cors.entries()) {
    responseHeaders.set(k, v);
  }
  // 禁用缓存（SSE/视频创建等不应被中间层缓存）
  responseHeaders.set('Cache-Control', 'no-store');

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

// Catch-all: 一个文件处理 /api/agnes 和 /api/agnes/* 任意深度
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS 预检
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN || '');
    return new Response(null, { status: 204, headers: cors });
  }

  return handleProxy(request, env, context);
};
