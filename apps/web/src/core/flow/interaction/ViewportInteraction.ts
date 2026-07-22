// @env browser

import {
  getWheelZoom,
  getZoomedViewportAtCanvasPoint,
} from '@w-process/flow-core'
import type { ViewportData } from '@w-process/flow-core'
import { CoordinateTransformer } from '../viewport/CoordinateTransformer'

export function shouldStartPanning(event: { button: number }) {
  return event.button === 2
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
    zoom: getWheelZoom(options.viewport.zoom, options.event.deltaY),
  })
}
