<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import type { EditorUiState, NodeId } from '../../../core/flow/types/flow'

const props = defineProps<{
  uiState: EditorUiState | null
}>()

const emit = defineEmits<{
  updateNodeLabel: [nodeId: NodeId, label: string]
}>()

const labelDraft = shallowRef('')
const selectedNode = computed(() => props.uiState?.selectedNode ?? null)
const selectedEdge = computed(() => props.uiState?.selectedEdge ?? null)
const selectedCount = computed(() => props.uiState?.selection.items.length ?? 0)
const showSingleNode = computed(() => selectedCount.value <= 1 && Boolean(selectedNode.value))
const showSingleEdge = computed(() => selectedCount.value <= 1 && Boolean(selectedEdge.value))

watch(
  selectedNode,
  (node) => {
    labelDraft.value = node?.label ?? ''
  },
  { immediate: true },
)

function commitLabel() {
  const node = selectedNode.value
  if (!node) return

  const nextLabel = labelDraft.value.trim()
  if (!nextLabel) {
    labelDraft.value = node.label
    return
  }

  if (nextLabel === node.label) return
  emit('updateNodeLabel', node.id, nextLabel)
}
</script>

<template>
  <aside class="property-panel">
    <div class="panel-heading">属性</div>

    <div v-if="showSingleNode && selectedNode" class="property-section">
      <div class="property-title">{{ selectedNode.label }}</div>
      <form class="property-form" @submit.prevent="commitLabel">
        <label class="field">
          <span class="field-label">名称</span>
          <input
            v-model="labelDraft"
            class="field-input"
            type="text"
            autocomplete="off"
            @blur="commitLabel"
            @keydown.enter.prevent="commitLabel"
          >
        </label>
      </form>
      <dl class="property-list">
        <div>
          <dt>ID</dt>
          <dd>{{ selectedNode.id }}</dd>
        </div>
        <div>
          <dt>类型</dt>
          <dd>{{ selectedNode.type }}</dd>
        </div>
        <div>
          <dt>位置</dt>
          <dd>{{ Math.round(selectedNode.position.x) }}, {{ Math.round(selectedNode.position.y) }}</dd>
        </div>
        <div>
          <dt>尺寸</dt>
          <dd>{{ selectedNode.size.width }} x {{ selectedNode.size.height }}</dd>
        </div>
        <div>
          <dt>端口</dt>
          <dd>{{ selectedNode.ports.length }}</dd>
        </div>
      </dl>
    </div>

    <div v-else-if="showSingleEdge && selectedEdge" class="property-section">
      <div class="property-title">Edge</div>
      <dl class="property-list">
        <div>
          <dt>ID</dt>
          <dd>{{ selectedEdge.id }}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{{ selectedEdge.source.nodeId }} / {{ selectedEdge.source.portId }}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{{ selectedEdge.target.nodeId }} / {{ selectedEdge.target.portId }}</dd>
        </div>
      </dl>
    </div>

    <div v-else-if="selectedCount > 1" class="property-section">
      <div class="property-title">已选择 {{ selectedCount }} 个元素</div>
      <p class="property-hint">多选状态下暂不展示单个节点属性。</p>
    </div>

    <div v-else class="empty-state">
      未选择元素
    </div>
  </aside>
</template>

<style scoped>
.property-panel {
  background: var(--panel-bg);
  border-left: 1px solid var(--app-border);
  min-width: 260px;
  padding: 16px;
}

.panel-heading {
  color: var(--muted-text);
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
}

.property-section {
  background: #fff;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 14px;
}

.property-title {
  color: var(--strong-text);
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 12px;
}

.property-form {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}

.field {
  display: grid;
  gap: 6px;
}

.field-label {
  color: var(--muted-text);
  font-size: 12px;
}

.field-input {
  background: #fff;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  color: var(--strong-text);
  font: inherit;
  font-size: 13px;
  height: 34px;
  min-width: 0;
  padding: 0 10px;
}

.field-input:focus {
  border-color: #2563eb;
  outline: 2px solid rgba(37, 99, 235, 0.16);
}

.property-list {
  display: grid;
  gap: 10px;
  margin: 0;
}

.property-list div {
  display: grid;
  gap: 4px;
}

.property-list dt {
  color: var(--muted-text);
  font-size: 12px;
}

.property-list dd {
  color: var(--strong-text);
  font-size: 13px;
  margin: 0;
  overflow-wrap: anywhere;
}

.property-hint,
.empty-state {
  color: var(--muted-text);
  font-size: 14px;
}

.property-hint {
  line-height: 1.6;
  margin: 0;
}
</style>
