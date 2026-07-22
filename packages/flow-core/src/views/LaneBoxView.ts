import type { LaneBox } from '../scene/LaneBox'
import { getLaneContentRect, getLaneOrientation } from '../scene/swimlane'
import type { BoxDrawContext, Point, Rect } from '../types/flow'
import { DEFAULT_CANVAS_FONT_FAMILY } from '../renderer/TextRenderer'
import { containsPoint } from '../utils/geometry'
import { BaseBoxView } from './BaseBoxView'

export class LaneBoxView extends BaseBoxView<LaneBox> {
  override drawBackground(
    ctx: CanvasRenderingContext2D,
    box: LaneBox,
    context: BoxDrawContext,
  ) {
    const rect = box.getRect()
    const content = getLaneContentRect(box.serialize())
    const orientation = getLaneOrientation(box.serialize())

    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.fillStyle = '#f1f5f9'
    if (orientation === 'horizontal') {
      ctx.fillRect(rect.x, rect.y, content.x - rect.x, rect.height)
    }
    else {
      ctx.fillRect(rect.x, rect.y, rect.width, content.y - rect.y)
    }
    if (context.dropTarget) {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.1)'
      ctx.fillRect(content.x, content.y, content.width, content.height)
    }
    ctx.restore()
  }

  override drawForeground(
    ctx: CanvasRenderingContext2D,
    box: LaneBox,
    context: BoxDrawContext,
  ) {
    const rect = box.getRect()
    const data = box.serialize()
    const content = getLaneContentRect(data)
    const orientation = getLaneOrientation(data)
    const viewport = context.viewport

    ctx.save()
    ctx.strokeStyle = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : '#94a3b8'
    ctx.lineWidth = (context.selected ? 2 : 1) / viewport.zoom
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    ctx.beginPath()
    if (orientation === 'horizontal') {
      ctx.moveTo(content.x, rect.y)
      ctx.lineTo(content.x, rect.y + rect.height)
    }
    else {
      ctx.moveTo(rect.x, content.y)
      ctx.lineTo(rect.x + rect.width, content.y)
    }
    ctx.stroke()

    ctx.fillStyle = '#334155'
    ctx.font = `600 ${12 / viewport.zoom}px ${DEFAULT_CANVAS_FONT_FAMILY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (orientation === 'horizontal') {
      ctx.fillText(box.label, rect.x + (content.x - rect.x) / 2, rect.y + rect.height / 2)
    }
    else {
      ctx.fillText(box.label, rect.x + rect.width / 2, rect.y + (content.y - rect.y) / 2)
    }
    ctx.restore()
  }

  override hitTest(box: LaneBox, point: Point) {
    return containsPoint(getLaneHeaderRect(box), point)
  }

  override containsContentPoint(box: LaneBox, point: Point) {
    return containsPoint(getLaneContentRect(box.serialize()), point)
  }
}

function getLaneHeaderRect(box: LaneBox): Rect {
  const rect = box.getRect()
  const content = getLaneContentRect(box.serialize())
  return getLaneOrientation(box.serialize()) === 'horizontal'
    ? {
        x: rect.x,
        y: rect.y,
        width: content.x - rect.x,
        height: rect.height,
      }
    : {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: content.y - rect.y,
      }
}
