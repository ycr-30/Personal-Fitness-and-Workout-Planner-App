<template>
  <article class="analytics-mockup" aria-hidden="true">
    <header class="analytics-head">
      <div>
        <p class="analytics-eyebrow">Performance Intelligence</p>
        <strong>Analytics</strong>
      </div>
      <div class="analytics-range">
        <span>7D</span>
        <span class="active">30D</span>
      </div>
    </header>

    <div class="analytics-grid">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        class="analytics-stat"
        :class="{ 'analytics-stat-wide': metric.wide }"
      >
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </article>
    </div>

    <article class="analytics-note">
      <span>This week</span>
      <strong>4-day streak and body-progress signals still in view.</strong>
    </article>
  </article>
</template>

<script setup>
const metrics = [
  { label: 'Completion', value: '67%', note: '3 of 4 sessions' },
  { label: 'Active Minutes', value: '120', note: '4 min per day' },
  { label: 'Body Trend', value: 'Stable', note: 'Weight and body logs in view', wide: true }
]
</script>

<style scoped>
.analytics-mockup {
  border: 1px solid #e7ecf3;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 36px rgba(18, 24, 38, 0.05);
  padding: 15px;
  display: grid;
  gap: 12px;
}

.analytics-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.analytics-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #667085;
  font-weight: 700;
}

.analytics-head strong {
  font-size: 18px;
  line-height: 1.15;
  color: #121826;
}

.analytics-range {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.analytics-range span {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f7f8fb;
  border: 1px solid #e7ecf3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 700;
  color: #667085;
}

.analytics-range .active {
  background: rgba(75, 123, 255, 0.1);
  border-color: transparent;
  color: #4b7bff;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.analytics-stat {
  border: 1px solid #e7ecf3;
  border-radius: 16px;
  background: linear-gradient(180deg, #fcfdff 0%, #f8faff 100%);
  padding: 11px;
  display: grid;
  gap: 4px;
}

.analytics-stat-wide strong {
  font-size: 20px;
  letter-spacing: -0.02em;
}

.analytics-stat span {
  font-size: 12px;
  line-height: 1.2;
  color: #667085;
  font-weight: 700;
}

.analytics-stat strong {
  font-size: 24px;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #121826;
}

.analytics-stat small {
  font-size: 12px;
  line-height: 1.45;
  color: #667085;
}

.analytics-note {
  display: grid;
  gap: 4px;
  border: 1px solid rgba(75, 123, 255, 0.12);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(75, 123, 255, 0.06), rgba(255, 255, 255, 0.96));
  padding: 12px;
}

.analytics-note span {
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #667085;
  font-weight: 700;
}

.analytics-note strong {
  font-size: 15px;
  line-height: 1.28;
  color: #121826;
}

@media (max-width: 680px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
