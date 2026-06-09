import type { NodeId, Point, Rect } from '../types/flow'

export interface AutoLayoutNode {
  nodeId: NodeId
  position: Point
  bounds: Rect
}

export interface AutoLayoutEdge {
  sourceNodeId: NodeId
  targetNodeId: NodeId
}

export interface AutoLayoutOptions {
  layerGap: number
  nodeGap: number
  componentGap: number
}
