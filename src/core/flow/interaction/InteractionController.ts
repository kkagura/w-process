import { CoordinateTransformer } from '../viewport/CoordinateTransformer'
import type { InteractionControllerOptions, InteractionMode } from './InteractionTypes'
import {
  createNodeDragMode,
  getDraggedNodePosition,
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

      this.options.scene.select(selection)
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

    if (this.mode.type === 'dragging-node') {
      this.options.scene.moveNode(this.mode.nodeId, getDraggedNodePosition(this.mode, point))
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
    if (this.mode.type === 'dragging-node') {
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
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.options.scene.removeSelection()
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
}
