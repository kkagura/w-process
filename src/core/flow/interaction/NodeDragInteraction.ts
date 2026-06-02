import type { HitTestResult, NodeId, NodeMove, Point, SelectableRef } from '../types/flow'
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

  const selection = { type: 'node' as const, id: options.nodeId }
  const targetNodeIds = options.scene.isSelected(selection)
    ? options.scene.getSelectedNodeIds()
    : [options.nodeId]

  return {
    type: 'dragging-node',
    nodeId: options.nodeId,
    start: options.start,
    origins: targetNodeIds
      .map((nodeId) => {
        const selectedNode = options.scene.getNode(nodeId)
        if (!selectedNode) return null
        return {
          nodeId,
          origin: selectedNode.getPosition(),
        }
      })
      .filter((origin): origin is { nodeId: NodeId; origin: Point } => Boolean(origin)),
  }
}

export function getDraggedNodeMoves(mode: Extract<InteractionMode, { type: 'dragging-node' }>, current: Point): NodeMove[] {
  const delta = {
    x: current.x - mode.start.x,
    y: current.y - mode.start.y,
  }

  return mode.origins.map(item => ({
    nodeId: item.nodeId,
    position: {
      x: item.origin.x + delta.x,
      y: item.origin.y + delta.y,
    },
  }))
}

export function getHoveredSelection(hit: HitTestResult): SelectableRef | null {
  if (hit?.type === 'node') {
    return { type: 'node', id: hit.id }
  }

  return null
}
