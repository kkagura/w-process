import type { Point, Rect } from '../types/flow'

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function containsPoint(rect: Rect, point: Point) {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
}

export function getUnionBounds(items: Rect[]): Rect {
  if (items.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const left = Math.min(...items.map(item => item.x))
  const top = Math.min(...items.map(item => item.y))
  const right = Math.max(...items.map(item => item.x + item.width))
  const bottom = Math.max(...items.map(item => item.y + item.height))

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}
