import type { Point, Rect } from '../types/flow'

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) return distance(point, start)

  const t = Math.max(0, Math.min(1, (
    (point.x - start.x) * dx + (point.y - start.y) * dy
  ) / lengthSquared))

  return distance(point, {
    x: start.x + t * dx,
    y: start.y + t * dy,
  })
}

export function hitTestPolygon(point: Point, polygon: Point[], tolerance = 0) {
  if (polygon.length < 3) return false

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]
    const end = polygon[(index + 1) % polygon.length]
    if (distanceToSegment(point, start, end) <= tolerance) return true
  }

  let inside = false
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const start = polygon[current]
    const end = polygon[previous]
    const crossesY = (start.y > point.y) !== (end.y > point.y)
    if (!crossesY) continue

    const intersectionX = start.x
      + ((point.y - start.y) * (end.x - start.x)) / (end.y - start.y)
    if (point.x < intersectionX) inside = !inside
  }

  return inside
}

export function containsPoint(rect: Rect, point: Point) {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
}

export function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

export function normalizeAngle(degrees: number) {
  if (!Number.isFinite(degrees)) return 0

  const normalized = degrees % 360
  return normalized < 0 ? normalized + 360 : normalized
}

export function getRectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  }
}

export function rotatePoint(point: Point, center: Point, rotation: number): Point {
  const radians = toRadians(rotation)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = point.x - center.x
  const dy = point.y - center.y

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

export function inverseRotatePoint(point: Point, center: Point, rotation: number): Point {
  return rotatePoint(point, center, -rotation)
}

export function getRotatedRectCorners(rect: Rect, rotation: number): Point[] {
  const center = getRectCenter(rect)
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ].map(point => rotatePoint(point, center, rotation))
}

export function getRotatedRectBounds(rect: Rect, rotation: number): Rect {
  const points = getRotatedRectCorners(rect, rotation)
  const left = Math.min(...points.map(point => point.x))
  const top = Math.min(...points.map(point => point.y))
  const right = Math.max(...points.map(point => point.x))
  const bottom = Math.max(...points.map(point => point.y))

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function normalizeRect(start: Point, end: Point): Rect {
  const left = Math.min(start.x, end.x)
  const top = Math.min(start.y, end.y)
  const right = Math.max(start.x, end.x)
  const bottom = Math.max(start.y, end.y)

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function rectsIntersect(left: Rect, right: Rect) {
  return left.x <= right.x + right.width
    && left.x + left.width >= right.x
    && left.y <= right.y + right.height
    && left.y + left.height >= right.y
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
