import { BaseNode } from '../elements/BaseNode'
import { ElementRegistry } from '../elements/ElementRegistry'
import { EdgeLayer } from './EdgeLayer'
import { RootBox } from './RootBox'
import type {
  BoxId,
  FlowDocument,
  FlowTheme,
  HitTestResult,
  NodeId,
  Point,
  EditorUiState,
  SceneEvent,
  SceneSummary,
  Selection,
  ViewportData,
} from '../types/flow'
import { defaultTheme } from '../types/flow'

export class SceneManager {
  private rootBox = new RootBox()
  private edgeLayer = new EdgeLayer()
  private selection: Selection = null
  private hovered: Selection = null
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
    this.selection = { type: 'node', id: node.id }
    this.hovered = null
    this.emit({
      type: 'node-added',
      node: node.serialize(),
      selection: this.selection,
    })
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

  removeSelection() {
    if (!this.selection) return

    if (this.selection.type === 'node') {
      this.rootBox.remove(this.selection.id)
      const removedEdgeCount = this.edgeLayer.removeByNode(this.selection.id)
      const nodeId = this.selection.id
      this.selection = null
      this.hovered = null
      this.emit({
        type: 'node-removed',
        nodeId,
        removedEdgeCount,
      })
      return
    }

    this.selection = null
    this.hovered = null
    this.emit({
      type: 'selection-changed',
      selection: null,
      selectedNode: null,
    })
  }

  select(selection: Selection) {
    this.selection = selection
    this.emit({
      type: 'selection-changed',
      selection,
      selectedNode: this.getSelectedNodeData(),
    })
  }

  setHovered(hovered: Selection) {
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

  isSelected(selection: Exclude<Selection, null>) {
    return this.isSameSelection(this.selection, selection)
  }

  isHovered(selection: Exclude<Selection, null>) {
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
    this.selection = null
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
    if (this.selection?.type !== 'node') return null
    return this.getNodeData(this.selection.id)
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

  private isSameSelection(left: Selection, right: Selection) {
    if (!left || !right) return left === right
    return left.type === right.type && left.id === right.id
  }
}
