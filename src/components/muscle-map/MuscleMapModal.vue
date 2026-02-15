<template>
  <transition name="fade">
    <div v-if="open" class="muscle-modal-backdrop" @click.self="close">
      <div class="muscle-modal-card" role="dialog" aria-modal="true">
        <header class="modal-header">
          <div>
            <h2>Muscle Map</h2>
            <p>Exercise Finder</p>
          </div>
          <button class="close" type="button" @click="close">X</button>
        </header>

        <div v-if="baseError" class="error-banner">{{ baseError }}</div>

        <div class="muscle-map-layout">
          <section class="demo-column">
            <div class="demo-panel">
              <div class="demo-header">
                <div>
                  <h3>{{ featuredView?.name || 'Exercise Demo' }}</h3>
                  <p v-if="selectedMuscleLabel">Selected: {{ selectedMuscleLabel }}</p>
                  <p v-else>Select a muscle group to begin.</p>
                </div>
                <button
                  v-if="detail"
                  class="close"
                  type="button"
                  @click="detail = null"
                  aria-label="Clear selected exercise"
                >
                  X
                </button>
              </div>

              <div v-if="!selectedSlug" class="demo-empty">
                <p>Pick a muscle on the map to see exercises, cues, and demo media.</p>
              </div>

              <div v-else-if="featuredView" class="demo-body">
                <div class="demo-media">
                  <template v-if="featuredView.mediaUrl">
                    <video
                      v-if="featuredView.mediaType === 'video'"
                      :src="featuredView.mediaUrl"
                      muted
                      autoplay
                      loop
                      playsinline
                    />
                    <img v-else :src="featuredView.mediaUrl" :alt="featuredView.name" />
                  </template>
                  <div v-else class="media-placeholder">
                    <span>Demo</span>
                    <small>Media will appear once available.</small>
                  </div>
                </div>
                <div class="demo-info">
                  <div class="demo-meta">
                    <span>Primary: {{ featuredView.primaryMuscle || '—' }}</span>
                    <span v-if="featuredView.equipmentLabel">
                      Equipment: {{ featuredView.equipmentLabel }}
                    </span>
                    <span v-if="featuredView.difficulty">Difficulty: {{ featuredView.difficulty }}</span>
                  </div>
                  <ol>
                    <li v-for="(item, idx) in featuredView.instructions" :key="idx">{{ item }}</li>
                  </ol>
                  <div class="demo-actions">
                    <button
                      class="btn primary"
                      type="button"
                      :disabled="!featuredView.raw"
                      @click="handleAdd(featuredView.raw)"
                    >
                      Add to workout log
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="demo-empty">
                <p>No exercises found for the current filters.</p>
              </div>
            </div>

            <ExerciseResults
              :exercises="exercises"
              :loading="loadingExercises"
              :error="exercisesError"
              :selected-muscle-name="selectedMuscleLabel"
              @view="handleView"
              @add="handleAdd"
            />
          </section>

          <aside class="filter-column">
            <GenderToggle v-model="gender" :disabled="loadingBase" />

            <FrontBackMap
              :front-svg="frontSvg"
              :back-svg="backSvg"
              :selected-slug="selectedSlug"
              :loading="loadingBase"
              :compact="hasSelection"
              @select="handleSelect"
            />

            <EquipmentFilter
              v-model="selectedEquipments"
              :options="equipments"
              :loading="loadingBase"
            />
          </aside>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { exerciseApi } from '@/lib/apiClient'
import GenderToggle from './GenderToggle.vue'
import FrontBackMap from './FrontBackMap.vue'
import EquipmentFilter from './EquipmentFilter.vue'
import ExerciseResults from './ExerciseResults.vue'
import maleFrontSvg from '../../../musle map/muscle-map-male-front.svg?raw'
import maleBackSvg from '../../../musle map/muscle-map-male-back.svg?raw'
import femaleFrontSvg from '../../../musle map/muscle-map-female-front.svg?raw'
import femaleBackSvg from '../../../musle map/muscle-map-female-back.svg?raw'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'add-exercise', 'loading'])

const gender = ref('male')
const muscles = ref([])
const equipments = ref([])
const exercises = ref([])
const selectedSlug = ref('')
const selectedMuscleData = ref(null)
const selectedEquipments = ref([])
const loadingBase = ref(false)
const loadingExercises = ref(false)
const baseError = ref('')
const exercisesError = ref('')
const detail = ref(null)

const exerciseCache = new Map()
let fetchTimer = null
let fetchToken = 0

const SLUG_ALIASES = {
  'upper-back': 'back',
  'lower-back': 'back',
  trapezius: 'back',
  lats: 'back',
  deltoids: 'shoulders',
  gluteal: 'glutes',
  hamstring: 'hamstrings',
  quadriceps: 'quads',
  obliques: 'abs',
  core: 'abs',
  tibialis: 'calves'
}

const frontSvg = computed(() => (gender.value === 'female' ? femaleFrontSvg : maleFrontSvg))
const backSvg = computed(() => (gender.value === 'female' ? femaleBackSvg : maleBackSvg))

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

function formatSlugLabel(value) {
  if (!value) return ''
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function resolveMuscleBySlug(slug) {
  const normalized = normalizeSlug(slug)
  if (!normalized) return null
  const canonical = SLUG_ALIASES[normalized] || normalized
  return (
    muscles.value.find((muscle) => {
      const candidates = [
        normalizeSlug(muscle.slug),
        normalizeSlug(muscle.name),
        normalizeSlug(muscle.regionId || muscle.region_id),
        normalizeSlug(muscle.code),
        String(muscle.id || '')
      ].filter(Boolean)
      return candidates.includes(normalized) || candidates.includes(canonical)
    }) || null
  )
}

const selectedMuscleLabel = computed(() => {
  if (selectedMuscleData.value?.name) return selectedMuscleData.value.name
  if (!selectedSlug.value) return ''
  return formatSlugLabel(selectedSlug.value)
})

const selectedMuscleQuery = computed(() => {
  const data = selectedMuscleData.value
  if (data?.slug) return data.slug
  if (data?.code) return data.code
  if (data?.id) return data.id
  if (data?.name) return data.name
  const normalized = normalizeSlug(selectedSlug.value)
  return SLUG_ALIASES[normalized] || normalized
})

const hasSelection = computed(() => !!selectedSlug.value)

function buildExerciseView(source) {
  if (!source) return null
  const name = source.name || source.title || 'Exercise'
  const rawEquipment =
    source.equipments || source.equipment || source.equipmentLabel || source.equipmentType || []
  const equipmentList = Array.isArray(rawEquipment)
    ? rawEquipment
    : typeof rawEquipment === 'string'
      ? rawEquipment.split(',')
      : []
  const equipmentLabel = equipmentList.map((item) => String(item).trim()).filter(Boolean).join(', ')
  const primaryMuscle =
    source.primaryMuscle?.name ||
    source.primaryMuscle ||
    source.muscle ||
    source.mainMuscle ||
    ''
  const instructions = normalizeList(
    source.instructions || source.steps || source.notes || source.tips || source.cues || ''
  )
  const mediaUrl =
    source.mediaUrl ||
    source.media?.[0] ||
    source.demoUrl ||
    source.premiumVideos?.[0] ||
    source.premiumImages?.[0] ||
    source.videoUrl ||
    source.gifUrl ||
    ''
  const mediaType = mediaUrl && /\.(mp4|webm|ogg)$/i.test(mediaUrl) ? 'video' : 'image'
  const subtitle =
    equipmentLabel || primaryMuscle ? [equipmentLabel, primaryMuscle].filter(Boolean).join(' · ') : ''

  return {
    name,
    equipmentLabel,
    primaryMuscle,
    difficulty: source.difficulty || source.level || '',
    instructions: instructions.length
      ? instructions
      : ['Select an exercise to see step-by-step cues.'],
    mediaUrl,
    mediaType,
    subtitle,
    raw: source
  }
}

const featuredView = computed(() => buildExerciseView(detail.value || exercises.value[0]))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetState()
    loadBaseData()
  }
)

watch([selectedSlug, selectedEquipments], () => {
  if (!props.open) return
  if (!selectedMuscleQuery.value) {
    exercises.value = []
    exercisesError.value = ''
    return
  }
  detail.value = null
  scheduleExerciseFetch()
})

function resetState() {
  gender.value = 'male'
  selectedSlug.value = ''
  selectedMuscleData.value = null
  selectedEquipments.value = []
  exercises.value = []
  exercisesError.value = ''
  detail.value = null
}

function close() {
  emit('close')
}

function handleSelect(slug) {
  selectedSlug.value = normalizeSlug(slug)
  selectedMuscleData.value = resolveMuscleBySlug(selectedSlug.value)
}

async function loadBaseData() {
  loadingBase.value = true
  baseError.value = ''
  emit('loading', true)
  try {
    const [muscleRes, equipmentRes] = await Promise.all([
      exerciseApi.getMuscles(),
      exerciseApi.getEquipments()
    ])
    muscles.value = Array.isArray(muscleRes) ? muscleRes : muscleRes?.data || []
    equipments.value = Array.isArray(equipmentRes) ? equipmentRes : equipmentRes?.data || []
    if (selectedSlug.value) {
      selectedMuscleData.value = resolveMuscleBySlug(selectedSlug.value)
    }
  } catch (err) {
    baseError.value = err?.message || 'Unable to load muscles and equipment.'
  } finally {
    loadingBase.value = false
    emit('loading', false)
  }
}

function scheduleExerciseFetch() {
  if (fetchTimer) clearTimeout(fetchTimer)
  fetchTimer = setTimeout(() => {
    fetchExercises()
  }, 240)
}

async function fetchExercises() {
  const muscle = selectedMuscleQuery.value
  const equipment = selectedEquipments.value
  if (!muscle) return
  const cacheKey = `${muscle}|${[...equipment].sort().join(',')}`
  if (exerciseCache.has(cacheKey)) {
    exercises.value = exerciseCache.get(cacheKey)
    exercisesError.value = ''
    return
  }
  const currentToken = ++fetchToken
  loadingExercises.value = true
  exercisesError.value = ''
  try {
    const res = await exerciseApi.getExercises({
      muscle,
      equipments: equipment
    })
    if (currentToken !== fetchToken) return
    const list = Array.isArray(res) ? res : res?.data || []
    exercises.value = list
    exerciseCache.set(cacheKey, list)
  } catch (err) {
    if (currentToken !== fetchToken) return
    exercisesError.value = err?.message || 'Unable to load exercises.'
  } finally {
    if (currentToken === fetchToken) {
      loadingExercises.value = false
    }
  }
}

async function handleView(exercise) {
  if (!exercise?.id) return
  try {
    const data = await exerciseApi.getExerciseById(exercise.id)
    detail.value = data?.data || data || null
  } catch (err) {
    detail.value = {
      name: exercise.name,
      notes: err?.message || 'Unable to load exercise details.'
    }
  }
}

function handleAdd(exercise) {
  emit('add-exercise', {
    exercise,
    muscle: selectedMuscleData.value || { name: selectedMuscleLabel.value }
  })
  close()
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value === 'string') {
    return value
      .split(/\n|\r|\u2022|\u00b7|\-|;/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}
</script>

<style scoped>
.muscle-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, 0.55);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 60;
}

.muscle-modal-card {
  width: min(1100px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  background: var(--surface);
  border-radius: 22px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-strong);
  padding: 24px;
  display: grid;
  gap: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.modal-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.modal-header p {
  margin: 0;
  color: var(--text-muted);
}

.close {
  border: none;
  background: var(--surface-soft);
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 700;
  color: var(--text-muted);
}

.error-banner {
  padding: 10px 12px;
  border-radius: 12px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
}

.muscle-map-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.85fr);
  gap: 20px;
}

.demo-column {
  display: grid;
  gap: 16px;
  align-content: start;
}

.filter-column {
  display: grid;
  gap: 16px;
  align-content: start;
}

.demo-panel {
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 16px;
  background: var(--surface-soft);
  display: grid;
  gap: 14px;
}

.demo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.demo-header h3 {
  margin: 0 0 6px;
}

.demo-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.demo-body {
  display: grid;
  grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
  gap: 16px;
}

.demo-media {
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
  min-height: 220px;
  display: grid;
  place-items: center;
}

.demo-media img,
.demo-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.demo-info {
  display: grid;
  gap: 12px;
}

.demo-meta {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.demo-info ol {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.demo-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.demo-empty {
  padding: 12px;
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 13px;
}

.media-placeholder {
  display: grid;
  place-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 12px;
}

:deep(.btn) {
  border-radius: 14px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: var(--shadow-soft);
}

:deep(.btn.primary) {
  background: var(--accent);
  color: #fff;
  border-color: transparent;
}

:deep(.btn.ghost) {
  background: var(--surface);
  color: var(--text-primary);
}

:deep(.btn:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

:deep(.btn.is-loading) {
  position: relative;
  color: transparent;
}

:deep(.btn.is-loading::after) {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1024px) {
  .muscle-modal-card {
    padding: 18px;
  }

  .muscle-map-layout {
    grid-template-columns: 1fr;
  }

  .demo-body {
    grid-template-columns: 1fr;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
