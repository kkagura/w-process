# w-process

基于 Vue 3、TypeScript 与 Canvas 的 Web 流程图编辑器。项目使用 pnpm workspace 管理：

- `apps/web`：浏览器编辑器、Vue UI 与浏览器事件适配。
- `packages/flow-core`：场景模型、命令、布局、路由与 Canvas 绘制核心。

Node.js 图片渲染工具位于 `packages/flow-node-renderer`，正式支持 Node.js 22.18 及以上版本。

## 开发

```bash
pnpm install
pnpm dev
```

## 验证与构建

```bash
pnpm typecheck
pnpm build
```

只构建 Web 应用及其依赖：

```bash
pnpm build:web
```

## Node.js 场景渲染

先构建 Node 渲染器及其核心依赖：

```bash
pnpm build:node
```

从场景 JSON 生成 PNG：

```bash
pnpm render ./scene.json
pnpm render ./scene.json --output ./scene.png --padding 40 --pixel-ratio 2
```

默认输出到 JSON 同目录，使用同名 `.png` 文件；文件已存在时需要添加 `--force`。渲染默认使用 `preview` 模式，隐藏网格、端口和编辑交互状态。

常用参数：

```text
-o, --output <path>       输出路径
    --padding <number>    内容边距
    --pixel-ratio <n>     像素倍率
    --background <color>  背景色或 transparent
    --show-grid           显示网格
    --show-ports          显示端口
    --font <path>         追加注册字体，可重复传入
-f, --force               覆盖已有图片
```

发布或链接该 workspace 包后，也可以直接使用 `w-process-render <scene.json>`。程序化调用：

```ts
import { renderFlowImage } from '@w-process/flow-node-renderer'

const png = await renderFlowImage(document, {
  padding: 40,
  pixelRatio: 2,
})
```

Node 渲染器默认注册 OFL-1.1 授权的 Noto Sans SC 400、600、700 字重，保证中文文本可以稳定绘制。
