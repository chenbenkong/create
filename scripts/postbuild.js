/**
 * 构建后清理脚本
 *
 * 移除 vite-plugin-trae-solo-badge 在 dist 根写入的 wrangler.json
 * 防止 Cloudflare Pages 误识别为 Workers 项目（要求 pages_build_output_dir）
 */
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const filesToRemove = ['wrangler.json', 'wrangler.jsonc', '.assetsignore'];

let removed = 0;
for (const f of filesToRemove) {
  const p = join(distDir, f);
  if (existsSync(p)) {
    rmSync(p, { force: true });
    console.log(`[postbuild] removed ${f}`);
    removed++;
  }
}

if (removed === 0) {
  console.log('[postbuild] no wrangler artifacts to remove');
}
