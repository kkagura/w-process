import type { SceneManager } from '../scene/SceneManager'

export interface SceneCommand {
  label: string
  execute(scene: SceneManager): void
  undo(scene: SceneManager): void
}

export interface HistoryState {
  canUndo: boolean
  canRedo: boolean
  dirty: boolean
}
