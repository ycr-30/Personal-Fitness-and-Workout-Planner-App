<template>
  <article class="panel ai-card">
    <div class="panel-head">
      <div>
        <h2>Nutrition Alerts</h2>
        <p>Rule-based checks with graceful fallback</p>
      </div>
      <span class="badge alert">Rules</span>
    </div>

    <div class="summary-block" :class="summaryTone">
      <span class="summary-kicker">At a glance</span>
      <strong>{{ alertHeadline }}</strong>
      <div class="summary-tags">
        <span v-for="item in summaryTags" :key="item">{{ item }}</span>
      </div>
    </div>

    <div class="context-line">
      {{ contextLine }}
    </div>

    <div class="alert-list">
      <article v-for="item in visibleAlerts" :key="item.id" class="alert-row" :class="item.tone">
        <strong>{{ item.title }}</strong>
        <p>{{ item.message }}</p>
      </article>
    </div>

    <button
      v-if="hasOverflow"
      type="button"
      class="toggle-btn"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Show less' : 'Show details' }}
    </button>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  alerts: { type: Array, default: () => [] }
})

const expanded = ref(false)

const visibleAlerts = computed(() => (expanded.value ? props.alerts : props.alerts.slice(0, 2)))
const hasOverflow = computed(() => props.alerts.length > 2)

const summaryTone = computed(() => {
  if (!props.alerts.length) return 'positive'
  if (props.alerts.some((item) => item.tone === 'danger')) return 'danger'
  if (props.alerts.some((item) => item.tone === 'warning')) return 'warning'
  return 'positive'
})

const alertHeadline = computed(() => {
  if (!props.alerts.length) return 'No active alerts today'
  if (props.alerts.length === 1) return '1 active alert today'
  return `${props.alerts.length} active alerts today`
})

const summaryTags = computed(() => {
  if (!props.alerts.length) return ['Nutrition looks balanced today']
  return props.alerts.slice(0, 3).map((item) => item.title)
})

const contextLine = computed(() => {
  if (!props.alerts.length) {
    return 'No calorie, protein, or hydration rules are currently triggered.'
  }
  return 'Rule checks are based on your current calorie, protein, and hydration data for this date.'
})
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

.badge.alert {
  padding: 8px 11px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.08);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
}

.summary-block {
  border: 1px solid rgba(239, 68, 68, 0.12);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.04), rgba(255, 255, 255, 0.96));
  padding: 14px;
  display: grid;
  gap: 8px;
}

.summary-block.warning {
  border-color: rgba(245, 158, 11, 0.14);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.05), rgba(255, 255, 255, 0.96));
}

.summary-block.positive {
  border-color: rgba(34, 197, 94, 0.14);
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.05), rgba(255, 255, 255, 0.96));
}

.summary-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(239, 68, 68, 0.82);
}

.summary-block.warning .summary-kicker {
  color: rgba(180, 83, 9, 0.84);
}

.summary-block.positive .summary-kicker {
  color: rgba(21, 128, 61, 0.84);
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
  background: rgba(239, 68, 68, 0.08);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
}

.summary-block.warning .summary-tags span {
  background: rgba(245, 158, 11, 0.09);
  color: #b45309;
}

.summary-block.positive .summary-tags span {
  background: rgba(34, 197, 94, 0.09);
  color: #15803d;
}

.context-line {
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-muted);
  padding: 0 2px;
}

.alert-list {
  display: grid;
  gap: 10px;
}

.alert-row {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  background: var(--surface-muted);
  display: grid;
  gap: 5px;
}

.alert-row strong {
  font-size: 14px;
}

.alert-row p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.alert-row.warning {
  background: rgba(245, 158, 11, 0.08);
}

.alert-row.danger {
  background: rgba(244, 63, 94, 0.08);
}

.alert-row.positive {
  background: rgba(34, 197, 94, 0.08);
}

.toggle-btn {
  justify-self: start;
  border: none;
  background: transparent;
  padding: 0;
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
}
</style>
