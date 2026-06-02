<script setup lang="ts">
import { elementTemplates } from '../../../core/flow/constants/elementTemplates'

function handleDragStart(event: DragEvent, type: string) {
  event.dataTransfer?.setData('application/x-flow-node', type)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
  }
}
</script>

<template>
  <aside class="element-palette">
    <div class="panel-heading">元素</div>
    <div class="element-list">
      <button
        v-for="template in elementTemplates"
        :key="template.type"
        class="element-item"
        draggable="true"
        type="button"
        @dragstart="handleDragStart($event, template.type)"
      >
        <span class="element-icon" />
        <span>{{ template.label }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.element-palette {
  border-right: 1px solid var(--app-border);
  background: var(--panel-bg);
  min-width: 220px;
  padding: 16px;
}

.panel-heading {
  color: var(--muted-text);
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
}

.element-list {
  display: grid;
  gap: 10px;
}

.element-item {
  align-items: center;
  background: #fff;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  color: var(--strong-text);
  cursor: grab;
  display: flex;
  font: inherit;
  font-size: 14px;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  text-align: left;
}

.element-item:active {
  cursor: grabbing;
}

.element-item:hover {
  border-color: #0f766e;
}

.element-icon {
  background: #e0f2fe;
  border: 1px solid #38bdf8;
  border-radius: 5px;
  display: inline-block;
  height: 18px;
  width: 26px;
}
</style>
