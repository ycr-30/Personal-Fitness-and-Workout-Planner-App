<template>
  <article class="entry-row">
    <div class="entry-main">
      <div class="entry-top">
        <strong>{{ entry.foodNameSnapshot }}</strong>
        <span v-if="entry.brandSnapshot" class="brand">{{ entry.brandSnapshot }}</span>
      </div>
      <p>{{ portionText }}</p>
      <small>
        Protein {{ formatValue(entry.proteinG) }} g ·
        Carbohydrates {{ formatValue(entry.carbsG) }} g ·
        Fat {{ formatValue(entry.fatG) }} g
      </small>
    </div>
    <div class="entry-side">
      <strong>{{ formatValue(entry.calories) }} kcal</strong>
      <div class="entry-actions">
        <button class="mini-btn" type="button" @click="$emit('edit', entry)">Edit</button>
        <button class="mini-btn danger" type="button" @click="$emit('delete', entry)">Delete</button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entry: {
    type: Object,
    required: true
  }
})

defineEmits(['edit', 'delete'])

function formatValue(value) {
  return Number(value || 0).toFixed(2)
}

const portionText = computed(() => {
  if (props.entry.unit === 'serving') {
    return `${formatValue(props.entry.quantity)} serving${Number(props.entry.quantity) === 1 ? '' : 's'}`
  }
  if (props.entry.quantityG) {
    return `${formatValue(props.entry.quantityG)} g`
  }
  return `${formatValue(props.entry.quantity)} ${props.entry.unit}`
})
</script>

<style scoped>
.entry-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
}

.entry-main {
  display: grid;
  gap: 4px;
}

.entry-top {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.entry-main strong {
  font-size: 15px;
}

.brand,
.entry-main p,
.entry-main small {
  color: var(--text-muted);
}

.entry-main p,
.entry-main small {
  margin: 0;
  font-size: 12px;
}

.entry-side {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.entry-side strong {
  font-size: 15px;
}

.entry-actions {
  display: flex;
  gap: 8px;
}

.mini-btn {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--surface);
  font-size: 12px;
  font-weight: 700;
}

.mini-btn.danger {
  color: #be123c;
  background: rgba(244, 63, 94, 0.06);
}

@media (max-width: 720px) {
  .entry-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .entry-side {
    width: 100%;
    justify-items: stretch;
  }

  .entry-actions {
    justify-content: flex-start;
  }
}
</style>
