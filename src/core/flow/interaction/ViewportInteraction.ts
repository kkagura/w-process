import type { Point, ViewportData } from '../types/flow'
import { CoordinateTransformer } from '../viewport/CoordinateTransformer'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
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
  const nextZoom = clampZoom(
    options.viewport.zoom * Math.exp(-options.event.deltaY * WHEEL_ZOOM_SENSITIVITY),
  )

  if (nextZoom === options.viewport.zoom) return null

  const worldPoint = CoordinateTransformer.canvasToWorld(canvasPoint, options.viewport)
  return {
    x: canvasPoint.x - worldPoint.x * nextZoom,
    y: canvasPoint.y - worldPoint.y * nextZoom,
    zoom: nextZoom,
  }
}

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}
