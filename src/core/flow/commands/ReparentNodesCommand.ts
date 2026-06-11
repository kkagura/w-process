import type { SceneManager } from '../scene/SceneManager'
import type { BoxId, NodeId } from '../types/flow'
import type { SceneCommand } from './SceneCommand'

export interface NodeParentAssignment {
  nodeId: NodeId
  parentBoxId: BoxId
}

export class ReparentNodesCommand implements SceneCommand {
  label = 'Reparent nodes'
  private before: NodeParentAssignment[]
  private after: NodeParentAssignment[]

  constructor(
    before: NodeParentAssignment[],
    after: NodeParentAssignment[],
  ) {
    this.before = structuredClone(before)
    this.after = structuredClone(after)
  }

  execute(scene: SceneManager) {
    scene.reparentNodes(this.after)
  }

  undo(scene: SceneManager) {
    scene.reparentNodes(this.before)
  }

  static hasChanges(before: NodeParentAssignment[], after: NodeParentAssignment[]) {
    const beforeMap = new Map(before.map(item => [item.nodeId, item.parentBoxId]))
    return after.some(item => beforeMap.get(item.nodeId) !== item.parentBoxId)
  }
}
