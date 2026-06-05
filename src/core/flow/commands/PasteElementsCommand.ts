import type { SceneManager } from '../scene/SceneManager'
import type { FlowEdge, FlowNode, SelectableRef, SelectionState } from '../types/flow'
import type { SceneCommand } from './SceneCommand'

export class PasteElementsCommand implements SceneCommand {
  label = 'Paste elements'
  private nodes: FlowNode[]
  private edges: FlowEdge[]
  private selectionBefore: SelectionState

  constructor(options: {
    nodes: FlowNode[]
    edges: FlowEdge[]
    selectionBefore: SelectionState
  }) {
    this.nodes = structuredClone(options.nodes)
    this.edges = structuredClone(options.edges)
    this.selectionBefore = structuredClone(options.selectionBefore)
  }

  execute(scene: SceneManager) {
    for (const node of this.nodes) {
      scene.addNodeData(node)
    }

    for (const edge of this.edges) {
      scene.addEdgeData(edge)
    }

    scene.selectMany(this.getPastedSelection())
  }

  undo(scene: SceneManager) {
    scene.removeNodes(this.nodes.map(node => node.id))
    scene.removeEdges(this.edges.map(edge => edge.id))
    scene.selectMany(this.selectionBefore.items, this.selectionBefore.primary)
  }

  private getPastedSelection(): SelectableRef[] {
    return [
      ...this.nodes.map<SelectableRef>(node => ({ type: 'node', id: node.id })),
      ...this.edges.map<SelectableRef>(edge => ({ type: 'edge', id: edge.id })),
    ]
  }
}
