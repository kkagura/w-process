<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <label class="field">
    <span class="field-label">{{ label }}</span>
    <slot />
  </label>
</template>

<style scoped>
.field {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.field-label {
  color: var(--muted-text);
  font-size: 11px;
}
</style>
