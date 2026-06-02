import type { SceneManager } from '../scene/SceneManager'
import type { HistoryState, SceneCommand } from './SceneCommand'

type HistoryListener = (state: HistoryState) => void

export class HistoryManager {
  private undoStack: SceneCommand[] = []
  private redoStack: SceneCommand[] = []
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
    this.emit()
  }

  undo() {
    const command = this.undoStack.pop()
    if (!command) return

    command.undo(this.scene)
    this.redoStack.push(command)
    this.emit()
  }

  redo() {
    const command = this.redoStack.pop()
    if (!command) return

    command.execute(this.scene)
    this.undoStack.push(command)
    this.emit()
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
    this.emit()
  }

  getState(): HistoryState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
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
