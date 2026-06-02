import { BaseEdge } from '../elements/BaseEdge'
import type { EdgeId, FlowEdge, NodeId } from '../types/flow'

export class EdgeLayer {
  private edges = new Map<EdgeId, BaseEdge>()

  add(edge: BaseEdge) {
    this.edges.set(edge.id, edge)
  }

  remove(id: EdgeId) {
    this.edges.delete(id)
  }

  removeByNode(nodeId: NodeId) {
    let removedCount = 0

    for (const edge of this.edges.values()) {
      if (edge.hasEndpointNode(nodeId)) {
        this.edges.delete(edge.id)
        removedCount += 1
      }
    }

    return removedCount
  }

  getEdges() {
    return [...this.edges.values()]
  }

  serialize(): FlowEdge[] {
    return this.getEdges().map(edge => edge.serialize())
  }
}
