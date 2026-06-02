import type { HitTestResult, NodeId, Point, Selection } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'
import type { InteractionMode } from './InteractionTypes'

export function getNodeIdFromHit(hit: HitTestResult): NodeId | null {
  if (hit?.type === 'node') return hit.id
  if (hit?.type === 'port') return hit.nodeId
  return null
}

export function createNodeDragMode(options: {
  scene: SceneManager
  nodeId: NodeId
  start: Point
}): InteractionMode | null {
  const node = options.scene.getNode(options.nodeId)
  if (!node) return null

  return {
    type: 'dragging-node',
    nodeId: options.nodeId,
    start: options.start,
    origin: node.getPosition(),
  }
}

export function getDraggedNodePosition(mode: Extract<InteractionMode, { type: 'dragging-node' }>, current: Point): Point {
  return {
    x: mode.origin.x + current.x - mode.start.x,
    y: mode.origin.y + current.y - mode.start.y,
  }
}

export function getHoveredSelection(hit: HitTestResult): Selection {
  if (hit?.type === 'node') {
    return { type: 'node', id: hit.id }
  }

  return null
}
