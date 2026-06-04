import type { TriangleNode } from '../elements/TriangleNode'
import type { NodeDrawContext, Point } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeFillStyle, getNodeTextStyle } from './nodeStyle'

export class TriangleNodeView extends BaseNodeView<TriangleNode> {
  draw(ctx: CanvasRenderingContext2D, node: TriangleNode, context: NodeDrawContext) {
    const points = getTrianglePoints(node)
    const position = node.getPosition()
    const size = node.getSize()
    const borderStyle = getNodeBorderStyle(node.getProps(), {
      color: '#ea580c',
      width: 1.5,
      dash: 'solid',
    })
    const fillStyle = getNodeFillStyle(node.getProps(), {
      color: '#fff7ed',
      opacity: 1,
    })
    const borderColor = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : borderStyle.color

    ctx.save()
    ctx.globalAlpha = context.dragging ? 0.82 : 1
    ctx.fillStyle = fillStyle.color
    ctx.strokeStyle = borderColor
    ctx.lineWidth = context.selected ? Math.max(borderStyle.width, 2) : borderStyle.width
    if (borderStyle.dash === 'dashed') ctx.setLineDash([8, 5])

    drawPolygon(ctx, points)
    ctx.fill()
    ctx.stroke()

    drawTextBlock(ctx, {
      text: node.label,
      rect: {
        x: position.x + size.width * 0.2,
        y: position.y + size.height * 0.34,
        width: size.width * 0.6,
        height: size.height * 0.48,
      },
      style: {
        color: '#9a3412',
        fontWeight: '600',
        padding: 4,
        ...getNodeTextStyle(node.getProps()),
      },
    })

    drawPorts(ctx, this, node, context)
    ctx.restore()
  }

  hitTest(node: TriangleNode, point: Point) {
    return isPointInPolygon(point, getTrianglePoints(node))
  }
}

function getTrianglePoints(node: TriangleNode): Point[] {
  const position = node.getPosition()
  const size = node.getSize()
  return [
    { x: position.x + size.width / 2, y: position.y },
    { x: position.x + size.width, y: position.y + size.height },
    { x: position.x, y: position.y + size.height },
  ]
}

function drawPolygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y)
  }
  ctx.closePath()
}

function isPointInPolygon(point: Point, polygon: Point[]) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index]
    const previousPoint = polygon[previous]
    const intersects = currentPoint.y > point.y !== previousPoint.y > point.y
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / (previousPoint.y - currentPoint.y) + currentPoint.x
    if (intersects) inside = !inside
  }
  return inside
}

function drawPorts(ctx: CanvasRenderingContext2D, view: BaseNodeView<TriangleNode>, node: TriangleNode, context: NodeDrawContext) {
  for (const port of node.getPorts()) {
    const portPosition = view.getPortPosition(node, port)
    ctx.beginPath()
    ctx.arc(portPosition.x, portPosition.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = context.theme.colors.portFill
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  }
}
