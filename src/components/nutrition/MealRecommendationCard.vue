<template>
  <article class="panel ai-card">
    <div class="panel-head">
      <div>
        <h2>AI Meal Recommendation</h2>
        <p>Generated from your active nutrition target and what is still missing today</p>
      </div>
      <span class="badge warm">Next meal</span>
    </div>

    <div class="summary-block">
      <span class="summary-kicker">Best next move</span>
      <strong>{{ recommendationHeadline }}</strong>
      <div class="summary-tags">
        <span v-for="item in recommendationTags" :key="item">{{ item }}</span>
      </div>
    </div>

    <div class="context-line">
      Still available today: {{ Math.round(summary?.remainingCalories || 0) }} kilocalories ·
      {{ remainingProtein }} grams protein · {{ remainingCarbohydrates }} grams carbohydrates ·
      {{ remainingFat }} grams fat
    </div>

    <div v-if="loading" class="state">Planning your next meal...</div>
    <div v-else-if="error && !lines.length" class="state error">{{ error }}</div>
    <div v-else class="details-block">
      <ul class="bullet-list">
        <li v-for="line in visibleLines" :key="line">{{ line }}</li>
      </ul>
      <button
        v-if="hasOverflow"
        type="button"
        class="toggle-btn"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Show less' : 'Show details' }}
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  lines: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  summary: { type: Object, default: () => ({}) },
  goalTypeLabel: { type: String, default: 'Maintenance' }
})

const expanded = ref(false)

const remainingProtein = computed(() =>
  Math.max(Math.round((props.summary?.targets?.protein || 0) - (props.summary?.proteinG || 0)), 0)
)
const remainingCarbohydrates = computed(() =>
  Math.max(Math.round((props.summary?.targets?.carbs || 0) - (props.summary?.carbsG || 0)), 0)
)
const remainingFat = computed(() =>
  Math.max(Math.round((props.summary?.targets?.fat || 0) - (props.summary?.fatG || 0)), 0)
)

const recommendationTags = computed(() => {
  const tags = []
  if (remainingProtein.value >= 25) tags.push('Lean protein')
  if (remainingCarbohydrates.value >= 25) tags.push('Complex carbohydrates')
  if (remainingFat.value >= 12) tags.push('Healthy fats')
  if (!tags.length) tags.push('Keep the next meal light')
  return tags.slice(0, 3)
})

const recommendationHeadline = computed(() => {
  if (recommendationTags.value.length >= 2) {
    return `Best next meal: ${recommendationTags.value.join(' + ').toLowerCase()}`
  }
  return `Best next meal: ${recommendationTags.value[0].toLowerCase()}`
})

const visibleLines = computed(() => (expanded.value ? props.lines : props.lines.slice(0, 2)))
const hasOverflow = computed(() => props.lines.length > 2)
</script>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow-soft);
  padding: 18px;
  display: grid;
  gap: 14px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.panel-head h2 {
  margin: 0;
  font-size: 18px;
}

.panel-head p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.badge {
  padding: 8px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.badge.warm {
  color: #b45309;
  background: rgba(245, 158, 11, 0.1);
}

.summary-block {
  border: 1px solid rgba(245, 158, 11, 0.14);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.05), rgba(255, 255, 255, 0.96));
  padding: 14px;
  display: grid;
  gap: 8px;
}

.summary-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(180, 83, 9, 0.84);
}

.summary-block strong {
  font-size: 22px;
  line-height: 1.18;
  letter-spacing: -0.03em;
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-tags span {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.08);
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
}

.context-line {
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-muted);
  padding: 0 2px;
}

.details-block {
  display: grid;
  gap: 10px;
}

.state {
  min-height: 140px;
  display: grid;
  place-items: center;
  text-align: center;
  border-radius: 16px;
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: 14px;
}

.state.error {
  color: #b91c1c;
}

.bullet-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
}

.bullet-list li {
  line-height: 1.5;
}

.toggle-btn {
  justify-self: start;
  border: none;
  background: transparent;
  padding: 0;
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
}
</style>
