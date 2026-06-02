import type { BaseEdge } from '../elements/BaseEdge'
import type { EdgeDrawContext, Point } from '../types/flow'
import { distanceToSegment } from '../utils/geometry'

export class BaseEdgeView<TEdge extends BaseEdge = BaseEdge> {
  draw(ctx: CanvasRenderingContext2D, _edge: TEdge, context: EdgeDrawContext) {
    const [controlA, controlB] = getBezierControls(context.sourcePoint, context.targetPoint)

    ctx.save()
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
    ctx.strokeStyle = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : '#64748b'
    ctx.lineWidth = context.selected ? 2.5 / context.viewport.zoom : 1.6 / context.viewport.zoom
    ctx.stroke()

    this.drawArrow(ctx, context.targetPoint, controlB, context)
    ctx.restore()
  }

  hitTest(_edge: TEdge, point: Point, context: EdgeDrawContext) {
    const samples = sampleBezier(context.sourcePoint, context.targetPoint)
    const threshold = 8 / context.viewport.zoom

    for (let index = 1; index < samples.length; index += 1) {
      if (distanceToSegment(point, samples[index - 1], samples[index]) <= threshold) {
        return true
      }
    }

    return false
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    target: Point,
    control: Point,
    context: EdgeDrawContext,
  ) {
    const angle = Math.atan2(target.y - control.y, target.x - control.x)
    const size = 8 / context.viewport.zoom

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
        : '#64748b'
    ctx.fill()
  }
}

export function getBezierControls(source: Point, target: Point): [Point, Point] {
  const distanceX = Math.abs(target.x - source.x)
  const offset = Math.max(48, distanceX * 0.45)

  return [
    { x: source.x + offset, y: source.y },
    { x: target.x - offset, y: target.y },
  ]
}

export function sampleBezier(source: Point, target: Point, steps = 24) {
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
