import type { DataNode } from '../elements/DataNode'
import type { NodeDrawContext, Point } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeTextStyle } from './nodeStyle'

export class DataNodeView extends BaseNodeView<DataNode> {
  draw(ctx: CanvasRenderingContext2D, node: DataNode, context: NodeDrawContext) {
    const points = getDataNodePoints(node)
    const borderStyle = getNodeBorderStyle(node.getProps(), {
      color: '#0891b2',
      width: 1.5,
      dash: 'solid',
    })
    const borderColor = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : borderStyle.color

    ctx.save()
    ctx.globalAlpha = context.dragging ? 0.82 : 1
    ctx.fillStyle = '#ecfeff'
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
        x: position.x + size.width * 0.12,
        y: position.y,
        width: size.width * 0.76,
        height: size.height,
      },
      style: {
        color: '#155e75',
        fontWeight: '600',
        ...getNodeTextStyle(node.getProps()),
      },
    })

    drawPorts(ctx, this, node, context)
    ctx.restore()
  }

  hitTest(node: DataNode, point: Point) {
    return isPointInPolygon(point, getDataNodePoints(node))
  }
}

function getDataNodePoints(node: DataNode): Point[] {
  const position = node.getPosition()
  const size = node.getSize()
  const offset = Math.min(24, size.width * 0.16)
  return [
    { x: position.x + offset, y: position.y },
    { x: position.x + size.width, y: position.y },
    { x: position.x + size.width - offset, y: position.y + size.height },
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

function drawPorts(ctx: CanvasRenderingContext2D, view: BaseNodeView<DataNode>, node: DataNode, context: NodeDrawContext) {
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
