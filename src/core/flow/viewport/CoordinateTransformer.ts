import type { Point, ViewportData } from '../types/flow'

export class CoordinateTransformer {
  static clientToCanvas(event: Pick<PointerEvent | DragEvent, 'clientX' | 'clientY'>, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  static canvasToWorld(point: Point, viewport: ViewportData): Point {
    return {
      x: (point.x - viewport.x) / viewport.zoom,
      y: (point.y - viewport.y) / viewport.zoom,
    }
  }

  static clientToWorld(
    event: Pick<PointerEvent | DragEvent, 'clientX' | 'clientY'>,
    canvas: HTMLCanvasElement,
    viewport: ViewportData,
  ) {
    return this.canvasToWorld(this.clientToCanvas(event, canvas), viewport)
  }
}
