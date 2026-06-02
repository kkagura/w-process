import { BaseNode } from '../elements/BaseNode'
import type { BoxData, BoxId, Point, Rect, SceneElementData } from '../types/flow'
import { getUnionBounds } from '../utils/geometry'

export type SceneElement = BaseNode | Box

export interface RemovedSceneElement {
  element: SceneElement
  parentBoxId: BoxId
  index: number
}

export class Box {
  protected children: SceneElement[] = []
  protected data: BoxData

  constructor(data: BoxData) {
    this.data = structuredClone(data)
  }

  get id() {
    return this.data.id
  }

  get type() {
    return this.data.type
  }

  add(child: SceneElement) {
    this.children.push(child)
  }

  addAt(child: SceneElement, index = this.children.length) {
    const safeIndex = Math.max(0, Math.min(index, this.children.length))
    this.children.splice(safeIndex, 0, child)
  }

  remove(id: string): SceneElement | null {
    const index = this.children.findIndex(child => child.id === id)
    if (index >= 0) {
      const [removed] = this.children.splice(index, 1)
      return removed
    }

    for (const child of this.children) {
      if (child instanceof Box) {
        const removed = child.remove(id)
        if (removed) return removed
      }
    }

    return null
  }

  removeWithLocation(id: string): RemovedSceneElement | null {
    const index = this.children.findIndex(child => child.id === id)
    if (index >= 0) {
      const [element] = this.children.splice(index, 1)
      return {
        element,
        parentBoxId: this.id,
        index,
      }
    }

    for (const child of this.children) {
      if (child instanceof Box) {
        const removed = child.removeWithLocation(id)
        if (removed) return removed
      }
    }

    return null
  }

  find(id: string): SceneElement | null {
    for (const child of this.children) {
      if (child.id === id) return child
      if (child instanceof Box) {
        const matched = child.find(id)
        if (matched) return matched
      }
    }

    return null
  }

  findBox(id: BoxId): Box | null {
    if (this.id === id) return this
    const matched = this.find(id)
    return matched instanceof Box ? matched : null
  }

  getNodesDeep(): BaseNode[] {
    const nodes: BaseNode[] = []
    for (const child of this.children) {
      if (child instanceof Box) {
        nodes.push(...child.getNodesDeep())
      } else {
        nodes.push(child)
      }
    }
    return nodes
  }

  getBoxesDeep(): Box[] {
    const boxes: Box[] = []
    for (const child of this.children) {
      if (child instanceof Box) {
        boxes.push(child, ...child.getBoxesDeep())
      }
    }
    return boxes
  }

  moveBy(delta: Point) {
    for (const node of this.getNodesDeep()) {
      const position = node.getPosition()
      node.moveTo({
        x: position.x + delta.x,
        y: position.y + delta.y,
      })
    }
  }

  getBounds(): Rect {
    const bounds = this.getNodesDeep().map((node) => {
      const position = node.getPosition()
      const size = node.getSize()
      return { ...position, ...size }
    })

    if (bounds.length === 0) {
      return { ...this.data.position, ...this.data.size }
    }

    return getUnionBounds(bounds)
  }

  serialize(): BoxData {
    return {
      ...structuredClone(this.data),
      children: this.children.map(child => child.serialize() as SceneElementData),
    }
  }
}
