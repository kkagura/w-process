import type { IconNode } from '../elements/IconNode'
import type { NodeDrawContext } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeFillStyle, getNodeTextStyle } from './nodeStyle'

export class IconNodeView extends BaseNodeView<IconNode> {
  draw(ctx: CanvasRenderingContext2D, node: IconNode, context: NodeDrawContext) {
    const position = node.getPosition()
    const size = node.getSize()
    const borderStyle = getNodeBorderStyle(node.getProps(), {
      color: '#2563eb',
      width: 1.5,
      dash: 'solid',
    })
    const fillStyle = getNodeFillStyle(node.getProps(), {
      color: '#ffffff',
      opacity: 1,
    })
    const iconStyle = getIconStyle(node.getProps())
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

    roundedRect(ctx, position.x, position.y, size.width, size.height, 10)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])

    const iconSize = Math.min(size.width * 0.36, size.height * 0.42, 44)
    const iconX = position.x + (size.width - iconSize) / 2
    const iconY = position.y + Math.max(12, size.height * 0.14)

    drawIconBadge(ctx, iconX, iconY, iconSize, iconStyle.backgroundColor)
    drawServiceIcon(ctx, iconX, iconY, iconSize, iconStyle.color)

    const textTop = iconY + iconSize + 6
    drawTextBlock(ctx, {
      text: node.label,
      rect: {
        x: position.x + 8,
        y: textTop,
        width: Math.max(0, size.width - 16),
        height: Math.max(0, position.y + size.height - textTop - 8),
      },
      style: {
        color: '#1e3a8a',
        fontWeight: '700',
        padding: 2,
        maxLines: 2,
        ...getNodeTextStyle(node.getProps()),
      },
    })

    drawPorts(ctx, this, node, context)
    ctx.restore()
  }
}

function drawIconBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawServiceIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  const unit = size / 24
  const left = x + 6 * unit
  const top = y + 6 * unit
  const width = 12 * unit
  const height = 12 * unit

  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(1.5, 1.8 * unit)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  roundedRect(ctx, left, top, width, height, 2.5 * unit)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(left + 4 * unit, top + 5 * unit)
  ctx.lineTo(left + width - 4 * unit, top + 5 * unit)
  ctx.moveTo(left + 4 * unit, top + 9 * unit)
  ctx.lineTo(left + width - 4 * unit, top + 9 * unit)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(left + 3.2 * unit, top + 5 * unit, 0.8 * unit, 0, Math.PI * 2)
  ctx.arc(left + 3.2 * unit, top + 9 * unit, 0.8 * unit, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawPorts(ctx: CanvasRenderingContext2D, view: BaseNodeView<IconNode>, node: IconNode, context: NodeDrawContext) {
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

function getIconStyle(props: Record<string, unknown>) {
  const value = props.iconStyle
  if (!isRecord(value)) {
    return {
      color: '#2563eb',
      backgroundColor: '#dbeafe',
    }
  }

  return {
    color: typeof value.color === 'string' ? value.color : '#2563eb',
    backgroundColor: typeof value.backgroundColor === 'string' ? value.backgroundColor : '#dbeafe',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
