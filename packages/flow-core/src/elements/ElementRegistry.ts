import { BaseEdge } from './BaseEdge'
import { BaseNode } from './BaseNode'
import { ArrowNode } from './ArrowNode'
import { CircleNode } from './CircleNode'
import { DataNode } from './DataNode'
import { DecisionNode } from './DecisionNode'
import { DocumentNode } from './DocumentNode'
import { EndNode } from './EndNode'
import { IconNode } from './IconNode'
import { RectangleNode } from './RectangleNode'
import { StartNode } from './StartNode'
import { SubflowNode } from './SubflowNode'
import { TaskNode } from './TaskNode'
import { TriangleNode } from './TriangleNode'
import { Box } from '../scene/Box'
import { EdgeLayer } from '../scene/EdgeLayer'
import { RootBox } from '../scene/RootBox'
import { SwimlaneBox } from '../scene/SwimlaneBox'
import { LaneBox } from '../scene/LaneBox'
import { GroupBox } from '../scene/GroupBox'
import { ArchitectureLayerBox } from '../scene/ArchitectureLayerBox'
import type { BoxData, FlowEdge, FlowNode } from '../types/flow'
import { BaseBoxView } from '../views/BaseBoxView'
import { SwimlaneBoxView } from '../views/SwimlaneBoxView'
import { LaneBoxView } from '../views/LaneBoxView'
import { GroupBoxView } from '../views/GroupBoxView'
import { ArchitectureLayerBoxView } from '../views/ArchitectureLayerBoxView'
import { BaseEdgeView } from '../views/BaseEdgeView'
import { BaseNodeView } from '../views/BaseNodeView'
import { ArrowNodeView } from '../views/ArrowNodeView'
import { CircleNodeView } from '../views/CircleNodeView'
import { DataNodeView } from '../views/DataNodeView'
import { DecisionNodeView } from '../views/DecisionNodeView'
import { DocumentNodeView } from '../views/DocumentNodeView'
import { EndNodeView } from '../views/EndNodeView'
import { IconNodeView } from '../views/IconNodeView'
import { RectangleNodeView } from '../views/RectangleNodeView'
import { StartNodeView } from '../views/StartNodeView'
import { SubflowNodeView } from '../views/SubflowNodeView'
import { TaskNodeView } from '../views/TaskNodeView'
import { TriangleNodeView } from '../views/TriangleNodeView'

type NodeConstructor = new (data: FlowNode) => BaseNode
type NodeViewConstructor = new () => BaseNodeView
type BoxConstructor = new (data: BoxData) => Box
type BoxViewConstructor = new () => BaseBoxView

export class ElementRegistry {
  private nodeTypes = new Map<string, {
    node: NodeConstructor
    view: BaseNodeView
  }>()

  private boxTypes = new Map<string, {
    box: BoxConstructor
    view: BaseBoxView
  }>()
  private boxView = new BaseBoxView()
  private edgeView = new BaseEdgeView()

  static createDefault() {
    const registry = new ElementRegistry()
    registry.registerNode('start', {
      node: StartNode,
      view: StartNodeView,
    })
    registry.registerNode('task', {
      node: TaskNode,
      view: TaskNodeView,
    })
    registry.registerNode('decision', {
      node: DecisionNode,
      view: DecisionNodeView,
    })
    registry.registerNode('data', {
      node: DataNode,
      view: DataNodeView,
    })
    registry.registerNode('document', {
      node: DocumentNode,
      view: DocumentNodeView,
    })
    registry.registerNode('subflow', {
      node: SubflowNode,
      view: SubflowNodeView,
    })
    registry.registerNode('end', {
      node: EndNode,
      view: EndNodeView,
    })
    registry.registerNode('shape-circle', {
      node: CircleNode,
      view: CircleNodeView,
    })
    registry.registerNode('shape-rectangle', {
      node: RectangleNode,
      view: RectangleNodeView,
    })
    registry.registerNode('shape-triangle', {
      node: TriangleNode,
      view: TriangleNodeView,
    })
    registry.registerNode('shape-arrow-single', {
      node: ArrowNode,
      view: ArrowNodeView,
    })
    registry.registerNode('shape-arrow-double', {
      node: ArrowNode,
      view: ArrowNodeView,
    })
    registry.registerNode('icon-service', {
      node: IconNode,
      view: IconNodeView,
    })
    registry.registerBox('swimlane', {
      box: SwimlaneBox,
      view: SwimlaneBoxView,
    })
    registry.registerBox('lane', {
      box: LaneBox,
      view: LaneBoxView,
    })
    registry.registerBox('group', {
      box: GroupBox,
      view: GroupBoxView,
    })
    registry.registerBox('layer', {
      box: ArchitectureLayerBox,
      view: ArchitectureLayerBoxView,
    })
    return registry
  }

  registerNode(type: string, options: {
    node: NodeConstructor
    view: NodeViewConstructor
  }) {
    this.nodeTypes.set(type, {
      node: options.node,
      view: new options.view(),
    })
  }

  createNode(data: FlowNode): BaseNode {
    const matched = this.nodeTypes.get(data.type)
    if (!matched) throw new Error(`Unknown node type: ${data.type}`)
    return new matched.node(data)
  }

  createBox(data: BoxData): Box {
    const matched = this.boxTypes.get(data.type)
    const box = data.type === 'root'
      ? new RootBox()
      : matched
        ? new matched.box(data)
        : new Box(data)
    for (const child of data.children) {
      if ('children' in child) {
        box.add(this.createBox(child))
      } else {
        box.add(this.createNode(child))
      }
    }
    return box
  }

  registerBox(type: string, options: {
    box: BoxConstructor
    view: BoxViewConstructor
  }) {
    this.boxTypes.set(type, {
      box: options.box,
      view: new options.view(),
    })
  }

  createEdge(data: FlowEdge) {
    return new BaseEdge(data)
  }

  createEdgeLayer(edges: FlowEdge[]) {
    const layer = new EdgeLayer()
    for (const edge of edges) {
      layer.add(this.createEdge(edge))
    }
    return layer
  }

  getNodeView(type: string): BaseNodeView {
    const matched = this.nodeTypes.get(type)
    if (!matched) throw new Error(`Unknown node type: ${type}`)
    return matched.view
  }

  getBoxView(type: string) {
    return this.boxTypes.get(type)?.view ?? this.boxView
  }

  getEdgeView(_type: string) {
    return this.edgeView
  }
}
