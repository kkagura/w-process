import type { Point, ViewportData } from '../types/flow'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3
const WHEEL_ZOOM_SENSITIVITY = 0.001

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

export function getZoomedViewportAtCanvasPoint(options: {
  canvasPoint: Point
  viewport: ViewportData
  zoom: number
}): ViewportData | null {
  const nextZoom = clampZoom(options.zoom)
  if (nextZoom === options.viewport.zoom) return null

  const worldPoint = {
    x: (options.canvasPoint.x - options.viewport.x) / options.viewport.zoom,
    y: (options.canvasPoint.y - options.viewport.y) / options.viewport.zoom,
  }
  return {
    x: options.canvasPoint.x - worldPoint.x * nextZoom,
    y: options.canvasPoint.y - worldPoint.y * nextZoom,
    zoom: nextZoom,
  }
}

export function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function getWheelZoom(currentZoom: number, deltaY: number) {
  return currentZoom * Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY)
}
