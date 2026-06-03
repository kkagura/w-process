import type { Point, Rect } from '../types/flow'
import { distanceToSegment } from '../utils/geometry'

export interface OrthogonalRouteOptions {
  source: Point
  target: Point
  sourceRect?: Rect | null
  targetRect?: Rect | null
  obstacles?: Rect[]
  padding?: number
}

interface SearchNode {
  key: string
  point: Point
  g: number
  h: number
  parent: SearchNode | null
}

type Direction = 'left' | 'right' | 'top' | 'bottom'

const DEFAULT_PADDING = 28
const TURN_COST = 12
const EPSILON = 0.001

export function routeOrthogonalEdge(options: OrthogonalRouteOptions): Point[] {
  const padding = options.padding ?? DEFAULT_PADDING
  const sourceDirection = getPortDirection(options.source, options.sourceRect, options.target)
  const targetDirection = getPortDirection(options.target, options.targetRect, options.source)
  const sourceEndpoint = movePoint(options.source, sourceDirection, padding)
  const targetEndpoint = movePoint(options.target, targetDirection, padding)
  const obstacles = (options.obstacles ?? []).map(obstacle => expandRect(obstacle, padding))
  const points = buildGridPoints({
    source: options.source,
    target: options.target,
    sourceEndpoint,
    targetEndpoint,
    obstacles,
  })

  const path = findOrthogonalPath(sourceEndpoint, targetEndpoint, points, obstacles)
  const routedPath = path.length > 0
    ? [options.source, ...path, options.target]
    : createFallbackPath(options.source, options.target, sourceEndpoint, targetEndpoint)

  return compressOrthogonalPath(routedPath)
}

export function hitTestOrthogonalPath(path: Point[], point: Point, threshold: number) {
  for (let index = 1; index < path.length; index += 1) {
    if (distanceToSegment(point, path[index - 1], path[index]) <= threshold) {
      return true
    }
  }

  return false
}

function buildGridPoints(options: {
  source: Point
  target: Point
  sourceEndpoint: Point
  targetEndpoint: Point
  obstacles: Rect[]
}) {
  const xs = new Set<number>()
  const ys = new Set<number>()
  const midX = Math.round((options.sourceEndpoint.x + options.targetEndpoint.x) / 2)
  const midY = Math.round((options.sourceEndpoint.y + options.targetEndpoint.y) / 2)

  for (const point of [
    options.source,
    options.target,
    options.sourceEndpoint,
    options.targetEndpoint,
    { x: midX, y: midY },
  ]) {
    xs.add(point.x)
    ys.add(point.y)
  }

  xs.add(midX)
  ys.add(midY)

  for (const obstacle of options.obstacles) {
    xs.add(obstacle.x)
    xs.add(obstacle.x + obstacle.width)
    ys.add(obstacle.y)
    ys.add(obstacle.y + obstacle.height)
  }

  const xAxis = [...xs].sort((left, right) => left - right)
  const yAxis = [...ys].sort((left, right) => left - right)
  const points: Point[] = []

  for (const x of xAxis) {
    for (const y of yAxis) {
      points.push({ x, y })
    }
  }

  return points
}

function findOrthogonalPath(source: Point, target: Point, points: Point[], obstacles: Rect[]) {
  const pointMap = new Map(points.map(point => [pointKey(point), point]))
  const sourcePoint = pointMap.get(pointKey(source))
  const targetPoint = pointMap.get(pointKey(target))
  if (!sourcePoint || !targetPoint) return []

  const open = new Map<string, SearchNode>()
  const closed = new Set<string>()
  const start: SearchNode = {
    key: pointKey(sourcePoint),
    point: sourcePoint,
    g: 0,
    h: getManhattanDistance(sourcePoint, targetPoint),
    parent: null,
  }

  open.set(start.key, start)

  while (open.size > 0) {
    const current = getLowestCostNode(open)
    open.delete(current.key)

    if (current.key === pointKey(targetPoint)) {
      return buildPath(current)
    }

    closed.add(current.key)

    for (const nextPoint of getNeighbors(current.point, points)) {
      const nextKey = pointKey(nextPoint)
      if (closed.has(nextKey)) continue
      if (isSegmentBlocked(current.point, nextPoint, obstacles)) continue

      const distance = getManhattanDistance(current.point, nextPoint)
      const turnCost = hasTurned(current.parent?.point ?? null, current.point, nextPoint)
        ? TURN_COST
        : 0
      const nextG = current.g + distance + turnCost
      const existing = open.get(nextKey)

      if (!existing || nextG < existing.g) {
        open.set(nextKey, {
          key: nextKey,
          point: nextPoint,
          g: nextG,
          h: getManhattanDistance(nextPoint, targetPoint),
          parent: current,
        })
      }
    }
  }

  return []
}

function getNeighbors(point: Point, points: Point[]) {
  const sameX = points
    .filter(item => item.x === point.x && item.y !== point.y)
    .sort((left, right) => Math.abs(left.y - point.y) - Math.abs(right.y - point.y))
  const sameY = points
    .filter(item => item.y === point.y && item.x !== point.x)
    .sort((left, right) => Math.abs(left.x - point.x) - Math.abs(right.x - point.x))

  return [
    sameX.find(item => item.y < point.y),
    sameX.find(item => item.y > point.y),
    sameY.find(item => item.x < point.x),
    sameY.find(item => item.x > point.x),
  ].filter((item): item is Point => Boolean(item))
}

function getLowestCostNode(open: Map<string, SearchNode>) {
  let selected: SearchNode | null = null

  for (const node of open.values()) {
    if (!selected || node.g + node.h < selected.g + selected.h) {
      selected = node
    }
  }

  return selected!
}

function buildPath(node: SearchNode) {
  const path: Point[] = []
  let current: SearchNode | null = node

  while (current) {
    path.unshift(current.point)
    current = current.parent
  }

  return path
}

function createFallbackPath(source: Point, target: Point, sourceEndpoint: Point, targetEndpoint: Point) {
  const midX = Math.round((sourceEndpoint.x + targetEndpoint.x) / 2)

  return [
    source,
    sourceEndpoint,
    { x: midX, y: sourceEndpoint.y },
    { x: midX, y: targetEndpoint.y },
    targetEndpoint,
    target,
  ]
}

function compressOrthogonalPath(path: Point[]) {
  if (path.length < 3) return dedupeAdjacentPoints(path)

  const deduped = dedupeAdjacentPoints(path)
  const compressed: Point[] = [deduped[0]]

  for (let index = 1; index < deduped.length - 1; index += 1) {
    const previous = compressed[compressed.length - 1]
    const current = deduped[index]
    const next = deduped[index + 1]

    if (!areCollinear(previous, current, next)) {
      compressed.push(current)
    }
  }

  compressed.push(deduped[deduped.length - 1])
  return compressed
}

function dedupeAdjacentPoints(path: Point[]) {
  const result: Point[] = []

  for (const point of path) {
    const previous = result[result.length - 1]
    if (!previous || previous.x !== point.x || previous.y !== point.y) {
      result.push(point)
    }
  }

  return result
}

function areCollinear(previous: Point, current: Point, next: Point) {
  return (previous.x === current.x && current.x === next.x)
    || (previous.y === current.y && current.y === next.y)
}

function getPortDirection(point: Point, rect: Rect | null | undefined, fallbackPoint: Point): Direction {
  if (rect) {
    const left = Math.abs(point.x - rect.x)
    const right = Math.abs(point.x - (rect.x + rect.width))
    const top = Math.abs(point.y - rect.y)
    const bottom = Math.abs(point.y - (rect.y + rect.height))
    const min = Math.min(left, right, top, bottom)

    if (min === left) return 'left'
    if (min === right) return 'right'
    if (min === top) return 'top'
    return 'bottom'
  }

  const dx = fallbackPoint.x - point.x
  const dy = fallbackPoint.y - point.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left'
  }

  return dy >= 0 ? 'bottom' : 'top'
}

function movePoint(point: Point, direction: Direction, distance: number): Point {
  if (direction === 'left') return { x: point.x - distance, y: point.y }
  if (direction === 'right') return { x: point.x + distance, y: point.y }
  if (direction === 'top') return { x: point.x, y: point.y - distance }
  return { x: point.x, y: point.y + distance }
}

function expandRect(rect: Rect, distance: number): Rect {
  return {
    x: rect.x - distance,
    y: rect.y - distance,
    width: rect.width + distance * 2,
    height: rect.height + distance * 2,
  }
}

function isSegmentBlocked(start: Point, end: Point, obstacles: Rect[]) {
  return obstacles.some(obstacle => segmentOverlapsRectInterior(start, end, obstacle))
}

function segmentOverlapsRectInterior(start: Point, end: Point, rect: Rect) {
  const left = rect.x
  const right = rect.x + rect.width
  const top = rect.y
  const bottom = rect.y + rect.height

  if (start.x === end.x) {
    const x = start.x
    if (x <= left + EPSILON || x >= right - EPSILON) return false

    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)
    return maxY > top + EPSILON && minY < bottom - EPSILON
  }

  if (start.y === end.y) {
    const y = start.y
    if (y <= top + EPSILON || y >= bottom - EPSILON) return false

    const minX = Math.min(start.x, end.x)
    const maxX = Math.max(start.x, end.x)
    return maxX > left + EPSILON && minX < right - EPSILON
  }

  return false
}

function hasTurned(previous: Point | null, current: Point, next: Point) {
  if (!previous) return false

  const previousHorizontal = previous.y === current.y
  const nextHorizontal = current.y === next.y
  return previousHorizontal !== nextHorizontal
}

function getManhattanDistance(left: Point, right: Point) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
}

function pointKey(point: Point) {
  return `${point.x}:${point.y}`
}
