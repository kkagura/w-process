import type { SceneElementLocation, SceneManager } from '../scene/SceneManager'
import type { BoxData, SelectableRef, SelectionState } from '../types/flow'
import type { SceneCommand } from './SceneCommand'

export class UngroupCommand implements SceneCommand {
  label = 'Ungroup'
  private groupData: BoxData
  private groupLocation: SceneElementLocation
  private nodeLocations: SceneElementLocation[]
  private selectionBefore: SelectionState

  constructor(options: {
    groupData: BoxData
    groupLocation: SceneElementLocation
    nodeLocations: SceneElementLocation[]
    selectionBefore: SelectionState
  }) {
    this.groupData = structuredClone(options.groupData)
    this.groupLocation = structuredClone(options.groupLocation)
    this.nodeLocations = structuredClone(options.nodeLocations)
    this.selectionBefore = structuredClone(options.selectionBefore)
  }

  execute(scene: SceneManager) {
    scene.unwrapGroup({
      groupId: this.groupData.id,
      nodeLocations: this.nodeLocations,
      selection: createSelection(this.nodeLocations.map<SelectableRef>(item => ({
        type: 'node',
        id: item.elementId,
      }))),
    })
  }

  undo(scene: SceneManager) {
    scene.wrapNodesInGroup({
      groupData: this.groupData,
      groupLocation: this.groupLocation,
      nodeLocations: this.nodeLocations,
      selection: this.selectionBefore,
    })
  }
}

function createSelection(items: SelectableRef[]): SelectionState {
  return { items, primary: items[0] ?? null }
}
