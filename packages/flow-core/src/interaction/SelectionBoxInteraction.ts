import type { Point, Rect } from '../types/flow'
import { normalizeRect } from '../utils/geometry'

const SELECTION_DRAG_THRESHOLD = 6

export function shouldStartSelection(event: { button: number }) {
  return event.button === 0
}

export function hasSelectionDragExceeded(start: Point, current: Point) {
  return Math.hypot(current.x - start.x, current.y - start.y) >= SELECTION_DRAG_THRESHOLD
}

export function getSelectionRect(start: Point, current: Point): Rect {
  return normalizeRect(start, current)
}
