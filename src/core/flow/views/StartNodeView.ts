import type { StartNode } from '../elements/StartNode'
import type { NodeDrawContext, Point } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'

export class StartNodeView extends BaseNodeView<StartNode> {
  draw(ctx: CanvasRenderingContext2D, node: StartNode, context: NodeDrawContext) {
    const position = node.getPosition()
    const size = node.getSize()
    const borderColor = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : '#16a34a'

    ctx.save()
    ctx.globalAlpha = context.dragging ? 0.82 : 1
    ctx.fillStyle = '#f0fdf4'
    ctx.strokeStyle = borderColor
    ctx.lineWidth = context.selected ? 2 : 1.5

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
      rect: {
        ...position,
        ...size,
      },
      style: {
        color: '#166534',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 18,
        padding: 12,
        maxLines: 1,
      },
    })

    for (const port of node.getPorts()) {
      const portPosition = this.getPortPosition(node, port)
      ctx.beginPath()
      ctx.arc(portPosition.x, portPosition.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = context.theme.colors.portFill
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    }

    ctx.restore()
  }

  hitTest(node: StartNode, point: Point) {
    const position = node.getPosition()
    const size = node.getSize()
    const radiusX = size.width / 2
    const radiusY = size.height / 2
    const centerX = position.x + radiusX
    const centerY = position.y + radiusY

    if (radiusX <= 0 || radiusY <= 0) return false

    const normalizedX = (point.x - centerX) / radiusX
    const normalizedY = (point.y - centerY) / radiusY
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1
  }
}
