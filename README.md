# w-process

基于 Vue 3、TypeScript 与 Canvas 的 Web 流程图编辑器。项目使用 pnpm workspace 管理：

- `apps/web`：浏览器编辑器、Vue UI 与浏览器事件适配。
- `packages/flow-core`：场景模型、命令、布局、路由与 Canvas 绘制核心。

当前第一版拆分不包含 Node.js 图片渲染包。

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
