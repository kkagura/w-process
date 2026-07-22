import type { BoxId, NodeId, Point, Rect } from '../types/flow'

export interface AutoLayoutNode {
  nodeId: NodeId
  position: Point
  bounds: Rect
}

export interface AutoLayoutEdge {
  sourceNodeId: NodeId
  targetNodeId: NodeId
}

export interface AutoLayoutPlanNode extends AutoLayoutNode {
  parentBoxId: BoxId
}

export interface AutoLayoutGroup {
  parentBoxId: BoxId
  nodes: AutoLayoutNode[]
  edges: AutoLayoutEdge[]
}

export interface AutoLayoutPlan {
  groups: AutoLayoutGroup[]
  eligibleNodeCount: number
}

export interface AutoLayoutOptions {
  layerGap: number
  nodeGap: number
  componentGap: number
}
