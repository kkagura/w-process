<script setup lang="ts" generic="T extends string">
import PropertyField from './PropertyField.vue'

defineProps<{
  label: string
  options: Array<{
    label: string
    value: T
  }>
}>()

const model = defineModel<T>({ required: true })

const emit = defineEmits<{
  commit: []
}>()
</script>

<template>
  <PropertyField :label="label">
    <select v-model="model" class="field-input" @change="emit('commit')">
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
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
