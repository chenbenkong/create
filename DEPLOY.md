# Cloudflare Pages 部署指南

## 架构

```
┌─────────────────────────────────────────┐
│  Cloudflare Pages                       │
│  ┌───────────────────────────────────┐  │
│  │ 静态资源（dist/）                  │  │
│  │  - HTML / CSS / JS                 │  │
│  │  - 字体（WOFF2）                   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Pages Functions                   │  │
│  │  - /api/agnes/*     API 反向代理   │  │
│  │    （注入密钥，防盗用，限流）       │  │
│  │  - /api/__download  下载代理       │  │
│  │  - _middleware      SPA fallback   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │
              │ 服务端请求
              ▼
┌─────────────────────────────────────────┐
│  Agnes AI API（apihub.agnes-ai.com）     │
│  - 图像 / 视频 / 对话                     │
└─────────────────────────────────────────┘
```

**安全特性**：API key 只存在 CF Pages 环境变量，**前端 bundle 不含密钥**。

## 一次性准备

### 1. 安装 wrangler（已登录过可跳过）

```bash
npm install -g wrangler
wrangler login
```

### 2. 在 Cloudflare 控制台创建 Pages 项目

1. 打开 https://dash.cloudflare.com → Workers & Pages → Create application → Pages → Connect to Git
2. 选你的 GitHub 仓库
3. Build settings：
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: （留空）
4. **环境变量**（必须配置，API 反代用）：
   - `AGNES_API_KEY` = `sk-8fRJIZOlfLqL7G6MjKrJkjU2LRQFs6qrr1x9uSk2N9WnvzbX`
   - `ALLOWED_ORIGIN` = `*` （或你的域名，如 `https://skill-studio.pages.dev,https://yourdomain.com`）

   在 Pages 项目 → Settings → Environment variables → Production 添加。
   密钥只存在服务端，前端 bundle 不含。

## 部署方式

### 方式 A：Git 推送自动部署（推荐）

```bash
git add .
git commit -m "feat: cloudflare pages 部署适配"
git push origin main
```

CF Pages 会自动检测 push，触发构建，1-2 分钟后发布到 `https://<project-name>.pages.dev`。

### 方式 B：wrangler 直接部署

```bash
npm run build
wrangler pages deploy dist --project-name=skill-studio
```

首次会要求确认 project。

## 验证

部署完成后测试三个点：

1. **首页**：`https://<project>.pages.dev/` → 应返回 React SPA
2. **路由 fallback**：访问 `https://<project>.pages.dev/archive` → 应加载 SPA（不是 404）
3. **下载代理**：打开浏览器 DevTools → Network → 点下载 → 应看到 `/api/__download?url=...` 请求 200

## 关键文件

| 文件 | 作用 |
|------|------|
| `functions/api/agnes/[[path]].ts` | **Agnes API 反向代理**（catch-all，注入密钥 + 限流） |
| `functions/api/__download.ts` | 下载代理（解决跨域 <a download> 问题） |
| `functions/_middleware.ts` | SPA fallback（`/archive` 等路由） |
| `src/utils/api.ts` | 客户端调用 `/api/agnes/*`（同源，不再带密钥） |
| `src/utils/download.ts` | 客户端下载调用 `/api/__download` |
| `vite.config.ts` | dev 注入下载代理（prod 不注入） |
| `.pages.toml` | Pages 配置（output dir + compat） |

## 注意事项

- **API key 在 CF Pages 环境变量**，前端 bundle 完全不含密钥（F12 看不到）
- **简易限流**：每个 IP 每分钟 60 次请求（够个人/小团队用）
- **CORS 透传**：所有 `/api/agnes/*` 响应都带 CORS 头，可被其他域名调用
- **生产严格限流**：建议后续用 Durable Object（按 token 限流）替换当前内存限流
- CF Pages Functions 免费额度：**每天 10 万次请求** + 10ms CPU/request
- 视频/图片走 `/api/__download` 中转会消耗 CF 流量（慷慨配额，个人项目够用）
- **本地 dev 限制**：`npm run dev` 时 `/api/agnes/*` 会 404（无本地反代）。临时调试可改 `src/utils/api.ts` 第 16 行 `BASE_URL = 'https://apihub.agnes-ai.com'`，但**记得发布前改回来**。

## 回滚

CF Pages 控制台 → Deployments → 选历史版本 → Rollback。

## 域名绑定

CF Pages → Custom domains → 添加 `yourdomain.com` → 按提示改 DNS。
