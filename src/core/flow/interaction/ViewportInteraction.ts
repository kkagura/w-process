import type { Point, ViewportData } from '../types/flow'
import { CoordinateTransformer } from '../viewport/CoordinateTransformer'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3
const WHEEL_ZOOM_SENSITIVITY = 0.001

export function shouldStartPanning(event: PointerEvent) {
  return event.button === 2
}

export function getPannedViewport(mode: {
  start: Point
  origin: ViewportData
}, current: Point): ViewportData {
  return {
    ...mode.origin,
    x: mode.origin.x + current.x - mode.start.x,
    y: mode.origin.y + current.y - mode.start.y,
  }
}

export function getZoomedViewport(options: {
  canvas: HTMLCanvasElement
  event: WheelEvent
  viewport: ViewportData
}): ViewportData | null {
  const canvasPoint = CoordinateTransformer.clientToCanvas(options.event, options.canvas)
  return getZoomedViewportAtCanvasPoint({
    canvasPoint,
    viewport: options.viewport,
    zoom: options.viewport.zoom * Math.exp(-options.event.deltaY * WHEEL_ZOOM_SENSITIVITY),
  })
}

export function getZoomedViewportAtCanvasPoint(options: {
  canvasPoint: Point
  viewport: ViewportData
  zoom: number
}): ViewportData | null {
  const nextZoom = clampZoom(options.zoom)
  if (nextZoom === options.viewport.zoom) return null

  const worldPoint = CoordinateTransformer.canvasToWorld(options.canvasPoint, options.viewport)
  return {
    x: options.canvasPoint.x - worldPoint.x * nextZoom,
    y: options.canvasPoint.y - worldPoint.y * nextZoom,
    zoom: nextZoom,
  }
}

export function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}
