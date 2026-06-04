import type { DecisionNode } from '../elements/DecisionNode'
import type { NodeDrawContext, Point } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeFillStyle, getNodeTextStyle } from './nodeStyle'

export class DecisionNodeView extends BaseNodeView<DecisionNode> {
  draw(ctx: CanvasRenderingContext2D, node: DecisionNode, context: NodeDrawContext) {
    const points = getDiamondPoints(node)
    const borderStyle = getNodeBorderStyle(node.getProps(), {
      color: '#f59e0b',
      width: 1.5,
      dash: 'solid',
    })
    const fillStyle = getNodeFillStyle(node.getProps(), {
      color: '#fffbeb',
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

    const position = node.getPosition()
    const size = node.getSize()
    drawTextBlock(ctx, {
      text: node.label,
      rect: {
        x: position.x + size.width * 0.18,
        y: position.y + size.height * 0.18,
        width: size.width * 0.64,
        height: size.height * 0.64,
      },
      style: {
        color: '#92400e',
        fontWeight: '700',
        padding: 6,
        ...getNodeTextStyle(node.getProps()),
      },
    })

    drawPorts(ctx, this, node, context)
    ctx.restore()
  }

  hitTest(node: DecisionNode, point: Point) {
    return isPointInPolygon(point, getDiamondPoints(node))
  }
}

function getDiamondPoints(node: DecisionNode): Point[] {
  const position = node.getPosition()
  const size = node.getSize()
  const centerX = position.x + size.width / 2
  const centerY = position.y + size.height / 2
  return [
    { x: centerX, y: position.y },
    { x: position.x + size.width, y: centerY },
    { x: centerX, y: position.y + size.height },
    { x: position.x, y: centerY },
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

function drawPorts(ctx: CanvasRenderingContext2D, view: BaseNodeView<DecisionNode>, node: DecisionNode, context: NodeDrawContext) {
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
