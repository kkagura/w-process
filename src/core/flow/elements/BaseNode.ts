import type { FlowNode, FlowPort, Point, Size } from '../types/flow'

export abstract class BaseNode {
  protected data: FlowNode

  constructor(data: FlowNode) {
    this.data = structuredClone(data)
  }

  get id() {
    return this.data.id
  }

  get type() {
    return this.data.type
  }

  get label() {
    return this.data.label
  }

  getPorts(): FlowPort[] {
    return this.data.ports
  }

  getPosition(): Point {
    return this.data.position
  }

  getSize(): Size {
    return this.data.size
  }

  getProps() {
    return this.data.props
  }

  updateLabel(label: string) {
    this.data.label = label
  }

  updateData(data: FlowNode) {
    this.data = structuredClone(data)
  }

  moveTo(position: Point) {
    this.data.position = { ...position }
  }

  updateProps(props: Record<string, unknown>) {
    this.data.props = { ...this.data.props, ...props }
  }

  serialize(): FlowNode {
    return structuredClone(this.data)
  }
}
