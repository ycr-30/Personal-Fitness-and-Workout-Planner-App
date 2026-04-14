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
        <p class="cluster-note">{{ chips.join(' · ') }}</p>

        <div class="summary-card">
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
const HERO_VIEWBOX = {
  male: '884 94 420 274',
  female: '972 106 402 268'
}

const activeSvgMarkup = computed(() => {
  const rawSvg = SVG_SOURCES[props.gender] || maleBackSvg
  if (props.variant !== 'hero') return rawSvg
  const heroViewBox = HERO_VIEWBOX[props.gender] || HERO_VIEWBOX.male
  return rawSvg.replace(/viewBox="[^"]+"/, `viewBox="${heroViewBox}"`)
})
const summaryTitle = computed(() => 'Back-focused build')
const summaryBody = computed(() => 'Rear delts, upper back, lats · 52 min')
</script>

<style scoped>
.landing-muscle-map {
  display: grid;
  gap: 0;
}

.map-layout {
  display: grid;
  grid-template-columns: minmax(0, 264px) minmax(0, 228px);
  gap: 12px;
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
  min-height: 168px;
}

.variant-preview .map-shell {
  min-height: 244px;
}

.svg-stage {
  position: relative;
  width: 100%;
  height: 100%;
}

.variant-hero .svg-stage {
  min-height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 0;
}

.variant-preview .svg-stage {
  min-height: 244px;
  padding-top: 4px;
}

.svg-stage :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.variant-hero .svg-stage :deep(svg) {
  width: 141%;
  max-width: none;
  margin-left: 0;
  margin-top: -3px;
}

.variant-preview .svg-stage :deep(svg) {
  width: min(100%, 266px);
  max-height: 250px;
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

.variant-hero .svg-stage :deep(.muscle) {
  fill: #f5f7fb !important;
  stroke: #d8e0ea;
  stroke-width: 1.26;
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

.variant-hero .svg-stage :deep(.muscle-group[data-slug='deltoids'] .muscle) {
  fill: rgba(255, 90, 95, 0.84) !important;
  stroke: rgba(255, 90, 95, 0.96);
}

.svg-stage :deep(.muscle-group[data-slug='upper-back'] .muscle),
.svg-stage :deep(.muscle-group[data-slug='trapezius'] .muscle) {
  fill: rgba(75, 123, 255, 0.78) !important;
  stroke: rgba(75, 123, 255, 0.88);
}

.variant-hero .svg-stage :deep(.muscle-group[data-slug='upper-back'] .muscle),
.variant-hero .svg-stage :deep(.muscle-group[data-slug='trapezius'] .muscle) {
  fill: rgba(75, 123, 255, 0.84) !important;
  stroke: rgba(75, 123, 255, 0.92);
}

.svg-stage :deep(.muscle-group[data-slug='lower-back'] .muscle) {
  fill: rgba(75, 123, 255, 0.36) !important;
  stroke: rgba(75, 123, 255, 0.58);
}

.map-summary {
  display: grid;
  gap: 7px;
  align-content: center;
  justify-self: stretch;
  max-width: 228px;
}

.cluster-note {
  margin: 0;
  color: #667085;
  font-size: 9.5px;
  line-height: 1.35;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.62;
}

.summary-card {
  width: 100%;
  border: 1px solid rgba(231, 236, 243, 0.94);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  padding: 11px 12px;
  display: grid;
  gap: 4px;
}

.summary-card strong {
  font-size: 15px;
  line-height: 1.12;
  color: #121826;
}

.summary-card p {
  margin: 0;
  color: #667085;
  font-size: 11px;
  line-height: 1.42;
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
    justify-items: center;
    text-align: center;
  }
}
</style>
