import { CoordinateTransformer } from '../viewport/CoordinateTransformer'
import { CreateEdgeCommand } from '../commands/CreateEdgeCommand'
import { DeleteSelectionCommand } from '../commands/DeleteSelectionCommand'
import { MoveNodesCommand } from '../commands/MoveNodesCommand'
import { PasteElementsCommand } from '../commands/PasteElementsCommand'
import { UpdateNodeDataCommand } from '../commands/UpdateNodeDataCommand'
import { copySelectionToClipboard, createPastedFlowData } from '../clipboard/FlowClipboard'
import type { FlowClipboardData } from '../clipboard/FlowClipboard'
import type { Endpoint, Point, SnapGuide } from '../types/flow'
import { createId } from '../utils/ids'
import type { InteractionControllerOptions, InteractionMode } from './InteractionTypes'
import {
  createNodeDragMode,
  getDraggedNodeBounds,
  getDraggedNodeMoves,
  getHoveredSelection,
  getNodeIdFromHit,
} from './NodeDragInteraction'
import { snapRectToNodes } from './SnapEngine'
import {
  getSelectionRect,
  hasSelectionDragExceeded,
  shouldStartSelection,
} from './SelectionBoxInteraction'
import {
  getRawResizedRect,
  getResizedNodeData,
  hasNodeResizeChanges,
  hitTestResizeHandle,
} from './NodeResizeInteraction'
import {
  getPannedViewport,
  getZoomedViewport,
  shouldStartPanning,
} from './ViewportInteraction'

export class InteractionController {
  private mode: InteractionMode = { type: 'idle' }
  private snapGuides: SnapGuide[] = []
  private clipboard: FlowClipboardData | null = null
  private pasteCount = 0
  private options: InteractionControllerOptions

  constructor(options: InteractionControllerOptions) {
    this.options = options
    this.options.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.options.canvas.addEventListener('pointermove', this.handlePointerMove)
    this.options.canvas.addEventListener('pointerup', this.handlePointerUp)
    this.options.canvas.addEventListener('pointercancel', this.handlePointerCancel)
    this.options.canvas.addEventListener('lostpointercapture', this.handleLostPointerCapture)
    this.options.canvas.addEventListener('pointerleave', this.handlePointerLeave)
    this.options.canvas.addEventListener('keydown', this.handleKeyDown)
    this.options.canvas.addEventListener('contextmenu', this.handleContextMenu)
    this.options.canvas.addEventListener('wheel', this.handleWheel, { passive: false })
  }

  getDraggingNodeId() {
    return this.mode.type === 'dragging-node' ? this.mode.nodeId : null
  }

  getSelectionRect() {
    return this.mode.type === 'selecting'
      ? getSelectionRect(this.mode.start, this.mode.current)
      : null
  }

  getSnapGuides() {
    return this.snapGuides
  }

  getPendingEdge() {
    if (this.mode.type !== 'connecting') return null

    const sourcePoint = this.options.scene.getEndpointPoint(this.mode.source)
    if (!sourcePoint) return null

    const hit = this.options.scene.hitTest(this.mode.current)
    const target = hit?.type === 'port'
      ? { nodeId: hit.nodeId, portId: hit.portId }
      : null

    return {
      sourcePoint,
      currentPoint: this.mode.current,
      sourceRect: this.options.scene.getNodeRect(this.mode.source.nodeId),
      valid: target ? this.options.scene.canConnect(this.mode.source, target) : false,
    }
  }

  dispose() {
    this.options.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.options.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.options.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.options.canvas.removeEventListener('pointercancel', this.handlePointerCancel)
    this.options.canvas.removeEventListener('lostpointercapture', this.handleLostPointerCapture)
    this.options.canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    this.options.canvas.removeEventListener('keydown', this.handleKeyDown)
    this.options.canvas.removeEventListener('contextmenu', this.handleContextMenu)
    this.options.canvas.removeEventListener('wheel', this.handleWheel)
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.options.canvas.focus()

    if (shouldStartPanning(event)) {
      this.mode = {
        type: 'panning',
        start: this.getCanvasPoint(event),
        origin: this.options.scene.getViewport(),
      }
      this.options.scene.setHovered(null)
      this.snapGuides = []
      this.options.canvas.setPointerCapture(event.pointerId)
      this.setCursor('grabbing')
      event.preventDefault()
      return
    }

    const point = this.getWorldPoint(event)
    const resizeHit = this.getSelectedResizeHandle(point)
    if (resizeHit && event.button === 0) {
      this.mode = {
        type: 'resizing-node',
        nodeId: resizeHit.node.id,
        handle: resizeHit.handle.handle,
        start: point,
        before: resizeHit.node,
        startRect: {
          ...resizeHit.node.position,
          ...resizeHit.node.size,
        },
      }
      this.options.scene.setHovered({ type: 'node', id: resizeHit.node.id })
      this.snapGuides = []
      this.options.canvas.setPointerCapture(event.pointerId)
      this.setCursor(resizeHit.handle.cursor)
      this.options.requestRender()
      event.preventDefault()
      return
    }

    const hit = this.options.scene.hitTest(point)

    if (hit?.type === 'edge' && event.button === 0) {
      const selection = { type: 'edge' as const, id: hit.id }

      if (event.ctrlKey || event.metaKey) {
        this.options.scene.toggleSelection(selection)
      }
      else if (event.shiftKey) {
        this.options.scene.addSelection(selection)
      }
      else {
        this.options.scene.select(selection)
      }

      this.mode = { type: 'idle' }
      this.snapGuides = []
      this.options.requestRender()
      event.preventDefault()
      return
    }

    if (hit?.type === 'port' && event.button === 0) {
      const source = { nodeId: hit.nodeId, portId: hit.portId }
      if (this.options.scene.getEndpointPort(source)) {
        this.mode = {
          type: 'connecting',
          source,
          current: point,
        }
        this.options.scene.setHovered(null)
        this.snapGuides = []
        this.options.canvas.setPointerCapture(event.pointerId)
        this.options.requestRender()
        event.preventDefault()
        return
      }
    }

    const nodeId = getNodeIdFromHit(hit)

    if (nodeId && event.button === 0) {
      const selection = { type: 'node' as const, id: nodeId }

      if (event.shiftKey) {
        this.options.scene.addSelection(selection)
        this.mode = { type: 'idle' }
        this.snapGuides = []
        this.options.requestRender()
        event.preventDefault()
        return
      }

      if (event.ctrlKey || event.metaKey) {
        this.options.scene.toggleSelection(selection)
        this.mode = { type: 'idle' }
        this.snapGuides = []
        this.options.requestRender()
        event.preventDefault()
        return
      }

      const mode = createNodeDragMode({
        scene: this.options.scene,
        nodeId,
        start: point,
      })
      if (!mode) return

      if (this.options.scene.isSelected(selection)) {
        this.options.scene.addSelection(selection)
      }
      else {
        this.options.scene.select(selection)
      }
      this.mode = mode
      this.snapGuides = []
      this.options.canvas.setPointerCapture(event.pointerId)
      this.options.requestRender()
      return
    }

    if (shouldStartSelection(event)) {
      this.mode = {
        type: 'pending-selection',
        startCanvas: this.getCanvasPoint(event),
        startWorld: point,
      }
      this.options.scene.setHovered(null)
      this.snapGuides = []
      this.options.canvas.setPointerCapture(event.pointerId)
      event.preventDefault()
      return
    }

    this.mode = { type: 'idle' }
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (this.mode.type === 'panning') {
      const current = this.getCanvasPoint(event)
      this.options.scene.setViewport(getPannedViewport(this.mode, current))
      this.options.requestRender({ background: true, main: true })
      event.preventDefault()
      return
    }

    const point = this.getWorldPoint(event)

    if (this.mode.type === 'connecting') {
      this.mode = {
        ...this.mode,
        current: point,
      }
      this.options.requestRender()
      event.preventDefault()
      return
    }

    if (this.mode.type === 'resizing-node') {
      const snap = event.shiftKey
        ? null
        : this.getResizeSnap(this.mode, point)
      if (event.shiftKey) {
        this.snapGuides = []
      }
      const nextNode = getResizedNodeData({
        mode: this.mode,
        current: point,
        keepAspectRatio: event.shiftKey,
        snap: snap ?? undefined,
      })
      this.options.scene.updateNodeData(nextNode)
      this.options.requestRender()
      event.preventDefault()
      return
    }

    if (this.mode.type === 'dragging-node') {
      const snapResult = snapRectToNodes({
        movingBounds: getDraggedNodeBounds(this.mode, point),
        targetRects: this.options.scene.getNodeRects(this.mode.origins.map(item => item.nodeId)),
        threshold: 8 / this.options.scene.getViewport().zoom,
      })

      this.snapGuides = snapResult.guides
      this.options.scene.moveNodes(getDraggedNodeMoves(this.mode, point, snapResult.delta))
      this.options.requestRender()
      return
    }

    if (this.mode.type === 'pending-selection') {
      const currentCanvas = this.getCanvasPoint(event)
      if (hasSelectionDragExceeded(this.mode.startCanvas, currentCanvas)) {
        this.mode = {
          type: 'selecting',
          start: this.mode.startWorld,
          current: point,
        }
        this.options.requestRender()
        event.preventDefault()
      }
      return
    }

    if (this.mode.type === 'selecting') {
      this.mode = {
        ...this.mode,
        current: point,
      }
      this.snapGuides = []
      this.options.requestRender()
      event.preventDefault()
      return
    }

    const resizeHit = this.getSelectedResizeHandle(point)
    if (resizeHit) {
      this.setCursor(resizeHit.handle.cursor)
      this.options.scene.setHovered({ type: 'node', id: resizeHit.node.id })
      return
    }
    this.setCursor('')

    const hit = this.options.scene.hitTest(point)
    this.options.scene.setHovered(getHoveredSelection(hit))
  }

  private handlePointerUp = (event: PointerEvent) => {
    if (this.mode.type === 'connecting') {
      this.createEdgeFromConnection(this.mode)
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
      this.snapGuides = []
      this.options.requestRender()
      event.preventDefault()
      return
    }

    if (this.mode.type === 'resizing-node') {
      this.recordNodeResizeHistory(this.mode)
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
      this.snapGuides = []
      this.setCursor('')
      this.options.requestRender()
      event.preventDefault()
      return
    }

    if (this.mode.type === 'dragging-node') {
      this.recordNodeDragHistory(this.mode)
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
      this.snapGuides = []
      this.options.requestRender()
    }

    if (this.mode.type === 'panning') {
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
      this.snapGuides = []
      this.setCursor('')
      this.options.requestRender({ background: true, main: true })
    }

    if (this.mode.type === 'pending-selection') {
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
      this.snapGuides = []
      this.options.scene.clearSelection()
      this.options.requestRender()
      return
    }

    if (this.mode.type === 'selecting') {
      const rect = getSelectionRect(this.mode.start, this.mode.current)
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
      this.snapGuides = []
      this.options.scene.selectNodesInRect(rect)
      this.options.requestRender()
    }
  }

  private handlePointerCancel = () => {
    this.resetPointerMode()
  }

  private handleLostPointerCapture = () => {
    this.resetPointerMode()
  }

  private handlePointerLeave = () => {
    if (this.mode.type === 'idle') {
      this.options.scene.setHovered(null)
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      if (this.mode.type === 'idle') {
        this.copySelection()
      }
      event.preventDefault()
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
      if (this.mode.type === 'idle') {
        this.pasteSelection()
      }
      event.preventDefault()
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      if (this.mode.type === 'idle') {
        this.options.scene.selectAll()
        this.options.requestRender()
      }
      event.preventDefault()
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      if (event.shiftKey) {
        this.options.history.redo()
      }
      else {
        this.options.history.undo()
      }
      event.preventDefault()
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      this.options.history.redo()
      event.preventDefault()
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const command = new DeleteSelectionCommand(this.options.scene.getSelection().items)
      if (!command.isEmpty) {
        this.options.history.execute(command)
      }
      event.preventDefault()
    }
  }

  private handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
  }

  private handleWheel = (event: WheelEvent) => {
    if (!event.ctrlKey || this.mode.type !== 'idle') return

    event.preventDefault()
    this.options.canvas.focus()

    const viewport = this.options.scene.getViewport()
    const nextViewport = getZoomedViewport({
      canvas: this.options.canvas,
      event,
      viewport,
    })
    if (!nextViewport) return

    this.options.scene.setViewport(nextViewport)
    this.options.requestRender({ background: true, main: true })
  }

  private resetPointerMode() {
    if (this.mode.type === 'idle') return

    if (this.mode.type === 'resizing-node') {
      this.options.scene.updateNodeData(this.mode.before)
    }

    this.mode = { type: 'idle' }
    this.snapGuides = []
    this.setCursor('')
    this.options.requestRender({ background: true, main: true })
  }

  private setCursor(cursor: string) {
    this.options.canvas.style.cursor = cursor
  }

  private getCanvasPoint(event: PointerEvent) {
    return CoordinateTransformer.clientToCanvas(event, this.options.canvas)
  }

  private getWorldPoint(event: PointerEvent) {
    return CoordinateTransformer.clientToWorld(
      event,
      this.options.canvas,
      this.options.scene.getViewport(),
    )
  }

  private createEdgeFromConnection(mode: Extract<InteractionMode, { type: 'connecting' }>) {
    const hit = this.options.scene.hitTest(mode.current)
    if (hit?.type !== 'port') return

    const target: Endpoint = {
      nodeId: hit.nodeId,
      portId: hit.portId,
    }
    if (!this.options.scene.canConnect(mode.source, target)) return

    this.options.history.execute(new CreateEdgeCommand({
      id: createId('edge'),
      source: mode.source,
      target,
      props: {},
    }))
  }

  private copySelection() {
    const clipboard = copySelectionToClipboard(this.options.scene)
    if (!clipboard) {
      this.options.emitFeedback?.({ type: 'clipboard-copy-empty' })
      return
    }

    this.clipboard = clipboard
    this.pasteCount = 0
    this.options.emitFeedback?.({
      type: 'clipboard-copied',
      nodeCount: clipboard.nodes.length,
      edgeCount: clipboard.edges.length,
    })
  }

  private pasteSelection() {
    if (!this.clipboard) {
      this.options.emitFeedback?.({ type: 'clipboard-paste-empty' })
      return
    }

    this.pasteCount += 1
    const offset = {
      x: 24 * this.pasteCount,
      y: 24 * this.pasteCount,
    }
    const pasted = createPastedFlowData(this.clipboard, offset)
    if (pasted.nodes.length === 0) {
      this.options.emitFeedback?.({ type: 'clipboard-paste-empty' })
      return
    }

    this.options.history.execute(new PasteElementsCommand({
      ...pasted,
      selectionBefore: this.options.scene.getSelection(),
    }))
    this.options.emitFeedback?.({
      type: 'clipboard-pasted',
      nodeCount: pasted.nodes.length,
      edgeCount: pasted.edges.length,
    })
  }

  private recordNodeDragHistory(mode: Extract<InteractionMode, { type: 'dragging-node' }>) {
    const before = mode.origins.map(item => ({
      nodeId: item.nodeId,
      position: item.origin,
    }))
    const after = mode.origins
      .map((item) => {
        const node = this.options.scene.getNode(item.nodeId)
        if (!node) return null
        return {
          nodeId: item.nodeId,
          position: node.getPosition(),
        }
      })
      .filter((move): move is typeof before[number] => Boolean(move))

    if (!MoveNodesCommand.hasChanges(before, after)) return
    this.options.history.record(new MoveNodesCommand(before, after))
  }

  private recordNodeResizeHistory(mode: Extract<InteractionMode, { type: 'resizing-node' }>) {
    const after = this.options.scene.getNodeData(mode.nodeId)
    if (!after || !hasNodeResizeChanges(mode.before, after)) return

    this.options.history.record(new UpdateNodeDataCommand(mode.before, after))
  }

  private getResizeSnap(mode: Extract<InteractionMode, { type: 'resizing-node' }>, point: Point) {
    const rawRect = getRawResizedRect({
      mode,
      current: point,
      keepAspectRatio: false,
    })
    const snapResult = snapRectToNodes({
      movingBounds: rawRect,
      targetRects: this.options.scene.getNodeRects([mode.nodeId]),
      threshold: 8 / this.options.scene.getViewport().zoom,
    })
    const affectsX = mode.handle.includes('e') || mode.handle.includes('w')
    const affectsY = mode.handle.includes('n') || mode.handle.includes('s')
    this.snapGuides = snapResult.guides.filter(guide => (
      (affectsX && guide.type === 'vertical')
      || (affectsY && guide.type === 'horizontal')
    ))

    return {
      delta: {
        x: affectsX ? snapResult.delta.x : 0,
        y: affectsY ? snapResult.delta.y : 0,
      },
      xKind: affectsX ? snapResult.snappedXKind : undefined,
      yKind: affectsY ? snapResult.snappedYKind : undefined,
    }
  }

  private getSelectedResizeHandle(point: Point) {
    const selection = this.options.scene.getSelection()
    if (selection.items.length !== 1 || selection.primary?.type !== 'node') return null

    const node = this.options.scene.getNodeData(selection.primary.id)
    const rect = this.options.scene.getNodeRect(selection.primary.id)
    if (!node || !rect) return null

    const handle = hitTestResizeHandle(point, rect, this.options.scene.getViewport())
    return handle ? { node, handle } : null
  }
}
