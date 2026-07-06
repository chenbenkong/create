// POST /api/agnes/v1/videos
// 文件路径 functions/api/agnes/v1/videos/index.ts → 路由到 /api/agnes/v1/videos

import { proxy, preflight, type Env } from '../proxy';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  return proxy(request, env, '/v1/videos');
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return preflight(request, env);
};
