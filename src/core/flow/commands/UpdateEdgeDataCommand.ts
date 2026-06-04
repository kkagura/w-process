import type { FlowEdge } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'
import type { SceneCommand } from './SceneCommand'

export class UpdateEdgeDataCommand implements SceneCommand {
  label = 'Update edge data'
  private before: FlowEdge
  private after: FlowEdge

  constructor(before: FlowEdge, after: FlowEdge) {
    this.before = structuredClone(before)
    this.after = structuredClone(after)
  }

  execute(scene: SceneManager) {
    scene.updateEdgeData(this.after)
  }

  undo(scene: SceneManager) {
    scene.updateEdgeData(this.before)
  }
}
