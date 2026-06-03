import { BaseEdge } from '../elements/BaseEdge'
import type { EdgeId, Endpoint, FlowEdge, NodeId } from '../types/flow'

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
      isSameEndpoint(existing.source, edge.source)
      && isSameEndpoint(existing.target, edge.target)
    ) || (
      isSameEndpoint(existing.source, edge.target)
      && isSameEndpoint(existing.target, edge.source)
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

function isSameEndpoint(left: Endpoint, right: Endpoint) {
  return left.nodeId === right.nodeId && left.portId === right.portId
}
