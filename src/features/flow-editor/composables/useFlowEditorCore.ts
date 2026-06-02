import { onBeforeUnmount, shallowRef } from 'vue'
import { FlowEditorCore } from '../../../core/flow/FlowEditorCore'
import type { SceneSnapshot } from '../../../core/flow/types/flow'

export interface FlowEditorCanvasElements {
  backgroundCanvas: HTMLCanvasElement
  mainCanvas: HTMLCanvasElement
}

export function useFlowEditorCore() {
  const core = shallowRef<FlowEditorCore | null>(null)
  const snapshot = shallowRef<SceneSnapshot | null>(null)
  let unsubscribe: (() => void) | null = null

  function mount(elements: FlowEditorCanvasElements) {
    core.value?.dispose()
    unsubscribe?.()

    const nextCore = new FlowEditorCore(elements)
    core.value = nextCore
    unsubscribe = nextCore.scene.subscribe((nextSnapshot) => {
      snapshot.value = nextSnapshot
    })
  }

  onBeforeUnmount(() => {
    unsubscribe?.()
    core.value?.dispose()
  })

  return {
    core,
    snapshot,
    mount,
  }
}
