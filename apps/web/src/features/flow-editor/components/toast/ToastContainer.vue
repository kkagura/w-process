<script setup lang="ts">
import type { ToastMessage } from '../../composables/useToast'

interface Props {
  toasts: readonly ToastMessage[]
}

interface Emits {
  close: [id: string]
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="toast-viewport" role="status" aria-live="polite">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast-item"
      :class="`toast-item--${toast.type}`"
    >
      <span class="toast-marker" aria-hidden="true" />
      <span class="toast-message">{{ toast.message }}</span>
      <button
        class="toast-close"
        type="button"
        aria-label="关闭提示"
        @click="emit('close', toast.id)"
      >
        x
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-viewport {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  gap: 8px;
  left: 200px;
  pointer-events: none;
  position: absolute;
  right: 276px;
  top: 16px;
  z-index: 30;
}

.toast-item {
  align-items: center;
  animation: toast-enter 140ms ease-out;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.16);
  color: #111827;
  display: grid;
  font-size: 13px;
  font-weight: 600;
  gap: 8px;
  grid-template-columns: 8px minmax(0, 1fr) 22px;
  line-height: 1.3;
  max-width: min(360px, 100%);
  min-height: 36px;
  min-width: 180px;
  padding: 8px 8px 8px 12px;
  pointer-events: auto;
}

.toast-marker {
  border-radius: 999px;
  height: 8px;
  width: 8px;
}

.toast-item--success .toast-marker {
  background: #16a34a;
}

.toast-item--info .toast-marker {
  background: #2563eb;
}

.toast-item--warning .toast-marker {
  background: #d97706;
}

.toast-item--error .toast-marker {
  background: #dc2626;
}

.toast-message {
  overflow-wrap: anywhere;
}

.toast-close {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: #64748b;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  height: 22px;
  justify-content: center;
  padding: 0;
  width: 22px;
}

.toast-close:hover,
.toast-close:focus-visible {
  background: #f1f5f9;
  color: #0f172a;
  outline: none;
}

@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
