<template>
  <div class="map-wrapper" :class="{ compact }">
    <div class="map-panel">
      <header v-if="showLabels">
        <h4>Front</h4>
        <p>Tap a muscle group to filter exercises.</p>
      </header>
      <MuscleSvgMap
        :svg-markup="frontSvg"
        :selected-slug="selectedSlug"
        :loading="loading"
        :compact="compact"
        @select="handleSelect"
      />
    </div>

    <div class="map-panel">
      <header v-if="showLabels">
        <h4>Back</h4>
        <p>Choose posterior muscles for balance.</p>
      </header>
      <MuscleSvgMap
        :svg-markup="backSvg"
        :selected-slug="selectedSlug"
        :loading="loading"
        :compact="compact"
        @select="handleSelect"
      />
    </div>
  </div>
</template>

<script setup>
import MuscleSvgMap from './MuscleSvgMap.vue'

const props = defineProps({
  frontSvg: {
    type: String,
    default: ''
  },
  backSvg: {
    type: String,
    default: ''
  },
  selectedSlug: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  },
  showLabels: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['select'])

function handleSelect(slug) {
  emit('select', slug)
}
</script>

<style scoped>
.map-wrapper {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.map-panel {
  display: grid;
  gap: 12px;
}

.map-wrapper.compact {
  gap: 12px;
}

.map-wrapper.compact .map-panel header h4 {
  font-size: 14px;
}

.map-wrapper.compact .map-panel header p {
  font-size: 11px;
}

.map-panel header h4 {
  margin: 0 0 6px;
  font-size: 16px;
}

.map-panel header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

@media (max-width: 1024px) {
  .map-wrapper {
    grid-template-columns: 1fr;
  }
}
</style>
