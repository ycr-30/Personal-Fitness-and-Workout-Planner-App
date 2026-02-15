<template>
  <section class="equipment-filter" :class="{ disabled }">
    <header>
      <h3>Equipment Filter</h3>
      <p>Select one or more equipment types.</p>
    </header>

    <div v-if="loading" class="equipment-loading">Loading equipment...</div>

    <div v-else class="equipment-grid" :class="{ disabled }">
      <label
        v-for="option in normalizedOptions"
        :key="option.key"
        class="equipment-option"
        :class="{ active: modelValue.includes(option.key) }"
      >
        <input
          type="checkbox"
          :value="option.key"
          :checked="modelValue.includes(option.key)"
          :disabled="disabled"
          @change="toggle(option.key)"
        />
        <span class="equipment-icon" v-html="option.icon"></span>
        <span>{{ option.label }}</span>
      </label>
    </div>

    <p v-if="disabled && !loading" class="equipment-disabled">
      {{ disabledMessage }}
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { formatSlugLabel, normalizeSlug, sanitizeDisplayText } from '@/lib/muscleMapUtils'

const props = defineProps({
  options: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  disabledMessage: {
    type: String,
    default: 'Select a muscle group to enable equipment filters.'
  }
})

const emit = defineEmits(['update:modelValue'])

const SVG_ICON_MODULES = import.meta.glob('../../../Equipment Filter/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default'
})

const ICONS = {
  bodyweight: '<span class="emoji-icon" role="img" aria-label="Bodyweight">🧍</span>',
  dumbbell: '<span class="emoji-icon" role="img" aria-label="Dumbbell">🏋️</span>',
  barbell: '<span class="emoji-icon" role="img" aria-label="Barbell">🏋️‍♂️</span>',
  kettlebell: '<span class="emoji-icon" role="img" aria-label="Kettlebell">🏋️‍♀️</span>',
  cable: '<span class="emoji-icon" role="img" aria-label="Cable">🔗</span>',
  machine: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="5" height="14" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="14" y="6" width="5" height="11" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 20h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  bands: '<span class="emoji-icon" role="img" aria-label="Bands">🪢</span>',
  trx: '<span class="emoji-icon" role="img" aria-label="TRX">🪢</span>',
  stretching: '<span class="emoji-icon" role="img" aria-label="Stretching">🤸</span>',
  medicineball: '<span class="emoji-icon" role="img" aria-label="Medicine Ball">🏀</span>',
  bosu: '<span class="emoji-icon" role="img" aria-label="Bosu Ball">🟠</span>',
  yoga: '<span class="emoji-icon" role="img" aria-label="Yoga">🧘</span>',
  cardio: '<span class="emoji-icon" role="img" aria-label="Cardio">🏃</span>',
  recovery: '<span class="emoji-icon" role="img" aria-label="Recovery">😌</span>',
  plate: '<span class="emoji-icon" role="img" aria-label="Plate">💿</span>',
  default: '<span class="emoji-icon" role="img" aria-label="Equipment">🏋️</span>'
}

const ICON_ALIASES = {
  'body-weight': 'bodyweight',
  'bodyweight': 'bodyweight',
  calisthenics: 'bodyweight',
  dumbbell: 'dumbbell',
  dumbbells: 'dumbbell',
  barbell: 'barbell',
  barbells: 'barbell',
  kettlebell: 'kettlebell',
  kettlebells: 'kettlebell',
  cable: 'cable',
  cables: 'cable',
  machine: 'machine',
  machines: 'machine',
  'smith-machine': 'smith-machine',
  'strength-machine': 'smith-machine',
  bands: 'bands',
  band: 'bands',
  'resistance-band': 'bands',
  'resistance-bands': 'bands',
  trx: 'trx',
  suspension: 'trx',
  stretching: 'stretching',
  mobility: 'stretching',
  yoga: 'yoga',
  'medicine-ball': 'medicine-ball',
  'med-ball': 'medicine-ball',
  'bosu-ball': 'bosu-ball',
  bosu: 'bosu-ball',
  cardio: 'cardio',
  aerobic: 'cardio',
  recovery: 'recovery',
  plate: 'plate',
  plates: 'plate',
  vitruvian: 'vitruvian'
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

function buildSvgIconMap() {
  const entries = Object.entries(SVG_ICON_MODULES).map(([filePath, raw]) => {
    const fileName = filePath.split('/').pop()?.replace(/\.svg$/i, '') || ''
    return [normalizeKey(fileName), typeof raw === 'string' ? raw : '']
  })
  return Object.fromEntries(entries.filter(([, raw]) => raw))
}

const SVG_ICONS = buildSvgIconMap()

function getIconFor(option) {
  const candidate = option.slug || option.name || option.label || option.code || option.id
  const normalized = normalizeKey(candidate)
  const alias = ICON_ALIASES[normalized] || normalized
  return SVG_ICONS[alias] || SVG_ICONS[normalized] || ICONS[alias] || ICONS.default
}

const normalizedOptions = computed(() =>
  props.options
    .map((option) => {
      const key = option.slug || option.id || option.code || option.name
      const safeKey = sanitizeDisplayText(key)
      const fallbackLabel = formatSlugLabel(normalizeSlug(option.slug || option.code || option.id || ''))
      const label = sanitizeDisplayText(
        option.name || option.label || option.slug || option.code,
        fallbackLabel || safeKey
      )
      return { key: safeKey, label, icon: getIconFor(option) }
    })
    .filter((option) => option.key && option.label)
)

function toggle(key) {
  if (props.disabled) return
  const next = props.modelValue.includes(key)
    ? props.modelValue.filter((item) => item !== key)
    : [...props.modelValue, key]
  emit('update:modelValue', next)
}
</script>

<style scoped>
.equipment-filter {
  display: grid;
  gap: 12px;
}

.equipment-filter header h3 {
  margin: 0 0 6px;
  font-size: 16px;
}

.equipment-filter header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.equipment-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.equipment-option span:last-child {
  min-width: 0;
  line-height: 1.25;
}

.equipment-option input {
  accent-color: var(--accent);
}

.equipment-icon {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  color: var(--accent-strong, #2f49a3);
}

.equipment-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.equipment-icon :deep(.emoji-icon) {
  font-size: 18px;
  line-height: 1;
}

.equipment-option.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.equipment-option.active .equipment-icon {
  color: var(--accent);
}

.equipment-loading {
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: 13px;
}

.equipment-filter.disabled {
  opacity: 0.85;
}

.equipment-grid.disabled {
  pointer-events: none;
  opacity: 0.6;
}

.equipment-disabled {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 420px) {
  .equipment-grid {
    grid-template-columns: 1fr;
  }
}
</style>
