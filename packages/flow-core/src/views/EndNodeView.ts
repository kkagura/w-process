import type { EndNode } from '../elements/EndNode'
import type { NodeDrawContext, Point } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeFillStyle, getNodeTextStyle } from './nodeStyle'

export class EndNodeView extends BaseNodeView<EndNode> {
  draw(ctx: CanvasRenderingContext2D, node: EndNode, context: NodeDrawContext) {
    const position = node.getPosition()
    const size = node.getSize()
    const borderStyle = getNodeBorderStyle(node.getProps(), {
      color: '#dc2626',
      width: 1.5,
      dash: 'solid',
    })
    const fillStyle = getNodeFillStyle(node.getProps(), {
      color: '#fef2f2',
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

    ctx.beginPath()
    ctx.ellipse(
      position.x + size.width / 2,
      position.y + size.height / 2,
      size.width / 2,
      size.height / 2,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()
    ctx.stroke()

    drawTextBlock(ctx, {
      text: node.label,
      rect: { ...position, ...size },
      style: {
        color: '#991b1b',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 18,
        padding: 12,
        maxLines: 1,
        ...getNodeTextStyle(node.getProps()),
      },
    })

    if (context.showPorts) drawPorts(ctx, this, node, context)
    ctx.restore()
  }

  hitTest(node: EndNode, point: Point) {
    const localPoint = this.getLocalPoint(node, point)
    const position = node.getPosition()
    const size = node.getSize()
    const radiusX = size.width / 2
    const radiusY = size.height / 2
    if (radiusX <= 0 || radiusY <= 0) return false

    const normalizedX = (localPoint.x - (position.x + radiusX)) / radiusX
    const normalizedY = (localPoint.y - (position.y + radiusY)) / radiusY
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1
  }
}

function drawPorts(ctx: CanvasRenderingContext2D, view: BaseNodeView<EndNode>, node: EndNode, context: NodeDrawContext) {
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
