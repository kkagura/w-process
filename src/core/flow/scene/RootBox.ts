import { Box } from './Box'
import { getUnionBounds } from '../utils/geometry'

export class RootBox extends Box {
  constructor() {
    super({
      id: 'root',
      type: 'root',
      label: 'Root',
      position: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
      children: [],
    })
  }

  override moveBy() {}

  override getBounds() {
    const bounds = this.getChildren().map(child => child.getBounds())
    return bounds.length > 0
      ? getUnionBounds(bounds)
      : { x: 0, y: 0, width: 0, height: 0 }
  }
}
