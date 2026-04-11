<template>
  <article class="panel calories-card">
    <div class="panel-head">
      <div>
        <h2>Calories Summary</h2>
        <p>Daily intake vs target</p>
      </div>
      <span class="status-chip" :class="statusTone">{{ statusLabel }}</span>
    </div>

    <div class="summary-layout">
      <div class="ring-wrap">
        <div class="ring" :style="ringStyle">
          <div class="ring-inner">
            <strong>{{ summary.consumedCalories }}</strong>
            <span>Consumed kcal</span>
          </div>
        </div>
        <p class="overall-progress">{{ summary.completion.overallPercent }}% overall completion</p>
      </div>

      <div class="metric-grid">
        <div class="metric">
          <span>Target</span>
          <strong>{{ summary.targets.calories }}</strong>
          <small>kcal</small>
        </div>
        <div class="metric">
          <span>Remaining</span>
          <strong>{{ summary.remainingCalories }}</strong>
          <small>kcal</small>
        </div>
        <div class="metric">
          <span>Exercise</span>
          <strong>{{ summary.exerciseBurn }}</strong>
          <small>kcal burn</small>
        </div>
        <div class="metric highlight">
          <span>Progress</span>
          <strong>{{ summary.completion.caloriesPercent }}%</strong>
          <small>of calorie target</small>
        </div>
      </div>
    </div>

    <div class="progress-block">
      <div class="progress-meta">
        <span>Daily completion</span>
        <strong>{{ summary.completion.caloriesPercent }}%</strong>
      </div>
      <div class="progress-bar">
        <span :style="{ width: `${summary.completion.caloriesPercent}%` }"></span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  summary: {
    type: Object,
    required: true
  }
})

const statusTone = computed(() => {
  const consumed = Number(props.summary?.consumedCalories || 0)
  const target = Number(props.summary?.targets?.calories || 0)
  if (!target) return 'neutral'
  if (consumed > target * 1.1) return 'danger'
  if (consumed < target * 0.65) return 'warning'
  return 'positive'
})

const statusLabel = computed(() => {
  if (statusTone.value === 'danger') return 'Over target'
  if (statusTone.value === 'warning') return 'Still low'
  if (statusTone.value === 'neutral') return 'No target'
  return 'On track'
})

const ringStyle = computed(() => ({
  '--value': `${props.summary?.completion?.caloriesPercent || 0}%`
}))
</script>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow-soft);
  padding: 18px;
  display: grid;
  gap: 16px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h2 {
  margin: 0;
  font-size: 20px;
}

.panel-head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.status-chip {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 700;
}

.status-chip.positive {
  color: #15803d;
  background: rgba(34, 197, 94, 0.08);
}

.status-chip.warning {
  color: #b45309;
  background: rgba(245, 158, 11, 0.1);
}

.status-chip.danger {
  color: #be123c;
  background: rgba(244, 63, 94, 0.1);
}

.status-chip.neutral {
  color: var(--text-muted);
  background: var(--surface-muted);
}

.summary-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 20px;
  align-items: center;
}

.ring-wrap {
  display: grid;
  justify-items: center;
  gap: 12px;
}

.ring {
  width: 180px;
  height: 180px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at center, #fff 59%, transparent 60%),
    conic-gradient(var(--accent) 0 var(--value), rgba(148, 163, 184, 0.18) var(--value) 100%);
}

.ring-inner {
  width: 116px;
  height: 116px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.ring-inner strong {
  display: block;
  font-size: 28px;
  line-height: 1;
}

.ring-inner span,
.overall-progress {
  color: var(--text-muted);
  font-size: 12px;
  margin: 0;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  background: var(--surface-muted);
  display: grid;
  gap: 4px;
}

.metric span,
.metric small {
  color: var(--text-muted);
}

.metric strong {
  font-size: 28px;
  line-height: 1;
}

.metric.highlight {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.08), rgba(255, 255, 255, 0.95));
}

.progress-block {
  display: grid;
  gap: 10px;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--text-muted);
}

.progress-meta strong {
  color: var(--text-primary);
}

.progress-bar {
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}

.progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #fb7185, #ef4444);
}

@media (max-width: 860px) {
  .summary-layout {
    grid-template-columns: 1fr;
  }
}
</style>
