# 智能体工作指导

本文件用于指导后续智能体在本项目中实现 Web 流程图工具。开始任何代码改动前，必须先阅读根目录的 `架构设计.md`，并以该文档为最高优先级的产品与架构依据。

## 1. 项目定位

这是一个基于 Vite + Vue 3 + TypeScript 的 Web 流程图编辑器。

核心目标：

- 左侧元素列表支持拖拽元素。
- 中间画布支持创建、选中、拖动、删除元素。
- 元素自带端口，不同元素端口之间支持连线。
- 右侧属性面板展示并编辑选中节点、容器或连线属性。
- 流程图核心逻辑必须尽量框架无关，Vue 只作为 UI 适配层。

## 2. 架构硬约束

必须遵守以下边界：

- `src/core/flow` 是纯 TypeScript 编辑器内核，不得依赖 Vue、Vue reactivity、Vue Router、DOM 组件或业务页面状态。
- Vue 组件只负责页面布局、Canvas DOM 挂载、属性面板、按钮、拖拽入口和生命周期适配。
- 流程图业务状态由 `SceneManager` 管理，Vue 通过快照订阅读取状态，不直接修改核心 class 实例。
- 持久化数据必须使用可序列化 DTO，不能直接保存 class 实例。
- 节点模型和节点绘制分离：`BaseNode` 负责模型和普通逻辑，`BaseNodeView` 负责 Canvas 绘制和视觉命中。
- 容器模型和容器绘制分离：`Box` 负责层级和子元素管理，`BaseBoxView` 负责容器绘制和视觉命中。
- 连线由 `EdgeLayer` 独立管理，不挂在某个 `Box` 下。
- `SceneManager` 不直接维护扁平节点集合，应通过 `rootBox` 管理节点和容器层级。
- Canvas 使用双层设计：`backgroundCanvas` 画背景网格，`mainCanvas` 画容器、节点、端口、连线和交互态。
- 事件只绑定在 `mainCanvas`，坐标转换统一以 `mainCanvas` 为准。

禁止事项：

- 不要引入流程图/图编辑器库替代核心实现。
- 不要把核心逻辑写进 Vue SFC。
- 不要让 Vue 深度响应式代理 `SceneManager`、`BaseNode`、`BaseEdge`、`Box` 等 class 实例。
- 不要让 `BaseNode` 直接依赖 Canvas 或实现 `draw()`。
- 不要在 `CanvasRenderer` 中堆大量 `if node.type === ...` 的绘制分支，应委托给对应 View。
- 不要把 hover、selected、dragging 等交互态写进持久化 DTO。

## 3. 推荐目录边界

核心代码放在：

```text
src/core/flow/
```

Vue 适配和页面组件放在：

```text
src/features/flow-editor/
```

推荐结构以 `架构设计.md` 为准。新增文件时优先放入已有责任目录，不要为了单个小功能新建模糊目录。

## 4. 核心类职责

实现时保持职责单一：

- `FlowEditorCore`：编辑器门面，连接 Canvas 图层、`SceneManager`、`CanvasRenderer`、`InteractionController`。
- `SceneManager`：管理 `rootBox`、`edgeLayer`、选中态、hover 态、视口、命令执行和事件通知。
- `Box` / `RootBox`：管理节点和容器层级、边界计算、批量移动、序列化。
- `EdgeLayer`：管理所有连线，处理按节点删除相关连线。
- `BaseNode`：节点数据访问、端口、移动、业务规则、属性更新、序列化。
- `BaseNodeView`：节点绘制、端口视觉位置、节点命中、端口命中。
- `BaseBoxView`：容器背景、边框、标题、容器命中。
- `BaseEdge`：连线端点、连接规则、序列化。
- `BaseEdgeView`：连线绘制和视觉命中。
- `ElementRegistry`：注册并创建节点、容器、连线及对应 View。
- `CanvasLayerManager`：管理双 Canvas 的尺寸、像素比、上下文和清屏。
- `CanvasRenderer`：按顺序调用各类 View 绘制，不修改场景状态。
- `InteractionController`：把 pointer、drag、keyboard 事件转换为场景命令。
- `CoordinateTransformer`：处理 client、canvas、world 坐标转换。

## 5. 状态归属规则

业务状态放模型：

- 节点名称、类型、尺寸、位置、端口、业务属性。
- 审批状态、运行状态、校验错误、禁用状态等业务语义。

交互状态放场景或交互控制器：

- selected、hovered、dragging、connecting。
- 临时连线、框选范围、当前工具模式。

绘制状态通过 `NodeDrawContext` / `BoxDrawContext` / `EdgeDrawContext` 传入 View：

- theme。
- viewport。
- selected / hovered / dragging / connecting 等组合结果。

导出数据中不保存交互态。

## 6. 实现顺序

若用户没有指定具体任务，优先按以下顺序推进：

1. 建立 `src/core/flow` 和 `src/features/flow-editor` 目录。
2. 定义 DTO 类型、命令类型、事件类型、视口类型。
3. 实现 `Box`、`RootBox`、`EdgeLayer`。
4. 实现 `BaseNode`、`BaseNodeView`、基础节点和基础节点 View。
5. 实现 `BaseEdge`、`BaseEdgeView`、基础连线。
6. 实现 `ElementRegistry`。
7. 实现 `SceneManager` 的添加、移动、删除、选择、快照订阅、导入导出。
8. 实现 `CanvasLayerManager` 和双 Canvas 尺寸同步。
9. 实现 `CanvasRenderer.renderBackground()` 和 `CanvasRenderer.renderMain()`。
10. 实现 `FlowEditorCore`。
11. 实现 Vue 三栏布局和 `useFlowEditorCore` 适配。
12. 实现拖拽创建节点。
13. 实现命中测试、选中、拖动、删除。
14. 实现端口绘制、端口命中、连线创建。
15. 实现属性面板编辑。

每一步都应保持可运行、可验证，不要一次提交大量未接通的抽象。

## 7. Vue 编码规则

Vue 文件使用 Vue 3 Composition API：

- 使用 `<script setup lang="ts">`。
- 根组件和页面组件保持薄层，只做组合和布局。
- 复杂逻辑放到 `src/core/flow`，Vue composable 只做生命周期适配。
- Props down / events up，避免子组件直接修改父组件状态。
- Canvas DOM ref 可以交给 `useFlowEditorCore` 创建和销毁核心实例。
- 不要在模板里做复杂计算，派生数据放在 script 中。

Vue 侧允许使用 `shallowRef` 持有核心实例和快照引用，但不要 `reactive()` 包裹核心 class。

## 8. Canvas 规则

双 Canvas 结构：

```text
backgroundCanvas：背景色、网格线、静态参考线
mainCanvas：容器、连线、节点、端口、hover、selected、临时连线、框选
```

要求：

- 两张 Canvas 必须共享同一个 CSS 尺寸、实际像素尺寸、`devicePixelRatio` 和 viewport。
- `backgroundCanvas` 设置 `pointer-events: none`。
- `mainCanvas` 接收 pointer、drag、keyboard 相关事件。
- 背景层只在尺寸、主题、viewport 变化时重绘。
- 主层在场景数据或交互状态变化时重绘。
- 绘制函数不得修改 `SceneManager` 状态。
- 编辑模式下端口只在所属节点悬浮、选中或正在连线时显示；普通命中只检测当前可见端口，连线模式检测全部端口。
- Preview 模式默认隐藏端口；显式启用 `showPorts` 时绘制全部端口，不依赖编辑器 hover 状态。

## 9. 命中测试规则

命中优先级：

1. 端口。
2. 节点。
3. 容器。
4. 连线。
5. 空白画布。

节点和端口命中委托给 `BaseNodeView`。容器命中委托给 `BaseBoxView`。连线命中委托给 `BaseEdgeView` 或几何工具函数。

容器命中应从深层到浅层检测，避免点击 group 内节点时先命中外层 group。

## 10. 数据与序列化规则

`FlowDocument` 使用纯数据：

```ts
interface FlowDocument {
  root: BoxData
  edges: FlowEdge[]
  viewport?: ViewportData
}
```

规则：

- `root` 保存容器和节点层级。
- `edges` 保存独立连线层。
- 导出时不保存 selection、hover、dragging、connecting。
- 导入时通过 `ElementRegistry` 重建运行时 class 实例。
- 节点、容器、端口、连线 ID 必须稳定。

## 11. 验证要求

完成代码改动后，优先运行：

```bash
pnpm run build
```

如果新增了可测试的纯 TS 函数或类，优先补充单元测试；当前项目没有测试框架时，至少保证构建通过。

前端交互类任务应手动确认：

- 页面能启动。
- 双 Canvas 尺寸正确。
- 拖拽创建节点正常。
- 节点拖动不会导致背景频繁重绘。
- 选中、hover、删除、连线行为符合预期。

## 12. 修改文档规则

如果实现时发现架构需要调整，先更新 `架构设计.md`，再改代码。不要让代码和架构文档长期不一致。

新增重要约束时，也同步更新本文件，保证后续智能体能继续按同一套规则工作。

## 13. 待办清单维护规则

根目录 `TODO.md` 记录了本项目已实现和待实现的功能清单。

完成任意功能后，必须检查 `TODO.md` 是否存在对应事项：

- 如果存在对应未完成事项，需要将该事项从 `[ ]` 更新为 `[x]`。
- 如果实现的功能不在清单中，但属于重要编辑器能力，应追加到 `TODO.md` 并标记为 `[x]`。
- 如果新增了明确的后续功能拆分，也应补充到 `TODO.md` 的待实现部分。
- 更新清单时只改与本次功能相关的条目，不要重排无关事项。

## 14. Monorepo 目标边界

项目目标形态采用 pnpm workspace：

- `packages/flow-core`：同构场景与渲染核心，不依赖 Vue、DOM、Node.js 文件系统或具体 Canvas 实现。
- `apps/web`：Vue 浏览器编辑器，负责 `HTMLCanvasElement`、浏览器事件、DOM 生命周期和页面展示。
- `packages/flow-node-renderer`：Node.js 图片渲染适配，负责 Canvas 创建、字体注册、图层合成和图片编码。

依赖只能从 `web`、`flow-node-renderer` 指向 `flow-core`，不得反向依赖。Node Canvas 原生依赖只能声明在 `flow-node-renderer` 中，不得进入 `flow-core` 或 `web`。

拆包时必须保持每一步可构建；GitHub Pages 只构建 `@w-process/web` 及其依赖并上传 `apps/web/dist`，通用 CI 另行验证全部 workspace 包。

库包构建约束：

- `flow-core` 使用 tsdown 输出 neutral、纯 ESM JavaScript 和声明文件。
- `flow-node-renderer` 使用 tsdown 输出 Node.js、纯 ESM JavaScript 和声明文件，`@napi-rs/canvas` 必须保持 external。
- 两个库包都必须独立运行 `tsc --noEmit`；tsdown 构建不能替代类型检查。
- Node 原生 TypeScript 只用于内部辅助脚本，正式包入口必须指向构建后的 JavaScript，不直接发布 `.ts` 源码。
- Node CLI 命令统一为 `w-process-render <scene.json>`，正式入口指向 `flow-node-renderer/dist/cli.mjs`。
- `renderFlowImage()` 保持无文件系统副作用；CLI 层单独负责读取 JSON、写入 PNG、错误输出和退出码。
- Node 渲染首版只支持 PNG，并且必须在创建原生 Canvas 前校验最大宽高和最大物理像素数。
- Node renderer 默认注册 OFL-1.1 授权的 Noto Sans SC 完整 TTF；新增字体只能进入 Node 适配包，不能进入 `flow-core`。

## 15. Skill 同步维护规则

项目内的 `skills/w-process-diagram` 是 w-process 功能面向智能体的使用契约。对编辑器、`flow-core`、Node renderer、CLI 或场景数据能力的任何功能修改，都必须在同一任务中检查并同步更新该 Skill；未完成 Skill 同步时，不得将功能任务视为完成。

同步时至少检查：

- `skills/w-process-diagram/SKILL.md`：触发范围、执行流程、CLI 调用方式、渲染选项和失败处理是否仍然准确。
- `skills/w-process-diagram/references/flow-document.md`：DTO 字段、序列化规则、校验约束和连线引用方式是否变化。
- `skills/w-process-diagram/references/elements.md`：节点、容器、端口、默认尺寸、注册类型和连接规则是否变化。
- `skills/w-process-diagram/references/layout.md`：布局、间距、容器内容区和视觉检查规则是否变化。
- `skills/w-process-diagram/assets/templates/`：现有模板是否仍能覆盖并正确演示修改后的能力；新增重要图形能力时必须增加或调整对应模板。
- `skills/w-process-diagram/agents/openai.yaml`：Skill 的展示名称、描述和默认提示是否与能力范围一致。

典型同步要求：

- 新增或修改节点、容器、端口、默认尺寸时，同步更新元素目录和受影响模板。
- 修改 `FlowDocument`、导入导出或运行时校验规则时，同步更新数据约定和全部受影响模板。
- 修改布局、连线路由、文字渲染或容器边界规则时，同步更新布局说明并重新检查生成图片。
- 修改 CLI 命令、参数、默认值、输出格式或错误码时，同步更新 `SKILL.md` 的调用与失败处理说明。
- 新增 Skill 可表达的重要图形类别时，同步更新 frontmatter 触发描述、图形选择规则和模板。

完成同步后必须运行 Skill 校验，并使用当前 Node CLI 渲染所有受影响模板。涉及视觉变化时，还必须查看生成图片，确认文字、节点、容器和连线正常。Skill 源码只在项目内维护，智能体不得擅自安装到用户的全局 Skill 目录。
