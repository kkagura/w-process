<script setup lang="ts">
import { basicShapeTemplates, flowNodeTemplates } from '../../../core/flow/constants/elementTemplates'

const paletteGroups = [
  {
    title: '基础图形',
    templates: basicShapeTemplates,
  },
  {
    title: '流程节点',
    templates: flowNodeTemplates,
  },
]

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
    <section v-for="group in paletteGroups" :key="group.title" class="element-group">
      <div class="element-group-title">{{ group.title }}</div>
      <div class="element-list">
        <button
          v-for="template in group.templates"
          :key="template.type"
          :aria-label="template.label"
          class="element-item"
          draggable="true"
          :title="template.label"
          type="button"
          @dragstart="handleDragStart($event, template.type)"
        >
          <span class="element-icon" :class="`element-icon--${template.type}`" aria-hidden="true" />
          <span class="element-label" aria-hidden="true">{{ template.label }}</span>
        </button>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.element-palette {
  border-right: 1px solid var(--app-border);
  background: var(--panel-bg);
  min-width: 184px;
  overflow: visible;
  padding: 12px;
  position: relative;
  z-index: 4;
}

.panel-heading {
  color: var(--muted-text);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 10px;
}

.element-group {
  display: grid;
  gap: 8px;
}

.element-group + .element-group {
  margin-top: 14px;
}

.element-group-title {
  color: var(--strong-text);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.element-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, 48px);
  justify-content: start;
}

.element-item {
  align-items: center;
  background: #fff;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  color: var(--strong-text);
  cursor: grab;
  display: flex;
  font: inherit;
  height: 42px;
  justify-content: center;
  padding: 0;
  position: relative;
  width: 48px;
}

.element-item:active {
  cursor: grabbing;
}

.element-item:hover {
  border-color: #0f766e;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
}

.element-item:hover .element-label,
.element-item:focus-visible .element-label {
  opacity: 1;
  transform: translate(0, -50%);
  visibility: visible;
}

.element-icon {
  background: #e0f2fe;
  border: 1px solid #38bdf8;
  border-radius: 5px;
  display: inline-block;
  height: 20px;
  position: relative;
  width: 30px;
}

.element-icon--start,
.element-icon--end {
  border-radius: 999px;
}

.element-icon--end {
  background: #fee2e2;
  border-color: #ef4444;
}

.element-icon--decision {
  background: #fef3c7;
  border-color: #f59e0b;
  border-radius: 3px;
  height: 22px;
  transform: rotate(45deg);
  width: 22px;
}

.element-icon--data {
  background: #cffafe;
  border-color: #06b6d4;
  transform: skewX(-14deg);
}

.element-icon--document {
  background: #ede9fe;
  border-color: #8b5cf6;
}

.element-icon--document::after {
  background: #fff;
  border-top: 1px solid #8b5cf6;
  bottom: 2px;
  content: '';
  height: 5px;
  left: 3px;
  position: absolute;
  right: 3px;
  transform: skewY(-8deg);
}

.element-icon--subflow {
  background: #f8fafc;
  border-color: #64748b;
}

.element-icon--subflow::before,
.element-icon--subflow::after {
  background: #64748b;
  content: '';
  height: 100%;
  position: absolute;
  top: 0;
  width: 1px;
}

.element-icon--subflow::before {
  left: 6px;
}

.element-icon--subflow::after {
  right: 6px;
}

.element-icon--shape-circle {
  background: #dbeafe;
  border-color: #2563eb;
  border-radius: 999px;
  height: 24px;
  width: 24px;
}

.element-icon--shape-rectangle {
  background: #f8fafc;
  border-color: #475569;
  border-radius: 3px;
  height: 22px;
  width: 30px;
}

.element-icon--shape-triangle {
  background: transparent;
  border: 0;
  border-bottom: 24px solid #fed7aa;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  height: 0;
  width: 0;
}

.element-icon--shape-triangle::after {
  border-bottom: 20px solid #fff7ed;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  content: '';
  left: -12px;
  position: absolute;
  top: 3px;
}

.element-label {
  background: #0f172a;
  border-radius: 6px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  left: calc(100% + 10px);
  line-height: 1;
  max-width: 160px;
  opacity: 0;
  overflow-wrap: anywhere;
  padding: 7px 8px;
  pointer-events: none;
  position: absolute;
  top: 50%;
  transform: translate(-4px, -50%);
  transition: opacity 120ms ease, transform 120ms ease, visibility 120ms ease;
  visibility: hidden;
  white-space: nowrap;
  z-index: 10;
}
</style>
