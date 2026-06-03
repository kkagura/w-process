import type { SceneManager } from '../scene/SceneManager'
import type { HistoryState, SceneCommand } from './SceneCommand'

type HistoryListener = (state: HistoryState) => void

export class HistoryManager {
  private undoStack: SceneCommand[] = []
  private redoStack: SceneCommand[] = []
  private revision = 0
  private savedRevision = 0
  private listeners = new Set<HistoryListener>()
  private scene: SceneManager

  constructor(scene: SceneManager) {
    this.scene = scene
  }

  execute(command: SceneCommand) {
    command.execute(this.scene)
    this.record(command)
  }

  record(command: SceneCommand) {
    this.undoStack.push(command)
    this.redoStack = []
    this.revision += 1
    this.emit()
  }

  undo() {
    const command = this.undoStack.pop()
    if (!command) return

    command.undo(this.scene)
    this.redoStack.push(command)
    this.revision -= 1
    this.emit()
  }

  redo() {
    const command = this.redoStack.pop()
    if (!command) return

    command.execute(this.scene)
    this.undoStack.push(command)
    this.revision += 1
    this.emit()
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
    this.revision = 0
    this.savedRevision = 0
    this.emit()
  }

  markSaved() {
    this.savedRevision = this.revision
    this.emit()
  }

  getState(): HistoryState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      dirty: this.revision !== this.savedRevision,
    }
  }

  subscribe(listener: HistoryListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    const state = this.getState()
    for (const listener of this.listeners) listener(state)
  }
}
