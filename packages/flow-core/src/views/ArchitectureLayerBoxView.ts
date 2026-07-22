import type { ArchitectureLayerBox } from '../scene/ArchitectureLayerBox'
import {
  ARCHITECTURE_LAYER_CORNER_RADIUS,
  getArchitectureLayerBorderStyle,
  getArchitectureLayerContentRect,
  getArchitectureLayerFillStyle,
  getArchitectureLayerHeaderRect,
  getArchitectureLayerTitleStyle,
} from '../scene/architectureLayer'
import type { BoxDrawContext, Point, Rect } from '../types/flow'
import { containsPoint } from '../utils/geometry'
import { BaseBoxView } from './BaseBoxView'

const BORDER_HIT_SIZE = 6

export class ArchitectureLayerBoxView extends BaseBoxView<ArchitectureLayerBox> {
  override drawBackground(
    ctx: CanvasRenderingContext2D,
    box: ArchitectureLayerBox,
    context: BoxDrawContext,
  ) {
    const data = box.serialize()
    const rect = box.getRect()
    const header = getArchitectureLayerHeaderRect(data)
    const fill = getArchitectureLayerFillStyle(data)
    const title = getArchitectureLayerTitleStyle(data)

    ctx.save()
    roundedRect(ctx, rect, ARCHITECTURE_LAYER_CORNER_RADIUS)
    ctx.clip()
    ctx.globalAlpha = fill.opacity
    ctx.fillStyle = fill.color
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.globalAlpha = 1
    ctx.fillStyle = title.backgroundColor
    ctx.fillRect(header.x, header.y, header.width, header.height)
    if (context.dropTarget) {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.12)'
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
    ctx.restore()
  }

  override drawForeground(
    ctx: CanvasRenderingContext2D,
    box: ArchitectureLayerBox,
    context: BoxDrawContext,
  ) {
    const data = box.serialize()
    const rect = box.getRect()
    const header = getArchitectureLayerHeaderRect(data)
    const border = getArchitectureLayerBorderStyle(data)
    const title = getArchitectureLayerTitleStyle(data)
    const viewport = context.viewport

    ctx.save()
    ctx.strokeStyle = context.selected
      ? context.theme.colors.selected
      : context.hovered
        ? context.theme.colors.hovered
        : border.color
    ctx.lineWidth = (context.selected ? Math.max(2, border.width) : border.width) / viewport.zoom
    ctx.setLineDash(border.dash === 'dashed' ? [7 / viewport.zoom, 5 / viewport.zoom] : [])
    roundedRect(ctx, rect, ARCHITECTURE_LAYER_CORNER_RADIUS)
    ctx.stroke()

    ctx.setLineDash([])
    ctx.fillStyle = title.color
    ctx.font = `700 ${title.fontSize / viewport.zoom}px "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(box.label || '架构层', header.x + 14 / viewport.zoom, header.y + header.height / 2)
    ctx.restore()
  }

  override hitTest(box: ArchitectureLayerBox, point: Point) {
    const data = box.serialize()
    const rect = box.getRect()
    if (containsPoint(getArchitectureLayerHeaderRect(data), point)) return true

    return containsPoint(rect, point) && (
      point.x - rect.x <= BORDER_HIT_SIZE
      || rect.x + rect.width - point.x <= BORDER_HIT_SIZE
      || point.y - rect.y <= BORDER_HIT_SIZE
      || rect.y + rect.height - point.y <= BORDER_HIT_SIZE
    )
  }

  override containsContentPoint(box: ArchitectureLayerBox, point: Point) {
    return containsPoint(getArchitectureLayerContentRect(box.serialize()), point)
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, rect: Rect, radius: number) {
  const safeRadius = Math.min(radius, rect.width / 2, rect.height / 2)
  ctx.beginPath()
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, safeRadius)
}
