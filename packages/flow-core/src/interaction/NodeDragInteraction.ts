import type { HitTestResult, NodeId, NodeMove, Point, Rect, SelectableRef, Size } from '../types/flow'
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
  const origins = targetNodeIds
    .map((nodeId) => {
      const selectedNode = options.scene.getNode(nodeId)
      if (!selectedNode) return null
      return {
        nodeId,
        origin: selectedNode.getPosition(),
        size: selectedNode.getSize(),
      }
    })
    .filter((origin): origin is { nodeId: NodeId; origin: Point; size: Size } => Boolean(origin))

  if (origins.length === 0) return null

  return {
    type: 'dragging-node',
    nodeId: options.nodeId,
    start: options.start,
    origins,
  }
}

export function getDraggedNodeMoves(
  mode: Extract<InteractionMode, { type: 'dragging-node' }>,
  current: Point,
  snapDelta: Point = { x: 0, y: 0 },
): NodeMove[] {
  const dragDelta = {
    x: current.x - mode.start.x,
    y: current.y - mode.start.y,
  }
  const delta = {
    x: dragDelta.x + snapDelta.x,
    y: dragDelta.y + snapDelta.y,
  }

  return mode.origins.map(item => ({
    nodeId: item.nodeId,
    position: {
      x: item.origin.x + delta.x,
      y: item.origin.y + delta.y,
    },
  }))
}

export function getDraggedNodeBounds(
  mode: Extract<InteractionMode, { type: 'dragging-node' }>,
  current: Point,
): Rect {
  const dragDelta = {
    x: current.x - mode.start.x,
    y: current.y - mode.start.y,
  }
  const rects = mode.origins.map(item => ({
    x: item.origin.x + dragDelta.x,
    y: item.origin.y + dragDelta.y,
    width: item.size.width,
    height: item.size.height,
  }))

  return getBounds(rects)
}

export function getHoveredSelection(hit: HitTestResult): SelectableRef | null {
  if (hit?.type === 'node') {
    return { type: 'node', id: hit.id }
  }

  if (hit?.type === 'port') {
    return { type: 'node', id: hit.nodeId }
  }

  if (hit?.type === 'edge') {
    return { type: 'edge', id: hit.id }
  }

  if (hit?.type === 'box') {
    return { type: 'box', id: hit.id }
  }

  return null
}

function getBounds(rects: Rect[]): Rect {
  const left = Math.min(...rects.map(rect => rect.x))
  const top = Math.min(...rects.map(rect => rect.y))
  const right = Math.max(...rects.map(rect => rect.x + rect.width))
  const bottom = Math.max(...rects.map(rect => rect.y + rect.height))

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}
