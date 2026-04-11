<template>
  <section class="panel trends-panel">
    <div class="section-head">
      <div class="section-copy">
        <h2>Nutrition Trends</h2>
        <p>Daily intake and hydration over the selected range</p>
      </div>
      <div class="range-tabs">
        <button
          v-for="option in rangeOptions"
          :key="option.value"
          type="button"
          class="range-tab"
          :class="{ active: range === option.value }"
          @click="$emit('update:range', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="state">Loading nutrition trends...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else class="trend-grid">
      <article
        v-for="chart in charts"
        :key="chart.id"
        class="trend-card"
        :style="chart.themeStyle"
      >
        <header class="trend-head">
          <div class="trend-title-block">
            <span class="trend-kicker">{{ chart.kicker }}</span>
            <strong>{{ chart.label }}</strong>
            <p>{{ chart.totalLabel }}</p>
          </div>

          <div class="trend-value-block">
            <span class="trend-value-caption">Latest</span>
            <strong>{{ chart.currentLabel }}</strong>
            <span class="trend-delta" :class="chart.deltaTone">{{ chart.deltaLabel }}</span>
          </div>
        </header>

        <div v-if="chart.hasData" class="trend-chart-shell">
          <div class="trend-chart-meta">
            <span>{{ chart.contextLabel }}</span>
            <span>{{ chart.latestDateLabel }}</span>
          </div>

          <div class="trend-chart">
            <svg viewBox="0 0 360 170" preserveAspectRatio="none" aria-hidden="true">
              <g class="grid-lines">
                <line x1="18" y1="32" x2="342" y2="32"></line>
                <line x1="18" y1="84" x2="342" y2="84"></line>
                <line x1="18" y1="136" x2="342" y2="136"></line>
              </g>
              <path class="line-area" :style="{ fill: chart.areaColor }" :d="chart.area"></path>
              <path class="line-main" :style="{ stroke: chart.color }" :d="chart.path"></path>
            </svg>

            <div class="axis-label axis-label--top">{{ chart.maxLabel }}</div>
            <div class="axis-label axis-label--bottom">{{ chart.minLabel }}</div>

            <div class="points-layer">
              <button
                v-for="(point, index) in chart.points"
                :key="`${chart.id}-${point.x}-${point.y}`"
                type="button"
                class="point-hit"
                :class="{ latest: point.isLatest }"
                :style="{ left: `${point.xPercent}%`, top: `${point.yPercent}%` }"
                @mouseenter="showTooltip(chart, point, index)"
                @mouseleave="hideTooltip(chart.id)"
                @focus="showTooltip(chart, point, index)"
                @blur="hideTooltip(chart.id)"
              >
                <span
                  class="point-dot"
                  :class="{
                    latest: point.isLatest,
                    active: hoveredPoint?.chartId === chart.id && hoveredPoint?.index === index
                  }"
                ></span>
              </button>

              <div
                v-if="hoveredPoint?.chartId === chart.id"
                class="chart-tooltip"
                :style="{ left: `${hoveredPoint.left}%`, top: `${hoveredPoint.top}%` }"
              >
                <span class="tooltip-date">{{ hoveredPoint.point.dateLabel }}</span>
                <strong>{{ hoveredPoint.point.valueLabel }}</strong>
                <span class="tooltip-context">{{ hoveredPoint.point.deltaLabel }}</span>
              </div>
            </div>
          </div>

          <footer class="trend-foot">
            <span>{{ chart.startLabel }}</span>
            <span>{{ chart.endLabel }}</span>
          </footer>

          <p class="trend-note">{{ chart.note }}</p>
        </div>

        <div v-else class="trend-empty">
          <div class="trend-empty-icon"></div>
          <strong>No data in this range yet</strong>
          <p>{{ chart.emptyMessage }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatChartDate } from '@/utils/mealTimeResolver'

const props = defineProps({
  series: { type: Array, default: () => [] },
  range: { type: Number, default: 7 },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

defineEmits(['update:range'])

const hoveredPoint = ref(null)

const rangeOptions = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' }
]

const METRIC_CONFIG = {
  calories: {
    label: 'Calories',
    color: '#f26f6f',
    rgb: '242, 111, 111',
    shortUnit: 'kcal',
    longUnit: 'kilocalories',
    kicker: 'Daily energy intake',
    contextLabel: 'Logged food energy in the selected range',
    note: 'Based on saved meal entries only.',
    emptyMessage: 'Add meal entries to reveal your calorie rhythm.'
  },
  protein: {
    label: 'Protein',
    color: '#4d7ef0',
    rgb: '77, 126, 240',
    shortUnit: 'g',
    longUnit: 'grams',
    kicker: 'Recovery support',
    contextLabel: 'Daily protein intake from saved foods',
    note: 'Useful for recovery and muscle support.',
    emptyMessage: 'Save protein-rich meals to unlock this trend.'
  },
  carbs: {
    label: 'Carbs',
    color: '#22b77a',
    rgb: '34, 183, 122',
    shortUnit: 'g',
    longUnit: 'grams',
    kicker: 'Fuel intake',
    contextLabel: 'Daily carbohydrate intake from saved foods',
    note: 'Helps track training fuel and daily intake balance.',
    emptyMessage: 'Add foods with carbohydrate values to see this trend.'
  },
  water: {
    label: 'Water',
    color: '#4ab5f8',
    rgb: '74, 181, 248',
    shortUnit: 'ml',
    longUnit: 'millilitres',
    kicker: 'Hydration',
    contextLabel: 'Water logged through quick adds and saved entries',
    note: 'Includes all water entries saved in the selected range.',
    emptyMessage: 'Log water entries to build your hydration trend.'
  }
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(Number(value || 0))
}

function formatMetricValue(value, config, mode = 'short') {
  const safeValue = Number(value || 0)
  const digits = Math.abs(safeValue) >= 100 ? 0 : 1
  const unit = mode === 'long' ? config.longUnit : config.shortUnit
  return `${formatNumber(safeValue, digits)} ${unit}`
}

function formatDeltaLabel(delta, config) {
  if (!Number.isFinite(delta)) return 'First logged day'
  if (Math.abs(delta) < 0.05) return 'Flat versus previous day'
  const direction = delta > 0 ? 'Up' : 'Down'
  return `${direction} ${formatMetricValue(Math.abs(delta), config, 'long')} versus previous day`
}

function formatDeltaTone(delta) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.05) return 'neutral'
  return delta > 0 ? 'positive' : 'negative'
}

function formatTooltipDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date)
}

function buildSmoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  const d = [`M ${points[0].x} ${points[0].y}`]
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] || p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`)
  }
  return d.join(' ')
}

function buildChart(metric) {
  const config = METRIC_CONFIG[metric]
  const values = props.series.map((item) => Number(item?.[metric] || 0))
  const total = values.reduce((sum, value) => sum + value, 0)
  const hasData = total > 0
  const width = 360
  const height = 170
  const padding = 18

  if (!props.series.length) {
    return {
      id: metric,
      ...config,
      hasData: false,
      path: '',
      area: '',
      points: [],
      totalLabel: `Range total ${formatMetricValue(0, config)}`,
      currentLabel: formatMetricValue(0, config),
      deltaLabel: 'First logged day',
      deltaTone: 'neutral',
      minLabel: formatMetricValue(0, config),
      maxLabel: formatMetricValue(0, config),
      startLabel: '--',
      endLabel: '--',
      latestDateLabel: '--',
      themeStyle: {
        '--accent': config.color,
        '--accent-rgb': config.rgb
      }
    }
  }

  const rawMin = Math.min(...values, 0)
  const rawMax = Math.max(...values, 0)
  const spread = rawMax - rawMin
  const pad = spread > 0 ? spread * 0.12 : Math.max(Math.abs(rawMax) * 0.08, 1)
  const scaledMin = rawMin - pad
  const scaledMax = rawMax + pad
  const scaledRange = scaledMax - scaledMin || 1
  const step = props.series.length > 1 ? (width - padding * 2) / (props.series.length - 1) : 0

  const points = props.series.map((item, index) => {
    const value = Number(item?.[metric] || 0)
    const x = padding + index * step
    const y = height - padding - ((value - scaledMin) / scaledRange) * (height - padding * 2)
    const previousValue = index > 0 ? Number(props.series[index - 1]?.[metric] || 0) : NaN
    return {
      x,
      y,
      xPercent: (x / width) * 100,
      yPercent: (y / height) * 100,
      value,
      date: item?.date,
      dateLabel: formatTooltipDate(item?.date),
      valueLabel: formatMetricValue(value, config),
      deltaLabel: formatDeltaLabel(value - previousValue, config),
      isLatest: index === props.series.length - 1
    }
  })

  const path = buildSmoothPath(points)
  const area = points.length
    ? `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : ''

  const currentValue = values[values.length - 1] || 0
  const previousValue = values.length > 1 ? values[values.length - 2] : NaN
  const delta = currentValue - previousValue

  return {
    id: metric,
    ...config,
    hasData,
    path,
    area,
    points,
    areaColor: `rgba(${config.rgb}, 0.14)`,
    totalLabel: `Range total ${formatMetricValue(total, config)}`,
    currentLabel: formatMetricValue(currentValue, config),
    deltaLabel: formatDeltaLabel(delta, config),
    deltaTone: formatDeltaTone(delta),
    minLabel: formatMetricValue(rawMin, config),
    maxLabel: formatMetricValue(rawMax, config),
    startLabel: props.series.length ? formatChartDate(props.series[0].date) : '--',
    endLabel: props.series.length ? formatChartDate(props.series[props.series.length - 1].date) : '--',
    latestDateLabel: props.series.length ? formatTooltipDate(props.series[props.series.length - 1].date) : '--',
    themeStyle: {
      '--accent': config.color,
      '--accent-rgb': config.rgb
    }
  }
}

function showTooltip(chart, point, index) {
  hoveredPoint.value = {
    chartId: chart.id,
    index,
    point,
    left: Math.min(Math.max(point.xPercent, 18), 82),
    top: point.yPercent < 30 ? point.yPercent + 16 : point.yPercent - 12
  }
}

function hideTooltip(chartId) {
  if (hoveredPoint.value?.chartId === chartId) {
    hoveredPoint.value = null
  }
}

const charts = computed(() => ['calories', 'protein', 'carbs', 'water'].map((metric) => buildChart(metric)))
</script>

<style scoped>
.panel {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 95%, transparent),
      color-mix(in srgb, var(--surface-muted) 92%, transparent)
    );
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  border-radius: 28px;
  box-shadow: var(--shadow-soft);
  padding: 22px;
  display: grid;
  gap: 18px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.section-copy h2 {
  margin: 0;
  font-size: 24px;
  letter-spacing: -0.03em;
}

.section-copy p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.range-tabs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  background: color-mix(in srgb, var(--surface-muted) 92%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface) 78%, transparent);
}

.range-tab {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 8px 14px;
  font-weight: 700;
  color: var(--text-muted);
}

.range-tab.active {
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  color: var(--text-primary);
  box-shadow:
    0 8px 18px color-mix(in srgb, var(--shadow-soft) 46%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--surface) 78%, transparent);
}

.state {
  min-height: 240px;
  border-radius: 22px;
  background: color-mix(in srgb, var(--surface-muted) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
  display: grid;
  place-items: center;
  color: var(--text-muted);
}

.state.error {
  color: #b91c1c;
}

.trend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.trend-card {
  --accent: #f26f6f;
  --accent-rgb: 242, 111, 111;
  position: relative;
  border-radius: 26px;
  border: 1px solid color-mix(in srgb, var(--border) 76%, rgba(var(--accent-rgb), 0.24));
  background:
    radial-gradient(circle at top right, rgba(var(--accent-rgb), 0.14), transparent 42%),
    linear-gradient(180deg, rgba(var(--accent-rgb), 0.055), transparent 34%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 94%, transparent),
      color-mix(in srgb, var(--surface-muted) 92%, transparent)
    );
  padding: 18px 18px 16px;
  display: grid;
  gap: 14px;
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--surface) 72%, transparent),
    0 18px 44px color-mix(in srgb, var(--shadow-soft) 42%, transparent);
}

.trend-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.trend-title-block {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.trend-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--accent-rgb), 0.86);
}

.trend-title-block strong {
  font-size: 21px;
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.trend-title-block p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.trend-value-block {
  min-width: 128px;
  display: grid;
  justify-items: end;
  gap: 6px;
}

.trend-value-caption {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--text-muted) 86%, transparent);
}

.trend-value-block strong {
  font-size: 28px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.trend-delta {
  max-width: 220px;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  text-align: right;
  color: color-mix(in srgb, var(--text-muted) 94%, transparent);
  background: color-mix(in srgb, var(--surface-soft) 94%, transparent);
}

.trend-delta.positive {
  color: color-mix(in srgb, #22c55e 72%, var(--text-primary));
  background: color-mix(in srgb, #22c55e 14%, var(--surface-soft));
}

.trend-delta.negative {
  color: color-mix(in srgb, #ef4444 74%, var(--text-primary));
  background: color-mix(in srgb, #ef4444 14%, var(--surface-soft));
}

.trend-delta.neutral {
  color: color-mix(in srgb, var(--text-muted) 92%, transparent);
  background: color-mix(in srgb, var(--surface-track) 82%, transparent);
}

.trend-chart-shell {
  display: grid;
  gap: 12px;
}

.trend-chart-meta,
.trend-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: color-mix(in srgb, var(--text-muted) 90%, transparent);
  font-size: 12px;
}

.trend-chart {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  background:
    linear-gradient(180deg, rgba(var(--accent-rgb), 0.055), transparent 28%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-soft) 96%, transparent),
      color-mix(in srgb, var(--surface) 98%, transparent)
    );
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface) 72%, transparent);
}

.trend-chart svg {
  width: 100%;
  height: 190px;
  display: block;
}

.grid-lines line {
  stroke: color-mix(in srgb, var(--border) 62%, transparent);
  stroke-width: 1;
  stroke-dasharray: 2 6;
}

.line-area {
  opacity: 1;
}

.line-main {
  fill: none;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.axis-label {
  position: absolute;
  left: 16px;
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--text-muted) 82%, transparent);
  pointer-events: none;
}

.axis-label--top {
  top: 12px;
}

.axis-label--bottom {
  bottom: 12px;
}

.points-layer {
  position: absolute;
  inset: 0;
}

.point-hit {
  position: absolute;
  width: 18px;
  height: 18px;
  transform: translate(-50%, -50%);
  border: none;
  background: transparent;
  padding: 0;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.point-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.72);
  border: 2px solid var(--surface);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.16);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.point-dot.latest {
  width: 12px;
  height: 12px;
  background: rgba(var(--accent-rgb), 0.98);
  box-shadow:
    0 0 0 4px rgba(var(--accent-rgb), 0.14),
    0 10px 22px rgba(var(--accent-rgb), 0.18);
}

.point-dot.active {
  transform: scale(1.12);
  box-shadow:
    0 0 0 5px rgba(var(--accent-rgb), 0.16),
    0 12px 24px rgba(15, 23, 42, 0.08);
}

.chart-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  min-width: 146px;
  max-width: 190px;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
  background: color-mix(in srgb, var(--surface) 98%, transparent);
  box-shadow:
    0 14px 30px color-mix(in srgb, var(--shadow-soft) 64%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--surface) 72%, transparent);
  display: grid;
  gap: 4px;
  pointer-events: none;
}

.tooltip-date,
.tooltip-context {
  font-size: 11px;
  color: color-mix(in srgb, var(--text-muted) 90%, transparent);
}

.chart-tooltip strong {
  font-size: 14px;
  line-height: 1.2;
}

.trend-note {
  margin: 0;
  font-size: 12px;
  color: color-mix(in srgb, var(--text-muted) 92%, transparent);
}

.trend-empty {
  min-height: 294px;
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
  background:
    linear-gradient(180deg, rgba(var(--accent-rgb), 0.05), transparent 34%),
    color-mix(in srgb, var(--surface-muted) 92%, transparent);
  display: grid;
  place-items: center;
  gap: 10px;
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
}

.trend-empty strong {
  color: var(--text-primary);
}

.trend-empty p {
  margin: 0;
  max-width: 280px;
  font-size: 13px;
  line-height: 1.5;
}

.trend-empty-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background:
    radial-gradient(circle at center, rgba(var(--accent-rgb), 0.22), rgba(var(--accent-rgb), 0.08) 58%, transparent 60%),
    color-mix(in srgb, var(--surface) 96%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--surface) 70%, transparent),
    0 8px 18px color-mix(in srgb, var(--shadow-soft) 44%, transparent);
}

@media (max-width: 1100px) {
  .trend-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .panel {
    padding: 18px;
  }

  .trend-head {
    grid-template-columns: 1fr;
    display: grid;
  }

  .trend-value-block {
    justify-items: start;
  }

  .trend-chart svg {
    height: 178px;
  }

  .trend-delta {
    text-align: left;
  }
}

:global(:root[data-theme='dark']) .panel {
  box-shadow:
    0 28px 60px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

:global(:root[data-theme='dark']) .trend-card {
  box-shadow:
    0 18px 44px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

:global(:root[data-theme='dark']) .trend-chart {
  background:
    linear-gradient(180deg, rgba(var(--accent-rgb), 0.07), transparent 26%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-soft) 96%, transparent),
      color-mix(in srgb, var(--surface-muted) 94%, transparent)
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 -1px 0 rgba(255, 255, 255, 0.02);
}

:global(:root[data-theme='dark']) .chart-tooltip {
  background: color-mix(in srgb, var(--surface-muted) 96%, transparent);
  box-shadow:
    0 18px 34px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

:global(:root[data-theme='dark']) .point-dot.active {
  box-shadow:
    0 0 0 5px rgba(var(--accent-rgb), 0.18),
    0 12px 24px rgba(0, 0, 0, 0.22);
}
</style>
