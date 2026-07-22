import { BaseNode } from '../elements/BaseNode'
import { BaseEdge } from '../elements/BaseEdge'
import { ElementRegistry } from '../elements/ElementRegistry'
import { EdgeLayer } from './EdgeLayer'
import { RootBox } from './RootBox'
import { Box } from './Box'
import type { NodeParentAssignment } from '../commands/ReparentNodesCommand'
import type {
  BoxId,
  EdgeId,
  Endpoint,
  FlowEdge,
  FlowDocument,
  FlowNode,
  FlowPort,
  FlowTheme,
  HitTestResult,
  NodeMove,
  NodeId,
  Point,
  EditorUiState,
  SceneEvent,
  SceneSummary,
  SelectableRef,
  SelectionState,
  Rect,
  RenderMode,
  SceneElementData,
  ViewportData,
} from '../types/flow'
import { defaultTheme } from '../types/flow'
import { getUnionBounds, rectsIntersect } from '../utils/geometry'

export interface RemovedSceneElementSnapshot {
  data: SceneElementData
  parentBoxId: BoxId
  index: number
}

export interface RemovedSceneSnapshot {
  elements: RemovedSceneElementSnapshot[]
  edges: FlowEdge[]
  selectionBefore: SelectionState
}

export interface SceneElementLocation {
  elementId: string
  parentBoxId: BoxId
  index: number
}

export class SceneManager {
  private rootBox = new RootBox()
  private edgeLayer = new EdgeLayer()
  private selection: SelectionState = createSelectionState()
  private hovered: SelectableRef | null = null
  private listeners = new Set<(event: SceneEvent) => void>()
  private viewport: ViewportData = { x: 0, y: 0, zoom: 1 }
  private theme: FlowTheme = defaultTheme
  private registry: ElementRegistry

  constructor(registry: ElementRegistry) {
    this.registry = registry
  }

  addNode(node: BaseNode, parentBoxId?: BoxId) {
    const parent = parentBoxId
      ? this.rootBox.findBox(parentBoxId)
      : this.rootBox

    if (!parent) throw new Error(`Unknown parent box: ${parentBoxId}`)

    parent.add(node)
    this.selection = createSelectionState([{ type: 'node', id: node.id }])
    this.hovered = null
    this.emit({
      type: 'node-added',
      node: node.serialize(),
      selection: this.selection,
    })
  }

  addNodeData(nodeData: FlowNode, parentBoxId?: BoxId) {
    this.addNode(this.registry.createNode(nodeData), parentBoxId)
  }

  addBoxData(boxData: import('../types/flow').BoxData, parentBoxId?: BoxId) {
    const parent = parentBoxId
      ? this.rootBox.findBox(parentBoxId)
      : this.rootBox
    if (!parent) throw new Error(`Unknown parent box: ${parentBoxId}`)

    const box = this.registry.createBox(boxData)
    parent.add(box)
    this.selection = createSelectionState([{ type: 'box', id: box.id }])
    this.hovered = null
    this.emit({
      type: 'box-added',
      box: box.serialize(),
      selection: this.selection,
    })
  }

  addEdgeData(edgeData: FlowEdge) {
    if (!this.canConnect(edgeData.source, edgeData.target)) return false

    const edge = this.registry.createEdge(edgeData)
    this.edgeLayer.add(edge)
    this.selection = createSelectionState([{ type: 'edge', id: edge.id }])
    this.hovered = null
    this.emit({
      type: 'edge-added',
      edge: edge.serialize(),
      selection: this.selection,
    })
    return true
  }

  moveNode(id: NodeId, position: Point) {
    const node = this.rootBox.find(id)
    if (node instanceof BaseNode) {
      node.moveTo(position)
      this.emit({
        type: 'node-moved',
        nodeId: id,
        position: node.getPosition(),
      })
    }
  }

  updateNodeLabel(id: NodeId, label: string) {
    const node = this.rootBox.find(id)
    if (!(node instanceof BaseNode)) return null

    node.updateLabel(label)
    const data = node.serialize()
    this.emit({
      type: 'node-updated',
      node: data,
    })
    return data
  }

  updateNodeData(nodeData: FlowNode) {
    const node = this.rootBox.find(nodeData.id)
    if (!(node instanceof BaseNode)) return null

    node.updateData(nodeData)
    const data = node.serialize()
    this.emit({
      type: 'node-updated',
      node: data,
    })
    return data
  }

  updateNodesData(nodesData: FlowNode[]) {
    const updatedNodes: FlowNode[] = []

    for (const nodeData of nodesData) {
      const node = this.rootBox.find(nodeData.id)
      if (!(node instanceof BaseNode)) continue

      node.updateData(nodeData)
      updatedNodes.push(node.serialize())
    }

    if (updatedNodes.length === 0) return []

    this.emit({
      type: 'nodes-updated',
      nodes: updatedNodes,
    })
    return updatedNodes
  }

  moveNodes(moves: NodeMove[]) {
    const appliedMoves: NodeMove[] = []

    for (const move of moves) {
      const node = this.rootBox.find(move.nodeId)
      if (!(node instanceof BaseNode)) continue

      node.moveTo(move.position)
      appliedMoves.push({
        nodeId: move.nodeId,
        position: node.getPosition(),
      })
    }

    if (appliedMoves.length === 0) return

    this.emit({
      type: 'nodes-moved',
      moves: appliedMoves,
    })
  }

  moveBox(id: BoxId, position: Point) {
    const box = this.getBox(id)
    if (!box) return null

    const current = box.getPosition()
    const delta = {
      x: position.x - current.x,
      y: position.y - current.y,
    }
    if (delta.x === 0 && delta.y === 0) return box.serialize()

    box.moveBy(delta)
    const data = box.serialize()
    this.emit({ type: 'box-updated', box: data })
    return data
  }

  updateBoxData(boxData: import('../types/flow').BoxData) {
    const parent = this.rootBox.findParentBox(boxData.id)
    if (!parent) return null

    const removed = parent.removeWithLocation(boxData.id)
    if (!removed) return null

    const box = this.registry.createBox(boxData)
    parent.addAt(box, removed.index)
    if (
      this.selection.primary?.type === 'box'
      && !this.getBox(this.selection.primary.id)
    ) {
      this.selection = createSelectionState([{ type: 'box', id: box.id }])
    }
    const data = box.serialize()
    this.emit({
      type: 'document-loaded',
      uiState: this.getUiState(),
    })
    return data
  }

  removeSelection() {
    if (this.selection.items.length === 0) return

    const nodeIds = this.selection.items
      .filter((item): item is Extract<SelectableRef, { type: 'node' }> => item.type === 'node')
      .map(item => item.id)

    if (nodeIds.length > 0) {
      this.removeNodes(nodeIds)
      return
    }

    const edgeIds = this.selection.items
      .filter((item): item is Extract<SelectableRef, { type: 'edge' }> => item.type === 'edge')
      .map(item => item.id)

    if (edgeIds.length > 0) {
      this.removeEdges(edgeIds)
      return
    }

    const boxIds = this.selection.items
      .filter((item): item is Extract<SelectableRef, { type: 'box' }> => item.type === 'box')
      .map(item => item.id)

    if (boxIds.length > 0) {
      this.removeBoxes(boxIds)
      return
    }

    this.selection = createSelectionState()
    this.hovered = null
    this.emit({
      type: 'selection-changed',
      selection: this.selection,
      selectedNode: null,
      selectedEdge: null,
      selectedBox: null,
    })
  }

  removeEdges(edgeIds: EdgeId[]) {
    const removedEdges: FlowEdge[] = []

    for (const edgeId of edgeIds) {
      const removed = this.edgeLayer.remove(edgeId)
      if (removed) removedEdges.push(removed)
    }

    if (removedEdges.length > 0) {
      this.selection = createSelectionState()
      this.hovered = null
      this.emit({
        type: 'edges-removed',
        edgeIds: removedEdges.map(edge => edge.id),
      })
    }

    return removedEdges
  }

  restoreEdges(edges: FlowEdge[], selection = createSelectionState()) {
    for (const edge of edges) {
      this.edgeLayer.addData(edge)
    }

    this.selection = selection
    this.hovered = null
    this.emit({
      type: 'document-loaded',
      uiState: this.getUiState(),
    })
  }

  removeNodes(nodeIds: NodeId[]): RemovedSceneSnapshot {
    const selectionBefore = cloneSelectionState(this.selection)
    const removedElements: RemovedSceneElementSnapshot[] = []

    for (const nodeId of nodeIds) {
      const removed = this.rootBox.removeWithLocation(nodeId)
      if (!removed) continue

      removedElements.push({
        data: removed.element.serialize() as SceneElementData,
        parentBoxId: removed.parentBoxId,
        index: removed.index,
      })
    }

    const removedNodeIds = removedElements
      .filter((item): item is RemovedSceneElementSnapshot & { data: FlowNode } => !('children' in item.data))
      .map(item => item.data.id)
    const removedEdges = this.edgeLayer.removeByNodes(removedNodeIds)

    if (removedElements.length > 0) {
      this.selection = createSelectionState()
      this.hovered = null
      this.emit({
        type: 'nodes-removed',
        nodeIds: removedNodeIds,
        removedEdgeCount: removedEdges.length,
      })
    }

    return {
      elements: removedElements,
      edges: removedEdges,
      selectionBefore,
    }
  }

  removeBoxes(boxIds: BoxId[]): RemovedSceneSnapshot {
    const selectionBefore = cloneSelectionState(this.selection)
    const removedElements: RemovedSceneElementSnapshot[] = []
    const removedNodeIds: NodeId[] = []

    for (const boxId of boxIds) {
      const removed = this.rootBox.removeWithLocation(boxId)
      if (!removed || !(removed.element instanceof Box)) continue

      removedElements.push({
        data: removed.element.serialize(),
        parentBoxId: removed.parentBoxId,
        index: removed.index,
      })
      removedNodeIds.push(...removed.element.getNodeIdsDeep())
    }

    const removedEdges = this.edgeLayer.removeByNodes(removedNodeIds)
    if (removedElements.length > 0) {
      this.selection = createSelectionState()
      this.hovered = null
      this.emit({
        type: 'boxes-removed',
        boxIds: removedElements.map(item => item.data.id),
        removedBoxCount: removedElements.reduce((total, item) => (
          total + countBoxData(item.data)
        ), 0),
        nodeIds: removedNodeIds,
        removedEdgeCount: removedEdges.length,
      })
    }

    return {
      elements: removedElements,
      edges: removedEdges,
      selectionBefore,
    }
  }

  reparentNodes(assignments: NodeParentAssignment[]) {
    const movedNodeIds: NodeId[] = []

    for (const assignment of assignments) {
      const target = this.rootBox.findBox(assignment.parentBoxId)
      const parent = this.rootBox.findParentBox(assignment.nodeId)
      if (!target || !parent || target.id === parent.id) continue

      const removed = parent.removeWithLocation(assignment.nodeId)
      if (!removed || !(removed.element instanceof BaseNode)) continue
      target.add(removed.element)
      movedNodeIds.push(assignment.nodeId)
    }

    if (movedNodeIds.length > 0) {
      this.emit({
        type: 'nodes-reparented',
        nodeIds: movedNodeIds,
      })
    }
  }

  wrapNodesInGroup(options: {
    groupData: import('../types/flow').BoxData
    groupLocation: SceneElementLocation
    nodeLocations: SceneElementLocation[]
    selection: SelectionState
  }) {
    const parent = this.rootBox.findBox(options.groupLocation.parentBoxId)
    if (!parent || options.nodeLocations.length === 0) return false
    if (options.nodeLocations.some(item => item.parentBoxId !== parent.id)) return false

    const nodes = options.nodeLocations.flatMap((item) => {
      const node = this.getNode(item.elementId)
      return node && this.rootBox.findParentBox(node.id)?.id === parent.id ? [node] : []
    })
    if (nodes.length !== options.nodeLocations.length) return false

    for (const item of [...options.nodeLocations].sort((left, right) => right.index - left.index)) {
      parent.removeWithLocation(item.elementId)
    }

    const group = this.registry.createBox({
      ...structuredClone(options.groupData),
      children: [],
    })
    const nodeMap = new Map(nodes.map(node => [node.id, node]))
    for (const item of [...options.nodeLocations].sort((left, right) => left.index - right.index)) {
      const node = nodeMap.get(item.elementId)
      if (node) group.add(node)
    }
    parent.addAt(group, options.groupLocation.index)
    this.selection = cloneSelectionState(options.selection)
    this.hovered = null
    this.emit({ type: 'document-loaded', uiState: this.getUiState() })
    return true
  }

  unwrapGroup(options: {
    groupId: BoxId
    nodeLocations: SceneElementLocation[]
    selection: SelectionState
  }) {
    const group = this.getBox(options.groupId)
    const parent = this.rootBox.findParentBox(options.groupId)
    if (!group || group.type !== 'group' || !parent) return false

    const children = group.getChildren()
    if (children.some(child => !(child instanceof BaseNode))) return false
    const nodeMap = new Map(children.map(node => [node.id, node as BaseNode]))
    if (
      options.nodeLocations.length !== children.length
      || options.nodeLocations.some(item => !nodeMap.has(item.elementId))
    ) return false

    parent.removeWithLocation(group.id)
    for (const item of [...options.nodeLocations].sort((left, right) => {
      if (left.parentBoxId === right.parentBoxId) return left.index - right.index
      return left.parentBoxId.localeCompare(right.parentBoxId)
    })) {
      const target = this.rootBox.findBox(item.parentBoxId)
      const node = nodeMap.get(item.elementId)
      if (target && node) target.addAt(node, item.index)
    }

    this.selection = cloneSelectionState(options.selection)
    this.hovered = null
    this.emit({ type: 'document-loaded', uiState: this.getUiState() })
    return true
  }

  restoreRemovedSnapshot(snapshot: RemovedSceneSnapshot) {
    const orderedElements = [...snapshot.elements].sort((left, right) => {
      if (left.parentBoxId === right.parentBoxId) return left.index - right.index
      return left.parentBoxId.localeCompare(right.parentBoxId)
    })

    for (const item of orderedElements) {
      const parent = this.rootBox.findBox(item.parentBoxId)
      if (!parent) continue

      const element = 'children' in item.data
        ? this.registry.createBox(item.data)
        : this.registry.createNode(item.data)
      parent.addAt(element, item.index)
    }

    for (const edge of snapshot.edges) {
      this.edgeLayer.addData(edge)
    }

    this.selection = cloneSelectionState(snapshot.selectionBefore)
    this.hovered = null
    this.emit({
      type: 'document-loaded',
      uiState: this.getUiState(),
    })
  }

  select(selection: SelectableRef | null) {
    this.selectMany(selection ? [selection] : [])
  }

  selectMany(items: SelectableRef[], primary: SelectableRef | null = items[0] ?? null) {
    this.updateSelection(createSelectionState(items, primary))
  }

  selectAll() {
    const nodeSelections = this.getNodes()
      .map<SelectableRef>(node => ({ type: 'node', id: node.id }))
    const edgeSelections = this.getEdges()
      .map<SelectableRef>(edge => ({ type: 'edge', id: edge.id }))

    this.selectMany([...nodeSelections, ...edgeSelections])
  }

  addSelection(item: SelectableRef) {
    if (this.isSelected(item)) {
      this.updateSelection(createSelectionState(this.selection.items, item))
      return
    }

    this.updateSelection(createSelectionState([...this.selection.items, item], item))
  }

  toggleSelection(item: SelectableRef) {
    if (!this.isSelected(item)) {
      this.addSelection(item)
      return
    }

    const nextItems = this.selection.items.filter(selectedItem => !this.isSameSelection(selectedItem, item))
    const nextPrimary = this.isSameSelection(this.selection.primary, item)
      ? nextItems[0] ?? null
      : this.selection.primary

    this.updateSelection(createSelectionState(nextItems, nextPrimary))
  }

  selectNodesInRect(rect: Rect) {
    const selectedNodes = this.getNodes()
      .filter((node) => {
        return rectsIntersect(rect, node.getBounds())
      })
      .map<SelectableRef>(node => ({ type: 'node', id: node.id }))

    this.selectMany(selectedNodes)
  }

  setHovered(hovered: SelectableRef | null) {
    if (this.isSameSelection(this.hovered, hovered)) return
    this.hovered = hovered
    this.emit({ type: 'hover-changed', hovered })
  }

  clearSelection() {
    this.select(null)
  }

  hitTest(point: Point): HitTestResult {
    const nodes = [...this.getNodes()].reverse()

    for (const node of nodes) {
      const view = this.registry.getNodeView(node.type)
      const port = view.hitTestPort(node, point)
      if (port) {
        return { type: 'port', nodeId: node.id, portId: port.id }
      }
    }

    for (const node of nodes) {
      const view = this.registry.getNodeView(node.type)
      if (view.hitTest(node, point)) {
        return { type: 'node', id: node.id }
      }
    }

    const boxes = [...this.getBoxes()].reverse()
    for (const box of boxes) {
      const view = this.registry.getBoxView(box.type)
      if (view.hitTest(box, point)) {
        return { type: 'box', id: box.id }
      }
    }

    const edges = [...this.getEdges()].reverse()
    for (const edge of edges) {
      const edgeContext = this.createEdgeDrawContext(edge)
      if (!edgeContext) continue

      const view = this.registry.getEdgeView(edge.id)
      if (view.hitTest(edge, point, edgeContext)) {
        return { type: 'edge', id: edge.id }
      }
    }

    return null
  }

  getNode(id: NodeId) {
    const found = this.rootBox.find(id)
    return found instanceof BaseNode ? found : null
  }

  getBox(id: BoxId) {
    const found = this.rootBox.findBox(id)
    return found?.type === 'root' ? null : found
  }

  getBoxData(id: BoxId) {
    return this.getBox(id)?.serialize() ?? null
  }

  getParentBoxId(id: string) {
    return this.rootBox.findParentBox(id)?.id ?? null
  }

  getElementLocation(id: string): SceneElementLocation | null {
    const parent = this.rootBox.findParentBox(id)
    if (!parent) return null
    const index = parent.getChildren().findIndex(child => child.id === id)
    return index >= 0
      ? { elementId: id, parentBoxId: parent.id, index }
      : null
  }

  getDropTargetBoxId(point: Point) {
    const boxes = [...this.getBoxes()].reverse()
    for (const box of boxes) {
      if (box.type !== 'lane' && box.type !== 'group' && box.type !== 'layer') continue
      const view = this.registry.getBoxView(box.type)
      if (view.containsContentPoint(box, point)) return box.id
    }
    return 'root'
  }

  getNodes() {
    return this.rootBox.getNodesDeep()
  }

  getRootNodes() {
    return this.rootBox.getNodes()
  }

  getNodeRect(id: NodeId): Rect | null {
    const node = this.getNode(id)
    if (!node) return null

    return node.getBounds()
  }

  getNodeRawRect(id: NodeId): Rect | null {
    const node = this.getNode(id)
    if (!node) return null

    return node.getRawRect()
  }

  getNodeRects(excludedNodeIds: NodeId[] = []): Rect[] {
    const excluded = new Set(excludedNodeIds)

    return this.getNodes()
      .filter(node => !excluded.has(node.id))
      .map(node => node.getBounds())
  }

  getSelectedNodeIds(): NodeId[] {
    return this.selection.items
      .filter((item): item is Extract<SelectableRef, { type: 'node' }> => item.type === 'node')
      .map(item => item.id)
  }

  getSelectedNodeRects() {
    return this.getSelectedNodeIds()
      .map((nodeId) => {
        const rect = this.getNodeRect(nodeId)
        if (!rect) return null

        return {
          nodeId,
          rect,
        }
      })
      .filter((item): item is { nodeId: NodeId; rect: Rect } => Boolean(item))
  }

  getSelectedNodeBounds(): Rect | null {
    const rects = this.getSelectedNodeRects().map(item => item.rect)

    if (rects.length < 2) return null

    return getUnionBounds(rects)
  }

  getContentBounds(): Rect {
    return this.rootBox.getBounds()
  }

  getSelection(): SelectionState {
    return cloneSelectionState(this.selection)
  }

  getBoxes() {
    return this.rootBox.getBoxesDeep()
  }

  getEdges() {
    return this.edgeLayer.getEdges()
  }

  getEdgeData(id: EdgeId) {
    return this.edgeLayer.get(id)?.serialize() ?? null
  }

  updateEdgeData(edgeData: FlowEdge) {
    const edge = this.edgeLayer.get(edgeData.id)
    if (!edge) return null

    edge.updateData(edgeData)
    const data = edge.serialize()
    this.emit({
      type: 'edge-updated',
      edge: data,
    })
    return data
  }

  canConnect(source: Endpoint, target: Endpoint) {
    if (source.nodeId === target.nodeId && source.portId === target.portId) return false

    const sourcePort = this.getEndpointPort(source)
    const targetPort = this.getEndpointPort(target)
    if (!sourcePort || !targetPort) return false

    return !this.edgeLayer.hasConnection({
      id: '__connection-check__',
      source,
      target,
    })
  }

  getEndpointPort(endpoint: Endpoint): FlowPort | null {
    const node = this.getNode(endpoint.nodeId)
    if (!node) return null
    return node.getPorts().find(port => port.id === endpoint.portId) ?? null
  }

  getEndpointPoint(endpoint: Endpoint): Point | null {
    const node = this.getNode(endpoint.nodeId)
    if (!node) return null

    const port = node.getPorts().find(item => item.id === endpoint.portId)
    if (!port) return null

    const view = this.registry.getNodeView(node.type)
    return view.getPortPosition(node, port)
  }

  createEdgeDrawContext(edge: BaseEdge, renderMode: RenderMode = 'editor') {
    const sourcePoint = this.getEndpointPoint(edge.source)
    const targetPoint = this.getEndpointPoint(edge.target)
    if (!sourcePoint || !targetPoint) return null
    const sourceRect = this.getNodeRect(edge.source.nodeId)
    const targetRect = this.getNodeRect(edge.target.nodeId)

    return {
      renderMode,
      selected: this.isSelected({ type: 'edge', id: edge.id }),
      hovered: this.isHovered({ type: 'edge', id: edge.id }),
      sourcePoint,
      targetPoint,
      sourceRect,
      targetRect,
      obstacles: [sourceRect, targetRect].filter((rect): rect is Rect => Boolean(rect)),
      theme: this.getTheme(),
      viewport: this.getViewport(),
    }
  }

  getViewport() {
    return this.viewport
  }

  setViewport(viewport: ViewportData) {
    if (
      this.viewport.x === viewport.x
      && this.viewport.y === viewport.y
      && this.viewport.zoom === viewport.zoom
    ) {
      return
    }

    this.viewport = { ...viewport }
    this.emit({
      type: 'viewport-changed',
      viewport: this.getViewport(),
    })
  }

  getTheme() {
    return this.theme
  }

  isSelected(selection: SelectableRef) {
    return this.selection.items.some(item => this.isSameSelection(item, selection))
  }

  isHovered(selection: SelectableRef) {
    return this.isSameSelection(this.hovered, selection)
  }

  toDocument(): FlowDocument {
    return {
      root: this.rootBox.serialize(),
      edges: this.edgeLayer.serialize(),
      viewport: this.viewport,
    }
  }

  load(document: FlowDocument) {
    this.rootBox = this.registry.createBox(document.root) as RootBox
    this.edgeLayer = this.registry.createEdgeLayer(document.edges)
    this.viewport = document.viewport ?? { x: 0, y: 0, zoom: 1 }
    this.selection = createSelectionState()
    this.hovered = null
    this.emit({
      type: 'document-loaded',
      uiState: this.getUiState(),
    })
  }

  getUiState(): EditorUiState {
    return {
      selection: this.selection,
      hovered: this.hovered,
      viewport: this.getViewport(),
      selectedNode: this.getSelectedNodeData(),
      selectedEdge: this.getSelectedEdgeData(),
      selectedBox: this.getSelectedBoxData(),
      summary: this.getCanvasSummary(),
    }
  }

  getSelectedNodeData() {
    if (this.selection.primary?.type !== 'node') return null
    return this.getNodeData(this.selection.primary.id)
  }

  getSelectedEdgeData() {
    if (this.selection.primary?.type !== 'edge') return null
    return this.getEdgeData(this.selection.primary.id)
  }

  getSelectedBoxData() {
    if (this.selection.primary?.type !== 'box') return null
    return this.getBoxData(this.selection.primary.id)
  }

  getNodeData(id: NodeId) {
    return this.getNode(id)?.serialize() ?? null
  }

  getCanvasSummary(): SceneSummary {
    return {
      nodeCount: this.getNodes().length,
      edgeCount: this.getEdges().length,
      boxCount: this.getBoxes().length,
    }
  }

  subscribe(listener: (event: SceneEvent) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: SceneEvent) {
    for (const listener of this.listeners) listener(event)
  }

  private updateSelection(selection: SelectionState) {
    this.selection = selection
    this.emit({
      type: 'selection-changed',
      selection: this.selection,
      selectedNode: this.getSelectedNodeData(),
      selectedEdge: this.getSelectedEdgeData(),
      selectedBox: this.getSelectedBoxData(),
    })
  }

  private isSameSelection(left: SelectableRef | null, right: SelectableRef | null) {
    if (!left || !right) return left === right
    return left.type === right.type && left.id === right.id
  }
}

function createSelectionState(items: SelectableRef[] = [], primary: SelectableRef | null = items[0] ?? null): SelectionState {
  const uniqueItems = uniqueSelectableRefs(items)
  const normalizedPrimary = primary && uniqueItems.some(item => isSameSelectableRef(item, primary))
    ? primary
    : uniqueItems[0] ?? null

  return {
    items: uniqueItems,
    primary: normalizedPrimary,
  }
}

function cloneSelectionState(selection: SelectionState): SelectionState {
  return {
    items: selection.items.map(item => ({ ...item } as SelectableRef)),
    primary: selection.primary ? { ...selection.primary } : null,
  }
}

function uniqueSelectableRefs(items: SelectableRef[]) {
  const uniqueItems: SelectableRef[] = []
  for (const item of items) {
    if (!uniqueItems.some(uniqueItem => isSameSelectableRef(uniqueItem, item))) {
      uniqueItems.push(item)
    }
  }
  return uniqueItems
}

function isSameSelectableRef(left: SelectableRef, right: SelectableRef) {
  return left.type === right.type && left.id === right.id
}

function countBoxData(data: SceneElementData): number {
  if (!('children' in data)) return 0
  return 1 + data.children.reduce((total, child) => total + countBoxData(child), 0)
}
