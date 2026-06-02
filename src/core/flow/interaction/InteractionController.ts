import type { NodeId, Point } from '../types/flow'
import { CoordinateTransformer } from '../viewport/CoordinateTransformer'
import type { SceneManager } from '../scene/SceneManager'

type InteractionMode =
  | { type: 'idle' }
  | { type: 'dragging-node'; nodeId: NodeId; start: Point; origin: Point }

export interface InteractionControllerOptions {
  canvas: HTMLCanvasElement
  scene: SceneManager
  requestRender: () => void
}

export class InteractionController {
  private mode: InteractionMode = { type: 'idle' }
  private options: InteractionControllerOptions

  constructor(options: InteractionControllerOptions) {
    this.options = options
    this.options.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.options.canvas.addEventListener('pointermove', this.handlePointerMove)
    this.options.canvas.addEventListener('pointerup', this.handlePointerUp)
    this.options.canvas.addEventListener('pointerleave', this.handlePointerLeave)
    this.options.canvas.addEventListener('keydown', this.handleKeyDown)
  }

  getDraggingNodeId() {
    return this.mode.type === 'dragging-node' ? this.mode.nodeId : null
  }

  dispose() {
    this.options.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.options.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.options.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.options.canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    this.options.canvas.removeEventListener('keydown', this.handleKeyDown)
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.options.canvas.focus()
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

  private getWorldPoint(event: PointerEvent) {
    return CoordinateTransformer.clientToWorld(
      event,
      this.options.canvas,
      this.options.scene.getViewport(),
    )
  }
}
