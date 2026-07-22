import type { DocumentNode } from '../elements/DocumentNode'
import type { NodeDrawContext } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeFillStyle, getNodeTextStyle } from './nodeStyle'

export class DocumentNodeView extends BaseNodeView<DocumentNode> {
  draw(ctx: CanvasRenderingContext2D, node: DocumentNode, context: NodeDrawContext) {
    const position = node.getPosition()
    const size = node.getSize()
    const waveHeight = Math.min(14, size.height * 0.22)
    const borderStyle = getNodeBorderStyle(node.getProps(), {
      color: '#7c3aed',
      width: 1.5,
      dash: 'solid',
    })
    const fillStyle = getNodeFillStyle(node.getProps(), {
      color: '#f5f3ff',
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
    ctx.moveTo(position.x, position.y)
    ctx.lineTo(position.x + size.width, position.y)
    ctx.lineTo(position.x + size.width, position.y + size.height - waveHeight)
    ctx.bezierCurveTo(
      position.x + size.width * 0.72,
      position.y + size.height + waveHeight * 0.45,
      position.x + size.width * 0.36,
      position.y + size.height - waveHeight * 1.3,
      position.x,
      position.y + size.height - waveHeight * 0.15,
    )
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    drawTextBlock(ctx, {
      text: node.label,
      rect: {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height - waveHeight * 0.6,
      },
      style: {
        color: '#5b21b6',
        fontWeight: '600',
        ...getNodeTextStyle(node.getProps()),
      },
    })

    if (context.showPorts) drawPorts(ctx, this, node, context)
    ctx.restore()
  }
}

function drawPorts(ctx: CanvasRenderingContext2D, view: BaseNodeView<DocumentNode>, node: DocumentNode, context: NodeDrawContext) {
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
