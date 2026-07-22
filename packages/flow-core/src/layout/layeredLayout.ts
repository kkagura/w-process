import type { NodeMove, Point, Rect } from '../types/flow'
import { getUnionBounds } from '../utils/geometry'
import type { AutoLayoutEdge, AutoLayoutNode, AutoLayoutOptions } from './types'

const DEFAULT_OPTIONS: AutoLayoutOptions = {
  layerGap: 120,
  nodeGap: 56,
  componentGap: 120,
}

interface LayoutComponent {
  placements: Map<string, Point>
  width: number
  height: number
}

interface PackedPlacement {
  node: AutoLayoutNode
  visualPosition: Point
}

export function getAutoLayoutMoves(options: {
  nodes: AutoLayoutNode[]
  edges: AutoLayoutEdge[]
  layout?: Partial<AutoLayoutOptions>
}): NodeMove[] {
  if (options.nodes.length < 2) return []

  const layoutOptions = {
    ...DEFAULT_OPTIONS,
    ...options.layout,
  }
  const nodes = [...options.nodes]
  const nodeMap = new Map(nodes.map(node => [node.nodeId, node]))
  const edges = normalizeEdges(options.edges, nodeMap)
  const components = getWeaklyConnectedComponents(nodes, edges)
  const packed = packComponents(components, edges, layoutOptions)
  const originalBounds = getUnionBounds(nodes.map(node => node.bounds))
  const packedBounds = getUnionBounds(packed.map(item => ({
    ...item.visualPosition,
    width: item.node.bounds.width,
    height: item.node.bounds.height,
  })))
  const offset = {
    x: getCenter(originalBounds).x - getCenter(packedBounds).x,
    y: getCenter(originalBounds).y - getCenter(packedBounds).y,
  }

  return packed.map(({ node, visualPosition }) => ({
    nodeId: node.nodeId,
    position: {
      x: visualPosition.x + offset.x - (node.bounds.x - node.position.x),
      y: visualPosition.y + offset.y - (node.bounds.y - node.position.y),
    },
  }))
}

function normalizeEdges(
  edges: AutoLayoutEdge[],
  nodeMap: Map<string, AutoLayoutNode>,
) {
  const result: AutoLayoutEdge[] = []
  const keys = new Set<string>()

  for (const edge of edges) {
    if (edge.sourceNodeId === edge.targetNodeId) continue
    if (!nodeMap.has(edge.sourceNodeId) || !nodeMap.has(edge.targetNodeId)) continue

    const key = `${edge.sourceNodeId}->${edge.targetNodeId}`
    if (keys.has(key)) continue
    keys.add(key)
    result.push(edge)
  }

  return result
}

function getWeaklyConnectedComponents(
  nodes: AutoLayoutNode[],
  edges: AutoLayoutEdge[],
) {
  const nodeMap = new Map(nodes.map(node => [node.nodeId, node]))
  const neighbors = new Map(nodes.map(node => [node.nodeId, new Set<string>()]))

  for (const edge of edges) {
    neighbors.get(edge.sourceNodeId)?.add(edge.targetNodeId)
    neighbors.get(edge.targetNodeId)?.add(edge.sourceNodeId)
  }

  const orderedNodes = [...nodes].sort(compareNodesByPosition)
  const visited = new Set<string>()
  const components: AutoLayoutNode[][] = []

  for (const node of orderedNodes) {
    if (visited.has(node.nodeId)) continue

    const component: AutoLayoutNode[] = []
    const queue = [node.nodeId]
    visited.add(node.nodeId)

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      const matched = nodeMap.get(nodeId)
      if (matched) component.push(matched)

      const nextNodeIds = [...(neighbors.get(nodeId) ?? [])]
        .sort((left, right) => compareNodesByPosition(nodeMap.get(left)!, nodeMap.get(right)!))
      for (const nextNodeId of nextNodeIds) {
        if (visited.has(nextNodeId)) continue
        visited.add(nextNodeId)
        queue.push(nextNodeId)
      }
    }

    components.push(component.sort(compareNodesByPosition))
  }

  return components
}

function packComponents(
  components: AutoLayoutNode[][],
  edges: AutoLayoutEdge[],
  options: AutoLayoutOptions,
) {
  const packed: PackedPlacement[] = []
  let cursorY = 0

  for (const nodes of components) {
    const nodeIds = new Set(nodes.map(node => node.nodeId))
    const componentEdges = edges.filter(edge => (
      nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)
    ))
    const component = layoutComponent(nodes, componentEdges, options)

    for (const node of nodes) {
      const placement = component.placements.get(node.nodeId)
      if (!placement) continue
      packed.push({
        node,
        visualPosition: {
          x: placement.x,
          y: placement.y + cursorY,
        },
      })
    }

    cursorY += component.height + options.componentGap
  }

  return packed
}

function layoutComponent(
  nodes: AutoLayoutNode[],
  edges: AutoLayoutEdge[],
  options: AutoLayoutOptions,
): LayoutComponent {
  const nodeMap = new Map(nodes.map(node => [node.nodeId, node]))
  const acyclicEdges = removeBackEdges(nodes, edges, nodeMap)
  const layers = createLayers(nodes, acyclicEdges, nodeMap)
  reduceCrossings(layers, acyclicEdges)

  const layerWidths = layers.map(layer => Math.max(
    ...layer.map(nodeId => nodeMap.get(nodeId)!.bounds.width),
  ))
  const layerHeights = layers.map(layer => layer.reduce((height, nodeId, index) => {
    const nodeHeight = nodeMap.get(nodeId)!.bounds.height
    return height + nodeHeight + (index > 0 ? options.nodeGap : 0)
  }, 0))
  const componentHeight = Math.max(...layerHeights)
  const placements = new Map<string, Point>()
  let cursorX = 0

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const layer = layers[layerIndex]
    const layerWidth = layerWidths[layerIndex]
    let cursorY = (componentHeight - layerHeights[layerIndex]) / 2

    for (const nodeId of layer) {
      const node = nodeMap.get(nodeId)!
      placements.set(nodeId, {
        x: cursorX + (layerWidth - node.bounds.width) / 2,
        y: cursorY,
      })
      cursorY += node.bounds.height + options.nodeGap
    }

    cursorX += layerWidth + options.layerGap
  }

  return {
    placements,
    width: cursorX - options.layerGap,
    height: componentHeight,
  }
}

function removeBackEdges(
  nodes: AutoLayoutNode[],
  edges: AutoLayoutEdge[],
  nodeMap: Map<string, AutoLayoutNode>,
) {
  const outgoing = createEdgeMap(edges, 'sourceNodeId')
  const state = new Map<string, 'visiting' | 'visited'>()
  const keptEdges: AutoLayoutEdge[] = []

  function visit(nodeId: string) {
    state.set(nodeId, 'visiting')
    const nextEdges = [...(outgoing.get(nodeId) ?? [])].sort((left, right) => (
      compareNodesByPosition(
        nodeMap.get(left.targetNodeId)!,
        nodeMap.get(right.targetNodeId)!,
      )
    ))

    for (const edge of nextEdges) {
      if (state.get(edge.targetNodeId) === 'visiting') continue
      keptEdges.push(edge)
      if (!state.has(edge.targetNodeId)) {
        visit(edge.targetNodeId)
      }
    }

    state.set(nodeId, 'visited')
  }

  for (const node of [...nodes].sort(compareNodesByPosition)) {
    if (!state.has(node.nodeId)) visit(node.nodeId)
  }

  return keptEdges
}

function createLayers(
  nodes: AutoLayoutNode[],
  edges: AutoLayoutEdge[],
  nodeMap: Map<string, AutoLayoutNode>,
) {
  const outgoing = createEdgeMap(edges, 'sourceNodeId')
  const indegree = new Map(nodes.map(node => [node.nodeId, 0]))
  const layerByNode = new Map(nodes.map(node => [node.nodeId, 0]))

  for (const edge of edges) {
    indegree.set(edge.targetNodeId, (indegree.get(edge.targetNodeId) ?? 0) + 1)
  }

  const queue = nodes
    .filter(node => indegree.get(node.nodeId) === 0)
    .sort(compareNodesByPosition)

  while (queue.length > 0) {
    const node = queue.shift()!
    const nodeLayer = layerByNode.get(node.nodeId) ?? 0
    const nextEdges = [...(outgoing.get(node.nodeId) ?? [])].sort((left, right) => (
      compareNodesByPosition(
        nodeMap.get(left.targetNodeId)!,
        nodeMap.get(right.targetNodeId)!,
      )
    ))

    for (const edge of nextEdges) {
      layerByNode.set(
        edge.targetNodeId,
        Math.max(layerByNode.get(edge.targetNodeId) ?? 0, nodeLayer + 1),
      )
      const nextIndegree = (indegree.get(edge.targetNodeId) ?? 0) - 1
      indegree.set(edge.targetNodeId, nextIndegree)
      if (nextIndegree === 0) {
        insertSorted(queue, nodeMap.get(edge.targetNodeId)!, compareNodesByPosition)
      }
    }
  }

  const maxLayer = Math.max(...layerByNode.values())
  const layers = Array.from({ length: maxLayer + 1 }, () => [] as string[])
  for (const node of [...nodes].sort(compareNodesByPosition)) {
    layers[layerByNode.get(node.nodeId) ?? 0].push(node.nodeId)
  }

  return layers
}

function reduceCrossings(layers: string[][], edges: AutoLayoutEdge[]) {
  const incoming = createEdgeMap(edges, 'targetNodeId')
  const outgoing = createEdgeMap(edges, 'sourceNodeId')

  for (let iteration = 0; iteration < 4; iteration += 1) {
    for (let layerIndex = 1; layerIndex < layers.length; layerIndex += 1) {
      sortLayerByNeighbors(layers[layerIndex], layers, incoming, 'sourceNodeId')
    }

    for (let layerIndex = layers.length - 2; layerIndex >= 0; layerIndex -= 1) {
      sortLayerByNeighbors(layers[layerIndex], layers, outgoing, 'targetNodeId')
    }
  }
}

function sortLayerByNeighbors(
  layer: string[],
  layers: string[][],
  edgeMap: Map<string, AutoLayoutEdge[]>,
  neighborKey: 'sourceNodeId' | 'targetNodeId',
) {
  const rank = new Map<string, number>()
  for (const currentLayer of layers) {
    currentLayer.forEach((nodeId, index) => rank.set(nodeId, index))
  }
  const previousOrder = new Map(layer.map((nodeId, index) => [nodeId, index]))

  layer.sort((left, right) => {
    const leftScore = getNeighborScore(edgeMap.get(left) ?? [], neighborKey, rank)
    const rightScore = getNeighborScore(edgeMap.get(right) ?? [], neighborKey, rank)
    if (leftScore !== rightScore) return leftScore - rightScore
    return (previousOrder.get(left) ?? 0) - (previousOrder.get(right) ?? 0)
  })
}

function getNeighborScore(
  edges: AutoLayoutEdge[],
  neighborKey: 'sourceNodeId' | 'targetNodeId',
  rank: Map<string, number>,
) {
  if (edges.length === 0) return Number.POSITIVE_INFINITY

  return edges.reduce((total, edge) => (
    total + (rank.get(edge[neighborKey]) ?? 0)
  ), 0) / edges.length
}

function createEdgeMap(
  edges: AutoLayoutEdge[],
  key: 'sourceNodeId' | 'targetNodeId',
) {
  const result = new Map<string, AutoLayoutEdge[]>()

  for (const edge of edges) {
    const nodeId = edge[key]
    const matched = result.get(nodeId)
    if (matched) {
      matched.push(edge)
    }
    else {
      result.set(nodeId, [edge])
    }
  }

  return result
}

function compareNodesByPosition(left: AutoLayoutNode, right: AutoLayoutNode) {
  return left.position.y - right.position.y
    || left.position.x - right.position.x
    || left.nodeId.localeCompare(right.nodeId)
}

function insertSorted<T>(
  items: T[],
  item: T,
  compare: (left: T, right: T) => number,
) {
  const index = items.findIndex(existing => compare(item, existing) < 0)
  if (index < 0) {
    items.push(item)
  }
  else {
    items.splice(index, 0, item)
  }
}

function getCenter(rect: Rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  }
}
