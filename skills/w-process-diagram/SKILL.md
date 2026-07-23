---
name: w-process-diagram
description: 根据自然语言描述创建并渲染 w-process 流程图、审批流程、泳道图和分层架构图。当用户说“使用 w-process 画图”“用 w-process 生成流程图”、要求生成 w-process 场景 JSON 或 PNG，或者希望把业务流程、审批流、泳道或受支持的架构关系渲染成图片时使用。不要用于照片、插画、统计图表或任意图片生成。
---

# W Process 绘图

将用户描述转换为合法的 w-process `FlowDocument`，使用 `w-process-render` 渲染，检查生成的 PNG，并交付可复现的场景 JSON 和最终图片。

## 工作流程

1. 判断需求属于基础流程、审批分支、泳道图还是分层架构图。可以安全推断常规细节；只有缺少角色或关系会实质性改变图意时才向用户确认。
2. 阅读 [references/flow-document.md](references/flow-document.md) 和 [references/elements.md](references/elements.md)。分配坐标前阅读 [references/layout.md](references/layout.md)。
3. 将 `assets/templates/` 中最接近的模板复制到用户工作区。不要直接修改 Skill 目录中的模板，也不要把生成结果写入 Skill 目录。
4. 替换所有业务标签、ID、节点、容器、端口和连线。保证每个 ID 唯一且稳定。只使用 `references/elements.md` 中已注册的元素类型和准确的端口规则。
5. 除非用户指定其他位置，否则将场景保存为最终图片旁边的 UTF-8 JSON。不要保存选中、悬停、拖动、连线中等编辑器交互状态。
6. 运行 `w-process-render --help` 确认命令可用。如果命令不可用，并且当前位于 w-process 源码仓库内，再检查仓库本地的 `packages/flow-node-renderer/dist/cli.mjs`。不要自行安装全局包；应提示用户手动运行 `npm install --global @w-process/flow-node-renderer@0.0.1 --registry https://registry.npmjs.org/`，或者让用户提供现有命令路径。
7. 使用新的输出路径渲染：

   ```bash
   w-process-render scene.json --output preview.png --padding 40 --pixel-ratio 2
   ```

   只有覆盖本次任务中生成的图片时才使用 `--force`。保留用户已有文件。
8. 使用可用的图片查看工具检查 PNG。检查文字、裁剪、重叠、容器边界、流程方向、分支标签和容易产生误解的连线路径。发现问题时修改 JSON 并重新渲染。
9. 返回 PNG 和场景 JSON 路径，并简要说明采用的业务假设。只有 CLI 成功退出且图片已经检查后，才能声明任务完成。

## 图形选择

- 线性流程使用 `basic-flow.json`。
- 判断、审批通过/拒绝或条件分支使用 `approval-flow.json`。
- 不同角色、团队、部门或系统分别负责不同步骤时使用 `swimlane-flow.json`。
- 表达当前支持的分层系统关系时使用 `architecture.json`。使用通用的 `icon-service` 和 `data` 节点；不要虚构尚未注册的数据库、队列、网关或外部系统类型。
- 需要突出单向流转或双向同步关系，并且箭头本身应作为可独立编辑图形时，参考 `arrow-elements.json`；普通节点关系仍使用 `FlowEdge`。

## 渲染选项

- 默认使用 `--padding 40 --pixel-ratio 2`，生成清晰的交付图片。
- 除非用户要求编辑器效果或诊断图片，否则不要使用 `--show-grid` 和 `--show-ports`。CLI 的 `--show-ports` 会在静态预览中显示全部节点端口，不采用 Web 编辑器的悬浮显示规则。
- 只有用户明确要求或图片需要用于合成时，才使用 `--background transparent`。
- 用户提供字体时使用 `--font <path>`；否则依赖渲染器内置的中文字体。

## 失败处理

- 将 `INVALID_DOCUMENT` 视为场景构造错误，修复 JSON，不要绕过校验。
- 将未知节点或容器类型视为尚不支持的能力。改用已注册且语义接近的类型，或者向用户说明限制。
- 输出文件已存在时，优先选择新文件名；只有文件由本次任务生成时才覆盖。
- 图形过大时，先缩小间距或像素倍率，不要直接删除内容。
- 不要为了通过渲染而悄悄删除用户要求的分支、参与者、系统或关系。
