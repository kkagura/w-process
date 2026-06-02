import type { BoxId, FlowNode } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'
import type { SceneCommand } from './SceneCommand'

export class CreateNodeCommand implements SceneCommand {
  label = 'Create node'
  private node: FlowNode
  private parentBoxId?: BoxId

  constructor(
    node: FlowNode,
    parentBoxId?: BoxId,
  ) {
    this.node = node
    this.parentBoxId = parentBoxId
  }

  execute(scene: SceneManager) {
    scene.addNodeData(this.node, this.parentBoxId)
  }

  undo(scene: SceneManager) {
    scene.removeNodes([this.node.id])
  }
}
