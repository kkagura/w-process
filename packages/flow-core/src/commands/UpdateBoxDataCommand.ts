import type { SceneManager } from '../scene/SceneManager'
import type { BoxData } from '../types/flow'
import type { SceneCommand } from './SceneCommand'

export class UpdateBoxDataCommand implements SceneCommand {
  label = 'Update box data'
  private before: BoxData
  private after: BoxData

  constructor(before: BoxData, after: BoxData) {
    this.before = structuredClone(before)
    this.after = structuredClone(after)
  }

  execute(scene: SceneManager) {
    scene.updateBoxData(this.after)
  }

  undo(scene: SceneManager) {
    scene.updateBoxData(this.before)
  }
}
