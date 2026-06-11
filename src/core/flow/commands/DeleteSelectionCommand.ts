import type { RemovedSceneSnapshot, SceneManager } from '../scene/SceneManager'
import type { FlowEdge, SelectableRef, SelectionState } from '../types/flow'
import type { SceneCommand } from './SceneCommand'

export class DeleteSelectionCommand implements SceneCommand {
  label = 'Delete selection'
  private nodeSnapshot: RemovedSceneSnapshot | null = null
  private removedEdges: FlowEdge[] = []
  private selection: SelectableRef[]
  private selectionBefore: SelectionState

  constructor(selection: SelectableRef[]) {
    this.selection = selection
    this.selectionBefore = {
      items: selection.map(item => ({ ...item } as SelectableRef)),
      primary: selection[0] ? { ...selection[0] } as SelectableRef : null,
    }
  }

  get isEmpty() {
    return this.selection.length === 0
  }

  execute(scene: SceneManager) {
    const nodeIds = this.selection
      .filter((item): item is Extract<SelectableRef, { type: 'node' }> => item.type === 'node')
      .map(item => item.id)
    const edgeIds = this.selection
      .filter((item): item is Extract<SelectableRef, { type: 'edge' }> => item.type === 'edge')
      .map(item => item.id)
    const boxIds = this.selection
      .filter((item): item is Extract<SelectableRef, { type: 'box' }> => item.type === 'box')
      .map(item => item.id)

    if (nodeIds.length > 0) {
      const snapshot = scene.removeNodes(nodeIds)
      if (snapshot.elements.length > 0) {
        this.nodeSnapshot = snapshot
      }
    }

    if (edgeIds.length > 0) {
      this.removedEdges = scene.removeEdges(edgeIds)
    }

    if (boxIds.length > 0) {
      const snapshot = scene.removeBoxes(boxIds)
      if (snapshot.elements.length > 0) {
        this.nodeSnapshot = snapshot
      }
    }
  }

  undo(scene: SceneManager) {
    if (this.nodeSnapshot) {
      scene.restoreRemovedSnapshot(this.nodeSnapshot)
    }

    if (this.removedEdges.length > 0) {
      scene.restoreEdges(this.removedEdges, this.selectionBefore)
    }
  }
}
