<script setup lang="ts">
import PropertyField from './PropertyField.vue'

defineProps<{
  label: string
  autocomplete?: string
}>()

const model = defineModel<string>({ required: true })

const emit = defineEmits<{
  commit: []
}>()
</script>

<template>
  <PropertyField :label="label">
    <input
      v-model="model"
      class="field-input"
      type="text"
      :autocomplete="autocomplete ?? 'off'"
      @blur="emit('commit')"
      @keydown.enter.prevent="emit('commit')"
    >
  </PropertyField>
</template>

<style scoped>
.field-input {
  background: #fff;
  border: 1px solid var(--app-border);
  border-radius: 5px;
  color: var(--strong-text);
  font: inherit;
  font-size: 12px;
  height: 28px;
  min-width: 0;
  padding: 0 6px;
  width: 100%;
}

.field-input:focus {
  border-color: #2563eb;
  outline: 2px solid rgba(37, 99, 235, 0.16);
}
</style>
