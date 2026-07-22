# @w-process/flow-node-renderer

w-process 的 Node.js PNG 渲染 API 和命令行工具，支持读取 `FlowDocument` 场景 JSON、注册中文字体，并使用 preview 模式生成图片。要求 Node.js 22.18 或更高版本。

## 全局安装 CLI

```bash
npm install --global @w-process/flow-node-renderer@0.0.1
w-process-render --help
w-process-render ./scene.json --output ./scene.png
```

常用参数：

```text
-o, --output <path>       输出 PNG 路径
    --padding <number>    内容边距
    --pixel-ratio <n>     像素倍率
    --background <color>  背景色或 transparent
    --show-grid           显示网格
    --show-ports          显示端口
    --font <path>         注册字体，可重复传入
-f, --force               覆盖已有图片
```

## 程序化调用

```bash
npm install @w-process/flow-node-renderer@0.0.1
```

```ts
import { renderFlowImage } from '@w-process/flow-node-renderer'

const png = await renderFlowImage(document, {
  padding: 40,
  pixelRatio: 2,
})
```

`renderFlowImage()` 返回 PNG `Buffer`，不会读写文件。项目仓库与场景格式说明见 [w-process](https://github.com/kkagura/w-process)。
