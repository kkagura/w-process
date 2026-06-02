import { Box } from './Box'

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
}
