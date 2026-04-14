<template>
  <article class="review-board" aria-hidden="true">
    <section class="board-section volume-section">
      <header class="section-head">
        <div>
          <p class="section-eyebrow">Training Volume</p>
          <strong>Weekly trend</strong>
        </div>
        <div class="section-meta">
          <span class="meta-label">Last 30 days</span>
          <span class="meta-pill">Minutes</span>
        </div>
      </header>

      <div class="volume-chart">
        <div class="chart-grid">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="goal-line">
          <span>180 min goal</span>
        </div>

        <div class="bar-row">
          <article v-for="point in volumePoints" :key="point.label" class="bar-group">
            <div class="bar-track">
              <div class="bar-fill" :style="{ height: `${point.height}%` }"></div>
            </div>
            <strong>{{ point.value }}</strong>
            <span>{{ point.label }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="board-section nutrition-section">
      <header class="section-head nutrition-head">
        <div>
          <p class="section-eyebrow">Nutrition Trends</p>
          <strong>Calories, protein, carbs, and water</strong>
        </div>
        <span class="meta-pill muted">7D</span>
      </header>

      <div class="nutrition-grid">
        <article
          v-for="metric in nutritionMetrics"
          :key="metric.label"
          class="nutrition-card"
          :class="metric.tone"
        >
          <div class="nutrition-card-head">
            <div>
              <span class="nutrition-kicker">{{ metric.kicker }}</span>
              <strong>{{ metric.label }}</strong>
            </div>
            <div class="nutrition-value-block">
              <span class="value-caption">Latest</span>
              <strong>{{ metric.value }}</strong>
            </div>
          </div>

          <p class="nutrition-note">{{ metric.note }}</p>

          <div class="mini-chart-shell">
            <svg viewBox="0 0 220 92" preserveAspectRatio="none">
              <g class="mini-grid">
                <line x1="10" y1="18" x2="210" y2="18"></line>
                <line x1="10" y1="46" x2="210" y2="46"></line>
                <line x1="10" y1="74" x2="210" y2="74"></line>
              </g>
              <path class="mini-area" :style="{ fill: metric.fill }" :d="metric.area" />
              <path class="mini-line" :style="{ stroke: metric.color }" :d="metric.line" />
              <circle class="mini-dot" :style="{ fill: metric.color }" :cx="metric.dot.cx" :cy="metric.dot.cy" r="4" />
            </svg>
          </div>
        </article>
      </div>
    </section>
  </article>
</template>

<script setup>
const volumePoints = [
  { label: 'Mar 16', value: '0', height: 8 },
  { label: 'Mar 30', value: '0', height: 8 },
  { label: 'Apr 06', value: '0', height: 8 },
  { label: 'Apr 13', value: '120', height: 34 }
]

const nutritionMetrics = [
  {
    kicker: 'Daily energy intake',
    label: 'Calories',
    value: '292 kcal',
    note: 'Logged food energy in the selected range',
    tone: 'tone-coral',
    color: '#f26f6f',
    fill: 'rgba(242, 111, 111, 0.14)',
    line: 'M14 76 C42 76, 66 76, 92 76 S128 78, 148 42 S182 14, 206 12',
    area: 'M14 76 C42 76, 66 76, 92 76 S128 78, 148 42 S182 14, 206 12 L206 84 L14 84 Z',
    dot: { cx: 206, cy: 12 }
  },
  {
    kicker: 'Recovery support',
    label: 'Protein',
    value: '12.4 g',
    note: 'Daily protein intake from saved foods',
    tone: 'tone-blue',
    color: '#4d7ef0',
    fill: 'rgba(77, 126, 240, 0.14)',
    line: 'M14 74 C42 74, 68 74, 96 74 S134 76, 154 38 S186 18, 206 18',
    area: 'M14 74 C42 74, 68 74, 96 74 S134 76, 154 38 S186 18, 206 18 L206 84 L14 84 Z',
    dot: { cx: 206, cy: 18 }
  },
  {
    kicker: 'Fuel intake',
    label: 'Carbs',
    value: '31 g',
    note: 'Daily carbohydrate intake from saved foods',
    tone: 'tone-green',
    color: '#22b77a',
    fill: 'rgba(34, 183, 122, 0.14)',
    line: 'M14 76 C42 76, 68 76, 98 76 S136 78, 156 48 S186 20, 206 18',
    area: 'M14 76 C42 76, 68 76, 98 76 S136 78, 156 48 S186 20, 206 18 L206 84 L14 84 Z',
    dot: { cx: 206, cy: 18 }
  },
  {
    kicker: 'Hydration',
    label: 'Water',
    value: '1000 ml',
    note: 'Water logged through quick adds and saved entries',
    tone: 'tone-sky',
    color: '#4ab5f8',
    fill: 'rgba(74, 181, 248, 0.14)',
    line: 'M14 76 C42 76, 68 76, 96 76 S138 80, 156 28 S186 18, 206 58',
    area: 'M14 76 C42 76, 68 76, 96 76 S138 80, 156 28 S186 18, 206 58 L206 84 L14 84 Z',
    dot: { cx: 206, cy: 58 }
  }
]
</script>

<style scoped>
.review-board {
  width: 100%;
  max-width: 620px;
  min-height: 462px;
  border: 1px solid #e7ecf3;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 36px rgba(18, 24, 38, 0.05);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.board-section {
  display: grid;
  gap: 10px;
}

.volume-section {
  min-height: 180px;
}

.nutrition-section {
  min-height: 240px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #667085;
  font-weight: 700;
}

.section-head strong {
  font-size: 18px;
  line-height: 1.15;
  color: #121826;
}

.section-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.meta-label {
  font-size: 11px;
  line-height: 1.2;
  color: #667085;
  font-weight: 600;
}

.meta-pill {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.meta-pill.muted {
  background: #f7f8fb;
  color: #667085;
  border: 1px solid #e7ecf3;
}

.volume-chart {
  position: relative;
  flex: 1 1 auto;
  border: 1px solid rgba(245, 158, 11, 0.14);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.04), rgba(255, 255, 255, 0.98));
  padding: 12px 12px 10px;
  display: grid;
  gap: 10px;
}

.chart-grid {
  position: absolute;
  inset: 12px 12px 30px;
  display: grid;
  align-content: space-between;
  pointer-events: none;
}

.chart-grid span {
  display: block;
  border-top: 1px dashed rgba(102, 112, 133, 0.16);
}

.goal-line {
  position: relative;
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.goal-line::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px dashed rgba(180, 83, 9, 0.45);
}

.goal-line span {
  position: relative;
  z-index: 1;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  font-size: 11px;
  font-weight: 700;
}

.bar-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.bar-group {
  display: grid;
  gap: 6px;
  justify-items: center;
}

.bar-track {
  width: 100%;
  height: 72px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #e7ecf3;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 6px;
}

.bar-fill {
  width: 24px;
  min-height: 6px;
  border-radius: 999px 999px 8px 8px;
  background: linear-gradient(180deg, #ff7a7d 0%, #ff5a5f 100%);
}

.bar-group strong {
  font-size: 13px;
  line-height: 1;
  color: #667085;
}

.bar-group span {
  font-size: 11px;
  line-height: 1.2;
  color: #667085;
}

.nutrition-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.nutrition-card {
  border: 1px solid #e7ecf3;
  border-radius: 18px;
  padding: 12px;
  display: grid;
  gap: 8px;
}

.nutrition-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.nutrition-kicker {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #667085;
  font-weight: 700;
}

.nutrition-card-head strong {
  font-size: 14px;
  line-height: 1.15;
  color: #121826;
}

.nutrition-value-block {
  display: grid;
  gap: 2px;
  justify-items: end;
  text-align: right;
}

.value-caption {
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #667085;
  font-weight: 700;
}

.nutrition-value-block strong {
  font-size: 16px;
  line-height: 1.05;
}

.nutrition-note {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #667085;
}

.mini-chart-shell {
  border: 1px solid rgba(231, 236, 243, 0.9);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.84);
  padding: 6px;
}

.mini-chart-shell svg {
  width: 100%;
  height: 70px;
  display: block;
}

.mini-grid line {
  stroke: rgba(102, 112, 133, 0.14);
  stroke-dasharray: 3 8;
}

.mini-area {
  fill-opacity: 1;
}

.mini-line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mini-dot {
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 2.5;
}

.tone-coral {
  background: linear-gradient(180deg, rgba(255, 90, 95, 0.05), rgba(255, 255, 255, 0.96));
}

.tone-blue {
  background: linear-gradient(180deg, rgba(75, 123, 255, 0.05), rgba(255, 255, 255, 0.96));
}

.tone-green {
  background: linear-gradient(180deg, rgba(34, 183, 122, 0.06), rgba(255, 255, 255, 0.96));
}

.tone-sky {
  background: linear-gradient(180deg, rgba(74, 181, 248, 0.06), rgba(255, 255, 255, 0.96));
}

@media (max-width: 680px) {
  .nutrition-grid {
    grid-template-columns: 1fr;
  }
}
</style>
