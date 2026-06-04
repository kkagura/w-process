import { ElementRegistry } from './elements/ElementRegistry'
import { InteractionController } from './interaction/InteractionController'
import { CanvasLayerManager } from './renderer/CanvasLayerManager'
import { CanvasRenderer } from './renderer/CanvasRenderer'
import { SceneManager } from './scene/SceneManager'
import { getArrangedNodeMoves } from './alignment/arrangeSelection'
import { CreateNodeCommand } from './commands/CreateNodeCommand'
import { HistoryManager } from './commands/HistoryManager'
import { MoveNodesCommand } from './commands/MoveNodesCommand'
import { UpdateEdgeDataCommand } from './commands/UpdateEdgeDataCommand'
import { UpdateNodeDataCommand } from './commands/UpdateNodeDataCommand'
import { UpdateNodeLabelCommand } from './commands/UpdateNodeLabelCommand'
import type { HistoryState } from './commands/SceneCommand'
import type {
  EdgeId,
  EdgeLineStyleData,
  EdgeRouteData,
  ElementTemplate,
  FlowDocument,
  FlowEdge,
  FlowNode,
  NodeBorderStyleData,
  NodeFillStyleData,
  NodeId,
  NodeTextStyleData,
  Point,
  SelectionArrangeAction,
  Size,
} from './types/flow'
import { findElementTemplate } from './constants/elementTemplates'
import { createId } from './utils/ids'
import { CoordinateTransformer } from './viewport/CoordinateTransformer'

export interface FlowEditorCoreOptions {
  backgroundCanvas: HTMLCanvasElement
  mainCanvas: HTMLCanvasElement
}

export class FlowEditorCore {
  readonly registry = ElementRegistry.createDefault()
  readonly scene = new SceneManager(this.registry)
  readonly history = new HistoryManager(this.scene)

  private layers: CanvasLayerManager
  private renderer: CanvasRenderer
  private interaction: InteractionController
  private resizeObserver: ResizeObserver | null = null
  private mainFrame = 0
  private backgroundFrame = 0
  private unsubscribeScene: (() => void) | null = null

  constructor(options: FlowEditorCoreOptions) {
    this.layers = new CanvasLayerManager(options)
    this.renderer = new CanvasRenderer(this.registry)
    this.interaction = new InteractionController({
      canvas: options.mainCanvas,
      scene: this.scene,
      history: this.history,
      requestRender: options => this.requestRender(options),
    })

    options.mainCanvas.addEventListener('dragover', this.handleDragOver)
    options.mainCanvas.addEventListener('drop', this.handleDrop)

    this.layers.syncSize()
    this.renderBackground()
    this.renderMain()

    this.unsubscribeScene = this.scene.subscribe((event) => {
      if (event.type === 'viewport-changed' || event.type === 'document-loaded') {
        this.requestRender({ background: true, main: true })
        return
      }

      this.requestMainRender()
    })
    this.resizeObserver = new ResizeObserver(() => {
      if (this.layers.syncSize()) {
        this.requestBackgroundRender()
        this.requestMainRender()
      }
    })
    this.resizeObserver.observe(options.mainCanvas)
  }

  dispose() {
    this.interaction.dispose()
    this.layers.mainCanvas.removeEventListener('dragover', this.handleDragOver)
    this.layers.mainCanvas.removeEventListener('drop', this.handleDrop)
    this.resizeObserver?.disconnect()
    this.unsubscribeScene?.()
    cancelAnimationFrame(this.mainFrame)
    cancelAnimationFrame(this.backgroundFrame)
  }

  requestBackgroundRender() {
    cancelAnimationFrame(this.backgroundFrame)
    this.backgroundFrame = requestAnimationFrame(() => this.renderBackground())
  }

  requestMainRender() {
    cancelAnimationFrame(this.mainFrame)
    this.mainFrame = requestAnimationFrame(() => this.renderMain())
  }

  undo() {
    this.history.undo()
  }

  redo() {
    this.history.redo()
  }

  arrangeSelection(action: SelectionArrangeAction) {
    const nodes = this.scene.getSelectedNodeRects()
    const after = getArrangedNodeMoves(action, nodes)
    if (after.length === 0) return

    const before = nodes.map(node => ({
      nodeId: node.nodeId,
      position: {
        x: node.rect.x,
        y: node.rect.y,
      },
    }))

    if (!MoveNodesCommand.hasChanges(before, after)) return

    this.history.execute(new MoveNodesCommand(before, after))
  }

  updateNodeLabel(nodeId: NodeId, label: string) {
    const node = this.scene.getNodeData(nodeId)
    if (!node || node.label === label) return

    this.history.execute(new UpdateNodeLabelCommand(nodeId, node.label, label))
  }

  updateNodePosition(nodeId: NodeId, position: Point) {
    const node = this.scene.getNodeData(nodeId)
    if (!node || pointsEqual(node.position, position)) return

    const nextNode: FlowNode = {
      ...node,
      position: { ...position },
    }
    this.history.execute(new UpdateNodeDataCommand(node, nextNode))
  }

  updateNodeSize(nodeId: NodeId, size: Size) {
    const node = this.scene.getNodeData(nodeId)
    if (!node || sizesEqual(node.size, size)) return

    const nextNode = resizeNodeData(node, size)
    this.history.execute(new UpdateNodeDataCommand(node, nextNode))
  }

  updateNodeTextStyle(nodeId: NodeId, textStyle: Partial<NodeTextStyleData>) {
    this.updateNodeProps(nodeId, 'textStyle', textStyle)
  }

  updateNodeBorderStyle(nodeId: NodeId, borderStyle: Partial<NodeBorderStyleData>) {
    this.updateNodeProps(nodeId, 'borderStyle', borderStyle)
  }

  updateNodeFillStyle(nodeId: NodeId, fillStyle: Partial<NodeFillStyleData>) {
    this.updateNodeProps(nodeId, 'fillStyle', fillStyle)
  }

  updateEdgeLabel(edgeId: EdgeId, label: string) {
    const edge = this.scene.getEdgeData(edgeId)
    const nextLabel = label.trim()
    if (!edge || (edge.label ?? '') === nextLabel) return

    this.history.execute(new UpdateEdgeDataCommand(edge, {
      ...edge,
      label: nextLabel || undefined,
    }))
  }

  updateEdgeLineStyle(edgeId: EdgeId, lineStyle: Partial<EdgeLineStyleData>) {
    this.updateEdgeProps(edgeId, 'lineStyle', lineStyle)
  }

  updateEdgeRoute(edgeId: EdgeId, route: EdgeRouteData) {
    this.updateEdgeProps(edgeId, 'route', { ...route })
  }

  exportDocument(): FlowDocument {
    return this.scene.toDocument()
  }

  importDocument(document: FlowDocument) {
    this.scene.load(document)
    this.history.clear()
    this.requestRender({ background: true, main: true })
  }

  markSaved() {
    this.history.markSaved()
  }

  getHistoryState(): HistoryState {
    return this.history.getState()
  }

  subscribeHistory(listener: (state: HistoryState) => void) {
    return this.history.subscribe(listener)
  }

  private requestRender(options: { background?: boolean; main?: boolean } = { main: true }) {
    if (options.background) {
      this.requestBackgroundRender()
    }

    if (options.main ?? !options.background) {
      this.requestMainRender()
    }
  }

  private renderBackground() {
    this.renderer.renderBackground({
      layers: this.layers,
      scene: this.scene,
      interaction: {
        draggingNodeId: this.interaction.getDraggingNodeId(),
        selectionRect: this.interaction.getSelectionRect(),
        snapGuides: this.interaction.getSnapGuides(),
        pendingEdge: this.interaction.getPendingEdge(),
      },
    })
  }

  private renderMain() {
    this.renderer.renderMain({
      layers: this.layers,
      scene: this.scene,
      interaction: {
        draggingNodeId: this.interaction.getDraggingNodeId(),
        selectionRect: this.interaction.getSelectionRect(),
        snapGuides: this.interaction.getSnapGuides(),
        pendingEdge: this.interaction.getPendingEdge(),
      },
    })
  }

  private handleDragOver = (event: DragEvent) => {
    event.preventDefault()
  }

  private handleDrop = (event: DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer?.getData('application/x-flow-node')
    if (!type) return

    const template = findElementTemplate(type)
    if (!template) return

    const worldPoint = CoordinateTransformer.clientToWorld(
      event,
      this.layers.mainCanvas,
      this.scene.getViewport(),
    )
    this.createNodeFromTemplate(template, {
      x: worldPoint.x - template.defaultSize.width / 2,
      y: worldPoint.y - template.defaultSize.height / 2,
    })
  }

  private createNodeFromTemplate(template: ElementTemplate, position: Point) {
    const nodeId = createId('node')
    const nodeData: FlowNode = {
      id: nodeId,
      type: template.type,
      label: template.label,
      position,
      size: template.defaultSize,
      ports: template.ports.map(port => ({
        id: createId('port'),
        nodeId,
        templateId: port.id,
        label: port.label,
        offset: port.offset,
      })),
      props: { ...(template.defaultProps ?? {}) },
    }

    this.history.execute(new CreateNodeCommand(nodeData))
  }

  private updateNodeProps(nodeId: NodeId, propKey: string, propValue: Record<string, unknown>) {
    const node = this.scene.getNodeData(nodeId)
    if (!node) return

    const currentValue = isRecord(node.props[propKey]) ? node.props[propKey] : {}
    const nextValue = {
      ...currentValue,
      ...propValue,
    }
    if (recordsEqual(currentValue, nextValue)) return

    const nextNode: FlowNode = {
      ...node,
      props: {
        ...node.props,
        [propKey]: nextValue,
      },
    }
    this.history.execute(new UpdateNodeDataCommand(node, nextNode))
  }

  private updateEdgeProps(edgeId: EdgeId, propKey: string, propValue: Record<string, unknown>) {
    const edge = this.scene.getEdgeData(edgeId)
    if (!edge) return

    const currentProps = edge.props ?? {}
    const currentValue = isRecord(currentProps[propKey]) ? currentProps[propKey] : {}
    const nextValue = {
      ...currentValue,
      ...propValue,
    }
    if (recordsEqual(currentValue, nextValue)) return

    const nextEdge: FlowEdge = {
      ...edge,
      props: {
        ...currentProps,
        [propKey]: nextValue,
      },
    }
    this.history.execute(new UpdateEdgeDataCommand(edge, nextEdge))
  }
}

function resizeNodeData(node: FlowNode, size: Size): FlowNode {
  const scaleX = node.size.width === 0 ? 1 : size.width / node.size.width
  const scaleY = node.size.height === 0 ? 1 : size.height / node.size.height

  return {
    ...node,
    size: { ...size },
    ports: node.ports.map(port => ({
      ...port,
      offset: {
        x: port.offset.x * scaleX,
        y: port.offset.y * scaleY,
      },
    })),
  }
}

function pointsEqual(left: Point, right: Point) {
  return left.x === right.x && left.y === right.y
}

function sizesEqual(left: Size, right: Size) {
  return left.width === right.width && left.height === right.height
}

function recordsEqual(left: Record<string, unknown>, right: Record<string, unknown>) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false

  return leftKeys.every(key => left[key] === right[key])
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
