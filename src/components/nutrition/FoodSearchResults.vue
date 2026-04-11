<template>
  <div class="results-box">
    <div class="filter-row">
      <button
        type="button"
        class="filter-chip"
        :class="{ active: filterMode === 'recent' }"
        @click="$emit('update:filterMode', 'recent')"
      >
        Recent
      </button>
      <button
        type="button"
        class="filter-chip"
        :class="{ active: filterMode === 'all' }"
        @click="$emit('update:filterMode', 'all')"
      >
        All
      </button>
    </div>

    <div v-if="loading" class="state">Searching foods...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else-if="!results.length" class="state">
      {{ filterMode === 'recent' ? 'No foods added in the last 7 days yet.' : 'No foods found. Switch to Custom Food to add your own entry.' }}
    </div>
    <button
      v-for="item in results"
      :key="item.sourceKey || item.id"
      class="result-row"
      :class="{ active: selectedId === (item.sourceKey || item.id) }"
      type="button"
      @click="$emit('select', item)"
    >
      <div class="result-content">
        <strong class="result-title" :title="item.foodName">{{ item.foodName }}</strong>
        <p v-if="item.foodSubtype" class="result-subtype">{{ item.foodSubtype }}</p>
        <p>{{ item.brand || (item.isBranded ? 'Branded food' : 'Common food') }}</p>
        <small>{{ item.servingLabel || '100 g' }}</small>
      </div>
      <div class="result-meta">
        <span>{{ Math.round(item.caloriesPer100g || 0) }} kcal / 100g</span>
        <small>
          Protein {{ Number((item.proteinPer100g || 0).toFixed(2)) }}
          · Carbohydrates {{ Number((item.carbsPer100g || 0).toFixed(2)) }}
          · Fat {{ Number((item.fatPer100g || 0).toFixed(2)) }}
        </small>
      </div>
    </button>
  </div>
</template>

<script setup>
defineProps({
  results: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  selectedId: { type: String, default: '' },
  filterMode: { type: String, default: 'recent' }
})

defineEmits(['select', 'update:filterMode'])
</script>

<style scoped>
.results-box {
  display: grid;
  gap: 10px;
  max-height: 240px;
  overflow-y: auto;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
}

.filter-chip.active {
  border-color: rgba(239, 68, 68, 0.22);
  background: rgba(239, 68, 68, 0.08);
  color: var(--accent-strong);
}

.state {
  min-height: 120px;
  border-radius: 14px;
  background: var(--surface-muted);
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--text-muted);
  padding: 16px;
}

.state.error {
  color: #b91c1c;
}

.result-row {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-muted);
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  text-align: left;
}

.result-row.active {
  border-color: rgba(239, 68, 68, 0.32);
  background: rgba(239, 68, 68, 0.06);
}

.result-row strong {
  display: block;
}

.result-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
  word-break: break-word;
}

.result-row p,
.result-row small {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.result-subtype {
  color: var(--text);
  font-weight: 600;
}

.result-content {
  min-width: 0;
  flex: 1;
}

.result-meta {
  display: grid;
  justify-items: end;
  gap: 4px;
  flex-shrink: 0;
}

@media (max-width: 680px) {
  .result-row {
    flex-direction: column;
  }

  .result-meta {
    justify-items: start;
  }
}
</style>
