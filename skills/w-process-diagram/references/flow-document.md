# FlowDocument 数据约定

创建或修复 w-process 场景 JSON 时阅读本文件。

## 顶层结构

```json
{
  "root": {
    "id": "root",
    "type": "root",
    "label": "根容器",
    "position": { "x": 0, "y": 0 },
    "size": { "width": 0, "height": 0 },
    "children": []
  },
  "edges": [],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

当前渲染器校验要求提供 `root`、`edges`、节点的 `ports` 和 `props`、容器的 `children`，以及位置、尺寸和旋转角度。`viewport` 可省略。所有坐标必须是有限数字，所有尺寸必须大于或等于零。

## 节点

```json
{
  "id": "task-review",
  "type": "task",
  "label": "审核申请",
  "position": { "x": 240, "y": 80 },
  "size": { "width": 160, "height": 72 },
  "rotation": 0,
  "ports": [
    {
      "id": "task-review-left",
      "nodeId": "task-review",
      "templateId": "left",
      "label": "左侧端口",
      "offset": { "x": 0, "y": 36 }
    }
  ],
  "props": {}
}
```

嵌套节点的位置仍然使用绝对世界坐标，不是相对于父容器的坐标。每个端口的 `nodeId` 必须等于所属节点 ID。端口偏移必须与节点尺寸和元素目录保持一致。

## 容器

```json
{
  "id": "layer-client",
  "type": "layer",
  "label": "客户端层",
  "position": { "x": 20, "y": 20 },
  "size": { "width": 760, "height": 180 },
  "children": [],
  "props": {}
}
```

带有 `children` 的对象会被解释为容器。当前运行时支持的容器类型是 `root`、`group`、`layer`、`swimlane` 和 `lane`。虽然 DTO 类型预留了 `subflow` 容器值，但默认注册表尚未实现这种容器；应改用 `subflow` 节点。

`lane` 必须是 `swimlane` 的直接子容器。属于泳道的节点必须放入对应 `lane.children`。`layer` 或 `group` 也通过 `children` 管理内部节点。

## 连线

```json
{
  "id": "edge-submit",
  "source": { "nodeId": "start", "portId": "start-right" },
  "target": { "nodeId": "task-review", "portId": "task-review-left" },
  "label": "提交",
  "props": {
    "route": { "type": "orthogonal" },
    "lineStyle": {
      "color": "#64748b",
      "width": 1.6,
      "dash": "solid",
      "arrowSize": 8
    }
  }
}
```

连线只保存在顶层 `edges` 数组中。`portId` 引用实际端口的 `id`，不是 `templateId`。每个端点引用的节点和端口都必须存在。优先使用 `orthogonal`；只有能明显改善可读性时才使用 `bezier`。连线标签可以省略。

## 样式覆盖

保持 `props` 为空即可使用注册元素的默认样式。只有用户要求特定样式时才覆盖。节点支持的主要属性包括 `textStyle`、`fillStyle` 和 `borderStyle`；连线支持 `route` 和 `lineStyle`。不要把编辑器交互状态写入 `props`。

## 完整性检查

- 为每个节点、容器、端口和连线使用唯一且非空的 ID。
- 只使用 `elements.md` 中已注册的类型。
- 保持节点尺寸和端口偏移一致。
- 保证嵌套元素位于所属容器的内容区域内。
- 连线只放在顶层，并保证所有端点有效。
- 除非确实需要旋转，否则使用 `rotation: 0`。
- 排除选中、悬停、拖动、连线中和临时连线状态。
