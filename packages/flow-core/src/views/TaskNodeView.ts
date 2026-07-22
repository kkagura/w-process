import type { TaskNode } from '../elements/TaskNode'
import type { NodeDrawContext } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeFillStyle, getNodeTextStyle } from './nodeStyle'

export class TaskNodeView extends BaseNodeView<TaskNode> {
  draw(ctx: CanvasRenderingContext2D, node: TaskNode, context: NodeDrawContext) {
    const position = node.getPosition()
    const size = node.getSize()
    const radius = 8
    const borderStyle = getNodeBorderStyle(node.getProps(), {
      color: context.theme.colors.nodeBorder,
      width: 1.5,
      dash: 'solid',
    })
    const fillStyle = getNodeFillStyle(node.getProps(), {
      color: context.theme.colors.nodeFill,
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

    drawTextBlock(ctx, {
      text: node.label,
      rect: {
        ...position,
        ...size,
      },
      style: {
        color: context.theme.colors.nodeText,
        ...getNodeTextStyle(node.getProps()),
      },
    })

    if (context.showPorts) {
      for (const port of node.getPorts()) {
        const portPosition = this.getLocalPortPosition(node, port)
        ctx.beginPath()
        ctx.arc(portPosition.x, portPosition.y, 5, 0, Math.PI * 2)
        ctx.fillStyle = context.theme.colors.portFill
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
      }
    }

    ctx.restore()
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
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
