import type { SceneManager } from '../scene/SceneManager'
import type { SceneCommand } from './SceneCommand'

export class CompositeSceneCommand implements SceneCommand {
  readonly label: string
  private commands: SceneCommand[]

  constructor(
    label: string,
    commands: SceneCommand[],
  ) {
    this.label = label
    this.commands = commands
  }

  execute(scene: SceneManager) {
    for (const command of this.commands) command.execute(scene)
  }

  undo(scene: SceneManager) {
    for (const command of [...this.commands].reverse()) command.undo(scene)
  }
}
