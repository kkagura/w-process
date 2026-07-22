import type { SwimlaneBox } from '../scene/SwimlaneBox'
import type { BoxDrawContext, Point } from '../types/flow'
import { DEFAULT_CANVAS_FONT_FAMILY } from '../renderer/TextRenderer'
import { containsPoint } from '../utils/geometry'
import { BaseBoxView } from './BaseBoxView'
import { SWIMLANE_HEADER_SIZE } from '../scene/swimlane'

const BORDER_HIT_SIZE = 6

export class SwimlaneBoxView extends BaseBoxView<SwimlaneBox> {
  override drawBackground(
    ctx: CanvasRenderingContext2D,
    box: SwimlaneBox,
    context: BoxDrawContext,
  ) {
    const rect = box.getRect()
    ctx.save()
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(rect.x, rect.y, rect.width, SWIMLANE_HEADER_SIZE)
    if (context.dropTarget) {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.08)'
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
    ctx.restore()
  }

  override drawForeground(
    ctx: CanvasRenderingContext2D,
    box: SwimlaneBox,
    context: BoxDrawContext,
  ) {
    const rect = box.getRect()
    const viewport = context.viewport
    ctx.save()
    ctx.strokeStyle = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : '#64748b'
    ctx.lineWidth = (context.selected ? 2 : 1.2) / viewport.zoom
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    ctx.beginPath()
    ctx.moveTo(rect.x, rect.y + SWIMLANE_HEADER_SIZE)
    ctx.lineTo(rect.x + rect.width, rect.y + SWIMLANE_HEADER_SIZE)
    ctx.stroke()

    ctx.fillStyle = '#0f172a'
    ctx.font = `700 ${13 / viewport.zoom}px ${DEFAULT_CANVAS_FONT_FAMILY}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(box.label || '泳道', rect.x + 12 / viewport.zoom, rect.y + SWIMLANE_HEADER_SIZE / 2)
    ctx.restore()
  }

  override hitTest(box: SwimlaneBox, point: Point) {
    const rect = box.getRect()
    const header = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: SWIMLANE_HEADER_SIZE,
    }
    if (containsPoint(header, point)) return true

    return containsPoint(rect, point) && (
      point.x - rect.x <= BORDER_HIT_SIZE
      || rect.x + rect.width - point.x <= BORDER_HIT_SIZE
      || point.y - rect.y <= BORDER_HIT_SIZE
      || rect.y + rect.height - point.y <= BORDER_HIT_SIZE
    )
  }
}
