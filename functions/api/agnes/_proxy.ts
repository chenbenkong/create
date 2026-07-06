/**
 * Cloudflare Pages Function: 共享代理逻辑
 *
 * 文件路径对应 URL 路径（CF Pages Functions 路由规则）：
 *   /functions/api/agnes/v1/images/generations.ts → /api/agnes/v1/images/generations
 *   /functions/api/agnes/v1/videos/[id].ts         → /api/agnes/v1/videos/{id}
 *
 * 每个端点文件 import 本 helper，复用 proxy + preflight。
 */

export interface Env {
  AGNES_API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

const UPSTREAM_BASE = 'https://apihub.agnes-ai.com';

// 简易内存限流
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

export function preflight(request: Request, env: Env): Response {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin, env.ALLOWED_ORIGIN || '');
  return new Response(null, { status: 204, headers: cors });
}

/**
 * 核心转发
 * @param request   原始请求
 * @param env       环境变量
 * @param upstreamPath  上游路径（必须以 / 开头，如 "/v1/chat/completions"）
 */
export async function proxy(
  request: Request,
  env: Env,
  upstreamPath: string
): Promise<Response> {
  if (!env.AGNES_API_KEY) {
    return new Response(JSON.stringify({ error: 'Server misconfigured: missing API key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin, env.ALLOWED_ORIGIN || '');

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(cors) },
    });
  }

  const url = new URL(request.url);
  const upstreamUrl = UPSTREAM_BASE + upstreamPath + url.search;

  const upstreamHeaders = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const lower = k.toLowerCase();
    if (
      lower === 'host' ||
      lower === 'origin' ||
      lower === 'referer' ||
      lower === 'authorization' ||
      lower === 'cf-connecting-ip' ||
      lower === 'x-forwarded-for' ||
      lower === 'x-real-ip'
    ) {
      continue;
    }
    upstreamHeaders.set(k, v);
  }
  upstreamHeaders.set('Authorization', `Bearer ${env.AGNES_API_KEY}`);
  upstreamHeaders.set('Accept-Encoding', 'identity');

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

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const [k, v] of cors.entries()) {
    responseHeaders.set(k, v);
  }
  responseHeaders.set('Cache-Control', 'no-store');

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
