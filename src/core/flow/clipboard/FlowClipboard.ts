import type { FlowEdge, FlowNode, Point, Rect } from '../types/flow'
import { getRotatedRectBounds, getUnionBounds } from '../utils/geometry'
import { createId } from '../utils/ids'
import type { SceneManager } from '../scene/SceneManager'

export interface FlowClipboardData {
  nodes: FlowNode[]
  edges: FlowEdge[]
  origin: Point
}

export interface PastedFlowData {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export function copySelectionToClipboard(scene: SceneManager): FlowClipboardData | null {
  const selectedNodeIds = new Set(scene.getSelectedNodeIds())
  if (selectedNodeIds.size === 0) return null

  const nodes = scene.getNodes()
    .filter(node => selectedNodeIds.has(node.id))
    .map(node => node.serialize())
  const edges = scene.getEdges()
    .filter(edge => selectedNodeIds.has(edge.source.nodeId) && selectedNodeIds.has(edge.target.nodeId))
    .map(edge => edge.serialize())
  const bounds = getUnionBounds(nodes.map(getNodeRect))

  return {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
    origin: {
      x: bounds.x,
      y: bounds.y,
    },
  }
}

export function createPastedFlowData(data: FlowClipboardData, offset: Point): PastedFlowData {
  const nodeIdMap = new Map<string, string>()
  const portIdMap = new Map<string, string>()

  const nodes = data.nodes.map((node) => {
    const nodeId = createId('node')
    nodeIdMap.set(node.id, nodeId)

    const ports = node.ports.map((port) => {
      const portId = createId('port')
      portIdMap.set(getPortKey(node.id, port.id), portId)

      return {
        ...structuredClone(port),
        id: portId,
        nodeId,
        offset: { ...port.offset },
      }
    })

    return {
      ...structuredClone(node),
      id: nodeId,
      position: {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y,
      },
      size: { ...node.size },
      ports,
      props: structuredClone(node.props),
    }
  })

  const edges = data.edges
    .flatMap((edge) => {
      const sourceNodeId = nodeIdMap.get(edge.source.nodeId)
      const targetNodeId = nodeIdMap.get(edge.target.nodeId)
      const sourcePortId = portIdMap.get(getPortKey(edge.source.nodeId, edge.source.portId))
      const targetPortId = portIdMap.get(getPortKey(edge.target.nodeId, edge.target.portId))
      if (!sourceNodeId || !targetNodeId || !sourcePortId || !targetPortId) return []

      const nextEdge: FlowEdge = {
        ...structuredClone(edge),
        id: createId('edge'),
        source: {
          nodeId: sourceNodeId,
          portId: sourcePortId,
        },
        target: {
          nodeId: targetNodeId,
          portId: targetPortId,
        },
      }
      if (edge.props) {
        nextEdge.props = structuredClone(edge.props)
      }

      return [nextEdge]
    })

  return { nodes, edges }
}

function getNodeRect(node: FlowNode): Rect {
  return getRotatedRectBounds({
    ...node.position,
    ...node.size,
  }, node.rotation)
}

function getPortKey(nodeId: string, portId: string) {
  return `${nodeId}:${portId}`
}
