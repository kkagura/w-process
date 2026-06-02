import { BaseEdge } from './BaseEdge'
import { BaseNode } from './BaseNode'
import { TaskNode } from './TaskNode'
import { Box } from '../scene/Box'
import { EdgeLayer } from '../scene/EdgeLayer'
import { RootBox } from '../scene/RootBox'
import type { BoxData, FlowEdge, FlowNode } from '../types/flow'
import { BaseBoxView } from '../views/BaseBoxView'
import { BaseEdgeView } from '../views/BaseEdgeView'
import { BaseNodeView } from '../views/BaseNodeView'
import { TaskNodeView } from '../views/TaskNodeView'

type NodeConstructor = new (data: FlowNode) => BaseNode
type NodeViewConstructor = new () => BaseNodeView

export class ElementRegistry {
  private nodeTypes = new Map<string, {
    node: NodeConstructor
    view: BaseNodeView
  }>()

  private boxView = new BaseBoxView()
  private edgeView = new BaseEdgeView()

  static createDefault() {
    const registry = new ElementRegistry()
    registry.registerNode('task', {
      node: TaskNode,
      view: TaskNodeView,
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
    const box = data.type === 'root' ? new RootBox() : new Box(data)
    for (const child of data.children) {
      if ('children' in child) {
        box.add(this.createBox(child))
      } else {
        box.add(this.createNode(child))
      }
    }
    return box
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

  getBoxView(_type: string) {
    return this.boxView
  }

  getEdgeView(_type: string) {
    return this.edgeView
  }
}
