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

  get(id: EdgeId) {
    return this.edges.get(id) ?? null
  }

  remove(id: EdgeId) {
    const edge = this.edges.get(id)
    if (!edge) return null

    this.edges.delete(id)
    return edge.serialize()
  }

  hasConnection(edge: FlowEdge) {
    return this.getEdges().some(existing => (
      existing.source.nodeId === edge.source.nodeId
      && existing.source.portId === edge.source.portId
      && existing.target.nodeId === edge.target.nodeId
      && existing.target.portId === edge.target.portId
    ))
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
