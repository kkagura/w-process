import type { FlowNode } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'
import type { SceneCommand } from './SceneCommand'

export class UpdateNodeDataCommand implements SceneCommand {
  label = 'Update node data'
  private before: FlowNode
  private after: FlowNode

  constructor(before: FlowNode, after: FlowNode) {
    this.before = structuredClone(before)
    this.after = structuredClone(after)
  }

  execute(scene: SceneManager) {
    scene.updateNodeData(this.after)
  }

  undo(scene: SceneManager) {
    scene.updateNodeData(this.before)
  }
}
