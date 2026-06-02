import type { RemovedSceneSnapshot, SceneManager } from '../scene/SceneManager'
import type { SelectableRef } from '../types/flow'
import type { SceneCommand } from './SceneCommand'

export class DeleteSelectionCommand implements SceneCommand {
  label = 'Delete selection'
  private snapshot: RemovedSceneSnapshot | null = null
  private selection: SelectableRef[]

  constructor(selection: SelectableRef[]) {
    this.selection = selection
  }

  get isEmpty() {
    return this.selection.length === 0
  }

  execute(scene: SceneManager) {
    const nodeIds = this.selection
      .filter((item): item is Extract<SelectableRef, { type: 'node' }> => item.type === 'node')
      .map(item => item.id)

    if (nodeIds.length === 0) return

    const snapshot = scene.removeNodes(nodeIds)
    if (snapshot.elements.length > 0) {
      this.snapshot = snapshot
    }
  }

  undo(scene: SceneManager) {
    if (!this.snapshot) return
    scene.restoreRemovedSnapshot(this.snapshot)
  }
}
