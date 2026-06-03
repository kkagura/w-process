import type { NodeId, NodeMove, Rect, SelectionArrangeAction } from '../types/flow'
import { getUnionBounds } from '../utils/geometry'

export interface ArrangeNodeRect {
  nodeId: NodeId
  rect: Rect
}

export function getArrangedNodeMoves(
  action: SelectionArrangeAction,
  nodes: ArrangeNodeRect[],
): NodeMove[] {
  if (nodes.length < 2) return []

  if (action === 'distribute-horizontal') {
    return distributeHorizontal(nodes)
  }

  if (action === 'distribute-vertical') {
    return distributeVertical(nodes)
  }

  const bounds = getUnionBounds(nodes.map(node => node.rect))

  return nodes.map((node) => {
    const rect = node.rect
    let x = rect.x
    let y = rect.y

    if (action === 'align-left') {
      x = bounds.x
    }
    else if (action === 'align-vertical-center') {
      x = bounds.x + bounds.width / 2 - rect.width / 2
    }
    else if (action === 'align-right') {
      x = bounds.x + bounds.width - rect.width
    }
    else if (action === 'align-top') {
      y = bounds.y
    }
    else if (action === 'align-horizontal-center') {
      y = bounds.y + bounds.height / 2 - rect.height / 2
    }
    else if (action === 'align-bottom') {
      y = bounds.y + bounds.height - rect.height
    }

    return {
      nodeId: node.nodeId,
      position: { x, y },
    }
  })
}

function distributeHorizontal(nodes: ArrangeNodeRect[]) {
  if (nodes.length < 3) return []

  const sortedNodes = [...nodes].sort((left, right) => left.rect.x - right.rect.x)
  const bounds = getUnionBounds(sortedNodes.map(node => node.rect))
  const totalWidth = sortedNodes.reduce((total, node) => total + node.rect.width, 0)
  const gap = (bounds.width - totalWidth) / (sortedNodes.length - 1)
  let cursor = bounds.x

  return sortedNodes.map((node) => {
    const position = {
      x: cursor,
      y: node.rect.y,
    }
    cursor += node.rect.width + gap

    return {
      nodeId: node.nodeId,
      position,
    }
  })
}

function distributeVertical(nodes: ArrangeNodeRect[]) {
  if (nodes.length < 3) return []

  const sortedNodes = [...nodes].sort((left, right) => left.rect.y - right.rect.y)
  const bounds = getUnionBounds(sortedNodes.map(node => node.rect))
  const totalHeight = sortedNodes.reduce((total, node) => total + node.rect.height, 0)
  const gap = (bounds.height - totalHeight) / (sortedNodes.length - 1)
  let cursor = bounds.y

  return sortedNodes.map((node) => {
    const position = {
      x: node.rect.x,
      y: cursor,
    }
    cursor += node.rect.height + gap

    return {
      nodeId: node.nodeId,
      position,
    }
  })
}
