import type { BaseNode } from '../elements/BaseNode'
import type { FlowPort, NodeDrawContext, Point } from '../types/flow'
import { containsPoint, distance, inverseRotatePoint, rotatePoint, toRadians } from '../utils/geometry'

export abstract class BaseNodeView<TNode extends BaseNode = BaseNode> {
  abstract draw(ctx: CanvasRenderingContext2D, node: TNode, context: NodeDrawContext): void

  hitTest(node: TNode, point: Point) {
    return containsPoint(node.getRawRect(), this.getLocalPoint(node, point))
  }

  hitTestPort(node: TNode, point: Point): FlowPort | null {
    return node.getPorts().find((port) => {
      const portPosition = this.getPortPosition(node, port)
      return distance(point, portPosition) <= 8
    }) ?? null
  }

  getPortPosition(node: TNode, port: FlowPort): Point {
    return rotatePoint(
      this.getLocalPortPosition(node, port),
      node.getCenter(),
      node.getRotation(),
    )
  }

  getLocalPortPosition(node: TNode, port: FlowPort): Point {
    const position = node.getPosition()
    return {
      x: position.x + port.offset.x,
      y: position.y + port.offset.y,
    }
  }

  protected applyNodeTransform(ctx: CanvasRenderingContext2D, node: TNode) {
    const rotation = node.getRotation()
    if (rotation === 0) return

    const center = node.getCenter()
    ctx.translate(center.x, center.y)
    ctx.rotate(toRadians(rotation))
    ctx.translate(-center.x, -center.y)
  }

  protected getLocalPoint(node: TNode, point: Point): Point {
    const rotation = node.getRotation()
    if (rotation === 0) return point

    return inverseRotatePoint(point, node.getCenter(), rotation)
  }
}
