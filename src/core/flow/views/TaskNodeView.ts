import type { TaskNode } from '../elements/TaskNode'
import type { NodeDrawContext } from '../types/flow'
import type { TextHorizontalAlign, TextOverflow, TextStyle, TextVerticalAlign } from '../renderer/TextRenderer'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'

export class TaskNodeView extends BaseNodeView<TaskNode> {
  draw(ctx: CanvasRenderingContext2D, node: TaskNode, context: NodeDrawContext) {
    const position = node.getPosition()
    const size = node.getSize()
    const radius = 8
    const borderColor = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : context.theme.colors.nodeBorder

    ctx.save()
    ctx.globalAlpha = context.dragging ? 0.82 : 1
    ctx.fillStyle = context.theme.colors.nodeFill
    ctx.strokeStyle = borderColor
    ctx.lineWidth = context.selected ? 2 : 1.5

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
}

function getNodeTextStyle(props: Record<string, unknown>): Partial<TextStyle> {
  const value = props.textStyle
  if (!isRecord(value)) return {}

  const style: Partial<TextStyle> = {}

  if (typeof value.fontSize === 'number') style.fontSize = value.fontSize
  if (typeof value.fontFamily === 'string') style.fontFamily = value.fontFamily
  if (typeof value.fontWeight === 'string') style.fontWeight = value.fontWeight
  if (typeof value.fontStyle === 'string') style.fontStyle = value.fontStyle
  if (typeof value.color === 'string') style.color = value.color
  if (isTextHorizontalAlign(value.align)) style.align = value.align
  if (isTextVerticalAlign(value.verticalAlign)) style.verticalAlign = value.verticalAlign
  if (typeof value.lineHeight === 'number') style.lineHeight = value.lineHeight
  if (typeof value.padding === 'number') style.padding = value.padding
  if (typeof value.maxLines === 'number') style.maxLines = value.maxLines
  if (isTextOverflow(value.overflow)) style.overflow = value.overflow

  return style
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTextHorizontalAlign(value: unknown): value is TextHorizontalAlign {
  return value === 'left' || value === 'center' || value === 'right'
}

function isTextVerticalAlign(value: unknown): value is TextVerticalAlign {
  return value === 'top' || value === 'middle' || value === 'bottom'
}

function isTextOverflow(value: unknown): value is TextOverflow {
  return value === 'clip' || value === 'ellipsis'
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
