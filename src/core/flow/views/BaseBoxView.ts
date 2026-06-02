import type { Box } from '../scene/Box'
import type { BoxDrawContext, Point } from '../types/flow'
import { containsPoint } from '../utils/geometry'

export class BaseBoxView<TBox extends Box = Box> {
  draw(_ctx: CanvasRenderingContext2D, _box: TBox, _context: BoxDrawContext) {}

  hitTest(box: TBox, point: Point) {
    return containsPoint(box.getBounds(), point)
  }
}
