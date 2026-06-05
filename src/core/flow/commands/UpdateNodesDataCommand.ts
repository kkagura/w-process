import type { FlowNode } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'
import type { SceneCommand } from './SceneCommand'

export class UpdateNodesDataCommand implements SceneCommand {
  label = 'Update nodes data'
  private before: FlowNode[]
  private after: FlowNode[]

  constructor(before: FlowNode[], after: FlowNode[]) {
    this.before = structuredClone(before)
    this.after = structuredClone(after)
  }

  execute(scene: SceneManager) {
    scene.updateNodesData(this.after)
  }

  undo(scene: SceneManager) {
    scene.updateNodesData(this.before)
  }
}
