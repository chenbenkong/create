// GET /api/agnes/v1/videos/[id]
// 文件路径 functions/api/agnes/v1/videos/[id].ts → 路由到 /api/agnes/v1/videos/{任意 id}

import { proxy, preflight, type Env } from '../proxy';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = (params as Record<string, string>)?.id || '';
  return proxy(request, env, `/v1/videos/${encodeURIComponent(id)}`);
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return preflight(request, env);
};
