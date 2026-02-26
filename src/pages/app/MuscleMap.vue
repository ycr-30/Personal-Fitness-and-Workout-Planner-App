<template>
  <section class="muscle-map-page">
    <header class="page-header">
      <div>
        <h1>Muscle Map</h1>
        <p>Choose a muscle group, then pick equipment to get training guidance.</p>
      </div>
      <div class="header-actions">
        <button class="btn ghost" type="button" @click="goBack">Back to Workout History</button>
      </div>
    </header>

    <div v-if="baseError" class="error-banner">{{ baseError }}</div>

    <div class="stage-layout" :class="{ 'is-detail': isDetailStage }">
      <section class="stage-main">
        <div v-if="!isDetailStage" class="map-stage">
          <div class="map-hero">
            <FrontBackMap
              :front-svg="frontSvg"
              :back-svg="backSvg"
              :selected-slug="selectedSlug"
              :loading="loadingBase"
              :show-labels="false"
              @select="handleSelect"
            />
          </div>
          <div class="map-hint">
            <span>Step 1</span>
            <p>Select a muscle group on the map, then choose equipment on the right.</p>
          </div>
        </div>

        <div v-else class="detail-stage">
          <div class="demo-panel">
            <div class="demo-header">
              <div>
                <h3>{{ featuredView?.name || 'Exercise Demo' }}</h3>
                <p v-if="selectedMuscleLabel">Selected: {{ selectedMuscleLabel }}</p>
                <p v-else>Select a muscle group to begin.</p>
              </div>
            </div>

            <div v-if="!selectedSlug" class="demo-empty">
              <p>Pick a muscle on the map to see exercises, cues, and demo media.</p>
            </div>

            <div v-else-if="loadingExercises || pendingFetch" class="demo-loading">
              <div class="demo-skeleton-media" aria-hidden="true"></div>
              <div class="demo-skeleton-info" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
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
            :exercises="exercisesWithFallbackMedia"
            :loading="loadingExercises || pendingFetch"
            :error="exercisesError"
            :selected-muscle-name="selectedMuscleLabel"
            @add="handleAdd"
          />
        </div>
      </section>

      <aside class="stage-sidebar">
        <div class="sidebar-card">
          <GenderToggle v-model="gender" :disabled="loadingBase" />
        </div>

        <div v-if="isDetailStage" class="sidebar-card compact-map">
          <FrontBackMap
            :front-svg="frontSvg"
            :back-svg="backSvg"
            :selected-slug="selectedSlug"
            :loading="loadingBase"
            :compact="true"
            :show-labels="false"
            @select="handleSelect"
          />
        </div>

        <div class="sidebar-card equipment-card">
          <EquipmentFilter
            v-model="selectedEquipments"
            :options="equipments"
            :loading="loadingBase"
            :disabled="!selectedSlug"
          />
          <p v-if="!selectedSlug" class="sidebar-hint">
            Select a muscle to enable equipment filters.
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { exerciseApi } from '@/lib/apiClient'
import {
  buildExerciseView,
  formatSlugLabel,
  normalizeSlug,
  resolveExerciseMedia,
  sanitizeDisplayText
} from '@/lib/muscleMapUtils'
import GenderToggle from '@/components/muscle-map/GenderToggle.vue'
import FrontBackMap from '@/components/muscle-map/FrontBackMap.vue'
import EquipmentFilter from '@/components/muscle-map/EquipmentFilter.vue'
import ExerciseResults from '@/components/muscle-map/ExerciseResults.vue'
import maleFrontSvg from '../../../musle map/muscle-map-male-front.svg?raw'
import maleBackSvg from '../../../musle map/muscle-map-male-back.svg?raw'
import femaleFrontSvg from '../../../musle map/muscle-map-female-front.svg?raw'
import femaleBackSvg from '../../../musle map/muscle-map-female-back.svg?raw'

const router = useRouter()
const gender = ref('male')
const muscles = ref([])
const equipments = ref([])
const exercises = ref([])
const selectedSlug = ref('')
const selectedMuscleData = ref(null)
const selectedEquipments = ref([])
const loadingBase = ref(false)
const loadingExercises = ref(false)
const pendingFetch = ref(false)
const baseError = ref('')
const exercisesError = ref('')

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

const isDetailStage = computed(() => Boolean(selectedSlug.value))

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
  if (selectedMuscleData.value?.name) return sanitizeDisplayText(selectedMuscleData.value.name)
  if (!selectedSlug.value) return ''
  return formatSlugLabel(selectedSlug.value) || 'Selected Muscle'
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

function normalizeExerciseNameKey(value) {
  const normalized = sanitizeDisplayText(value).toLowerCase()
  if (!normalized) return ''
  return normalized
    .replace(/\s*[-–:|]\s*.*/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const exercisesWithFallbackMedia = computed(() => {
  const list = Array.isArray(exercises.value) ? exercises.value : []
  const mediaByName = new Map()

  list.forEach((exercise) => {
    const key = normalizeExerciseNameKey(exercise?.name || exercise?.title || '')
    if (!key) return
    const { mediaUrl } = resolveExerciseMedia(exercise)
    if (mediaUrl && !mediaByName.has(key)) {
      mediaByName.set(key, mediaUrl)
    }
  })

  return list.map((exercise) => {
    const { mediaUrl } = resolveExerciseMedia(exercise)
    if (mediaUrl) return exercise

    const key = normalizeExerciseNameKey(exercise?.name || exercise?.title || '')
    const fallbackMediaUrl = key ? mediaByName.get(key) : ''
    if (!fallbackMediaUrl) return exercise

    return {
      ...exercise,
      mediaUrl: fallbackMediaUrl
    }
  })
})

const featuredExercise = computed(() => {
  const list = Array.isArray(exercisesWithFallbackMedia.value)
    ? exercisesWithFallbackMedia.value
    : []
  return list.find((exercise) => Boolean(resolveExerciseMedia(exercise).mediaUrl)) || list[0] || null
})

const featuredView = computed(() =>
  buildExerciseView(featuredExercise.value, {
    fallbackName: 'Exercise Demo',
    fallbackInstruction: 'Select an exercise to see step-by-step cues.'
  })
)

function handleSelect(slug) {
  selectedSlug.value = normalizeSlug(slug)
  selectedMuscleData.value = resolveMuscleBySlug(selectedSlug.value)
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
  if (!muscle) {
    pendingFetch.value = false
    return
  }
  const cacheKey = `${muscle}|${[...equipment].sort().join(',')}`
  if (exerciseCache.has(cacheKey)) {
    exercises.value = exerciseCache.get(cacheKey)
    exercisesError.value = ''
    loadingExercises.value = false
    pendingFetch.value = false
    return
  }
  const currentToken = ++fetchToken
  loadingExercises.value = true
  exercisesError.value = ''
  exercises.value = []
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
    exercisesError.value = sanitizeDisplayText(
      err?.message,
      'Unable to load exercises. Check filters and data source.'
    )
  } finally {
    if (currentToken === fetchToken) {
      loadingExercises.value = false
      pendingFetch.value = false
    }
  }
}

function handleAdd(exercise) {
  if (!exercise) return
  const payload = {
    exercise,
    muscle: selectedMuscleData.value || { name: selectedMuscleLabel.value }
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('pf_pending_muscle_map', JSON.stringify(payload))
  }
  router.push({ name: 'logs', query: { openLog: '1' } })
}

function normalizeMuscles(list) {
  return list
    .map((item) => {
      const slug = normalizeSlug(item.slug || item.code || item.id)
      const fallbackName = formatSlugLabel(slug) || 'Muscle'
      return {
        ...item,
        slug: item.slug || slug,
        name: sanitizeDisplayText(item.name || item.label, fallbackName)
      }
    })
    .filter((item) => item.name)
}

function normalizeEquipments(list) {
  return list
    .map((item) => {
      const slug = normalizeSlug(item.slug || item.code || item.id || item.name)
      const fallbackName = formatSlugLabel(slug) || 'Equipment'
      return {
        ...item,
        slug: item.slug || slug,
        name: sanitizeDisplayText(item.name || item.label, fallbackName)
      }
    })
    .filter((item) => item.name)
}

function goBack() {
  router.push({ name: 'logs' })
}

async function loadBaseData() {
  loadingBase.value = true
  baseError.value = ''
  try {
    const [muscleRes, equipmentRes] = await Promise.all([
      exerciseApi.getMuscles(),
      exerciseApi.getEquipments()
    ])
    const muscleList = Array.isArray(muscleRes) ? muscleRes : muscleRes?.data || []
    const equipmentList = Array.isArray(equipmentRes) ? equipmentRes : equipmentRes?.data || []
    muscles.value = normalizeMuscles(muscleList)
    equipments.value = normalizeEquipments(equipmentList)
    if (selectedSlug.value) {
      selectedMuscleData.value = resolveMuscleBySlug(selectedSlug.value)
    }
  } catch (err) {
    baseError.value = sanitizeDisplayText(
      err?.message,
      'Unable to load muscles and equipment. Check API/Supabase connection.'
    )
  } finally {
    loadingBase.value = false
  }
}

watch([selectedSlug, selectedEquipments], () => {
  if (!selectedMuscleQuery.value) {
    exercises.value = []
    exercisesError.value = ''
    loadingExercises.value = false
    pendingFetch.value = false
    return
  }
  pendingFetch.value = true
  scheduleExerciseFetch()
})

onMounted(() => {
  loadBaseData()
})

onBeforeUnmount(() => {
  if (fetchTimer) clearTimeout(fetchTimer)
})
</script>

<style scoped>
.muscle-map-page {
  display: grid;
  gap: 20px;
  max-width: 1220px;
  margin: 0 auto;
  padding: 24px 12px 32px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.page-header h1 {
  margin: 0 0 6px;
  font-size: 26px;
}

.page-header p {
  margin: 0;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.error-banner {
  padding: 10px 12px;
  border-radius: 12px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
}

.stage-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(260px, 360px);
  gap: 16px;
}

.stage-layout.is-detail {
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 360px);
}

.stage-main {
  display: grid;
  gap: 16px;
}

.map-stage {
  display: grid;
  gap: 12px;
}

.map-hero {
  border-radius: 20px;
  padding: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
}

.map-hero :deep(.map-wrapper) {
  gap: 16px;
}

.map-hero :deep(.svg-shell svg) {
  max-height: 520px !important;
}

.map-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 13px;
}

.map-hint span {
  background: var(--accent);
  color: #fff;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
}

.detail-stage {
  display: grid;
  gap: 12px;
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
  grid-template-columns: minmax(240px, 360px) minmax(0, 1fr);
  gap: 16px;
}

.demo-loading {
  display: grid;
  grid-template-columns: minmax(240px, 360px) minmax(0, 1fr);
  gap: 16px;
}

.demo-skeleton-media {
  min-height: 240px;
  border-radius: 12px;
  background: linear-gradient(90deg, #eef2f7 25%, #e5ebf3 37%, #eef2f7 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.2s ease-in-out infinite;
}

.demo-skeleton-info {
  display: grid;
  gap: 10px;
  align-content: start;
}

.demo-skeleton-info span {
  display: block;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, #eef2f7 25%, #e5ebf3 37%, #eef2f7 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.2s ease-in-out infinite;
}

.demo-skeleton-info span:nth-child(1) {
  width: 60%;
}

.demo-skeleton-info span:nth-child(2) {
  width: 78%;
}

.demo-skeleton-info span:nth-child(3) {
  width: 92%;
}

.demo-skeleton-info span:nth-child(4) {
  width: 70%;
}

.demo-media {
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
  min-height: 240px;
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

.stage-sidebar {
  display: grid;
  gap: 12px;
  align-content: start;
  position: sticky;
  top: 14px;
  max-height: calc(100vh - 28px);
  overflow: auto;
  padding-right: 2px;
}

.sidebar-card {
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 12px;
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 12px;
}

.sidebar-card.compact-map {
  padding: 10px;
}

.equipment-card :deep(.equipment-filter) {
  gap: 10px;
}

.equipment-card {
  position: static;
}

.sidebar-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.media-placeholder {
  display: grid;
  place-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 12px;
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

@media (max-width: 1100px) {
  .stage-layout,
  .stage-layout.is-detail {
    grid-template-columns: 1fr;
  }

  .demo-body,
  .demo-loading {
    grid-template-columns: 1fr;
  }

  .stage-sidebar {
    position: static;
    top: auto;
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }

  .equipment-card {
    position: static;
    top: auto;
    max-height: none;
    overflow: visible;
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: 0 0;
  }
}
</style>
