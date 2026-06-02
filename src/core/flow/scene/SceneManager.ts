import { BaseNode } from '../elements/BaseNode'
import { ElementRegistry } from '../elements/ElementRegistry'
import { EdgeLayer } from './EdgeLayer'
import { RootBox } from './RootBox'
import type {
  BoxId,
  FlowEdge,
  FlowDocument,
  FlowNode,
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
  SceneElementData,
  ViewportData,
} from '../types/flow'
import { defaultTheme } from '../types/flow'
import { rectsIntersect } from '../utils/geometry'

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

  removeSelection() {
    if (this.selection.items.length === 0) return

    const nodeIds = this.selection.items
      .filter((item): item is Extract<SelectableRef, { type: 'node' }> => item.type === 'node')
      .map(item => item.id)

    if (nodeIds.length > 0) {
      this.removeNodes(nodeIds)
      return
    }

    this.selection = createSelectionState()
    this.hovered = null
    this.emit({
      type: 'selection-changed',
      selection: this.selection,
      selectedNode: null,
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

  selectMany(items: SelectableRef[], primary = items[0] ?? null) {
    this.updateSelection(createSelectionState(items, primary))
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
        const position = node.getPosition()
        const size = node.getSize()
        return rectsIntersect(rect, { ...position, ...size })
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

    return null
  }

  getNode(id: NodeId) {
    const found = this.rootBox.find(id)
    return found instanceof BaseNode ? found : null
  }

  getNodes() {
    return this.rootBox.getNodesDeep()
  }

  getSelectedNodeIds(): NodeId[] {
    return this.selection.items
      .filter((item): item is Extract<SelectableRef, { type: 'node' }> => item.type === 'node')
      .map(item => item.id)
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
      summary: this.getCanvasSummary(),
    }
  }

  getSelectedNodeData() {
    if (this.selection.primary?.type !== 'node') return null
    return this.getNodeData(this.selection.primary.id)
  }

  getNodeData(id: NodeId) {
    return this.getNode(id)?.serialize() ?? null
  }

  getCanvasSummary(): SceneSummary {
    return {
      nodeCount: this.getNodes().length,
      edgeCount: this.getEdges().length,
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
