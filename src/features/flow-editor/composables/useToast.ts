import { onBeforeUnmount, readonly, shallowRef } from 'vue'

export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration: number
}

export interface ShowToastOptions {
  type?: ToastType
  message: string
  duration?: number
}

const DEFAULT_DURATION = 2200
let toastSeed = 0

export function useToast() {
  const toasts = shallowRef<ToastMessage[]>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  function show(options: ShowToastOptions) {
    const toast: ToastMessage = {
      id: createToastId(),
      type: options.type ?? 'info',
      message: options.message,
      duration: options.duration ?? DEFAULT_DURATION,
    }

    toasts.value = [...toasts.value, toast]

    if (toast.duration > 0) {
      timers.set(toast.id, setTimeout(() => remove(toast.id), toast.duration))
    }

    return toast.id
  }

  function remove(id: string) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }

    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function clear() {
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
    toasts.value = []
  }

  onBeforeUnmount(clear)

  return {
    toasts: readonly(toasts),
    show,
    remove,
    clear,
  }
}

function createToastId() {
  toastSeed += 1
  return `toast-${Date.now()}-${toastSeed}`
}
