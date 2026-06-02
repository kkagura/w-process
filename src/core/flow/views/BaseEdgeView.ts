import type { BaseEdge } from '../elements/BaseEdge'
import type { EdgeDrawContext, Point } from '../types/flow'

export class BaseEdgeView<TEdge extends BaseEdge = BaseEdge> {
  draw(_ctx: CanvasRenderingContext2D, _edge: TEdge, _context: EdgeDrawContext) {}

  hitTest(_edge: TEdge, _point: Point) {
    return false
  }
}
