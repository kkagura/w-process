import type { Box } from '../scene/Box'
import type { BoxDrawContext, Point } from '../types/flow'
import { containsPoint } from '../utils/geometry'

export class BaseBoxView<TBox extends Box = Box> {
  drawBackground(_ctx: CanvasRenderingContext2D, _box: TBox, _context: BoxDrawContext) {}

  drawForeground(_ctx: CanvasRenderingContext2D, _box: TBox, _context: BoxDrawContext) {}

  hitTest(box: TBox, point: Point) {
    return containsPoint(box.getBounds(), point)
  }

  containsContentPoint(box: TBox, point: Point) {
    return containsPoint(box.getBounds(), point)
  }
}
