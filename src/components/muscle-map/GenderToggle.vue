<template>
  <div class="gender-toggle" role="radiogroup" aria-label="Select gender view">
    <button
      type="button"
      class="toggle-option"
      :class="{ active: modelValue === 'male' }"
      :disabled="disabled"
      @click="select('male')"
      role="radio"
      :aria-checked="modelValue === 'male'"
    >
      Male
    </button>
    <button
      type="button"
      class="toggle-option"
      :class="{ active: modelValue === 'female' }"
      :disabled="disabled"
      @click="select('female')"
      role="radio"
      :aria-checked="modelValue === 'female'"
    >
      Female
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    default: 'male'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

function select(value) {
  if (props.disabled) return
  if (value === props.modelValue) return
  emit('update:modelValue', value)
}
</script>

<style scoped>
.gender-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 999px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
}

.toggle-option {
  border: none;
  padding: 8px 16px;
  border-radius: 999px;
  background: transparent;
  font-weight: 600;
  color: var(--text-muted);
}

.toggle-option.active {
  background: var(--surface);
  color: var(--text-primary);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
}

.toggle-option:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
