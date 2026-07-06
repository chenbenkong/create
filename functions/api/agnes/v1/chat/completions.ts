// POST /api/agnes/v1/chat/completions

import { proxy, preflight, type Env } from '../_proxy';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  return proxy(request, env, '/v1/chat/completions');
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return preflight(request, env);
};
