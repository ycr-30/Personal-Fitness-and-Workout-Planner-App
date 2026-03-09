<template>
  <section class="schedule-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Execution Calendar</p>
        <h1>Schedule</h1>
        <p class="subtitle">Plan sessions, execute today, and track completion in one calendar view.</p>
      </div>
      <div class="header-actions">
        <article class="today-chip">
          <span>Today</span>
          <strong>{{ todayCompleted }}/{{ todayTotal }} completed</strong>
          <small>{{ todayMinutes }} min planned</small>
        </article>
        <button class="btn primary" type="button" @click="openCreateModal(todayIso)">+ Add Today</button>
      </div>
    </header>

    <section class="metric-strip">
      <article class="metric-card">
        <span>Overdue</span>
        <strong>{{ overdueCount }}</strong>
        <small>Pending before today</small>
      </article>
      <article class="metric-card">
        <span>Current Streak</span>
        <strong>{{ completionStreak }} days</strong>
        <small>Consecutive completion days</small>
      </article>
      <article class="metric-card">
        <span>Month Completion</span>
        <strong>{{ monthCompletionRate }}%</strong>
        <small>{{ monthCompleted }} / {{ monthPlanned }} sessions</small>
      </article>
    </section>

    <section class="layout-grid">
      <article class="card calendar-card">
        <div class="calendar-toolbar">
          <button class="icon-btn" type="button" @click="goPrevMonth">‹</button>
          <h2>{{ calendarTitle }}</h2>
          <button class="icon-btn" type="button" @click="goNextMonth">›</button>
          <button class="btn ghost small" type="button" @click="jumpToToday">Today</button>
        </div>

        <div class="week-head">
          <span v-for="day in weekDays" :key="day">{{ day }}</span>
        </div>

        <div class="calendar-grid">
          <template v-for="(cell, index) in calendarCells" :key="cell ? cell.key : `empty-${index}`">
            <button
              v-if="cell"
              class="day-cell"
              :class="{
                selected: cell.isSelected,
                today: cell.isToday,
                rest: cell.isRest,
                active: cell.stats.total > 0
              }"
              type="button"
              @click="selectDate(cell.date)"
            >
              <span class="day-num">{{ cell.label }}</span>
              <span v-if="cell.isRest && cell.stats.total === 0" class="day-rest">Rest</span>
              <span v-else-if="cell.stats.total > 0" class="day-stats">
                <em class="done">{{ cell.stats.completed }}</em>
                <em class="pending">{{ cell.stats.pending }}</em>
              </span>
            </button>
            <div v-else class="day-cell empty"></div>
          </template>
        </div>
      </article>

      <article class="card day-card">
        <header class="day-header">
          <div>
            <h2>{{ selectedDateLabel }}</h2>
            <p>{{ selectedSummary }}</p>
          </div>
          <div class="day-actions">
            <button class="btn ghost small" type="button" @click="openCreateModal(selectedDateIso)">
              Add Session
            </button>
            <button class="btn ghost small" type="button" @click="toggleRestDayForSelected">
              {{ selectedIsRest ? 'Clear Rest Day' : 'Mark Rest Day' }}
            </button>
          </div>
        </header>

        <div class="session-list">
          <article v-for="item in selectedDayLogs" :key="item.id" class="session-item" :class="{ completed: item.status === 'completed' }">
            <div class="session-main">
              <button
                class="check-btn"
                type="button"
                :aria-pressed="item.status === 'completed'"
                :title="item.status === 'completed' ? 'Mark as pending' : 'Mark as completed'"
                @click="toggleWorkoutStatus(item.id)"
              >
                ✓
              </button>
              <div class="session-copy">
                <strong>{{ item.title || 'Workout Session' }}</strong>
                <p>{{ buildSessionSubtitle(item) }}</p>
                <div class="tags">
                  <span v-for="tag in item.tags" :key="`${item.id}-${tag}`">{{ tag }}</span>
                </div>
              </div>
            </div>
            <div class="session-side">
              <span>{{ item.duration || '--' }}</span>
              <div class="mini-actions">
                <button class="mini-btn" type="button" @click="openMoveModal(item)">Move</button>
                <button class="mini-btn danger" type="button" @click="removeWorkout(item.id)">Delete</button>
              </div>
            </div>
          </article>

          <p v-if="selectedDayLogs.length === 0" class="empty-tip">
            {{ selectedIsRest ? 'Rest day marked. No sessions planned.' : 'No sessions planned for this date.' }}
          </p>
        </div>
      </article>
    </section>

    <transition name="fade">
      <div v-if="showCreateModal" class="modal-backdrop" @click.self="closeCreateModal">
        <form class="modal-card create-modal-card" @submit.prevent="saveCreateSession">
          <header>
            <div>
              <h2>Add Session</h2>
              <p>Build this session with the same workout form used in Workout Log.</p>
            </div>
            <button class="close-btn" type="button" @click="closeCreateModal">X</button>
          </header>

          <div class="form-grid">
            <label class="field">
              <span>Date</span>
              <input v-model="createForm.date" type="date" required />
            </label>
            <label class="field span-2">
              <span>Location</span>
              <input
                v-model.trim="createForm.location"
                type="text"
                placeholder="Gold's Gym"
                list="schedule-location-suggestions"
              />
              <datalist id="schedule-location-suggestions">
                <option v-for="place in locationSuggestions" :key="place" :value="place" />
              </datalist>
            </label>
            <div class="field pr-card">
              <span>PRs / Records</span>
              <div class="pr-display">
                <span class="trophy">🏆</span>
                <strong>{{ schedulePrCount }}</strong>
                <span class="pr-label">PRs</span>
              </div>
            </div>
            <div class="field full">
              <div class="builder-head">
                <span>Exercises</span>
                <button class="btn ghost small" type="button" @click="addScheduleExercise">
                  + Add exercise
                </button>
              </div>
              <div class="exercise-list">
                <p v-if="createForm.exercises.length === 0" class="muted">No exercises added yet.</p>
                <div
                  v-for="(exercise, index) in createForm.exercises"
                  :key="exercise.id"
                  class="exercise-card"
                >
                  <label class="exercise-group">
                    <span>Muscle Group</span>
                    <select v-model="exercise.groupFilter" @change="onScheduleExerciseGroupChange(exercise)">
                      <option value="">All groups</option>
                      <option v-for="option in muscleGroupOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </label>
                  <div class="exercise-header">
                    <select v-model="exercise.name">
                      <option value="" disabled>Select exercise...</option>
                      <option v-for="name in scheduleWorkoutOptions(exercise)" :key="name" :value="name">{{ name }}</option>
                    </select>
                    <button class="exercise-remove-btn" type="button" @click="removeScheduleExercise(index)">✕</button>
                  </div>
                  <div class="exercise-fields">
                    <label>
                      <span>Sets</span>
                      <input
                        v-model.number="exercise.sets"
                        type="number"
                        min="1"
                        placeholder="3"
                        @input="onScheduleExerciseFieldsChange(exercise)"
                      />
                    </label>
                    <label>
                      <span>Reps</span>
                      <input
                        v-model.number="exercise.reps"
                        type="number"
                        min="1"
                        placeholder="10"
                        @input="onScheduleExerciseFieldsChange(exercise)"
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
                        @input="onScheduleExerciseFieldsChange(exercise)"
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
                            @input="clearScheduleDurationError(exercise)"
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
                            @input="clearScheduleDurationError(exercise)"
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
                      @input="onScheduleExerciseRpeChange(exercise)"
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
            <button class="btn ghost" type="button" @click="closeCreateModal">Cancel</button>
            <button class="btn primary" type="submit">Save Session</button>
          </footer>
        </form>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showMoveModal" class="modal-backdrop" @click.self="closeMoveModal">
        <form class="modal-card compact" @submit.prevent="applyMove">
          <header>
            <h3>Reschedule Session</h3>
            <button class="close-btn" type="button" @click="closeMoveModal">X</button>
          </header>
          <label class="field">
            <span>New date</span>
            <input v-model="moveDate" type="date" required />
          </label>
          <footer class="modal-actions">
            <button class="btn ghost" type="button" @click="closeMoveModal">Cancel</button>
            <button class="btn primary" type="submit">Move</button>
          </footer>
        </form>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getUserStorageKey } from '@/lib/userStorage'

const auth = useAuthStore()
const logsKey = computed(() => getUserStorageKey('pf_workout_logs', auth.user))
const restKey = computed(() => getUserStorageKey('pf_rest_days', auth.user))

const logs = ref([])
const restDays = ref(new Set())
const calendarMonth = ref(new Date())
const selectedDate = ref(new Date())

const showCreateModal = ref(false)
const showMoveModal = ref(false)
const movingWorkoutId = ref(null)
const moveDate = ref('')
const DURATION_REQUIRED = 'Please enter training time.'

const createForm = reactive({
  date: '',
  location: '',
  exercises: []
})

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const locationSuggestions = ["Gold's Gym", 'Home', 'Uni Gym']
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
const workoutGroupMap = {
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
}

function parseLocalDate(value) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((item) => String(item).trim()).filter(Boolean)
  if (typeof tags === 'string') {
    return tags.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function normalizeWorkout(item) {
  return {
    id: item?.id ?? Date.now(),
    date: item?.date || toIsoDate(new Date()),
    title: item?.title || 'Workout Session',
    subtitle: item?.subtitle || '',
    duration: item?.duration || '',
    tags: normalizeTags(item?.tags),
    location: item?.location || '',
    exercises: Array.isArray(item?.exercises) ? item.exercises : [],
    prs: Number(item?.prs) || 0,
    status: item?.status === 'completed' ? 'completed' : 'pending'
  }
}

function loadLogs() {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(logsKey.value)
  if (!raw) {
    logs.value = []
    return
  }
  try {
    const data = JSON.parse(raw)
    logs.value = Array.isArray(data) ? data.map((item) => normalizeWorkout(item)) : []
  } catch (error) {
    console.error('Failed to parse workout logs', error)
    logs.value = []
  }
}

function loadRestDays() {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(restKey.value)
  if (!raw) {
    restDays.value = new Set()
    return
  }
  try {
    const data = JSON.parse(raw)
    restDays.value = Array.isArray(data) ? new Set(data) : new Set()
  } catch (error) {
    console.error('Failed to parse rest days', error)
    restDays.value = new Set()
  }
}

function saveLogs(next) {
  logs.value = next
  if (typeof window === 'undefined') return
  localStorage.setItem(logsKey.value, JSON.stringify(next))
  window.dispatchEvent(new Event('pf_logs_updated'))
}

function saveRestDays() {
  if (typeof window === 'undefined') return
  localStorage.setItem(restKey.value, JSON.stringify(Array.from(restDays.value)))
  window.dispatchEvent(new Event('pf_rest_updated'))
}

function handleStorage(event) {
  if (!event || event.key === logsKey.value || event.key === restKey.value) {
    loadLogs()
    loadRestDays()
  }
}

const todayIso = computed(() => toIsoDate(new Date()))
const selectedDateIso = computed(() => toIsoDate(selectedDate.value))

const dayStatsMap = computed(() => {
  const map = new Map()
  logs.value.forEach((item) => {
    const key = item.date
    if (!key) return
    if (!map.has(key)) {
      map.set(key, { total: 0, completed: 0, pending: 0 })
    }
    const stats = map.get(key)
    stats.total += 1
    if (item.status === 'completed') stats.completed += 1
    else stats.pending += 1
  })
  return map
})

const calendarTitle = computed(() =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calendarMonth.value)
)

const calendarCells = computed(() => {
  const year = calendarMonth.value.getFullYear()
  const month = calendarMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day)
    const key = toIsoDate(date)
    const stats = dayStatsMap.value.get(key) || { total: 0, completed: 0, pending: 0 }
    cells.push({
      key,
      date,
      label: day,
      stats,
      isRest: restDays.value.has(key),
      isToday: key === todayIso.value,
      isSelected: key === selectedDateIso.value
    })
  }

  while (cells.length < 42) cells.push(null)
  return cells
})

const selectedDayLogs = computed(() =>
  logs.value
    .filter((item) => item.date === selectedDateIso.value)
    .sort((a, b) => {
      if (a.status === b.status) return String(a.title || '').localeCompare(String(b.title || ''))
      return a.status === 'completed' ? 1 : -1
    })
)

const selectedIsRest = computed(() => restDays.value.has(selectedDateIso.value))

const selectedDateLabel = computed(() =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(selectedDate.value)
)

const selectedSummary = computed(() => {
  const stats = dayStatsMap.value.get(selectedDateIso.value) || { total: 0, completed: 0, pending: 0 }
  if (selectedIsRest.value && stats.total === 0) return 'Rest day scheduled.'
  if (!stats.total) return 'No sessions planned.'
  return `${stats.completed}/${stats.total} completed · ${stats.pending} pending`
})

const todayStats = computed(() => dayStatsMap.value.get(todayIso.value) || { total: 0, completed: 0, pending: 0 })
const todayTotal = computed(() => todayStats.value.total)
const todayCompleted = computed(() => todayStats.value.completed)

function parseDurationToMinutes(value) {
  if (!value) return 0
  const text = String(value)
  const hoursMatch = text.match(/(\d+)\s*h/i)
  const minsMatch = text.match(/(\d+)\s*m/i)
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0
  const mins = minsMatch ? Number(minsMatch[1]) : 0
  return hours * 60 + mins
}

const todayMinutes = computed(() => {
  return logs.value
    .filter((item) => item.date === todayIso.value)
    .reduce((sum, item) => sum + parseDurationToMinutes(item.duration), 0)
})

const overdueCount = computed(() => {
  return logs.value.filter((item) => item.status !== 'completed' && item.date < todayIso.value).length
})

const monthStats = computed(() => {
  const year = calendarMonth.value.getFullYear()
  const month = calendarMonth.value.getMonth()
  const items = logs.value.filter((item) => {
    const date = parseLocalDate(item.date)
    return date && date.getFullYear() === year && date.getMonth() === month
  })
  const total = items.length
  const completed = items.filter((item) => item.status === 'completed').length
  return { total, completed }
})

const monthPlanned = computed(() => monthStats.value.total)
const monthCompleted = computed(() => monthStats.value.completed)
const monthCompletionRate = computed(() => {
  if (!monthPlanned.value) return 0
  return Math.round((monthCompleted.value / monthPlanned.value) * 100)
})

const scheduleWorkoutNames = computed(() => {
  const names = new Set(Object.keys(workoutGroupMap))
  logs.value.forEach((item) => {
    const entries = Array.isArray(item?.exercises) ? item.exercises : []
    entries.forEach((exercise) => {
      const name = String(exercise?.name || '').trim()
      if (name) names.add(name)
    })
  })
  return Array.from(names)
})

const schedulePrCount = computed(() => {
  const current = createForm.exercises.filter((exercise) => exercise.name)
  if (!current.length) return 0

  const history = logs.value.flatMap((workout) => workout.exercises || [])
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

    if (weight > maxWeight || reps > maxReps || sets > maxSets) count += 1
  })

  return count
})

const completionStreak = computed(() => {
  const completedDates = new Set(
    logs.value.filter((item) => item.status === 'completed').map((item) => item.date)
  )
  let count = 0
  const cursor = new Date()
  while (completedDates.has(toIsoDate(cursor))) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
})

function buildSessionSubtitle(item) {
  const chunks = [item.subtitle, item.location].map((part) => String(part || '').trim()).filter(Boolean)
  return chunks.join(' · ') || 'Planned workout session'
}

function selectDate(date) {
  selectedDate.value = new Date(date)
}

function goPrevMonth() {
  calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() - 1, 1)
}

function goNextMonth() {
  calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + 1, 1)
}

function jumpToToday() {
  const today = new Date()
  selectedDate.value = today
  calendarMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
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

function estimateRpeFromExercise(exercise) {
  const sets = Number(exercise.sets) || 0
  const reps = Number(exercise.reps) || 0
  const weight = Number(exercise.weight) || 0
  if (!sets && !reps && !weight) return null
  const score = sets * reps * (weight || 5)
  const estimated = Math.round(score / 200)
  return Math.min(10, Math.max(1, estimated))
}

function createScheduleExercise(overrides = {}) {
  const defaultRpe = 6
  const suggestion = getRpeSuggestion(defaultRpe)
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    groupFilter: '',
    name: '',
    sets: suggestion.sets,
    reps: suggestion.reps,
    weight: suggestion.weight,
    rpe: defaultRpe,
    durationHours: '',
    durationMinutes: '',
    durationError: '',
    tags: [],
    _syncing: false,
    ...overrides
  }
}

function addScheduleExercise() {
  createForm.exercises.push(createScheduleExercise())
}

function removeScheduleExercise(index) {
  createForm.exercises.splice(index, 1)
}

function onScheduleExerciseRpeChange(exercise) {
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

function onScheduleExerciseFieldsChange(exercise) {
  if (!exercise || exercise._syncing) return
  const estimated = estimateRpeFromExercise(exercise)
  if (!estimated) return
  exercise._syncing = true
  exercise.rpe = estimated
  setTimeout(() => {
    exercise._syncing = false
  }, 0)
}

function clearScheduleDurationError(exercise) {
  if (!exercise) return
  exercise.durationError = ''
}

function scheduleWorkoutOptions(exercise) {
  const base = exercise?.groupFilter
    ? scheduleWorkoutNames.value.filter((name) => workoutGroupMap[name]?.includes(exercise.groupFilter))
    : scheduleWorkoutNames.value
  if (exercise?.name && !base.includes(exercise.name)) {
    return [exercise.name, ...base]
  }
  return base
}

function onScheduleExerciseGroupChange(exercise) {
  if (!exercise) return
  const options = scheduleWorkoutOptions(exercise)
  if (exercise.name && !options.includes(exercise.name)) {
    exercise.name = ''
    exercise.tags = []
  }
}

function resetCreateForm(defaultDate = selectedDateIso.value) {
  createForm.date = defaultDate
  createForm.location = ''
  createForm.exercises = []
}

function openCreateModal(defaultDate = selectedDateIso.value) {
  resetCreateForm(defaultDate)
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
  resetCreateForm(selectedDateIso.value)
}

function saveCreateSession() {
  const date = createForm.date
  const namedExercises = createForm.exercises.filter((exercise) => exercise.name)
  if (!date || !namedExercises.length) return

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
  if (createForm.location) subtitleParts.push(createForm.location)
  if (namedExercises.length) subtitleParts.push(`${namedExercises.length} Exercises`)
  const subtitle = subtitleParts.join(' - ') || 'Workout Session'

  const tags = Array.from(new Set(namedExercises.flatMap((exercise) => exercise.tags || [])))

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

  const entry = normalizeWorkout({
    id: Date.now(),
    date,
    title,
    subtitle,
    duration: durationDisplay,
    tags,
    location: createForm.location.trim(),
    exercises,
    prs: schedulePrCount.value,
    status: 'pending'
  })

  const next = [entry, ...logs.value].sort((a, b) => (a.date < b.date ? 1 : -1))
  saveLogs(next)

  if (restDays.value.has(date)) {
    restDays.value.delete(date)
    saveRestDays()
  }

  const nextDate = parseLocalDate(date)
  if (nextDate) {
    selectedDate.value = nextDate
    calendarMonth.value = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)
  }
  closeCreateModal()
}

function toggleWorkoutStatus(id) {
  const next = logs.value.map((item) => {
    if (item.id !== id) return item
    return {
      ...item,
      status: item.status === 'completed' ? 'pending' : 'completed'
    }
  })
  saveLogs(next)
}

function removeWorkout(id) {
  const next = logs.value.filter((item) => item.id !== id)
  saveLogs(next)
}

function toggleRestDayForSelected() {
  const key = selectedDateIso.value
  if (restDays.value.has(key)) restDays.value.delete(key)
  else restDays.value.add(key)
  saveRestDays()
}

function openMoveModal(item) {
  movingWorkoutId.value = item.id
  moveDate.value = item.date || selectedDateIso.value
  showMoveModal.value = true
}

function closeMoveModal() {
  showMoveModal.value = false
  movingWorkoutId.value = null
  moveDate.value = ''
}

function applyMove() {
  if (!movingWorkoutId.value || !moveDate.value) return
  const next = logs.value.map((item) =>
    item.id === movingWorkoutId.value ? { ...item, date: moveDate.value } : item
  )
  saveLogs(next)
  const nextDate = parseLocalDate(moveDate.value)
  if (nextDate) {
    selectedDate.value = nextDate
    calendarMonth.value = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)
  }
  closeMoveModal()
}

watch(
  () => createForm.exercises.map((exercise) => exercise.name),
  () => {
    createForm.exercises.forEach((exercise) => {
      if (!exercise.name) {
        exercise.tags = []
        return
      }
      const groups = workoutGroupMap[exercise.name]
      exercise.tags = groups?.length ? [...groups] : []
    })
  },
  { deep: true }
)

watch(
  [logsKey, restKey],
  () => {
    loadLogs()
    loadRestDays()
  },
  { immediate: true }
)

onMounted(() => {
  loadLogs()
  loadRestDays()
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage)
    window.addEventListener('pf_logs_updated', loadLogs)
    window.addEventListener('pf_rest_updated', loadRestDays)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener('pf_logs_updated', loadLogs)
    window.removeEventListener('pf_rest_updated', loadRestDays)
  }
})
</script>

<style scoped>
.schedule-page {
  padding: 34px clamp(20px, 4vw, 52px) 60px;
  display: grid;
  gap: 22px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 700;
}

h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(30px, 3.6vw, 42px);
}

.subtitle {
  margin: 8px 0 0;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.today-chip {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 16px;
  padding: 10px 14px;
  display: grid;
  gap: 2px;
  min-width: 200px;
}

.today-chip span {
  font-size: 12px;
  color: var(--text-muted);
}

.today-chip strong {
  font-size: 15px;
}

.today-chip small {
  font-size: 12px;
  color: var(--text-muted);
}

.btn {
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  padding: 10px 14px;
  font-weight: 600;
}

.btn.small {
  padding: 7px 11px;
  font-size: 12px;
}

.btn.primary {
  background: var(--accent);
  color: #fff;
  border-color: transparent;
}

.btn.ghost {
  background: var(--surface);
}

.metric-strip {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

.metric-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 14px;
  display: grid;
  gap: 4px;
}

.metric-card span {
  color: var(--text-muted);
  font-size: 12px;
}

.metric-card strong {
  font-size: 24px;
}

.metric-card small {
  color: var(--text-muted);
  font-size: 12px;
}

.layout-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
}

.card {
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.calendar-card {
  padding: 16px;
  display: grid;
  gap: 12px;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-toolbar h2 {
  margin: 0;
  font-size: 18px;
  min-width: 180px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-primary);
}

.week-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.week-head span {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.day-cell {
  min-height: 86px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-muted);
  display: grid;
  align-content: space-between;
  gap: 4px;
  padding: 8px;
  text-align: left;
}

.day-cell.empty {
  background: transparent;
  border: 1px dashed rgba(148, 163, 184, 0.25);
}

.day-cell.active {
  background: rgba(239, 68, 68, 0.08);
}

.day-cell.selected {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.day-cell.today {
  outline: 2px solid rgba(239, 68, 68, 0.35);
  outline-offset: -2px;
}

.day-cell.rest {
  background: rgba(14, 116, 144, 0.08);
}

.day-num {
  font-weight: 700;
  font-size: 13px;
}

.day-rest {
  font-size: 11px;
  color: #0e7490;
  font-weight: 700;
}

.day-stats {
  display: flex;
  gap: 6px;
  font-size: 11px;
}

.day-stats em {
  font-style: normal;
  padding: 2px 6px;
  border-radius: 999px;
  font-weight: 700;
}

.day-stats .done {
  background: rgba(34, 197, 94, 0.2);
  color: #166534;
}

.day-stats .pending {
  background: rgba(251, 113, 133, 0.24);
  color: #be123c;
}

.day-card {
  padding: 16px;
  display: grid;
  gap: 14px;
  align-content: start;
}

.day-header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.day-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
}

.day-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.day-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.session-list {
  display: grid;
  gap: 10px;
}

.session-item {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-muted);
  padding: 10px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.session-item.completed {
  opacity: 0.82;
}

.session-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
}

.check-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-weight: 700;
}

.session-item.completed .check-btn {
  background: #22c55e;
  border-color: #22c55e;
  color: #fff;
}

.session-copy strong {
  display: block;
  margin-bottom: 3px;
}

.session-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tags span {
  font-size: 11px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 7px;
  color: var(--text-muted);
}

.session-side {
  display: grid;
  justify-items: end;
  gap: 8px;
  min-width: 86px;
}

.session-side > span {
  font-weight: 600;
  font-size: 12px;
}

.mini-actions {
  display: flex;
  gap: 6px;
}

.mini-btn {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 11px;
  padding: 4px 8px;
}

.mini-btn.danger {
  color: #b91c1c;
  background: #fee2e2;
  border-color: #fecaca;
}

.empty-tip {
  margin: 0;
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 18px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 60;
}

.modal-card {
  width: min(520px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-strong);
  padding: 18px;
  display: grid;
  gap: 12px;
}

.create-modal-card {
  width: min(880px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 24px;
  gap: 20px;
}

.modal-card.compact {
  width: min(380px, 100%);
}

.modal-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-modal-card header {
  gap: 16px;
  align-items: center;
}

.create-modal-card h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.create-modal-card header p {
  margin: 0;
  color: var(--text-muted);
}

.modal-card h3 {
  margin: 0;
}

.close-btn {
  border: none;
  background: var(--surface-soft);
  color: var(--text-muted);
  width: 30px;
  height: 30px;
  border-radius: 9px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}

.modal-card .field input,
.modal-card .field select {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-primary);
  padding: 10px 12px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.create-modal-card .form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.create-modal-card .field {
  gap: 8px;
  font-size: 13px;
}

.create-modal-card .field input,
.create-modal-card .field select {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  background: var(--surface);
  color: var(--text-primary);
}

.create-modal-card .field input::placeholder {
  color: var(--text-muted);
}

.create-modal-card .span-2 {
  grid-column: span 2;
}

.create-modal-card .field.full {
  grid-column: 1 / -1;
}

.builder-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.muted {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
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

.exercise-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.exercise-header select {
  flex: 1;
}

.exercise-remove-btn {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 10px;
  width: 30px;
  height: 30px;
  font-size: 14px;
  color: var(--text-muted);
}

.exercise-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(100px, 1fr));
  gap: 10px;
}

.exercise-fields label,
.exercise-meta label {
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

.exercise-meta {
  display: grid;
  gap: 6px;
  margin-top: 6px;
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1100px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .field-row {
    grid-template-columns: 1fr;
  }

  .create-modal-card .span-2,
  .create-modal-card .field.full {
    grid-column: auto;
  }

  .builder-head,
  .modal-card header {
    align-items: flex-start;
  }

  .exercise-fields,
  .duration-inputs {
    grid-template-columns: 1fr;
  }

  .calendar-grid {
    gap: 4px;
  }

  .day-cell {
    min-height: 72px;
    padding: 6px;
  }
}
</style>
