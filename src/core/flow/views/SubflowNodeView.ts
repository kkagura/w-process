import type { SubflowNode } from '../elements/SubflowNode'
import type { NodeDrawContext } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeFillStyle, getNodeTextStyle } from './nodeStyle'

export class SubflowNodeView extends BaseNodeView<SubflowNode> {
  draw(ctx: CanvasRenderingContext2D, node: SubflowNode, context: NodeDrawContext) {
    const position = node.getPosition()
    const size = node.getSize()
    const radius = 8
    const sideInset = Math.min(18, size.width * 0.12)
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

    roundedRect(ctx, position.x, position.y, size.width, size.height, radius)
    ctx.fill()
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(position.x + sideInset, position.y)
    ctx.lineTo(position.x + sideInset, position.y + size.height)
    ctx.moveTo(position.x + size.width - sideInset, position.y)
    ctx.lineTo(position.x + size.width - sideInset, position.y + size.height)
    ctx.stroke()

    drawTextBlock(ctx, {
      text: node.label,
      rect: {
        x: position.x + sideInset,
        y: position.y,
        width: size.width - sideInset * 2,
        height: size.height,
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

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawPorts(ctx: CanvasRenderingContext2D, view: BaseNodeView<SubflowNode>, node: SubflowNode, context: NodeDrawContext) {
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
