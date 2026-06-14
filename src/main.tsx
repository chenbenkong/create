import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// 自托管字体（拉丁子集，Vite 编译时 woff2 打包进 dist assets，零网络依赖）
// 衬线：Playfair Display — 经典高对比度衬线（NYT 御用），笔画戏剧化，端点锐利（OFL 开源）
import '@fontsource/playfair-display/latin-400.css'
import '@fontsource/playfair-display/latin-400-italic.css'
import '@fontsource/playfair-display/latin-600.css'
import '@fontsource/playfair-display/latin-600-italic.css'
import '@fontsource/playfair-display/latin-800.css'
// 无衬线：Inter — 屏幕优化的现代黑体（OFL 开源）
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
// 等宽：JetBrains Mono — 屏幕等宽（OFL 开源）
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'

import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
