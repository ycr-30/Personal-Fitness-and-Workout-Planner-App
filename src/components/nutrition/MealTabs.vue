<template>
  <div class="meal-tabs" role="tablist" aria-label="Meal type tabs">
    <button
      v-for="item in items"
      :key="item.id"
      class="meal-tab"
      :class="{ active: modelValue === item.id }"
      type="button"
      role="tab"
      :aria-selected="modelValue === item.id"
      @click="$emit('update:modelValue', item.id)"
    >
      <span class="tab-top">
        <strong>{{ item.label }}</strong>
        <small>{{ item.secondary }}</small>
      </span>
      <span class="tab-meta">
        {{ Math.round(totals[item.id]?.calories || 0) }} kcal · {{ counts[item.id] || 0 }} items
      </span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
  modelValue: { type: String, required: true },
  totals: { type: Object, default: () => ({}) },
  counts: { type: Object, default: () => ({}) }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.meal-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.meal-tab {
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px;
  background: var(--surface-muted);
  display: grid;
  gap: 8px;
  text-align: left;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.meal-tab.active {
  border-color: rgba(239, 68, 68, 0.3);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.08), rgba(255, 255, 255, 0.96));
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
}

.tab-top {
  display: grid;
  gap: 2px;
}

.tab-top strong {
  font-size: 15px;
}

.tab-top small,
.tab-meta {
  color: var(--text-muted);
}

.tab-meta {
  font-size: 12px;
}

@media (max-width: 900px) {
  .meal-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .meal-tabs {
    grid-template-columns: 1fr;
  }
}
</style>
