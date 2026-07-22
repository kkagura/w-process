import type { RectangleNode } from '../elements/RectangleNode'
import type { NodeDrawContext } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeFillStyle, getNodeTextStyle } from './nodeStyle'

export class RectangleNodeView extends BaseNodeView<RectangleNode> {
  draw(ctx: CanvasRenderingContext2D, node: RectangleNode, context: NodeDrawContext) {
    const position = node.getPosition()
    const size = node.getSize()
    const borderStyle = getNodeBorderStyle(node.getProps(), {
      color: '#475569',
      width: 1.5,
      dash: 'solid',
    })
    const fillStyle = getNodeFillStyle(node.getProps(), {
      color: '#f8fafc',
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
    ctx.rect(position.x, position.y, size.width, size.height)
    ctx.fill()
    ctx.stroke()

    drawTextBlock(ctx, {
      text: node.label,
      rect: {
        ...position,
        ...size,
      },
      style: {
        color: '#334155',
        fontWeight: '600',
        ...getNodeTextStyle(node.getProps()),
      },
    })

    drawPorts(ctx, this, node, context)
    ctx.restore()
  }
}

function drawPorts(ctx: CanvasRenderingContext2D, view: BaseNodeView<RectangleNode>, node: RectangleNode, context: NodeDrawContext) {
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
