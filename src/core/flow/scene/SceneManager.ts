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
  SceneSnapshot,
  Selection,
  ViewportData,
} from '../types/flow'
import { defaultTheme } from '../types/flow'

export class SceneManager {
  private rootBox = new RootBox()
  private edgeLayer = new EdgeLayer()
  private selection: Selection = null
  private hovered: Selection = null
  private listeners = new Set<(snapshot: SceneSnapshot) => void>()
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
    this.select({ type: 'node', id: node.id })
  }

  moveNode(id: NodeId, position: Point) {
    const node = this.rootBox.find(id)
    if (node instanceof BaseNode) {
      node.moveTo(position)
      this.emitChange()
    }
  }

  removeSelection() {
    if (!this.selection) return

    if (this.selection.type === 'node') {
      this.rootBox.remove(this.selection.id)
      this.edgeLayer.removeByNode(this.selection.id)
    }

    this.selection = null
    this.hovered = null
    this.emitChange()
  }

  select(selection: Selection) {
    this.selection = selection
    this.emitChange()
  }

  setHovered(hovered: Selection) {
    if (this.isSameSelection(this.hovered, hovered)) return
    this.hovered = hovered
    this.emitChange()
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
    this.emitChange()
  }

  getSnapshot(): SceneSnapshot {
    return {
      document: this.toDocument(),
      selection: this.selection,
      hovered: this.hovered,
    }
  }

  subscribe(listener: (snapshot: SceneSnapshot) => void) {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => this.listeners.delete(listener)
  }

  private emitChange() {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) listener(snapshot)
  }

  private isSameSelection(left: Selection, right: Selection) {
    if (!left || !right) return left === right
    return left.type === right.type && left.id === right.id
  }
}
