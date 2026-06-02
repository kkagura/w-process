import { BaseEdge } from '../elements/BaseEdge'
import type { EdgeId, FlowEdge, NodeId } from '../types/flow'

export class EdgeLayer {
  private edges = new Map<EdgeId, BaseEdge>()

  add(edge: BaseEdge) {
    this.edges.set(edge.id, edge)
  }

  addData(edge: FlowEdge) {
    this.add(new BaseEdge(edge))
  }

  remove(id: EdgeId) {
    this.edges.delete(id)
  }

  removeByNode(nodeId: NodeId) {
    return this.removeByNodes([nodeId]).length
  }

  removeByNodes(nodeIds: NodeId[]) {
    const nodeIdSet = new Set(nodeIds)
    const removedEdges: FlowEdge[] = []

    for (const edge of this.edges.values()) {
      const shouldRemove = [...nodeIdSet].some(nodeId => edge.hasEndpointNode(nodeId))
      if (shouldRemove) {
        removedEdges.push(edge.serialize())
        this.edges.delete(edge.id)
      }
    }

    return removedEdges
  }

  getEdges() {
    return [...this.edges.values()]
  }

  serialize(): FlowEdge[] {
    return this.getEdges().map(edge => edge.serialize())
  }
}
