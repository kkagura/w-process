import type { EdgeId, FlowEdge, NodeId } from '../types/flow'

export class BaseEdge {
  protected data: FlowEdge

  constructor(data: FlowEdge) {
    this.data = structuredClone(data)
  }

  get id(): EdgeId {
    return this.data.id
  }

  get source() {
    return this.data.source
  }

  get target() {
    return this.data.target
  }

  hasEndpointNode(nodeId: NodeId) {
    return this.data.source.nodeId === nodeId || this.data.target.nodeId === nodeId
  }

  updateData(data: FlowEdge) {
    if (data.id !== this.id) return
    this.data = structuredClone(data)
  }

  serialize(): FlowEdge {
    return structuredClone(this.data)
  }
}
