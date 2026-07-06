import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import type { Plugin } from 'vite';

import { cloudflare } from "@cloudflare/vite-plugin";

/**
 * 下载代理（仅 dev server 注入）
 *
 * 问题：Agnes API 返回的图片/视频 URL 是跨域的（apihub.agnes-ai.com），
 *   浏览器在跨域时会忽略 <a download> 属性，变成页面导航（跳转到大图预览）。
 *
 * 开发环境：注入一个 /__download 中间件（Node fetch 后返回 blob）。
 * 生产环境（CF Pages）：由 functions/api/__download.ts 处理，dev 插件不再注入。
 */
function devDownloadProxyPlugin(): Plugin {
  return {
    name: 'dev-download-proxy',
    apply: 'serve', // 仅 dev server
    configureServer(server) {
      // 同时兼容 /__download（历史路径）和 /api/__download（生产路径）
      const handler = async (req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
        const fullUrl = req.url || '';
        const params = new URLSearchParams(fullUrl.split('?')[1] || '');
        const targetUrl = params.get('url');
        if (!targetUrl) {
          res.statusCode = 400;
          res.end('Missing url param');
          return;
        }
        try {
          const response = await fetch(targetUrl);
          if (!response.ok) {
            res.statusCode = response.status;
            res.end(`Remote error: ${response.status}`);
            return;
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType = response.headers.get('content-type') || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(buffer);
        } catch (err) {
          res.statusCode = 502;
          res.end(`Proxy error: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      };
      server.middlewares.use('/api/__download', handler);
      server.middlewares.use('/__download', handler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [react({
    babel: {
      plugins: [
        'react-dev-locator',
      ],
    },
  }), traeBadgePlugin({
    variant: 'dark',
    position: 'bottom-right',
    prodOnly: true,
    clickable: true,
    clickUrl: 'https://www.trae.ai/solo?showJoin=1',
    autoTheme: true,
    autoThemeTarget: '#root'
  }), tsconfigPaths(), devDownloadProxyPlugin(), cloudflare()],
})