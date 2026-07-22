import type { NodeMove } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'
import type { SceneCommand } from './SceneCommand'

export class MoveNodesCommand implements SceneCommand {
  label = 'Move nodes'
  private before: NodeMove[]
  private after: NodeMove[]

  constructor(
    before: NodeMove[],
    after: NodeMove[],
  ) {
    this.before = before
    this.after = after
  }

  static hasChanges(before: NodeMove[], after: NodeMove[]) {
    if (before.length !== after.length) return true

    return before.some((move, index) => {
      const next = after[index]
      return !next
        || move.nodeId !== next.nodeId
        || move.position.x !== next.position.x
        || move.position.y !== next.position.y
    })
  }

  execute(scene: SceneManager) {
    scene.moveNodes(this.after)
  }

  undo(scene: SceneManager) {
    scene.moveNodes(this.before)
  }
}
