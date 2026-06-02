import type { EdgeId, FlowEdge, NodeId } from '../types/flow'

export class BaseEdge {
  protected data: FlowEdge

  constructor(data: FlowEdge) {
    this.data = structuredClone(data)
  }

  get id(): EdgeId {
    return this.data.id
  }

  hasEndpointNode(nodeId: NodeId) {
    return this.data.source.nodeId === nodeId || this.data.target.nodeId === nodeId
  }

  serialize(): FlowEdge {
    return structuredClone(this.data)
  }
}
