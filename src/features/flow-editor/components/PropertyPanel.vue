<script setup lang="ts">
import { computed } from 'vue'
import type { BoxData, FlowNode, SceneElementData, SceneSnapshot } from '../../../core/flow/types/flow'

const props = defineProps<{
  snapshot: SceneSnapshot | null
}>()

const selectedNode = computed(() => {
  const selection = props.snapshot?.selection
  if (selection?.type !== 'node' || !props.snapshot) return null
  return findNode(props.snapshot.document.root, selection.id)
})

function findNode(box: BoxData, id: string): FlowNode | null {
  for (const child of box.children) {
    if (isBoxData(child)) {
      const found = findNode(child, id)
      if (found) return found
      continue
    }

    if (child.id === id) return child
  }

  return null
}

function isBoxData(data: SceneElementData): data is BoxData {
  return 'children' in data
}
</script>

<template>
  <aside class="property-panel">
    <div class="panel-heading">属性</div>

    <div v-if="selectedNode" class="property-section">
      <div class="property-title">{{ selectedNode.label }}</div>
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

.empty-state {
  color: var(--muted-text);
  font-size: 14px;
}
</style>
