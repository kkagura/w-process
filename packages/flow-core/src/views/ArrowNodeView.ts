import type { ArrowNode } from '../elements/ArrowNode'
import type { NodeDrawContext, Point, Rect } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { hitTestPolygon } from '../utils/geometry'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeFillStyle, getNodeTextStyle } from './nodeStyle'

const ARROW_SHAFT_RATIO = 0.44
const POLYGON_HIT_TOLERANCE = 2

export class ArrowNodeView extends BaseNodeView<ArrowNode> {
  draw(ctx: CanvasRenderingContext2D, node: ArrowNode, context: NodeDrawContext) {
    const polygon = getArrowPolygon(node)
    const borderStyle = getNodeBorderStyle(node.getProps(), {
      color: '#4f46e5',
      width: 1.5,
      dash: 'solid',
    })
    const fillStyle = getNodeFillStyle(node.getProps(), {
      color: '#eef2ff',
      opacity: 1,
    })
    const borderColor = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : borderStyle.color

    ctx.save()
    this.applyNodeTransform(ctx, node)
    ctx.globalAlpha = context.dragging ? 0.82 : 1
    ctx.fillStyle = fillStyle.color
    ctx.strokeStyle = borderColor
    ctx.lineWidth = context.selected ? Math.max(borderStyle.width, 2) : borderStyle.width
    if (borderStyle.dash === 'dashed') ctx.setLineDash([8, 5])

    drawPolygon(ctx, polygon)
    ctx.fill()
    ctx.stroke()

    drawTextBlock(ctx, {
      text: node.label,
      rect: getArrowTextRect(node),
      style: {
        color: '#3730a3',
        fontWeight: '600',
        padding: 6,
        ...getNodeTextStyle(node.getProps()),
      },
    })

    if (context.showPorts) drawPorts(ctx, this, node, context)
    ctx.restore()
  }

  hitTest(node: ArrowNode, point: Point) {
    return hitTestPolygon(
      this.getLocalPoint(node, point),
      getArrowPolygon(node),
      POLYGON_HIT_TOLERANCE,
    )
  }
}

export function getArrowPolygon(node: ArrowNode): Point[] {
  const rect = node.getRawRect()
  return node.type === 'shape-arrow-double'
    ? getDoubleArrowPolygon(rect)
    : getSingleArrowPolygon(rect)
}

function getSingleArrowPolygon(rect: Rect): Point[] {
  const shaftTop = rect.y + rect.height * (1 - ARROW_SHAFT_RATIO) / 2
  const shaftBottom = rect.y + rect.height * (1 + ARROW_SHAFT_RATIO) / 2
  const headLength = Math.min(rect.width * 0.34, rect.height * 0.78)
  const headStartX = rect.x + rect.width - headLength

  return [
    { x: rect.x, y: shaftTop },
    { x: headStartX, y: shaftTop },
    { x: headStartX, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
    { x: headStartX, y: rect.y + rect.height },
    { x: headStartX, y: shaftBottom },
    { x: rect.x, y: shaftBottom },
  ]
}

function getDoubleArrowPolygon(rect: Rect): Point[] {
  const shaftTop = rect.y + rect.height * (1 - ARROW_SHAFT_RATIO) / 2
  const shaftBottom = rect.y + rect.height * (1 + ARROW_SHAFT_RATIO) / 2
  const headLength = Math.min(rect.width * 0.24, rect.height * 0.68)
  const leftHeadEndX = rect.x + headLength
  const rightHeadStartX = rect.x + rect.width - headLength

  return [
    { x: rect.x, y: rect.y + rect.height / 2 },
    { x: leftHeadEndX, y: rect.y },
    { x: leftHeadEndX, y: shaftTop },
    { x: rightHeadStartX, y: shaftTop },
    { x: rightHeadStartX, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
    { x: rightHeadStartX, y: rect.y + rect.height },
    { x: rightHeadStartX, y: shaftBottom },
    { x: leftHeadEndX, y: shaftBottom },
    { x: leftHeadEndX, y: rect.y + rect.height },
  ]
}

function getArrowTextRect(node: ArrowNode): Rect {
  const rect = node.getRawRect()
  if (node.type === 'shape-arrow-double') {
    const headLength = Math.min(rect.width * 0.24, rect.height * 0.68)
    return {
      x: rect.x + headLength,
      y: rect.y + rect.height * (1 - ARROW_SHAFT_RATIO) / 2,
      width: Math.max(0, rect.width - headLength * 2),
      height: rect.height * ARROW_SHAFT_RATIO,
    }
  }

  const headLength = Math.min(rect.width * 0.34, rect.height * 0.78)
  return {
    x: rect.x,
    y: rect.y + rect.height * (1 - ARROW_SHAFT_RATIO) / 2,
    width: Math.max(0, rect.width - headLength),
    height: rect.height * ARROW_SHAFT_RATIO,
  }
}

function drawPolygon(ctx: CanvasRenderingContext2D, polygon: Point[]) {
  if (polygon.length === 0) return

  ctx.beginPath()
  ctx.moveTo(polygon[0].x, polygon[0].y)
  for (let index = 1; index < polygon.length; index += 1) {
    ctx.lineTo(polygon[index].x, polygon[index].y)
  }
  ctx.closePath()
}

function drawPorts(
  ctx: CanvasRenderingContext2D,
  view: BaseNodeView<ArrowNode>,
  node: ArrowNode,
  context: NodeDrawContext,
) {
  for (const port of node.getPorts()) {
    const portPosition = view.getLocalPortPosition(node, port)
    ctx.beginPath()
    ctx.arc(portPosition.x, portPosition.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = context.theme.colors.portFill
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  }
}
