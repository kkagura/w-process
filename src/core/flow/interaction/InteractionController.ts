import { CoordinateTransformer } from '../viewport/CoordinateTransformer'
import { CreateEdgeCommand } from '../commands/CreateEdgeCommand'
import { DeleteSelectionCommand } from '../commands/DeleteSelectionCommand'
import { MoveNodesCommand } from '../commands/MoveNodesCommand'
import type { Endpoint } from '../types/flow'
import { createId } from '../utils/ids'
import type { InteractionControllerOptions, InteractionMode } from './InteractionTypes'
import {
  createNodeDragMode,
  getDraggedNodeMoves,
  getHoveredSelection,
  getNodeIdFromHit,
} from './NodeDragInteraction'
import {
  getSelectionRect,
  hasSelectionDragExceeded,
  shouldStartSelection,
} from './SelectionBoxInteraction'
import {
  getPannedViewport,
  getZoomedViewport,
  shouldStartPanning,
} from './ViewportInteraction'

export class InteractionController {
  private mode: InteractionMode = { type: 'idle' }
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
      this.options.canvas.setPointerCapture(event.pointerId)
      this.setCursor('grabbing')
      event.preventDefault()
      return
    }

    const point = this.getWorldPoint(event)
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
        this.options.requestRender()
        event.preventDefault()
        return
      }

      if (event.ctrlKey || event.metaKey) {
        this.options.scene.toggleSelection(selection)
        this.mode = { type: 'idle' }
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

    if (this.mode.type === 'dragging-node') {
      this.options.scene.moveNodes(getDraggedNodeMoves(this.mode, point))
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
      this.options.requestRender()
      event.preventDefault()
      return
    }

    const hit = this.options.scene.hitTest(point)
    this.options.scene.setHovered(getHoveredSelection(hit))
  }

  private handlePointerUp = (event: PointerEvent) => {
    if (this.mode.type === 'connecting') {
      this.createEdgeFromConnection(this.mode)
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
      this.options.requestRender()
      event.preventDefault()
      return
    }

    if (this.mode.type === 'dragging-node') {
      this.recordNodeDragHistory(this.mode)
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
      this.options.requestRender()
    }

    if (this.mode.type === 'panning') {
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
      this.setCursor('')
      this.options.requestRender({ background: true, main: true })
    }

    if (this.mode.type === 'pending-selection') {
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
      this.options.scene.clearSelection()
      this.options.requestRender()
      return
    }

    if (this.mode.type === 'selecting') {
      const rect = getSelectionRect(this.mode.start, this.mode.current)
      this.options.canvas.releasePointerCapture(event.pointerId)
      this.mode = { type: 'idle' }
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

    this.mode = { type: 'idle' }
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
}
