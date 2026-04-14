<template>
  <article class="panel ai-card insight-card">
    <div class="panel-head">
      <div>
        <h2>AI Nutrition Insight</h2>
        <p>Generated from your active nutrition target and recent meal logs</p>
      </div>
      <span class="badge">AI</span>
    </div>

    <div class="summary-block">
      <span class="summary-kicker">At a glance</span>
      <strong>{{ insightHeadline }}</strong>
      <div class="summary-tags">
        <span v-for="item in summaryTags" :key="item">{{ item }}</span>
      </div>
    </div>

    <div class="context-line">
      Target: {{ goalTypeLabel }} · {{ Math.round(summary?.targets?.calories || 0) }} kilocalories ·
      {{ Math.round(summary?.targets?.protein || 0) }} grams protein ·
      {{ Math.round(summary?.targets?.water || 0) }} millilitres water
    </div>

    <div v-if="loading" class="state">Generating nutrition insight...</div>
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

const caloriesTarget = computed(() => Number(props.summary?.targets?.calories || 0))
const proteinTarget = computed(() => Number(props.summary?.targets?.protein || 0))
const waterTarget = computed(() => Number(props.summary?.targets?.water || 0))
const calories = computed(() => Number(props.summary?.consumedCalories || 0))
const protein = computed(() => Number(props.summary?.proteinG || 0))
const water = computed(() => Number(props.summary?.waterMl || 0))

const summaryTags = computed(() => {
  return [
    caloriesTarget.value > 0 && calories.value < caloriesTarget.value * 0.7
      ? 'Calories low'
      : 'Calories on track',
    proteinTarget.value > 0 && protein.value < proteinTarget.value * 0.7
      ? 'Protein behind'
      : 'Protein on track',
    waterTarget.value > 0 && water.value < waterTarget.value * 0.6
      ? 'Hydration needs attention'
      : 'Hydration on track'
  ]
})

const insightHeadline = computed(() => {
  if (caloriesTarget.value > 0 && calories.value < caloriesTarget.value * 0.7) {
    return 'You are under target today'
  }
  if (proteinTarget.value > 0 && protein.value < proteinTarget.value * 0.7) {
    return 'Protein intake is still behind'
  }
  if (waterTarget.value > 0 && water.value < waterTarget.value * 0.6) {
    return 'Hydration needs attention'
  }
  return 'Your nutrition looks broadly on track'
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
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.summary-block {
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.05), rgba(255, 255, 255, 0.96));
  padding: 14px;
  display: grid;
  gap: 8px;
}

.summary-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(37, 99, 235, 0.82);
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
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
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

:global(:root[data-theme='dark']) .insight-card .summary-block {
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.09), transparent 28%),
    linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.94));
  border-color: rgba(59, 130, 246, 0.22);
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
  color: var(--text-primary);
}

.bullet-list li {
  line-height: 1.5;
}

.toggle-btn {
  justify-self: start;
  border: none;
  background: transparent;
  padding: 0;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}
</style>
