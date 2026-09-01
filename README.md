# 创作站 · Atelier（create）

> 一个纸墨质感的 AI 创作工坊：文生图 / 图生图 / 文生视频 / 图生视频 / 多图生视频 / 对话，六种模式集成在一个浏览器页面里，作品自动进入本地作品库。

## 项目简介

创作站（页面标题为「创作工坊 · Atelier」）是一个纯前端的 AI 内容生成工作台。它把图像生成、视频生成和多模态对话收拢到同一套界面里，通过模式切换在六种创作方式之间无缝跳转，生成结果统一沉淀到「作品库」，支持缩略图预览、收藏、重命名与批量下载。

界面走的是**纸本 / 水墨**的克制审美：米白纸色底（`#ebe5d8`）、墨色文字、可开关的壁纸层，字体使用 Inter / Playfair Display / JetBrains Mono 三套自托管字体。整体是 SPA，用 React Router 管理 4 个页面，用 Zustand 管理创作状态与用户设置。

## 功能特性

### 六种创作模式

| 模式 | 说明 |
| --- | --- |
| `text2img` 文生图 | 输入提示词生成图片 |
| `img2img` 图生图 | 上传参考图 + 提示词做图像改写 |
| `text2video` 文生视频 | 纯文本描述生成视频 |
| `img2video` 图生视频 | 单张图 + 提示词驱动生成视频 |
| `multi2video` 多图生视频 | 上传多张参考图合成视频（`MultiImageUpload`） |
| `chat` 对话 | 多模态对话，支持带图提问 |

### 图像

- 尺寸档位：4K 超高清（1:1 / 16:9 / 9:16 / 3:4）与普通高清（1024×1024 / 1792×1024 / 1024×1792）
- 前端尺寸标识会翻译成 API 接受的 `WxH` 像素格式再发送（`resolveImageSize`）
- 生成中有独立的 `GenerationLoader` 动效反馈

### 视频

- 采用「创建任务 → 轮询结果」的异步流程（`createVideoTask` / `pollVideoResult`）
- 实时暴露进度百分比与状态文本（`queued` / `in_progress` / `completed` / `failed`）
- 可选默认分辨率 720p / 1080p

### 对话

- 侧边 `ChatPanel`，消息区分 user / assistant，支持附带图片
- 可在设置页切换对话模型与自定义系统提示词（设定 AI 的角色与行为）

### 作品库（Archive）

- 所有生成结果自动入库，持久化到 `localStorage`
- 为节省存储空间，卡片列表只存 200px JPEG 缩略图（`thumbnail.ts`），原图 URL 单独保存
- 支持收藏（`starred`）、自定义标题、图片/视频区分
- 独立的作品详情页 `/archive/:id`

### 下载

- 基于 **File System Access API** 选择本地下载目录，目录句柄存于 IndexedDB（`fileSystem.ts`、`file-system-access.d.ts`）
- 文件名格式可选：时间戳 / 提示词 / 自定义前缀
- 支持「生成完成后自动下载」
- Cloudflare 部署时可走 `functions/api/__download.ts` 代理，解决跨域 `<a download>` 失效问题

### 设置与无障碍

- 独立设置页 `/settings`，设置持久化在 `localStorage`（key: `atelier-settings`）
- 壁纸开关（`Wallpaper.tsx`）
- 「减弱动效」开关，开启后给 `body` 加 `reduce-motion` class，由 CSS 全局关闭动画

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | React 18 + React Router 7 |
| 语言 | TypeScript 5.8 |
| 构建 | Vite 6 + `@vitejs/plugin-react` + `vite-tsconfig-paths` |
| 样式 | Tailwind CSS 3 + PostCSS + Autoprefixer |
| 状态管理 | Zustand 5 |
| 图标 | lucide-react |
| 字体 | `@fontsource` 自托管 Inter / Playfair Display / JetBrains Mono |
| 工具库 | clsx + tailwind-merge |
| 代码规范 | ESLint 9 + typescript-eslint + react-hooks / react-refresh 插件 |
| 部署 | GitHub Pages（Actions）/ Cloudflare Pages（wrangler + Pages Functions） |

## 目录结构

```
create/
├── index.html                    # SPA 入口（标题「创作工坊 · Atelier」）
├── src/
│   ├── main.tsx                  # React 挂载入口
│   ├── App.tsx                   # 路由表：/ /archive /archive/:id /settings
│   ├── index.css                 # Tailwind 与全局样式（含 reduce-motion）
│   ├── pages/
│   │   ├── Home.tsx              # 创作主页面
│   │   ├── ArchivePage.tsx       # 作品库列表
│   │   ├── ArchiveDetailPage.tsx # 作品详情
│   │   └── SettingsPage.tsx      # 设置
│   ├── components/
│   │   ├── ModeSwitch.tsx        # 六种模式切换
│   │   ├── SizeSelector.tsx      # 尺寸选择
│   │   ├── ImageUpload.tsx       # 单图上传
│   │   ├── MultiImageUpload.tsx  # 多图上传
│   │   ├── ChatPanel.tsx         # 对话面板
│   │   ├── ResultDisplay.tsx     # 结果展示
│   │   ├── GenerationLoader.tsx  # 生成中动效
│   │   ├── Wallpaper.tsx         # 壁纸层
│   │   ├── Logo.tsx / Toast.tsx
│   ├── store/
│   │   ├── useStore.ts           # 创作主状态（模式/提示词/结果/作品库/对话）
│   │   └── useSettings.ts        # 用户设置（下载/图像/视频/对话/界面）
│   ├── utils/
│   │   ├── api.ts                # 图像 / 视频 / 对话 三类接口封装
│   │   ├── download.ts           # 下载逻辑
│   │   ├── fileSystem.ts         # File System Access API 封装
│   │   └── thumbnail.ts          # 缩略图生成
│   ├── lib/utils.ts              # clsx + tailwind-merge 的 cn helper
│   └── types/file-system-access.d.ts
├── functions/                    # Cloudflare Pages Functions
│   ├── _middleware.ts            # SPA fallback
│   └── api/__download.ts         # 下载代理
├── scripts/postbuild.js          # 构建后处理
├── public/favicon.svg
├── tailwind.config.js            # 纸色 / 墨色等自定义主题
├── vite.config.ts
├── wrangler.toml                 # Cloudflare Pages 配置
├── .env.example                  # CF 部署相关环境变量示例
├── DEPLOY.md                     # Cloudflare Pages 部署指南
└── .github/workflows/deploy.yml  # GitHub Pages 自动部署
```

## 本地运行

**前置要求：** Node.js 18+（CI 使用 Node 20）

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run check

# 代码检查
npm run lint

# 生产构建（tsc 项目构建 → vite build → postbuild 脚本）
npm run build

# 本地预览构建产物
npm run preview
```

### 部署到 Cloudflare Pages（可选）

仓库已带 `wrangler.toml`（`pages_build_output_dir = "dist"`）与 `functions/` 目录，可直接部署为 Pages + Functions：

```bash
npm install -g wrangler
wrangler login

npm run build
wrangler pages deploy dist --project-name=<你的项目名>
```

或在 Cloudflare 控制台绑定本仓库，Build command 填 `npm run build`，输出目录填 `dist`。更详细的步骤、限流说明与回滚方式见 [`DEPLOY.md`](./DEPLOY.md)。

## 在线演示

https://chenbenkong.github.io/create/

推送到 `main` 分支后，`.github/workflows/deploy.yml` 会执行 `npx vite build --base=./` 并发布到 GitHub Pages。

## 说明 / 备注

- **依赖第三方 AI 接口**：图像、视频、对话能力全部来自 Agnes AI 的 OpenAI 兼容接口（`/v1/images/generations`、`/v1/videos`、`/v1/chat/completions`）。接口不可用或额度耗尽时，页面的生成功能会失败，但界面与作品库仍可正常浏览。
- **⚠️ 密钥安全提醒**：当前 `src/utils/api.ts` 采用**直连模式**，API Key 以明文写在源码里，构建后会一并进入前端 bundle，任何访问者都能从浏览器取到。仓库里的 `functions/` 与 `DEPLOY.md` 保留了「Pages Functions 服务端反代 + 环境变量注入密钥」的方案（把 `BASE_URL` 改回 `/api/agnes` 并补齐 catch-all 代理即可切换）。**如需公开部署，请务必先改为服务端代理，并轮换掉已泄露的 Key。**
- **GitHub Pages 上无服务端**：Pages 是纯静态托管，`functions/` 不会生效，`/api/__download` 下载代理不可用，跨域资源的直接下载可能受限；需要完整能力请部署到 Cloudflare Pages。
- **本地开发注意**：`npm run dev` 下没有本地反向代理，若切换到 `/api/agnes/*` 模式会 404。
- **浏览器兼容**：自定义下载目录依赖 File System Access API，目前仅 Chromium 系浏览器（Chrome / Edge）支持；其他浏览器会退回普通下载。
- **本地存储限制**：作品库写在 `localStorage` 里，容量有限（通常几 MB），因此只存缩略图。清理浏览器数据会丢失作品库记录。
