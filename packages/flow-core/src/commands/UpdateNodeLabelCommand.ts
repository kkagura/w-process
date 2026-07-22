import type { NodeId } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'
import type { SceneCommand } from './SceneCommand'

export class UpdateNodeLabelCommand implements SceneCommand {
  label = 'Update node label'
  private nodeId: NodeId
  private before: string
  private after: string

  constructor(nodeId: NodeId, before: string, after: string) {
    this.nodeId = nodeId
    this.before = before
    this.after = after
  }

  execute(scene: SceneManager) {
    scene.updateNodeLabel(this.nodeId, this.after)
  }

  undo(scene: SceneManager) {
    scene.updateNodeLabel(this.nodeId, this.before)
  }
}
