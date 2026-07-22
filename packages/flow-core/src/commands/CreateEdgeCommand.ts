import type { FlowEdge } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'
import type { SceneCommand } from './SceneCommand'

export class CreateEdgeCommand implements SceneCommand {
  label = 'Create edge'
  private edge: FlowEdge

  constructor(edge: FlowEdge) {
    this.edge = edge
  }

  execute(scene: SceneManager) {
    scene.addEdgeData(this.edge)
  }

  undo(scene: SceneManager) {
    scene.removeEdges([this.edge.id])
  }
}
