import type { CircleNode } from '../elements/CircleNode'
import type { NodeDrawContext, Point } from '../types/flow'
import { drawTextBlock } from '../renderer/TextRenderer'
import { BaseNodeView } from './BaseNodeView'
import { getNodeBorderStyle, getNodeFillStyle, getNodeTextStyle } from './nodeStyle'

export class CircleNodeView extends BaseNodeView<CircleNode> {
  draw(ctx: CanvasRenderingContext2D, node: CircleNode, context: NodeDrawContext) {
    const position = node.getPosition()
    const size = node.getSize()
    const centerX = position.x + size.width / 2
    const centerY = position.y + size.height / 2
    const borderStyle = getNodeBorderStyle(node.getProps(), {
      color: '#2563eb',
      width: 1.5,
      dash: 'solid',
    })
    const fillStyle = getNodeFillStyle(node.getProps(), {
      color: '#eff6ff',
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
    ctx.ellipse(centerX, centerY, size.width / 2, size.height / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    drawTextBlock(ctx, {
      text: node.label,
      rect: {
        x: position.x + size.width * 0.18,
        y: position.y + size.height * 0.18,
        width: size.width * 0.64,
        height: size.height * 0.64,
      },
      style: {
        color: '#1e3a8a',
        fontWeight: '600',
        padding: 6,
        ...getNodeTextStyle(node.getProps()),
      },
    })

    if (context.showPorts) drawPorts(ctx, this, node, context)
    ctx.restore()
  }

  hitTest(node: CircleNode, point: Point) {
    const localPoint = this.getLocalPoint(node, point)
    const position = node.getPosition()
    const size = node.getSize()
    const radiusX = size.width / 2
    const radiusY = size.height / 2
    if (radiusX <= 0 || radiusY <= 0) return false

    const dx = (localPoint.x - (position.x + radiusX)) / radiusX
    const dy = (localPoint.y - (position.y + radiusY)) / radiusY
    return dx * dx + dy * dy <= 1
  }
}

function drawPorts(ctx: CanvasRenderingContext2D, view: BaseNodeView<CircleNode>, node: CircleNode, context: NodeDrawContext) {
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
