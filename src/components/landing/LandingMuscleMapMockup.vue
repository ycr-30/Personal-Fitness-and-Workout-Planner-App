<template>
  <div class="landing-muscle-map" :class="`variant-${variant}`" aria-hidden="true">
    <div v-if="variant === 'hero'" class="map-shell hero-shell">
      <div class="svg-stage" v-html="activeSvgMarkup"></div>
    </div>

    <div v-else class="map-layout">
      <div class="map-shell">
        <div class="svg-stage" v-html="activeSvgMarkup"></div>
      </div>

      <div class="map-summary">
        <div class="chip-row">
          <span v-for="chip in chips" :key="chip" class="map-chip">{{ chip }}</span>
        </div>

        <div class="summary-card">
          <span class="summary-kicker">{{ summaryKicker }}</span>
          <strong>{{ summaryTitle }}</strong>
          <p>{{ summaryBody }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import maleBackSvg from '../../../musle map/muscle-map-male-back.svg?raw'
import femaleBackSvg from '../../../musle map/muscle-map-female-back.svg?raw'

const props = defineProps({
  variant: {
    type: String,
    default: 'hero',
    validator: (value) => ['hero', 'preview'].includes(value)
  },
  gender: {
    type: String,
    default: 'male',
    validator: (value) => ['male', 'female'].includes(value)
  }
})

const SVG_SOURCES = {
  male: maleBackSvg,
  female: femaleBackSvg
}

// Landing-facing labels do not map 1:1 to the raw SVG groups.
// We highlight the nearest real regions from the shipped back-view assets:
// - rear delts -> deltoids
// - upper back -> upper-back + trapezius
// - lats -> approximated with upper-back sweep reinforced by lower-back
const chips = ['Rear delts', 'Upper back', 'Lats']

const activeSvgMarkup = computed(() => SVG_SOURCES[props.gender] || maleBackSvg)
const summaryKicker = computed(() => 'Session outline')
const summaryTitle = computed(() => 'Rear-delt and upper-back emphasis')
const summaryBody = computed(() => '3 selected groups · 52 min back-focused build')
</script>

<style scoped>
.landing-muscle-map {
  display: grid;
  gap: 0;
}

.map-layout {
  display: grid;
  grid-template-columns: minmax(0, 230px) minmax(0, 300px);
  gap: 22px;
  align-items: center;
  justify-content: center;
}

.map-shell {
  position: relative;
  border-radius: 20px;
  border: 1px solid rgba(231, 236, 243, 0.94);
  background:
    radial-gradient(circle at top right, rgba(75, 123, 255, 0.08), transparent 46%),
    radial-gradient(circle at bottom left, rgba(255, 90, 95, 0.07), transparent 48%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 251, 255, 0.98) 100%);
  overflow: hidden;
}

.hero-shell {
  min-height: 176px;
}

.variant-preview .map-shell {
  min-height: 282px;
}

.svg-stage {
  position: relative;
  width: 100%;
  height: 100%;
}

.variant-hero .svg-stage {
  min-height: 176px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
}

.variant-preview .svg-stage {
  min-height: 282px;
  padding-top: 10px;
}

.svg-stage :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.variant-hero .svg-stage :deep(svg) {
  width: 102%;
  max-width: none;
  margin-left: 0;
  margin-top: 2px;
}

.variant-preview .svg-stage :deep(svg) {
  width: min(100%, 236px);
  max-height: 272px;
  margin: 0 auto;
}

.svg-stage :deep(#border path) {
  stroke: rgba(189, 197, 211, 0.62);
  stroke-width: 2.15;
}

.svg-stage :deep(.muscle) {
  fill: #eef2f7 !important;
  stroke: #c7d1de;
  stroke-width: 1.42;
}

.svg-stage :deep(.muscle-group[data-slug='hair'] .muscle) {
  fill: rgba(185, 192, 204, 0.74) !important;
  stroke: rgba(185, 192, 204, 0.74);
}

.svg-stage :deep(.muscle-group[data-slug='head'] .muscle),
.svg-stage :deep(.muscle-group[data-slug='hands'] .muscle),
.svg-stage :deep(.muscle-group[data-slug='feet'] .muscle),
.svg-stage :deep(.muscle-group[data-slug='ankles'] .muscle) {
  fill: #f5f7fb !important;
}

.svg-stage :deep(.muscle-group[data-slug='deltoids'] .muscle) {
  fill: rgba(255, 90, 95, 0.76) !important;
  stroke: rgba(255, 90, 95, 0.9);
}

.svg-stage :deep(.muscle-group[data-slug='upper-back'] .muscle),
.svg-stage :deep(.muscle-group[data-slug='trapezius'] .muscle) {
  fill: rgba(75, 123, 255, 0.78) !important;
  stroke: rgba(75, 123, 255, 0.88);
}

.svg-stage :deep(.muscle-group[data-slug='lower-back'] .muscle) {
  fill: rgba(75, 123, 255, 0.36) !important;
  stroke: rgba(75, 123, 255, 0.58);
}

.map-summary {
  display: grid;
  gap: 12px;
  align-content: center;
  justify-self: stretch;
  max-width: 300px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-start;
}

.map-chip {
  min-height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(75, 123, 255, 0.15);
  background: rgba(75, 123, 255, 0.07);
  color: #4b7bff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.summary-card {
  border: 1px solid rgba(231, 236, 243, 0.94);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 16px 18px;
  display: grid;
  gap: 6px;
}

.summary-kicker {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #667085;
}

.summary-card strong {
  font-size: 20px;
  line-height: 1.14;
  color: #121826;
}

.summary-card p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 860px) {
  .map-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .variant-preview .svg-stage :deep(svg) {
    width: min(100%, 220px);
  }

  .map-summary {
    max-width: none;
  }
}
</style>
