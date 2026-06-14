## 1. 架构设计

```mermaid
flowchart LR
    "前端 React App" --> "Agnes Image API"
    subgraph "前端"
        "创作面板" --> "API 调用层"
        "结果展示" --> "API 调用层"
        "历史记录" --> "LocalStorage"
    end
    subgraph "外部服务"
        "Agnes Image API"
    end
```

## 2. 技术说明
- 前端：React@18 + Tailwind CSS@3 + Vite
- 初始化工具：Vite
- 后端：无（直接前端调用 API）
- 数据存储：LocalStorage（历史记录持久化）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 创作页面（文生图/图生图） |

## 4. API 定义

### 4.1 文生图接口
- **端点**：`POST https://apihub.agnes-ai.com/v1/images/generations`
- **Headers**：`Authorization: Bearer sk-8fRJIZOlfLqL7G6MjKrJkjU2LRQFs6qrr1x9uSk2N9WnvzbX`，`Content-Type: application/json`
- **请求体**：
```typescript
interface TextToImageRequest {
  model: "agnes-image-2.1-flash";
  prompt: string;
  n?: number;       // 默认 1
  size?: string;    // "1024x1024" | "1792x1024" | "1024x1792"
}
```
- **响应体**：
```typescript
interface ImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}
```

### 4.2 图生图接口
- **端点**：同上 `POST https://apihub.agnes-ai.com/v1/images/generations`
- **请求体**：
```typescript
interface ImageToImageRequest {
  model: "agnes-image-2.1-flash";
  prompt: string;
  image?: string;   // Base64 编码的参考图片
  n?: number;
  size?: string;
}
```

## 5. 数据模型

### 5.1 历史记录
```typescript
interface HistoryItem {
  id: string;
  prompt: string;
  mode: "text2img" | "img2img";
  size: string;
  imageUrl: string;
  createdAt: number;
}
```
存储于 LocalStorage，最多保留 50 条记录。
