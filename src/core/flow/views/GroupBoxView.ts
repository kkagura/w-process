import type { GroupBox } from '../scene/GroupBox'
import {
  getGroupBorderStyle,
  getGroupContentRect,
  getGroupFillStyle,
  getGroupHeaderRect,
  getGroupTitleStyle,
} from '../scene/group'
import type { BoxDrawContext, Point } from '../types/flow'
import { containsPoint } from '../utils/geometry'
import { BaseBoxView } from './BaseBoxView'

const BORDER_HIT_SIZE = 6

export class GroupBoxView extends BaseBoxView<GroupBox> {
  override drawBackground(ctx: CanvasRenderingContext2D, box: GroupBox, context: BoxDrawContext) {
    const data = box.serialize()
    const rect = box.getRect()
    const header = getGroupHeaderRect(data)
    const fill = getGroupFillStyle(data)
    const title = getGroupTitleStyle(data)

    ctx.save()
    ctx.globalAlpha = fill.opacity
    ctx.fillStyle = fill.color
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.globalAlpha = 1
    ctx.fillStyle = title.backgroundColor
    ctx.fillRect(header.x, header.y, header.width, header.height)
    if (context.dropTarget) {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.1)'
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
    ctx.restore()
  }

  override drawForeground(ctx: CanvasRenderingContext2D, box: GroupBox, context: BoxDrawContext) {
    const data = box.serialize()
    const rect = box.getRect()
    const header = getGroupHeaderRect(data)
    const border = getGroupBorderStyle(data)
    const title = getGroupTitleStyle(data)
    const viewport = context.viewport

    ctx.save()
    ctx.strokeStyle = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : border.color
    ctx.lineWidth = (context.selected ? Math.max(2, border.width) : border.width) / viewport.zoom
    ctx.setLineDash(border.dash === 'dashed' ? [6 / viewport.zoom, 4 / viewport.zoom] : [])
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    ctx.beginPath()
    ctx.moveTo(header.x, header.y + header.height)
    ctx.lineTo(header.x + header.width, header.y + header.height)
    ctx.stroke()

    ctx.setLineDash([])
    ctx.fillStyle = title.color
    ctx.font = `600 ${title.fontSize / viewport.zoom}px "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(box.label || '分组', header.x + 10 / viewport.zoom, header.y + header.height / 2)
    ctx.restore()
  }

  override hitTest(box: GroupBox, point: Point) {
    const data = box.serialize()
    const rect = box.getRect()
    if (containsPoint(getGroupHeaderRect(data), point)) return true

    return containsPoint(rect, point) && (
      point.x - rect.x <= BORDER_HIT_SIZE
      || rect.x + rect.width - point.x <= BORDER_HIT_SIZE
      || point.y - rect.y <= BORDER_HIT_SIZE
      || rect.y + rect.height - point.y <= BORDER_HIT_SIZE
    )
  }

  override containsContentPoint(box: GroupBox, point: Point) {
    return containsPoint(getGroupContentRect(box.serialize()), point)
  }
}
