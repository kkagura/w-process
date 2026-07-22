# @w-process/flow-core

w-process 的框架无关流程图核心，提供场景模型、元素注册、布局、连线路由和 Canvas 渲染能力。该包不依赖 Vue、浏览器 DOM、Node.js 文件系统或具体 Canvas 实现。

```bash
npm install @w-process/flow-core@0.0.1
```

```ts
import { ElementRegistry, SceneManager } from '@w-process/flow-core'

const registry = ElementRegistry.createDefault()
const scene = new SceneManager(registry)
```

项目仓库与完整架构说明见 [w-process](https://github.com/kkagura/w-process)。
