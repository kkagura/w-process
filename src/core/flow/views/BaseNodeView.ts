import type { BaseNode } from '../elements/BaseNode'
import type { FlowPort, NodeDrawContext, Point } from '../types/flow'
import { containsPoint, distance } from '../utils/geometry'

export abstract class BaseNodeView<TNode extends BaseNode = BaseNode> {
  abstract draw(ctx: CanvasRenderingContext2D, node: TNode, context: NodeDrawContext): void

  hitTest(node: TNode, point: Point) {
    const position = node.getPosition()
    const size = node.getSize()
    return containsPoint({ ...position, ...size }, point)
  }

  hitTestPort(node: TNode, point: Point): FlowPort | null {
    return node.getPorts().find((port) => {
      const portPosition = this.getPortPosition(node, port)
      return distance(point, portPosition) <= 8
    }) ?? null
  }

  getPortPosition(node: TNode, port: FlowPort): Point {
    const position = node.getPosition()
    return {
      x: position.x + port.offset.x,
      y: position.y + port.offset.y,
    }
  }
}
