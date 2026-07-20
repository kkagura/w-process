import type { AutoLayoutEdge, AutoLayoutPlan, AutoLayoutPlanNode } from './types'

export function createAutoLayoutPlan(options: {
  nodes: AutoLayoutPlanNode[]
  edges: AutoLayoutEdge[]
}): AutoLayoutPlan {
  const nodesByParent = new Map<string, AutoLayoutPlanNode[]>()
  const parentByNode = new Map<string, string>()

  for (const node of options.nodes) {
    const siblings = nodesByParent.get(node.parentBoxId) ?? []
    siblings.push(node)
    nodesByParent.set(node.parentBoxId, siblings)
    parentByNode.set(node.nodeId, node.parentBoxId)
  }

  const eligibleParents = new Set(
    [...nodesByParent.entries()]
      .filter(([, nodes]) => nodes.length >= 2)
      .map(([parentBoxId]) => parentBoxId),
  )
  const edgesByParent = new Map<string, AutoLayoutEdge[]>()

  for (const edge of options.edges) {
    const sourceParentId = parentByNode.get(edge.sourceNodeId)
    const targetParentId = parentByNode.get(edge.targetNodeId)
    if (!sourceParentId || sourceParentId !== targetParentId) continue
    if (!eligibleParents.has(sourceParentId)) continue

    const edges = edgesByParent.get(sourceParentId) ?? []
    edges.push(edge)
    edgesByParent.set(sourceParentId, edges)
  }

  const groups = [...nodesByParent.entries()]
    .filter(([parentBoxId, nodes]) => eligibleParents.has(parentBoxId) && nodes.length >= 2)
    .map(([parentBoxId, nodes]) => ({
      parentBoxId,
      nodes: nodes.map(node => ({
        nodeId: node.nodeId,
        position: node.position,
        bounds: node.bounds,
      })),
      edges: edgesByParent.get(parentBoxId) ?? [],
    }))

  return {
    groups,
    eligibleNodeCount: groups.reduce((count, group) => count + group.nodes.length, 0),
  }
}
