<script setup lang="ts">
defineProps<{
  title: string
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <div class="property-group">
    <div
      class="group-header"
      role="button"
      tabindex="0"
      :aria-expanded="!collapsed"
      @click="emit('toggle')"
      @keydown.enter.prevent="emit('toggle')"
      @keydown.space.prevent="emit('toggle')"
    >
      <span class="group-title">{{ title }}</span>
      <span class="group-arrow" :class="{ 'is-collapsed': collapsed }">⌄</span>
    </div>
    <div v-show="!collapsed" class="group-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.property-group {
  border-top: 1px solid var(--app-border);
  padding: 6px 0;
}

.property-group:first-of-type {
  border-top: 0;
}

.group-header {
  align-items: center;
  cursor: pointer;
  display: flex;
  font-size: 12px;
  font-weight: 700;
  justify-content: space-between;
  padding: 3px 0;
  user-select: none;
}

.group-header:focus {
  outline: none;
}

.group-title {
  color: var(--strong-text);
}

.group-arrow {
  color: var(--muted-text);
  font-size: 13px;
  line-height: 1;
  transform: rotate(0deg);
  transition: transform 120ms ease;
}

.group-arrow.is-collapsed {
  transform: rotate(-90deg);
}

.group-body {
  display: grid;
  gap: 8px;
  padding-top: 6px;
}
</style>
