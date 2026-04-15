<template>
  <section class="logs-page">
    <header class="page-header">
      <div>
        <h1>Workout History</h1>
        <p>View and manage your past training sessions.</p>
      </div>
      <div class="header-actions">
        <button
          class="btn primary"
          type="button"
          @click="openMuscleMap"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="4" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path
              d="M7 22v-6l-2.5-3.4a3 3 0 0 1 1.5-4.6l2.2-.8 3 3 3-3 2.2.8a3 3 0 0 1 1.5 4.6L17 16v6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Muscle Map
        </button>
        <button class="btn primary" type="button" @click="openForm">
          <span>+</span>
          Log Workout
        </button>
      </div>
    </header>

    <div class="filters">
      <label class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.6" fill="none" />
          <path d="M16 16l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          v-model.trim="searchInput"
          type="search"
          placeholder="Search by workout name..."
          @keydown.enter.prevent="applySearch"
        />
        <button type="button" class="search-button" @click="applySearch" aria-label="Search">
          🔍
        </button>
      </label>
      <label class="select">
        <select v-model="statusFilter">
          <option value="all">All</option>
          <option value="pending">Unfinished</option>
          <option value="completed">Completed</option>
        </select>
        <svg class="select-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </label>
      <label class="select">
        <select v-model="selectedGroup">
          <option value="all">All Muscle Groups</option>
          <option v-for="group in muscleGroups" :key="group" :value="group">{{ group }}</option>
        </select>
        <svg class="select-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </label>
      <label class="select">
        <select v-model="dateRange">
          <option value="month">This Month</option>
          <option value="last30">Last 30 Days</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
        <svg class="select-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </label>
    </div>

    <div class="table-card">
      <div class="table-head table-row">
        <span>Date</span>
        <span>Workout Details</span>
        <span>Duration</span>
        <span>Muscle Groups</span>
        <span>Actions</span>
      </div>

      <div v-if="filteredWorkouts.length === 0" class="empty-state">
        <div>
          <h3>{{ emptyTitle }}</h3>
          <p>{{ emptyMessage }}</p>
        </div>
        <button v-if="workouts.length === 0" class="btn primary" type="button" @click="openForm">
          Log Workout
        </button>
      </div>

      <div v-else>
        <div
          v-for="item in filteredWorkouts"
          :key="item.id"
          class="table-row"
          :class="{ completed: item.status === 'completed' }"
        >
          <div class="date">
            <strong>{{ formatDate(item.date) }}</strong>
            <span>{{ formatDay(item.date) }}</span>
          </div>
          <div class="details">
            <div class="title">
              <strong>{{ item.title }}</strong>
            </div>
            <p>{{ item.subtitle }}</p>
          </div>
          <div class="metric">
            <svg viewBox="0 0 24 24" class="metric-icon" aria-hidden="true">
              <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.5" fill="none" />
              <path d="M12 8v5l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ item.duration }}
          </div>
          <div class="tags">
            <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div class="row-actions">
            <button
              class="row-action"
              :class="{ active: item.status === 'completed' }"
              type="button"
              :title="item.status === 'completed' ? 'Mark as unfinished' : 'Mark as completed'"
              :aria-pressed="item.status === 'completed'"
              @click.stop="toggleCompleted(item.id)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 12l4 4 10-10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button class="row-action danger" type="button" title="Delete" @click="deleteWorkout(item.id)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M9 7V5h6v2m-7 4v7m8-7v7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                <rect x="6" y="7" width="12" height="13" rx="2" stroke="currentColor" stroke-width="1.4" fill="none" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <footer class="table-footer">
        <span>Showing {{ filteredWorkouts.length }} of {{ workouts.length }} workouts</span>
      </footer>
    </div>

    <transition name="fade">
      <div v-if="showForm" class="modal-backdrop" @click.self="closeForm">
        <form class="modal-card" @submit.prevent="addWorkout">
          <header>
            <div>
              <h2>Log a Workout</h2>
              <p>Add your session details to the history.</p>
            </div>
            <button class="close" type="button" @click="closeForm">X</button>
          </header>

          <div class="form-grid">
            <label class="field">
              <span>Date</span>
              <input
                v-model="form.date"
                type="date"
                :min="todayDate"
                required
                @invalid="setEnglishValidity($event)"
                @input="clearValidity($event)"
              />
            </label>
            <label class="field span-2">
              <span>Location</span>
              <input
                v-model.trim="form.location"
                type="text"
                placeholder="Enter location"
                list="location-suggestions"
              />
              <datalist id="location-suggestions">
                <option v-for="place in locationSuggestions" :key="place" :value="place" />
              </datalist>
            </label>
            <div class="field pr-card">
              <span>PRs / Records</span>
              <div class="pr-display">
                <span class="trophy">🏆</span>
                <strong>{{ prCount }}</strong>
                <span class="pr-label">PRs</span>
              </div>
            </div>
            <div class="field full">
              <div class="field-row">
                <span>Exercises</span>
                <button class="btn ghost small" type="button" @click="addExercise">
                  + Add exercise
                </button>
              </div>
              <div class="exercise-list">
                <p v-if="form.exercises.length === 0" class="muted">No exercises added yet.</p>
                <div
                  v-for="(exercise, index) in form.exercises"
                  :key="exercise.id"
                  class="exercise-card"
                >
                  <label class="exercise-group">
                    <span>Muscle Group</span>
                    <select v-model="exercise.groupFilter" @change="onExerciseGroupChange(exercise)">
                      <option value="">All groups</option>
                      <option v-for="option in muscleGroupOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </label>
                  <div class="exercise-header">
                    <select v-model="exercise.name">
                      <option value="" disabled>Select exercise...</option>
                      <option v-for="name in workoutOptions(exercise)" :key="name" :value="name">{{ name }}</option>
                    </select>
                    <button class="icon-btn" type="button" @click="removeExercise(index)">✕</button>
                  </div>
                  <div class="exercise-fields">
                    <label>
                      <span>Sets</span>
                      <input
                        v-model.number="exercise.sets"
                        type="number"
                        min="1"
                        placeholder="3"
                        @input="onExerciseFieldsChange(exercise)"
                      />
                    </label>
                    <label>
                      <span>Reps</span>
                      <input
                        v-model.number="exercise.reps"
                        type="number"
                        min="1"
                        placeholder="10"
                        @input="onExerciseFieldsChange(exercise)"
                      />
                    </label>
                    <label>
                      <span>Weight</span>
                      <input
                        v-model.number="exercise.weight"
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="60"
                        @input="onExerciseFieldsChange(exercise)"
                      />
                    </label>
                  </div>
                  <div class="exercise-meta">
                    <label>
                      <span>Duration</span>
                      <div class="duration-inputs">
                        <div class="duration-field">
                          <input
                            v-model.number="exercise.durationHours"
                            type="number"
                            min="0"
                            max="23"
                            placeholder="Hours"
                            @input="clearDurationError(exercise)"
                          />
                          <span>h</span>
                        </div>
                        <div class="duration-field">
                          <input
                            v-model.number="exercise.durationMinutes"
                            type="number"
                            min="0"
                            max="59"
                            placeholder="Minutes"
                            @input="clearDurationError(exercise)"
                          />
                          <span>min</span>
                        </div>
                      </div>
                    </label>
                    <p v-if="exercise.durationError" class="field-error">{{ exercise.durationError }}</p>
                  </div>
                  <div class="exercise-rpe">
                    <span>RPE (1-10)</span>
                    <input
                      v-model.number="exercise.rpe"
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      @input="onExerciseRpeChange(exercise)"
                    />
                    <div class="range-meta">
                      <strong>{{ exercise.rpe }}</strong>
                      <span>{{ getRpeLabel(exercise.rpe) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer class="modal-actions">
            <button class="btn ghost" type="button" @click="closeForm">Cancel</button>
            <button class="btn primary" type="submit">Save Workout</button>
          </footer>
        </form>
      </div>
    </transition>

  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUserStorageKey } from '@/lib/userStorage'
import { useUserSettings } from '@/composables/useUserSettings'
import { buildWorkoutLocationSuggestions, getLatestWorkoutLocation } from '@/utils/workoutLocations'

const auth = useAuthStore()
const storageKey = computed(() => getUserStorageKey('pf_workout_logs', auth.user))
const workouts = ref([])
const searchInput = ref('')
const searchQuery = ref('')
const showForm = ref(false)
const statusFilter = ref('all')
const selectedGroup = ref('all')
const dateRange = ref('month')
const ENGLISH_REQUIRED = 'Please fill out this field.'
const DURATION_REQUIRED = 'Please enter training time.'
const todayDate = new Date().toISOString().split('T')[0]
const route = useRoute()
const router = useRouter()
const PENDING_MUSCLE_MAP_KEY = 'pf_pending_muscle_map'
const { settings: userSettings, loadSettings } = useUserSettings()

const form = reactive({
  date: '',
  location: '',
  exercises: []
})

const workoutGroupMap = reactive({
  'Bench Press': ['Chest', 'Triceps', 'Shoulders'],
  'Incline Bench Press': ['Chest', 'Shoulders', 'Triceps'],
  'Decline Bench Press': ['Chest', 'Triceps'],
  'Dumbbell Press': ['Chest', 'Shoulders', 'Triceps'],
  'Push Up': ['Chest', 'Shoulders', 'Triceps'],
  'Chest Fly': ['Chest'],
  'Cable Fly': ['Chest'],
  'Pull Up': ['Back', 'Biceps'],
  'Chin Up': ['Back', 'Biceps'],
  'Lat Pulldown': ['Back', 'Biceps'],
  'Seated Row': ['Back', 'Biceps'],
  'Barbell Row': ['Back', 'Biceps'],
  'Dumbbell Row': ['Back', 'Biceps'],
  'Deadlift': ['Back', 'Glutes', 'Hamstrings'],
  'Romanian Deadlift': ['Glutes', 'Hamstrings'],
  'Back Extension': ['Lower Back', 'Glutes'],
  'Squat': ['Quads', 'Glutes', 'Hamstrings'],
  'Front Squat': ['Quads', 'Glutes'],
  'Goblet Squat': ['Quads', 'Glutes'],
  'Leg Press': ['Quads', 'Glutes'],
  'Lunge': ['Quads', 'Glutes', 'Hamstrings'],
  'Walking Lunge': ['Quads', 'Glutes', 'Hamstrings'],
  'Bulgarian Split Squat': ['Quads', 'Glutes', 'Hamstrings'],
  'Leg Extension': ['Quads'],
  'Leg Curl': ['Hamstrings'],
  'Calf Raise': ['Calves'],
  'Hip Thrust': ['Glutes', 'Hamstrings'],
  'Glute Bridge': ['Glutes', 'Hamstrings'],
  'Shoulder Press': ['Shoulders', 'Triceps'],
  'Dumbbell Shoulder Press': ['Shoulders', 'Triceps'],
  'Lateral Raise': ['Shoulders'],
  'Front Raise': ['Shoulders'],
  'Rear Delt Fly': ['Rear Delts', 'Upper Back'],
  'Upright Row': ['Shoulders', 'Traps'],
  'Bicep Curl': ['Biceps'],
  'Hammer Curl': ['Biceps', 'Forearms'],
  'Tricep Pushdown': ['Triceps'],
  'Tricep Dip': ['Triceps', 'Chest'],
  'Skullcrusher': ['Triceps'],
  'Overhead Tricep Extension': ['Triceps'],
  'Plank': ['Core'],
  'Crunch': ['Core'],
  'Leg Raise': ['Core'],
  'Russian Twist': ['Core'],
  'Bicycle Crunch': ['Core'],
  'Mountain Climber': ['Core'],
  'Burpee': ['Full Body'],
  'Kettlebell Swing': ['Glutes', 'Hamstrings', 'Core'],
  'Rowing Machine': ['Full Body'],
  'Treadmill Run': ['Cardio'],
  'Cycling': ['Cardio'],
  'Jump Rope': ['Cardio'],
  'Stair Climber': ['Cardio'],
  'Battle Ropes': ['Arms', 'Shoulders', 'Cardio'],
  'Farmer Carry': ['Core', 'Grip', 'Shoulders'],
  'Clean and Press': ['Full Body'],
  'Snatch': ['Full Body'],
  'Box Jump': ['Plyometrics'],
  'Sled Push': ['Legs', 'Core'],
  'Medicine Ball Slam': ['Core', 'Shoulders']
})

function loadWorkouts() {
  const raw = localStorage.getItem(storageKey.value)
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.map((item) => {
      const tags = Array.isArray(item.tags)
        ? item.tags
        : typeof item.tags === 'string'
          ? item.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : []
      return { status: 'pending', ...item, tags }
    })
  } catch (err) {
    console.error('Failed to parse workouts', err)
    return []
  }
}

watch(
  storageKey,
  () => {
    workouts.value = loadWorkouts()
  },
  { immediate: true }
)

watch(
  workouts,
  (value) => {
    localStorage.setItem(storageKey.value, JSON.stringify(value))
  },
  { deep: true }
)

watch(
  () => route.query.openLog,
  (value) => {
    if (value === '1') openForm()
  },
  { immediate: true }
)

function handleOpenLogModal() {
  openForm()
}

onMounted(() => {
  loadSettings()
  if (typeof window !== 'undefined') {
    window.addEventListener('pf_open_log_modal', handleOpenLogModal)
    const pending = localStorage.getItem(PENDING_MUSCLE_MAP_KEY)
    if (pending) {
      try {
        const payload = JSON.parse(pending)
        addExerciseFromMuscleMap(payload)
      } catch (err) {
        console.error('Failed to read pending muscle map entry', err)
      } finally {
        localStorage.removeItem(PENDING_MUSCLE_MAP_KEY)
      }
    }
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pf_open_log_modal', handleOpenLogModal)
  }
})

function syncWorkouts(next) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey.value, JSON.stringify(next))
  window.dispatchEvent(new Event('pf_logs_updated'))
}

const muscleGroups = computed(() => muscleGroupOptions.map((option) => option.value))

function buildInitials(text) {
  if (!text) return ''
  return text
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toLowerCase?.() || '')
    .join('')
}

function wordStartsWith(text, keyword) {
  if (!text || !keyword) return false
  return text
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .some((part) => part.startsWith(keyword))
}

function applySearch() {
  searchQuery.value = searchInput.value.trim()
}

const filteredWorkouts = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  return workouts.value.filter((item) => {
    if (keyword) {
      const title = (item.title || '').toLowerCase()
      const subtitle = (item.subtitle || '').toLowerCase()
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).toLowerCase()) : []
      const initials = buildInitials(title)
      const tagInitials = tags.map((tag) => buildInitials(tag)).join('')
      const match =
        title.includes(keyword) ||
        subtitle.includes(keyword) ||
        tags.some((tag) => tag.includes(keyword)) ||
        initials.includes(keyword) ||
        tagInitials.includes(keyword) ||
        wordStartsWith(title, keyword) ||
        tags.some((tag) => tag.startsWith(keyword))
      if (!match) return false
    }
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) return false

    if (selectedGroup.value !== 'all') {
      const tags = item.tags || []
      if (!tags.includes(selectedGroup.value)) return false
    }

    if (dateRange.value !== 'all') {
      const date = new Date(item.date)
      if (Number.isNaN(date.getTime())) return false
      const now = new Date()
      let start = new Date(now)
      let end = new Date(now)

      if (dateRange.value === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      } else if (dateRange.value === 'last30') {
        start.setDate(now.getDate() - 29)
        end = now
      } else if (dateRange.value === 'year') {
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31)
      }

      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      if (date < start || date > end) return false
    }

    return true
  })
})

const emptyTitle = computed(() =>
  workouts.value.length ? 'No matching results found.' : 'No workouts logged yet'
)

const emptyMessage = computed(() =>
  workouts.value.length
    ? 'Try a different keyword or filter.'
    : 'Click "Log Workout" to add your first session.'
)

const locationSuggestions = computed(() => {
  const defaultLocation = (userSettings.value?.workout_default_location || '').trim()
  return buildWorkoutLocationSuggestions(workouts.value, defaultLocation)
})

const muscleGroupOptions = [
  { value: 'Chest', label: 'Chest' },
  { value: 'Back', label: 'Back' },
  { value: 'Legs', label: 'Legs' },
  { value: 'Shoulders', label: 'Shoulders' },
  { value: 'Biceps', label: 'Biceps' },
  { value: 'Triceps', label: 'Triceps' },
  { value: 'Core', label: 'Core' },
  { value: 'Cardio', label: 'Cardio' },
  { value: 'Glutes', label: 'Glutes' },
  { value: 'Hamstrings', label: 'Hamstrings' },
  { value: 'Quads', label: 'Quads' },
  { value: 'Calves', label: 'Calves' },
  { value: 'Lower Back', label: 'Lower Back' },
  { value: 'Upper Back', label: 'Upper Back' },
  { value: 'Rear Delts', label: 'Rear Delts' },
  { value: 'Traps', label: 'Traps' },
  { value: 'Forearms', label: 'Forearms' },
  { value: 'Arms', label: 'Arms' },
  { value: 'Grip', label: 'Grip' },
  { value: 'Full Body', label: 'Full Body' },
  { value: 'Plyometrics', label: 'Plyometrics' }
]

const prCount = computed(() => {
  const current = form.exercises.filter((exercise) => exercise.name)
  if (!current.length) return 0

  const history = workouts.value.flatMap((workout) => workout.exercises || [])
  let count = 0

  current.forEach((exercise) => {
    const matches = history.filter((entry) => entry.name === exercise.name)
    const weight = Number(exercise.weight) || 0
    const reps = Number(exercise.reps) || 0
    const sets = Number(exercise.sets) || 0

    if (!matches.length) {
      if (weight || reps || sets) count += 1
      return
    }

    const maxWeight = Math.max(...matches.map((entry) => Number(entry.weight) || 0))
    const maxReps = Math.max(...matches.map((entry) => Number(entry.reps) || 0))
    const maxSets = Math.max(...matches.map((entry) => Number(entry.sets) || 0))

    if (weight > maxWeight || reps > maxReps || sets > maxSets) {
      count += 1
    }
  })

  return count
})

watch(
  () => form.exercises.map((exercise) => exercise.name),
  () => {
    form.exercises.forEach((exercise) => {
      if (!exercise.name) {
        exercise.tags = []
        return
      }
      const groups = workoutGroupMap[exercise.name]
      if (groups?.length) {
        exercise.tags = [...groups]
      }
    })
  },
  { deep: true }
)

function formatDate(dateValue) {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return dateValue
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(date)
}

function formatDay(dateValue) {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
}

function openMuscleMap() {
  router.push({ name: 'muscle-map' })
}

function openForm(options = {}) {
  const { preserve = false } = options
  showForm.value = true
  if (!preserve) resetForm()
}

function closeForm() {
  showForm.value = false
  resetForm()
}

function getRpeSuggestion(rpe) {
  if (rpe <= 3) return { sets: 2, reps: 12, weight: 20 }
  if (rpe <= 5) return { sets: 3, reps: 10, weight: 30 }
  if (rpe <= 7) return { sets: 4, reps: 8, weight: 40 }
  if (rpe <= 9) return { sets: 4, reps: 6, weight: 50 }
  return { sets: 5, reps: 5, weight: 60 }
}

function getRpeLabel(rpe) {
  if (rpe <= 3) return 'Easy'
  if (rpe <= 5) return 'Moderate'
  if (rpe <= 7) return 'Hard'
  if (rpe <= 9) return 'Very hard'
  return 'Max effort'
}

function splitDurationMinutes(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0)
  return {
    hours: Math.floor(safeMinutes / 60),
    minutes: safeMinutes % 60
  }
}

function getWorkoutDefaults() {
  const { hours, minutes } = splitDurationMinutes(
    userSettings.value?.workout_default_duration_min || 60
  )
  const defaultLocation = (userSettings.value?.workout_default_location || '').trim()
  return {
    location: getLatestWorkoutLocation(workouts.value, defaultLocation),
    rpe: Number(userSettings.value?.workout_default_rpe) || 6,
    durationHours: hours,
    durationMinutes: minutes
  }
}

function estimateRpeFromExercise(exercise) {
  const sets = Number(exercise.sets) || 0
  const reps = Number(exercise.reps) || 0
  const weight = Number(exercise.weight) || 0
  if (!sets && !reps && !weight) return null
  const score = sets * reps * (weight || 5)
  const estimated = Math.round(score / 200)
  return Math.min(10, Math.max(1, estimated))
}

function resetForm() {
  const defaults = getWorkoutDefaults()
  form.date = todayDate
  form.location = defaults.location
  form.exercises = []
}

function addWorkout() {
  const namedExercises = form.exercises.filter((exercise) => exercise.name)
  if (!namedExercises.length) return
  let hasDurationError = false
  namedExercises.forEach((exercise) => {
    const hours = Number(exercise.durationHours) || 0
    const minutes = Number(exercise.durationMinutes) || 0
    if (hours === 0 && minutes === 0) {
      exercise.durationError = DURATION_REQUIRED
      hasDurationError = true
    } else {
      exercise.durationError = ''
    }
  })
  if (hasDurationError) return
  const title =
    namedExercises.length === 1
      ? namedExercises[0].name
      : `${namedExercises[0].name} + ${namedExercises.length - 1}`
  const subtitleParts = []
  if (form.location) subtitleParts.push(form.location)
  if (namedExercises.length) subtitleParts.push(`${namedExercises.length} Exercises`)
  const subtitle = subtitleParts.join(' - ') || 'Workout Session'

  const tags = Array.from(
    new Set(namedExercises.flatMap((exercise) => exercise.tags || []))
  )

  const totalMinutes = namedExercises.reduce((sum, exercise) => {
    const hours = Number(exercise.durationHours) || 0
    const minutes = Number(exercise.durationMinutes) || 0
    return sum + hours * 60 + minutes
  }, 0)
  const durationDisplay = totalMinutes
    ? [
        Math.floor(totalMinutes / 60) ? `${Math.floor(totalMinutes / 60)}h` : '',
        totalMinutes % 60 ? `${totalMinutes % 60}m` : ''
      ]
        .filter(Boolean)
        .join(' ')
    : ''

  const exercises = namedExercises.map((exercise) => ({
    name: exercise.name,
    sets: exercise.sets || 0,
    reps: exercise.reps || 0,
    weight: exercise.weight || 0,
    rpe: exercise.rpe || 0,
    durationHours: exercise.durationHours || 0,
    durationMinutes: exercise.durationMinutes || 0,
    tags: exercise.tags || []
  }))

  const entry = {
    id: Date.now(),
    date: form.date,
    title,
    subtitle,
    duration: durationDisplay,
    tags,
    location: form.location,
    exercises,
    prs: prCount.value,
    status: userSettings.value?.workout_auto_mark_completed ? 'completed' : 'pending'
  }

  workouts.value = [entry, ...workouts.value]
  syncWorkouts(workouts.value)
  resetForm()
  closeForm()
}

function createExerciseEntry(overrides = {}) {
  const defaults = getWorkoutDefaults()
  const defaultRpe = defaults.rpe
  const suggestion = getRpeSuggestion(defaultRpe)
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    groupFilter: '',
    name: '',
    sets: suggestion.sets,
    reps: suggestion.reps,
    weight: suggestion.weight,
    rpe: defaultRpe,
    durationHours: defaults.durationHours,
    durationMinutes: defaults.durationMinutes,
    durationError: '',
    tags: [],
    _syncing: false,
    ...overrides
  }
}

function addExercise() {
  form.exercises.push(createExerciseEntry())
}

function addExerciseFromMuscleMap(payload) {
  if (!payload?.exercise) return
  const rawMuscle =
    payload.muscle?.name ||
    payload.muscle?.label ||
    payload.exercise.primaryMuscle?.name ||
    payload.exercise.primaryMuscle ||
    payload.exercise.muscle ||
    payload.exercise.mainMuscle ||
    ''
  const muscleGroup = normalizeMuscleGroup(rawMuscle)
  const name = registerWorkoutOption(payload.exercise.name || payload.exercise.title || '', [
    muscleGroup
  ])
  const entry = createExerciseEntry({
    groupFilter: muscleGroup || '',
    name,
    tags: muscleGroup ? [muscleGroup] : []
  })

  if (!showForm.value) {
    openForm()
  } else {
    openForm({ preserve: true })
  }

  form.exercises.push(entry)
}

function removeExercise(index) {
  form.exercises.splice(index, 1)
}

function onExerciseRpeChange(exercise) {
  if (!exercise) return
  exercise._syncing = true
  const suggestion = getRpeSuggestion(exercise.rpe || 1)
  exercise.sets = suggestion.sets
  exercise.reps = suggestion.reps
  exercise.weight = suggestion.weight
  setTimeout(() => {
    exercise._syncing = false
  }, 0)
}

function onExerciseFieldsChange(exercise) {
  if (!exercise || exercise._syncing) return
  const estimated = estimateRpeFromExercise(exercise)
  if (!estimated) return
  exercise._syncing = true
  exercise.rpe = estimated
  setTimeout(() => {
    exercise._syncing = false
  }, 0)
}

function clearDurationError(exercise) {
  if (!exercise) return
  exercise.durationError = ''
}

function workoutOptions(exercise) {
  const base = exercise?.groupFilter
    ? workoutNames.value.filter((name) => workoutGroupMap[name]?.includes(exercise.groupFilter))
    : workoutNames.value
  if (exercise?.name && !base.includes(exercise.name)) {
    return [exercise.name, ...base]
  }
  return base
}

function onExerciseGroupChange(exercise) {
  if (!exercise) return
  const options = workoutOptions(exercise)
  if (exercise.name && !options.includes(exercise.name)) {
    exercise.name = ''
    exercise.tags = []
  }
}

function toggleCompleted(id) {
  workouts.value = workouts.value.map((item) => {
    if (item.id !== id) return item
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed'
    return { ...item, status: nextStatus }
  })
  syncWorkouts(workouts.value)
}

function deleteWorkout(id) {
  workouts.value = workouts.value.filter((item) => item.id !== id)
  syncWorkouts(workouts.value)
}


function setEnglishValidity(event, message = ENGLISH_REQUIRED) {
  if (!event?.target) return
  event.target.setCustomValidity(message)
}

function clearValidity(event) {
  if (!event?.target) return
  event.target.setCustomValidity('')
}

function normalizeMuscleGroup(value) {
  if (!value) return ''
  const cleaned = String(value).trim().toLowerCase()
  const normalized = cleaned.replace(/[_-]/g, ' ')
  const aliases = {
    abs: 'Core',
    abdominal: 'Core',
    abdominals: 'Core',
    core: 'Core',
    oblique: 'Core',
    obliques: 'Core',
    glute: 'Glutes',
    glutes: 'Glutes',
    quad: 'Quads',
    quads: 'Quads',
    quadriceps: 'Quads',
    hamstring: 'Hamstrings',
    hamstrings: 'Hamstrings',
    calf: 'Calves',
    calves: 'Calves',
    tibialis: 'Calves',
    'upper back': 'Back',
    'lower back': 'Back',
    'upper-back': 'Back',
    'lower-back': 'Back',
    traps: 'Back',
    trapezius: 'Back',
    lats: 'Back',
    lat: 'Back',
    shoulder: 'Shoulders',
    shoulders: 'Shoulders',
    deltoid: 'Shoulders',
    deltoids: 'Shoulders',
    bicep: 'Biceps',
    biceps: 'Biceps',
    tricep: 'Triceps',
    triceps: 'Triceps',
    chest: 'Chest',
    back: 'Back'
  }
  if (aliases[cleaned]) return aliases[cleaned]
  if (aliases[normalized]) return aliases[normalized]
  const match = muscleGroupOptions.find(
    (option) => option.value.toLowerCase() === cleaned
  )
  return match ? match.value : ''
}

function normalizeWorkoutName(name) {
  if (!name) return ''
  const chineseIndex = name.search(/[\u4e00-\u9fff]/)
  if (chineseIndex > 0) {
    return name.slice(0, chineseIndex).trim()
  }
  return name.trim()
}

const workoutNames = ref(
  [
  'Bench Press',
  'Incline Bench Press',
  'Decline Bench Press',
  'Dumbbell Press',
  'Push Up',
  'Chest Fly',
  'Cable Fly',
  'Pull Up',
  'Chin Up',
  'Lat Pulldown',
  'Seated Row',
  'Barbell Row',
  'Dumbbell Row',
  'Deadlift',
  'Romanian Deadlift',
  'Back Extension',
  'Squat',
  'Front Squat',
  'Goblet Squat',
  'Leg Press',
  'Lunge',
  'Walking Lunge',
  'Bulgarian Split Squat',
  'Leg Extension',
  'Leg Curl',
  'Calf Raise',
  'Hip Thrust',
  'Glute Bridge',
  'Shoulder Press',
  'Dumbbell Shoulder Press',
  'Lateral Raise',
  'Front Raise',
  'Rear Delt Fly',
  'Upright Row',
  'Bicep Curl',
  'Hammer Curl',
  'Tricep Pushdown',
  'Tricep Dip',
  'Skullcrusher',
  'Overhead Tricep Extension',
  'Plank',
  'Crunch',
  'Leg Raise',
  'Russian Twist',
  'Bicycle Crunch',
  'Mountain Climber',
  'Burpee',
  'Kettlebell Swing',
  'Rowing Machine',
  'Treadmill Run',
  'Cycling',
  'Jump Rope',
  'Stair Climber',
  'Battle Ropes',
  'Farmer Carry',
  'Clean and Press',
  'Snatch',
  'Box Jump',
  'Sled Push',
  'Medicine Ball Slam'
]
  .map(normalizeWorkoutName)
  .filter((name, index, list) => name && list.indexOf(name) === index)
)

function registerWorkoutOption(name, groups = []) {
  const normalizedName = normalizeWorkoutName(name)
  if (!normalizedName) return ''

  if (!workoutNames.value.includes(normalizedName)) {
    workoutNames.value = [...workoutNames.value, normalizedName]
  }

  const nextGroups = Array.isArray(groups)
    ? groups.map((group) => normalizeMuscleGroup(group)).filter(Boolean)
    : []

  if (!workoutGroupMap[normalizedName]) {
    workoutGroupMap[normalizedName] = []
  }

  nextGroups.forEach((group) => {
    if (!workoutGroupMap[normalizedName].includes(group)) {
      workoutGroupMap[normalizedName].push(group)
    }
  })

  return normalizedName
}

function syncWorkoutOptionsFromHistory() {
  workouts.value.forEach((workout) => {
    const entries = Array.isArray(workout?.exercises) ? workout.exercises : []
    entries.forEach((exercise) => {
      const groups = Array.isArray(exercise?.tags) ? exercise.tags : []
      registerWorkoutOption(exercise?.name || '', groups)
    })
  })
}

watch(
  workouts,
  () => {
    syncWorkoutOptionsFromHistory()
  },
  { deep: true, immediate: true }
)
</script>

<style scoped>
.logs-page {
  padding: 36px clamp(20px, 4vw, 48px) 60px;
  display: grid;
  gap: 28px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: clamp(28px, 3.4vw, 36px);
}

.page-header p {
  margin: 0;
  color: var(--text-muted);
}

.btn {
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

.btn svg {
  width: 16px;
  height: 16px;
}

.btn.small {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 10px;
}

.btn.primary {
  background: var(--accent);
  color: #fff;
  border-color: transparent;
}

.btn.ghost {
  background: var(--surface);
  color: var(--text-primary);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.btn.is-loading {
  position: relative;
  color: transparent;
}

.btn.is-loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

.filters {
  display: grid;
  grid-template-columns: minmax(200px, 360px) repeat(3, minmax(160px, 220px));
  gap: 16px;
  animation: fadeUp 0.6s ease both;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-soft);
  max-width: 360px;
}

.search svg {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.search input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 14px;
  color: inherit;
  padding-right: 34px;
}

.search-button {
  position: absolute;
  right: 10px;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: var(--surface-muted);
  color: var(--text-primary);
  font-size: 13px;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--border);
}

.search-button:hover {
  background: var(--surface);
}

.search input::placeholder {
  color: var(--text-muted);
}

.select {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  font-weight: 600;
  color: var(--text-primary);
  box-shadow: var(--shadow-soft);
}

.select select {
  appearance: none;
  border: none;
  background: transparent;
  padding: 12px 36px 12px 14px;
  font-weight: 600;
  font-size: 14px;
  color: inherit;
  width: 100%;
}

.select-icon {
  position: absolute;
  right: 12px;
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  pointer-events: none;
}

.select svg {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.table-card {
  background: var(--surface);
  border-radius: 20px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
  animation: fadeUp 0.6s ease 0.08s both;
}

.table-row {
  display: grid;
  grid-template-columns: 140px minmax(220px, 1.2fr) 120px minmax(180px, 1fr) 120px;
  gap: 12px;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.table-head {
  background: var(--surface-muted);
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.date strong {
  display: block;
  font-size: 14px;
}

.date span {
  font-size: 12px;
  color: var(--text-muted);
}

.details strong {
  font-size: 14px;
}

.details p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.metric {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.metric-icon {
  width: 16px;
  height: 16px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  font-weight: 600;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.row-action {
  border: none;
  background: var(--surface-soft);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  color: var(--text-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.row-action svg {
  width: 18px;
  height: 18px;
}

.row-action:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.row-action.active {
  background: #dcfce7;
  color: #15803d;
}

.table-row.completed .details strong {
  color: #0f766e;
}

.row-action.danger {
  background: #fee2e2;
  color: #b91c1c;
}


.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  font-size: 13px;
  color: var(--text-muted);
}

.pager {
  display: flex;
  gap: 8px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 20px;
  border-bottom: 1px solid var(--border);
}

.empty-state h3 {
  margin: 0 0 6px;
  font-size: 16px;
}

.empty-state p {
  margin: 0;
  color: var(--text-muted);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 40;
}

.modal-card {
  width: min(880px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  background: var(--surface);
  border-radius: 20px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-strong);
  padding: 24px;
  display: grid;
  gap: 20px;
}

.modal-card header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.modal-card h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.modal-card p {
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.field {
  display: grid;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field span {
  font-weight: 600;
}

.span-2 {
  grid-column: span 2;
}

.range-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.range-meta strong {
  font-size: 14px;
  color: var(--text-primary);
}

.field input,
.field select {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  background: var(--surface);
  color: var(--text-primary);
}

.field input::placeholder {
  color: var(--text-muted);
}

.duration-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.duration-field {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  overflow: hidden;
  min-height: 48px;
}

.duration-field input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 14px;
  font-size: 15px;
  color: inherit;
  min-width: 0;
}

.duration-field span {
  padding: 0 14px 0 0;
  min-width: 36px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}

.field-error {
  margin-top: 6px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 8px;
  background: #fee2e2;
  display: inline-block;
}

.muted {
  color: var(--text-muted);
  font-size: 12px;
  margin: 0;
}

.exercise-list {
  display: grid;
  gap: 12px;
}

.exercise-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  background: var(--surface-soft);
  display: grid;
  gap: 12px;
}

.exercise-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.exercise-header select {
  flex: 1;
}

.exercise-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(100px, 1fr));
  gap: 10px;
}

.exercise-fields label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.exercise-fields input {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
  background: var(--surface);
  color: var(--text-primary);
}

.exercise-rpe {
  display: grid;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.exercise-rpe input[type='range'] {
  width: 100%;
}

.exercise-meta {
  display: grid;
  gap: 6px;
  margin-top: 6px;
}

.exercise-meta label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.icon-btn {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 10px;
  width: 30px;
  height: 30px;
  font-size: 14px;
  color: var(--text-muted);
  cursor: pointer;
}

.tag-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-option {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 12px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-option:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.tag-option.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.exercise-group {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.exercise-group select {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
  background: var(--surface);
  color: var(--text-primary);
}

.pr-card {
  justify-content: space-between;
}

.pr-display {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 700;
}

.pr-display .trophy {
  font-size: 16px;
}

.pr-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}

.field.full {
  grid-column: 1 / -1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 1100px) {
  .table-card {
    overflow-x: auto;
  }

  .table-row {
    min-width: 780px;
  }
}

@media (max-width: 820px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .empty-state {
    flex-direction: column;
    align-items: flex-start;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
