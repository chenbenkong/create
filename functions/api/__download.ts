/**
 * Cloudflare Pages Function: 下载代理
 *
 * 端点: GET /api/__download?url=<encoded>
 *
 * 作用：解决 Agnes API 跨域 URL 导致 <a download> 被忽略的问题。
 * 浏览器 fetch 这个同源端点拿 blob，再触发原生下载。
 *
 * 部署位置: functions/api/__download.ts（Pages 自动识别）
 */

interface Env {
  // 预留：未来如果加鉴权/防盗链可放这里
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url param', { status: 400 });
  }

  // 安全：只允许代理 apihub.agnes-ai.com 域名的 URL
  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  if (!/^https?:\/\/apihub\.agnes-ai\.com$/.test(parsedTarget.origin)) {
    return new Response('Forbidden origin', { status: 403 });
  }

  try {
    const upstream = await fetch(parsedTarget.toString(), {
      cf: { cacheTtl: 3600, cacheEverything: true },
    });

    if (!upstream.ok) {
      return new Response(`Remote error: ${upstream.status}`, { status: upstream.status });
    }

    // 直接透传 body + content-type，加 CORS 头
    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=3600');

    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return new Response(`Proxy error: ${msg}`, { status: 502 });
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  // CORS 预检
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
};
