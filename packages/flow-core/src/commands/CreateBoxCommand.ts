import type { SceneManager } from '../scene/SceneManager'
import type { BoxData, BoxId } from '../types/flow'
import type { SceneCommand } from './SceneCommand'

export class CreateBoxCommand implements SceneCommand {
  label = 'Create box'
  private box: BoxData
  private parentBoxId?: BoxId

  constructor(
    box: BoxData,
    parentBoxId?: BoxId,
  ) {
    this.box = structuredClone(box)
    this.parentBoxId = parentBoxId
  }

  execute(scene: SceneManager) {
    scene.addBoxData(this.box, this.parentBoxId)
  }

  undo(scene: SceneManager) {
    scene.removeBoxes([this.box.id])
  }
}
