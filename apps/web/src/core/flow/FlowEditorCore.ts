// @env browser

import { InteractionController } from './interaction/InteractionController'
import { CanvasLayerManager } from './renderer/CanvasLayerManager'
import { CoordinateTransformer } from './viewport/CoordinateTransformer'
import {
  addLaneData,
  CanvasRenderer,
  clampZoom,
  createArchitectureLayerData,
  createAutoLayoutPlan,
  createGroupData,
  createId,
  createSwimlaneData,
  CreateBoxCommand,
  CreateNodeCommand,
  DEFAULT_SWIMLANE_CROSS_SIZE,
  DEFAULT_SWIMLANE_VERTICAL_HEIGHT,
  ElementRegistry,
  findElementTemplate,
  getArrangedNodeMoves,
  getAutoLayoutMoves,
  getZoomedViewportAtCanvasPoint,
  GroupSelectionCommand,
  HistoryManager,
  HORIZONTAL_LANE_SIZE,
  MIN_ARCHITECTURE_LAYER_HEIGHT,
  MIN_ARCHITECTURE_LAYER_WIDTH,
  MIN_GROUP_HEIGHT,
  MIN_GROUP_WIDTH,
  MoveNodesCommand,
  normalizeAngle,
  removeLaneData,
  resizeSwimlaneData,
  SceneManager,
  SWIMLANE_HEADER_SIZE,
  translateBoxData,
  UngroupCommand,
  UpdateBoxDataCommand,
  UpdateEdgeDataCommand,
  UpdateNodeDataCommand,
  UpdateNodeLabelCommand,
  VERTICAL_LANE_SIZE,
} from '@w-process/flow-core'
import type {
  BoxId,
  BoxTemplate,
  EdgeId,
  EdgeLineStyleData,
  EdgeRouteData,
  ElementTemplate,
  EditorFeedbackEvent,
  FlowDocument,
  FlowEdge,
  FlowNode,
  GroupLayoutData,
  GroupTitleStyleData,
  HistoryState,
  NodeBorderStyleData,
  NodeFillStyleData,
  NodeId,
  NodeTextStyleData,
  Point,
  Rect,
  SelectionArrangeAction,
  Size,
} from '@w-process/flow-core'

const TOOLBAR_ZOOM_FACTOR = 1.2
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 }
const FIT_CONTENT_PADDING = 64

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
  private feedbackListeners = new Set<(event: EditorFeedbackEvent) => void>()

  constructor(options: FlowEditorCoreOptions) {
    this.layers = new CanvasLayerManager(options)
    this.renderer = new CanvasRenderer(this.registry)
    this.interaction = new InteractionController({
      canvas: options.mainCanvas,
      scene: this.scene,
      history: this.history,
      requestRender: options => this.requestRender(options),
      emitFeedback: event => this.emitFeedback(event),
      groupSelection: () => this.groupSelection(),
      ungroupSelection: () => this.ungroupSelection(),
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

  canGroupSelection() {
    return this.getGroupSelectionContext() !== null
  }

  canUngroupSelection() {
    const selection = this.scene.getSelection()
    if (selection.items.length !== 1 || selection.primary?.type !== 'box') return false
    const box = this.scene.getBoxData(selection.primary.id)
    return box?.type === 'group' && box.children.every(child => !('children' in child))
  }

  groupSelection() {
    const context = this.getGroupSelectionContext()
    if (!context) return

    const groupData = createGroupData(context.nodes)
    this.history.execute(new GroupSelectionCommand({
      groupData,
      groupLocation: {
        elementId: groupData.id,
        parentBoxId: context.parentBoxId,
        index: Math.min(...context.locations.map(item => item.index)),
      },
      nodeLocations: context.locations,
      selectionBefore: this.scene.getSelection(),
    }))
  }

  ungroupSelection() {
    const selection = this.scene.getSelection()
    if (selection.items.length !== 1 || selection.primary?.type !== 'box') return
    const groupData = this.scene.getBoxData(selection.primary.id)
    const groupLocation = this.scene.getElementLocation(selection.primary.id)
    if (!groupData || groupData.type !== 'group' || !groupLocation) return
    if (groupData.children.some(child => 'children' in child)) return

    this.history.execute(new UngroupCommand({
      groupData,
      groupLocation,
      nodeLocations: groupData.children.map((node, index) => ({
        elementId: node.id,
        parentBoxId: groupLocation.parentBoxId,
        index: groupLocation.index + index,
      })),
      selectionBefore: selection,
    }))
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

  canAutoLayout() {
    return this.getAutoLayoutPlan().eligibleNodeCount >= 2
  }

  autoLayout() {
    const plan = this.getAutoLayoutPlan()
    if (plan.groups.length === 0) {
      this.emitFeedback({
        type: 'auto-layout-skipped',
        reason: 'insufficient-sibling-nodes',
      })
      return
    }

    const after = plan.groups.flatMap(group => getAutoLayoutMoves({
      nodes: group.nodes,
      edges: group.edges,
    }))
    const nodeMap = new Map(this.scene.getNodes().map(node => [node.id, node]))
    const before = after.flatMap((move) => {
      const node = nodeMap.get(move.nodeId)
      return node
        ? [{
            nodeId: node.id,
            position: node.getPosition(),
          }]
        : []
    })

    if (!MoveNodesCommand.hasChanges(before, after)) {
      this.emitFeedback({
        type: 'auto-layout-skipped',
        reason: 'unchanged',
      })
      return
    }

    this.history.execute(new MoveNodesCommand(before, after))
    this.emitFeedback({
      type: 'auto-layout-applied',
      nodeCount: after.length,
      groupCount: plan.groups.length,
    })
  }

  zoomIn() {
    this.zoomBy(TOOLBAR_ZOOM_FACTOR)
  }

  zoomOut() {
    this.zoomBy(1 / TOOLBAR_ZOOM_FACTOR)
  }

  resetView() {
    this.scene.setViewport(DEFAULT_VIEWPORT)
    this.requestRender({ background: true, main: true })
  }

  fitContent() {
    if (this.scene.getNodes().length === 0 && this.scene.getBoxes().length === 0) return

    const rect = this.layers.mainCanvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const bounds = this.scene.getContentBounds()
    const availableWidth = Math.max(1, rect.width - FIT_CONTENT_PADDING * 2)
    const availableHeight = Math.max(1, rect.height - FIT_CONTENT_PADDING * 2)
    const zoom = clampZoom(Math.min(
      availableWidth / Math.max(1, bounds.width),
      availableHeight / Math.max(1, bounds.height),
    ))

    this.scene.setViewport({
      x: rect.width / 2 - (bounds.x + bounds.width / 2) * zoom,
      y: rect.height / 2 - (bounds.y + bounds.height / 2) * zoom,
      zoom,
    })
    this.requestRender({ background: true, main: true })
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

  updateNodeRotation(nodeId: NodeId, rotation: number) {
    const node = this.scene.getNodeData(nodeId)
    if (!node) return

    const nextRotation = normalizeAngle(rotation)
    if (normalizeAngle(node.rotation) === nextRotation) return

    this.history.execute(new UpdateNodeDataCommand(node, {
      ...node,
      rotation: nextRotation,
    }))
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

  updateBoxLabel(boxId: BoxId, label: string) {
    const box = this.scene.getBoxData(boxId)
    const nextLabel = label.trim()
    if (!box || !nextLabel || box.label === nextLabel) return

    this.history.execute(new UpdateBoxDataCommand(box, {
      ...box,
      label: nextLabel,
    }))
  }

  updateGroupGeometry(boxId: BoxId, rect: Rect) {
    const box = this.scene.getBoxData(boxId)
    if (!box || (box.type !== 'group' && box.type !== 'layer')) return

    const minWidth = box.type === 'layer' ? MIN_ARCHITECTURE_LAYER_WIDTH : MIN_GROUP_WIDTH
    const minHeight = box.type === 'layer' ? MIN_ARCHITECTURE_LAYER_HEIGHT : MIN_GROUP_HEIGHT

    const position = {
      x: Number.isFinite(rect.x) ? rect.x : box.position.x,
      y: Number.isFinite(rect.y) ? rect.y : box.position.y,
    }
    const moved = translateBoxData(box, {
      x: position.x - box.position.x,
      y: position.y - box.position.y,
    })
    const next = {
      ...moved,
      size: {
        width: Math.max(minWidth, Number.isFinite(rect.width) ? rect.width : box.size.width),
        height: Math.max(minHeight, Number.isFinite(rect.height) ? rect.height : box.size.height),
      },
    }
    if (
      next.position.x === box.position.x
      && next.position.y === box.position.y
      && next.size.width === box.size.width
      && next.size.height === box.size.height
    ) return

    this.history.execute(new UpdateBoxDataCommand(box, next))
  }

  updateGroupFillStyle(boxId: BoxId, fillStyle: Partial<NodeFillStyleData>) {
    this.updateBoxProps(boxId, 'fillStyle', fillStyle)
  }

  updateGroupBorderStyle(boxId: BoxId, borderStyle: Partial<NodeBorderStyleData>) {
    this.updateBoxProps(boxId, 'borderStyle', borderStyle)
  }

  updateGroupTitleStyle(boxId: BoxId, titleStyle: Partial<GroupTitleStyleData>) {
    this.updateBoxProps(boxId, 'titleStyle', titleStyle)
  }

  updateGroupLayout(boxId: BoxId, layout: Partial<GroupLayoutData>) {
    this.updateBoxProps(boxId, 'layout', layout)
  }

  updateSwimlaneSize(boxId: BoxId, size: Size) {
    const box = this.scene.getBoxData(boxId)
    if (!box || box.type !== 'swimlane') return

    const next = resizeSwimlaneData(box, {
      ...box.position,
      ...size,
    })
    if (sizesEqual(box.size, next.size)) return

    this.history.execute(new UpdateBoxDataCommand(box, next))
  }

  addSwimlaneLane(boxId: BoxId) {
    const box = this.scene.getBoxData(boxId)
    if (!box || box.type !== 'swimlane') return

    this.history.execute(new UpdateBoxDataCommand(box, addLaneData(box)))
  }

  removeSwimlaneLane(laneId: BoxId) {
    const parentBoxId = this.scene.getParentBoxId(laneId)
    if (!parentBoxId) return
    const swimlane = this.scene.getBoxData(parentBoxId)
    if (!swimlane || swimlane.type !== 'swimlane') return

    const next = removeLaneData(swimlane, laneId)
    if (!next) return
    this.history.execute(new UpdateBoxDataCommand(swimlane, next))
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

  subscribeFeedback(listener: (event: EditorFeedbackEvent) => void) {
    this.feedbackListeners.add(listener)
    return () => this.feedbackListeners.delete(listener)
  }

  private requestRender(options: { background?: boolean; main?: boolean } = { main: true }) {
    if (options.background) {
      this.requestBackgroundRender()
    }

    if (options.main ?? !options.background) {
      this.requestMainRender()
    }
  }

  private emitFeedback(event: EditorFeedbackEvent) {
    for (const listener of this.feedbackListeners) listener(event)
  }

  private getAutoLayoutPlan() {
    return createAutoLayoutPlan({
      nodes: this.scene.getNodes().flatMap((node) => {
        const parentBoxId = this.scene.getParentBoxId(node.id)
        return parentBoxId
          ? [{
              parentBoxId,
              nodeId: node.id,
              position: node.getPosition(),
              bounds: node.getBounds(),
            }]
          : []
      }),
      edges: this.scene.getEdges().map(edge => ({
        sourceNodeId: edge.source.nodeId,
        targetNodeId: edge.target.nodeId,
      })),
    })
  }

  private zoomBy(factor: number) {
    const viewport = this.scene.getViewport()
    const rect = this.layers.mainCanvas.getBoundingClientRect()
    const nextViewport = getZoomedViewportAtCanvasPoint({
      canvasPoint: {
        x: rect.width / 2,
        y: rect.height / 2,
      },
      viewport,
      zoom: viewport.zoom * factor,
    })
    if (!nextViewport) return

    this.scene.setViewport(nextViewport)
    this.requestRender({ background: true, main: true })
  }

  private renderBackground() {
    this.renderer.renderBackground({
      layers: this.layers,
      scene: this.scene,
      interaction: {
        draggingNodeId: this.interaction.getDraggingNodeId(),
        draggingBoxId: this.interaction.getDraggingBoxId(),
        dropTargetBoxId: this.interaction.getDropTargetBoxId(),
        selectionRect: this.interaction.getSelectionRect(),
        selectionBoundsOverlay: this.interaction.getSelectionBoundsOverlay(),
        snapGuides: this.interaction.getSnapGuides(),
        activeSwimlaneDivider: this.interaction.getActiveSwimlaneDivider(),
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
        draggingBoxId: this.interaction.getDraggingBoxId(),
        dropTargetBoxId: this.interaction.getDropTargetBoxId(),
        selectionRect: this.interaction.getSelectionRect(),
        selectionBoundsOverlay: this.interaction.getSelectionBoundsOverlay(),
        snapGuides: this.interaction.getSnapGuides(),
        activeSwimlaneDivider: this.interaction.getActiveSwimlaneDivider(),
        pendingEdge: this.interaction.getPendingEdge(),
      },
    })
  }

  private handleDragOver = (event: DragEvent) => {
    event.preventDefault()
  }

  private handleDrop = (event: DragEvent) => {
    event.preventDefault()
    const boxTemplateRaw = event.dataTransfer?.getData('application/x-flow-box')
    if (boxTemplateRaw) {
      const template = parseBoxTemplate(boxTemplateRaw)
      if (!template) return
      const worldPoint = CoordinateTransformer.clientToWorld(
        event,
        this.layers.mainCanvas,
        this.scene.getViewport(),
      )
      this.createBoxFromTemplate(template, worldPoint)
      return
    }

    const type = event.dataTransfer?.getData('application/x-flow-node')
    if (!type) return

    const template = findElementTemplate(type)
    if (!template) return

    const worldPoint = CoordinateTransformer.clientToWorld(
      event,
      this.layers.mainCanvas,
      this.scene.getViewport(),
    )
    const position = {
      x: worldPoint.x - template.defaultSize.width / 2,
      y: worldPoint.y - template.defaultSize.height / 2,
    }
    this.createNodeFromTemplate(
      template,
      position,
      this.scene.getDropTargetBoxId(worldPoint),
    )
  }

  private createNodeFromTemplate(
    template: ElementTemplate,
    position: Point,
    parentBoxId?: BoxId,
  ) {
    const nodeId = createId('node')
    const nodeData: FlowNode = {
      id: nodeId,
      type: template.type,
      label: template.label,
      position,
      size: template.defaultSize,
      rotation: 0,
      ports: template.ports.map(port => ({
        id: createId('port'),
        nodeId,
        templateId: port.id,
        label: port.label,
        offset: port.offset,
      })),
      props: { ...(template.defaultProps ?? {}) },
    }

    this.history.execute(new CreateNodeCommand(nodeData, parentBoxId))
  }

  private createBoxFromTemplate(template: BoxTemplate, center: Point) {
    if (template.type === 'layer') {
      const data = createArchitectureLayerData({
        label: template.label,
        size: template.defaultSize,
        props: template.defaultProps,
        position: {
          x: center.x - template.defaultSize.width / 2,
          y: center.y - template.defaultSize.height / 2,
        },
      })
      this.history.execute(new CreateBoxCommand(data))
      return
    }

    const width = template.orientation === 'horizontal'
      ? DEFAULT_SWIMLANE_CROSS_SIZE
      : template.laneCount * VERTICAL_LANE_SIZE
    const height = template.orientation === 'horizontal'
      ? SWIMLANE_HEADER_SIZE + template.laneCount * HORIZONTAL_LANE_SIZE
      : DEFAULT_SWIMLANE_VERTICAL_HEIGHT
    const data = createSwimlaneData({
      label: template.label,
      orientation: template.orientation,
      laneCount: template.laneCount,
      position: {
        x: center.x - width / 2,
        y: center.y - height / 2,
      },
    })
    this.history.execute(new CreateBoxCommand(data))
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

  private updateBoxProps(boxId: BoxId, propKey: string, propValue: Record<string, unknown>) {
    const box = this.scene.getBoxData(boxId)
    if (!box || (box.type !== 'group' && box.type !== 'layer')) return

    const currentValue = isRecord(box.props?.[propKey]) ? box.props[propKey] : {}
    const nextValue = {
      ...currentValue,
      ...propValue,
    }
    if (recordsEqual(currentValue, nextValue)) return

    this.history.execute(new UpdateBoxDataCommand(box, {
      ...box,
      props: {
        ...(box.props ?? {}),
        [propKey]: nextValue,
      },
    }))
  }

  private getGroupSelectionContext() {
    const selection = this.scene.getSelection()
    if (
      selection.items.length < 2
      || selection.items.some(item => item.type !== 'node')
    ) return null

    const nodeIds = selection.items.map(item => item.id)
    const nodes = nodeIds.flatMap((id) => {
      const node = this.scene.getNodeData(id)
      return node ? [node] : []
    })
    const locations = nodeIds.flatMap((id) => {
      const location = this.scene.getElementLocation(id)
      return location ? [location] : []
    })
    if (nodes.length !== nodeIds.length || locations.length !== nodeIds.length) return null
    const parentBoxId = locations[0]?.parentBoxId
    if (!parentBoxId || locations.some(item => item.parentBoxId !== parentBoxId)) return null
    if (this.scene.getBoxData(parentBoxId)?.type === 'group') return null

    return { nodes, locations, parentBoxId }
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

function parseBoxTemplate(value: string): BoxTemplate | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) return null
    if (parsed.type === 'layer') {
      if (typeof parsed.label !== 'string' || !isRecord(parsed.defaultSize)) return null
      const width = parsed.defaultSize.width
      const height = parsed.defaultSize.height
      if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) return null
      if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) return null
      return {
        type: 'layer',
        label: parsed.label,
        defaultSize: { width, height },
        defaultProps: isRecord(parsed.defaultProps) ? parsed.defaultProps : undefined,
      }
    }

    if (parsed.type !== 'swimlane') return null
    if (parsed.orientation !== 'horizontal' && parsed.orientation !== 'vertical') return null
    if (typeof parsed.label !== 'string' || typeof parsed.laneCount !== 'number') return null
    return {
      type: 'swimlane',
      label: parsed.label,
      orientation: parsed.orientation,
      laneCount: parsed.laneCount,
    }
  }
  catch {
    return null
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
