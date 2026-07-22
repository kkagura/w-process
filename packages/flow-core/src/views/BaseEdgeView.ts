import type { BaseEdge } from '../elements/BaseEdge'
import type { EdgeDrawContext, EdgeLineDash, EdgeLineStyleData, EdgeRouteData, EdgeRouteType, Point } from '../types/flow'
import { distanceToSegment } from '../utils/geometry'
import { hitTestOrthogonalPath, routeOrthogonalEdge } from '../routing/orthogonal'

export class BaseEdgeView<TEdge extends BaseEdge = BaseEdge> {
  draw(ctx: CanvasRenderingContext2D, edge: TEdge, context: EdgeDrawContext) {
    const lineStyle = getEdgeLineStyle(edge)
    const route = getEdgeRoute(edge)
    const path = getEdgePath(route.type, context)
    const visiblePath = trimPathEnd(path, getEndpointTrimOffset(lineStyle))

    ctx.save()
    ctx.beginPath()
    drawPolyline(ctx, visiblePath)
    ctx.strokeStyle = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : lineStyle.color
    ctx.lineWidth = (context.selected ? Math.max(lineStyle.width, 2.5) : lineStyle.width) / context.viewport.zoom
    if (lineStyle.dash === 'dashed') {
      ctx.setLineDash([8 / context.viewport.zoom, 5 / context.viewport.zoom])
    }
    ctx.stroke()

    this.drawArrow(ctx, visiblePath, context, lineStyle)
    this.drawLabel(ctx, edge, visiblePath, context)
    ctx.restore()
  }

  hitTest(edge: TEdge, point: Point, context: EdgeDrawContext) {
    const route = getEdgeRoute(edge)
    if (route.type === 'bezier') return hitTestBezierEdge(point, context)

    const path = getEdgePath(route.type, context)
    const threshold = 8 / context.viewport.zoom

    return hitTestOrthogonalPath(path, point, threshold)
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    path: Point[],
    context: EdgeDrawContext,
    lineStyle: EdgeLineStyleData,
  ) {
    if (path.length < 2) return

    const target = path[path.length - 1]
    const previous = path[path.length - 2]
    const angle = Math.atan2(target.y - previous.y, target.x - previous.x)
    const size = lineStyle.arrowSize / context.viewport.zoom

    ctx.beginPath()
    ctx.moveTo(target.x, target.y)
    ctx.lineTo(
      target.x - Math.cos(angle - Math.PI / 6) * size,
      target.y - Math.sin(angle - Math.PI / 6) * size,
    )
    ctx.lineTo(
      target.x - Math.cos(angle + Math.PI / 6) * size,
      target.y - Math.sin(angle + Math.PI / 6) * size,
    )
    ctx.closePath()
    ctx.fillStyle = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : lineStyle.color
    ctx.fill()
  }

  private drawLabel(
    ctx: CanvasRenderingContext2D,
    edge: TEdge,
    path: Point[],
    context: EdgeDrawContext,
  ) {
    const label = edge.serialize().label?.trim()
    if (!label || path.length < 2) return

    const point = getPathMidpoint(path)
    const fontSize = 12 / context.viewport.zoom
    const paddingX = 6 / context.viewport.zoom
    const paddingY = 3 / context.viewport.zoom

    ctx.save()
    ctx.font = `500 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    const width = ctx.measureText(label).width
    const height = fontSize + paddingY * 2
    const x = point.x - width / 2 - paddingX
    const y = point.y - height / 2

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.strokeStyle = context.selected ? context.theme.colors.selected : '#cbd5e1'
    ctx.lineWidth = 1 / context.viewport.zoom
    ctx.beginPath()
    ctx.roundRect(x, y, width + paddingX * 2, height, 4 / context.viewport.zoom)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#334155'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, point.x, point.y)
    ctx.restore()
  }
}

function getPathMidpoint(path: Point[]) {
  let totalLength = 0
  for (let index = 1; index < path.length; index += 1) {
    totalLength += getDistance(path[index - 1], path[index])
  }

  let walked = 0
  const half = totalLength / 2
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1]
    const end = path[index]
    const segmentLength = getDistance(start, end)
    if (walked + segmentLength >= half) {
      const ratio = segmentLength === 0 ? 0 : (half - walked) / segmentLength
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      }
    }
    walked += segmentLength
  }

  return path[Math.floor(path.length / 2)]
}

function getDistance(left: Point, right: Point) {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

function trimPathEnd(path: Point[], offset: number) {
  if (path.length < 2 || offset <= 0) return path.map(point => ({ ...point }))

  const trimmed = path.map(point => ({ ...point }))
  let remainingOffset = offset

  while (trimmed.length >= 2) {
    const target = trimmed[trimmed.length - 1]
    const previous = trimmed[trimmed.length - 2]
    const segmentLength = getDistance(previous, target)

    if (segmentLength === 0) {
      trimmed.pop()
      continue
    }

    if (segmentLength > remainingOffset) {
      const ratio = (segmentLength - remainingOffset) / segmentLength
      trimmed[trimmed.length - 1] = {
        x: previous.x + (target.x - previous.x) * ratio,
        y: previous.y + (target.y - previous.y) * ratio,
      }
      return trimmed
    }

    remainingOffset -= segmentLength
    trimmed.pop()
  }

  return trimmed
}

function getEndpointTrimOffset(lineStyle: EdgeLineStyleData) {
  return Math.max(7, lineStyle.arrowSize * 0.7 + lineStyle.width * 0.5)
}

function getEdgePath(routeType: EdgeRouteType, context: EdgeDrawContext) {
  if (routeType === 'bezier') {
    return sampleBezier(context.sourcePoint, context.targetPoint)
  }

  return routeOrthogonalEdge({
    source: context.sourcePoint,
    target: context.targetPoint,
    sourceRect: context.sourceRect,
    targetRect: context.targetRect,
    obstacles: context.obstacles,
  })
}

function getEdgeRoute(edge: BaseEdge): EdgeRouteData {
  const route = edge.serialize().props?.route
  const fallback: EdgeRouteData = {
    type: 'orthogonal',
  }
  if (!isRecord(route)) return fallback

  return {
    type: isEdgeRouteType(route.type) ? route.type : fallback.type,
  }
}

function getEdgeLineStyle(edge: BaseEdge): EdgeLineStyleData {
  const lineStyle = edge.serialize().props?.lineStyle
  const fallback: EdgeLineStyleData = {
    color: '#64748b',
    width: 1.6,
    dash: 'solid',
    arrowSize: 8,
  }
  if (!isRecord(lineStyle)) return fallback

  return {
    color: typeof lineStyle.color === 'string' && lineStyle.color ? lineStyle.color : fallback.color,
    width: Math.max(1, getFiniteNumber(lineStyle.width, fallback.width)),
    dash: isEdgeLineDash(lineStyle.dash) ? lineStyle.dash : fallback.dash,
    arrowSize: Math.max(4, getFiniteNumber(lineStyle.arrowSize, fallback.arrowSize)),
  }
}

function getFiniteNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isEdgeLineDash(value: unknown): value is EdgeLineDash {
  return value === 'solid' || value === 'dashed'
}

function isEdgeRouteType(value: unknown): value is EdgeRouteType {
  return value === 'orthogonal' || value === 'bezier'
}

function drawPolyline(ctx: CanvasRenderingContext2D, path: Point[]) {
  if (path.length === 0) return

  ctx.moveTo(path[0].x, path[0].y)
  for (let index = 1; index < path.length; index += 1) {
    ctx.lineTo(path[index].x, path[index].y)
  }
}

export function drawBezierEdge(
  ctx: CanvasRenderingContext2D,
  context: EdgeDrawContext,
) {
  const [controlA, controlB] = getBezierControls(context.sourcePoint, context.targetPoint)

  ctx.beginPath()
  ctx.moveTo(context.sourcePoint.x, context.sourcePoint.y)
  ctx.bezierCurveTo(
    controlA.x,
    controlA.y,
    controlB.x,
    controlB.y,
    context.targetPoint.x,
    context.targetPoint.y,
  )
}

export function hitTestBezierEdge(point: Point, context: EdgeDrawContext) {
  const samples = sampleBezier(context.sourcePoint, context.targetPoint)
  const threshold = 8 / context.viewport.zoom

  for (let index = 1; index < samples.length; index += 1) {
    if (distanceToSegment(point, samples[index - 1], samples[index]) <= threshold) {
      return true
    }
  }

  return false
}

export function getBezierControls(source: Point, target: Point): [Point, Point] {
  const distanceX = Math.abs(target.x - source.x)
  const offset = Math.max(48, distanceX * 0.45)

  return [
    { x: source.x + offset, y: source.y },
    { x: target.x - offset, y: target.y },
  ]
}

export function sampleBezier(source: Point, target: Point, steps = 32) {
  const [controlA, controlB] = getBezierControls(source, target)
  const samples: Point[] = []

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    const inverse = 1 - t
    samples.push({
      x: inverse ** 3 * source.x
        + 3 * inverse ** 2 * t * controlA.x
        + 3 * inverse * t ** 2 * controlB.x
        + t ** 3 * target.x,
      y: inverse ** 3 * source.y
        + 3 * inverse ** 2 * t * controlA.y
        + 3 * inverse * t ** 2 * controlB.y
        + t ** 3 * target.y,
    })
  }

  return samples
}
