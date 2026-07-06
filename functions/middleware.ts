/**
 * Cloudflare Pages Function: SPA fallback
 *
 * 作用：把非 /api/ 前缀的所有请求 fallback 到 /index.html，
 * 让 React Router 的 /archive /settings 等路由能正常处理。
 */

export const onRequest: PagesFunction = async (context) => {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // /api/* 走独立 functions，不 fallback
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  // 静态资源（带扩展名的）走默认流程
  if (/\.[a-zA-Z0-9]+$/.test(url.pathname)) {
    return next();
  }

  // 其他请求：fallback 到 /index.html（让 React Router 处理）
  return env.ASSETS.fetch(new URL('/index.html', url));
};
