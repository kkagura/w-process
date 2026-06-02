<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

interface Emits {
  canvasReady: [payload: {
    backgroundCanvas: HTMLCanvasElement
    mainCanvas: HTMLCanvasElement
  }]
}

const emit = defineEmits<Emits>()
const backgroundCanvas = useTemplateRef<HTMLCanvasElement>('backgroundCanvas')
const mainCanvas = useTemplateRef<HTMLCanvasElement>('mainCanvas')

onMounted(() => {
  if (!backgroundCanvas.value || !mainCanvas.value) return
  emit('canvasReady', {
    backgroundCanvas: backgroundCanvas.value,
    mainCanvas: mainCanvas.value,
  })
})
</script>

<template>
  <section class="canvas-shell">
    <div class="canvas-stage">
      <canvas
        ref="backgroundCanvas"
        class="canvas-layer canvas-background"
      />
      <canvas
        ref="mainCanvas"
        class="canvas-layer canvas-main"
        tabindex="0"
      />
    </div>
  </section>
</template>

<style scoped>
.canvas-shell {
  background: #f8fafc;
  min-width: 0;
  position: relative;
}

.canvas-stage {
  height: 100%;
  min-height: 0;
  position: relative;
  width: 100%;
}

.canvas-layer {
  display: block;
  height: 100%;
  inset: 0;
  position: absolute;
  width: 100%;
}

.canvas-background {
  pointer-events: none;
}

.canvas-main {
  cursor: default;
  outline: none;
  touch-action: none;
  user-select: none;
}
</style>
