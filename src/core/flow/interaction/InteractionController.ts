import type { NodeId, Point, ViewportData } from '../types/flow'
import { CoordinateTransformer } from '../viewport/CoordinateTransformer'
import type { SceneManager } from '../scene/SceneManager'

type InteractionMode =
  | { type: 'idle' }
  | { type: 'dragging-node'; nodeId: NodeId; start: Point; origin: Point }
  | { type: 'panning'; start: Point; origin: ViewportData }

export interface InteractionControllerOptions {
  canvas: HTMLCanvasElement
  scene: SceneManager
  requestRender: (options?: { background?: boolean; main?: boolean }) => void
}

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
  }

  getDraggingNodeId() {
    return this.mode.type === 'dragging-node' ? this.mode.nodeId : null
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
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.options.canvas.focus()

    if (this.shouldStartPanning(event)) {
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

    if (hit?.type === 'node' || hit?.type === 'port') {
      const nodeId = hit.type === 'node' ? hit.id : hit.nodeId
      const node = this.options.scene.getNode(nodeId)
      if (!node) return

      this.options.scene.select({ type: 'node', id: nodeId })
      this.mode = {
        type: 'dragging-node',
        nodeId,
        start: point,
        origin: node.getPosition(),
      }
      this.options.canvas.setPointerCapture(event.pointerId)
      this.options.requestRender()
      return
    }

    this.mode = { type: 'idle' }
    this.options.scene.clearSelection()
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (this.mode.type === 'panning') {
      const current = this.getCanvasPoint(event)
      this.options.scene.setViewport({
        ...this.mode.origin,
        x: this.mode.origin.x + current.x - this.mode.start.x,
        y: this.mode.origin.y + current.y - this.mode.start.y,
      })
      this.options.requestRender({ background: true, main: true })
      event.preventDefault()
      return
    }

    const point = this.getWorldPoint(event)

    if (this.mode.type === 'dragging-node') {
      this.options.scene.moveNode(this.mode.nodeId, {
        x: this.mode.origin.x + point.x - this.mode.start.x,
        y: this.mode.origin.y + point.y - this.mode.start.y,
      })
      this.options.requestRender()
      return
    }

    const hit = this.options.scene.hitTest(point)
    if (hit?.type === 'node') {
      this.options.scene.setHovered({ type: 'node', id: hit.id })
    } else {
      this.options.scene.setHovered(null)
    }
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

  private shouldStartPanning(event: PointerEvent) {
    return event.button === 2
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
