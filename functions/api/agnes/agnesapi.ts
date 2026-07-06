// GET /api/agnes/agnesapi
// 文件路径 functions/api/agnes/agnesapi.ts → 路由到 /api/agnes/agnesapi
// （旧版视频查询降级端点）

import { proxy, preflight, type Env } from './proxy';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  return proxy(request, env, '/agnesapi');
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return preflight(request, env);
};
