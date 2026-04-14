<template>
  <section class="dashboard-page">
    <header class="dashboard-hero">
      <div>
        <h1>{{ greeting }}, {{ firstName }}</h1>
        <p class="subtitle">Ready to crush your goals today?</p>
      </div>
      <div class="hero-actions">
        <button class="btn ghost" type="button" @click="openSchedule">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.5" fill="none" />
            <path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          Timetable
        </button>
        <button class="btn primary" type="button" @click="goToLogs">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 5l12 7-12 7z" fill="currentColor" />
          </svg>
          Start Workout
        </button>
      </div>
    </header>

    <section class="stats-grid">
      <article class="stat-card">
        <div class="stat-top">
          <div>
            <p>Current Weight</p>
            <h3>{{ weightDisplay }} <span>kg</span></h3>
          </div>
          <div class="stat-icon weight">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="5" width="12" height="14" rx="3" stroke="currentColor" stroke-width="1.5" fill="none" />
              <circle cx="12" cy="11" r="2.5" fill="currentColor" />
            </svg>
          </div>
        </div>
        <span class="stat-trend" :class="weightTrend.tone">{{ weightTrend.label }}</span>
      </article>
      <article class="stat-card">
        <div class="stat-top">
          <div>
            <p>Calories Burned</p>
            <h3>{{ caloriesDisplay }} <span>kcal</span></h3>
          </div>
          <div class="stat-icon fire">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3c2 3-1 4 2 6 2 2 4 3 4 6a6 6 0 1 1-12 0c0-3 2-5 4-7 1-1 1-3 2-5z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
        <span class="stat-trend" :class="caloriesTrend.tone">{{ caloriesTrend.label }}</span>
      </article>
      <article class="stat-card">
        <div class="stat-top">
          <div>
            <p>Active Minutes</p>
            <h3>{{ minutesDisplay }} <span>min</span></h3>
          </div>
          <div class="stat-icon move">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 4h8l2 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8l2-4z" fill="currentColor" />
              <path d="M9 10h6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </div>
        </div>
        <span class="stat-trend" :class="minutesTrend.tone">{{ minutesTrend.label }}</span>
      </article>
      <article class="stat-card">
        <div class="stat-top">
          <div>
            <p>Streak</p>
            <h3>{{ streakDisplay }} <span>Days</span></h3>
          </div>
          <div class="stat-icon bolt">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor" />
            </svg>
          </div>
        </div>
        <span class="stat-trend neutral">Best: {{ bestStreak }}</span>
      </article>
    </section>

    <section class="dashboard-main">
      <article
        class="chart-card"
        :class="{
          empty: weightVisibleLogCount === 0,
          compact: weightVisibleLogCount > 0 && weightVisibleLogCount < 4
        }"
      >
        <div class="card-header">
          <div>
            <h2>Weight Progression</h2>
            <p>{{ weightHeadline }}</p>
          </div>
          <div class="filter">
            <button class="chip" type="button" @click="toggleWeightFilter">
              {{ activeRangeLabel }}
            </button>
            <div v-if="showWeightFilter" class="filter-menu">
              <button
                v-for="option in weightRangeOptions"
                :key="option.value"
                class="filter-item"
                type="button"
                :class="{ active: weightRange === option.value }"
                @click="selectWeightRange(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
        <p class="chart-status">{{ weightStatusLine }}</p>
        <div class="chart-area">
          <div class="chart-grid">
            <div class="y-axis">
              <span v-for="label in weightChartAxis.yLabels" :key="label">{{ label }}</span>
            </div>
            <div class="chart-plot">
              <svg viewBox="0 0 520 180" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <path
                  :d="weightChart.line"
                  fill="none"
                  stroke="#ef4444"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <circle
                  v-for="point in weightChart.points"
                  :key="point.x"
                  :cx="point.x"
                  :cy="point.y"
                  r="4.5"
                  fill="#fff"
                  stroke="#ef4444"
                  stroke-width="2"
                />
              </svg>
            </div>
          </div>
          <div class="chart-labels x-axis">
            <span v-for="label in weightChartAxis.xLabels" :key="label">{{ label }}</span>
          </div>
        </div>
        <div class="chart-summary">
          <span>{{ weightVisibleLogCount }} logs in visible range</span>
          <span>{{ weightSummaryHint }}</span>
        </div>
      </article>

      <div class="side-stack">
        <article class="workout-card">
          <div class="card-header">
            <div>
              <h2>Today's Workout</h2>
              <p class="accent">{{ todaySummary }}</p>
            </div>
            <div class="more-menu" @click.stop>
              <button class="more" type="button" @click="toggleTodayMenu">...</button>
              <div v-if="showTodayMenu" class="today-menu">
                <button type="button" class="menu-item" @click="logWorkoutQuick">
                  Log workout
                </button>
                <button type="button" class="menu-item" @click="openReschedule">
                  Reschedule
                </button>
                <button type="button" class="menu-item" @click="markRestDay">
                  Mark as rest day
                </button>
                <button type="button" class="menu-item" @click="viewDetails">
                  View details
                </button>
              </div>
            </div>
          </div>
          <div class="task-meta-row">
            <span
              v-for="item in todayWorkoutMetaItems"
              :key="item"
              class="task-meta-pill"
            >
              {{ item }}
            </span>
          </div>
          <div v-if="todayWorkouts.length" class="workout-list">
            <div
              v-for="(item, index) in todayWorkouts"
              :key="item.id || `${item.title}-${item.date}-${index}`"
              class="workout-item"
              :class="{ completed: item.status === 'completed' }"
            >
              <span class="index">{{ index + 1 }}</span>
              <div class="workout-copy">
                <h4>{{ item.title }}</h4>
                <p>Target: {{ item.target }}</p>
                <div class="pill-row">
                  <span v-for="(pill, idx) in item.pills" :key="`${item.id}-${idx}`" class="pill">
                    {{ pill }}
                  </span>
                </div>
              </div>
              <button
                class="check-toggle"
                type="button"
                :aria-pressed="item.status === 'completed'"
                title="Mark as completed"
                @click="toggleWorkoutStatus(item.id)"
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
            </div>
          </div>
          <div v-else class="workout-empty">
            <p v-if="isRestDayToday" class="rest-day-text">Rest Day</p>
            <p v-else>No workout logged for today yet.</p>
          </div>
          <div class="card-actions split">
            <button class="btn primary wide" type="button" @click="goToLogs">Start workout</button>
            <button class="btn ghost wide" type="button" @click="openSchedule">View routine</button>
          </div>
        </article>

        <article class="focus-card">
          <div class="card-header">
            <div>
              <h2>Today Focus</h2>
              <p>What matters most today</p>
            </div>
          </div>
          <div class="focus-list">
            <div
              v-for="item in todayFocusItems"
              :key="item.label"
              class="focus-item"
            >
              <span class="focus-label">{{ item.label }}</span>
              <p class="focus-value">{{ item.value }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="dashboard-secondary">
      <article class="goal-progress-card">
        <div class="card-header">
          <div>
            <h2>Goal Progress</h2>
            <p>This week's consistency target</p>
          </div>
        </div>
        <div class="progress-list">
          <div
            v-for="item in goalProgressItems"
            :key="item.label"
            class="progress-item"
          >
            <div class="progress-topline">
              <div>
                <div class="progress-title-row">
                  <strong>{{ item.label }}</strong>
                  <span v-if="item.badge" class="micro-badge">{{ item.badge }}</span>
                </div>
                <p>{{ item.helper }}</p>
              </div>
              <span>{{ item.current }} / {{ item.target }}</span>
            </div>
            <div class="progress-track">
              <span :style="{ width: `${item.progress}%` }"></span>
            </div>
          </div>
        </div>
        <p class="section-note">{{ goalProgressNote }}</p>
        <div class="card-actions">
          <button class="btn ghost wide" type="button" @click="openAnalytics">View Analytics</button>
        </div>
      </article>

      <article class="nutrition-snapshot-card">
        <div class="card-header">
          <div>
            <h2>Nutrition Snapshot</h2>
            <p>Today's nutrition overview</p>
          </div>
        </div>
        <div class="snapshot-grid">
          <div
            v-for="item in nutritionSnapshotItems"
            :key="item.label"
            class="snapshot-item"
          >
            <div class="snapshot-topline">
              <span>{{ item.label }}</span>
              <strong>{{ item.current }} / {{ item.target }}</strong>
            </div>
            <div class="snapshot-track">
              <span :style="{ width: `${item.progress}%` }"></span>
            </div>
          </div>
        </div>
        <p class="snapshot-status">{{ nutritionStatusLine }}</p>
        <div class="card-actions">
          <button class="btn ghost wide" type="button" @click="openNutrition">Open Nutrition</button>
        </div>
      </article>
    </section>

    <section class="dashboard-tertiary">
      <article class="agent-success-card">
        <div class="card-header">
          <div>
            <h2>Agent Answer Success</h2>
            <p>Recorded answer delivery rate across all tracked agent runs</p>
          </div>
          <span class="micro-badge">{{ agentStatsRangeLabel }}</span>
        </div>

        <p v-if="agentStatsError" class="agent-error">{{ agentStatsError }}</p>

        <div v-if="agentStatsHasData" class="agent-summary-grid">
          <div
            v-for="item in agentSummaryItems"
            :key="item.label"
            class="agent-summary-item"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.helper }}</p>
          </div>
        </div>

        <div v-if="agentStatsHasData" class="agent-breakdown-grid">
          <article
            v-for="item in agentBreakdownItems"
            :key="item.agentType"
            class="agent-breakdown-card"
          >
            <div class="agent-breakdown-head">
              <div>
                <strong>{{ item.label }}</strong>
                <p>{{ item.successCount }} success · {{ item.failureCount }} failed</p>
              </div>
              <span class="agent-rate">{{ item.successRateLabel }}</span>
            </div>
            <div class="agent-bar">
              <span :style="{ width: `${item.successRatePercent}%` }"></span>
            </div>
            <div class="agent-meta">
              <span>{{ item.total }} total runs</span>
              <span>{{ item.fallbackCount }} fallback</span>
            </div>
          </article>
        </div>

        <div v-else class="agent-empty">
          <p v-if="agentStatsLoading">Loading agent performance...</p>
          <p v-else>No tracked agent runs yet. Use chat, analytics, or nutrition AI to populate this module.</p>
        </div>
      </article>
    </section>

    <transition name="fade">
      <div v-if="showSchedule" class="schedule-backdrop" @click.self="closeSchedule">
        <div class="schedule-modal">
          <header class="schedule-header">
            <div>
              <h2>Timetable</h2>
              <p>View upcoming workouts by day.</p>
            </div>
            <button class="close" type="button" @click="closeSchedule">X</button>
          </header>
          <div class="calendar-controls">
            <button class="icon-btn" type="button" @click="goPrevMonth">‹</button>
            <span>{{ calendarTitle }}</span>
            <button class="icon-btn" type="button" @click="goNextMonth">›</button>
          </div>
          <div class="calendar-grid">
            <span v-for="day in weekDays" :key="day" class="calendar-head">{{ day }}</span>
            <button
              v-for="(cell, index) in calendarCells"
              :key="index"
              class="calendar-cell"
              :class="{
                muted: !cell?.inMonth,
                selected: cell?.isSelected,
                hasWorkout: cell?.hasWorkout
              }"
              type="button"
              @click="cell && selectDate(cell.date)"
            >
              {{ cell?.label || '' }}
            </button>
          </div>
          <div class="schedule-list">
            <h3>{{ selectedTitle }}</h3>
            <ul v-if="selectedWorkouts.length">
              <li v-for="item in selectedWorkouts" :key="item.id">
                <strong>{{ item.title }}</strong>
                <span>{{ item.subtitle }}</span>
              </li>
            </ul>
            <p v-else class="empty">No workouts scheduled.</p>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showRescheduleModal" class="schedule-backdrop" @click.self="closeReschedule">
        <div class="reschedule-modal">
          <header class="schedule-header">
            <div>
              <h2>Reschedule workouts</h2>
              <p>Select the sessions and choose a new date.</p>
            </div>
            <button class="close" type="button" @click="closeReschedule">X</button>
          </header>
          <div class="reschedule-body">
            <div class="reschedule-list">
              <label
                v-for="item in todayLogItems"
                :key="item.id"
                class="reschedule-item"
              >
                <input v-model="rescheduleSelection[item.id]" type="checkbox" />
                <div>
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.duration || 'No duration' }}</span>
                </div>
              </label>
              <p v-if="!todayLogItems.length" class="empty">No workouts to reschedule.</p>
            </div>
            <div class="reschedule-controls">
              <label class="field">
                <span>New date</span>
                <input v-model="rescheduleDate" type="date" />
              </label>
              <div class="quick-row">
                <button class="btn ghost small" type="button" @click="setRescheduleDate(1)">
                  Tomorrow
                </button>
                <button class="btn ghost small" type="button" @click="setRescheduleDate(2)">
                  Day after
                </button>
              </div>
            </div>
          </div>
          <footer class="update-actions">
            <button class="btn ghost" type="button" @click="closeReschedule">Cancel</button>
            <button class="btn primary" type="button" @click="applyReschedule">Save</button>
          </footer>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showLogModal" class="modal-backdrop" @click.self="closeLogModal">
        <form class="modal-card" @submit.prevent="addLogWorkout">
          <header>
            <div>
              <h2>Log a Workout</h2>
              <p>Add your session details to the history.</p>
            </div>
            <button class="close" type="button" @click="closeLogModal">X</button>
          </header>

          <div class="form-grid">
            <label class="field">
              <span>Date</span>
              <input
                v-model="logForm.date"
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
                v-model.trim="logForm.location"
                type="text"
                placeholder="Gold's Gym"
                list="log-location-suggestions"
              />
              <datalist id="log-location-suggestions">
                <option v-for="place in locationSuggestions" :key="place" :value="place" />
              </datalist>
            </label>
            <div class="field pr-card">
              <span>PRs / Records</span>
              <div class="pr-display">
                <span class="trophy">🏆</span>
                <strong>{{ logPrCount }}</strong>
                <span class="pr-label">PRs</span>
              </div>
            </div>
            <div class="field full">
              <div class="field-row">
                <span>Exercises</span>
                <button class="btn ghost small" type="button" @click="addLogExercise">
                  + Add exercise
                </button>
              </div>
              <div class="exercise-list">
                <p v-if="logForm.exercises.length === 0" class="muted">No exercises added yet.</p>
                <div
                  v-for="(exercise, index) in logForm.exercises"
                  :key="exercise.id"
                  class="exercise-card"
                >
                  <label class="exercise-group">
                    <span>Muscle Group</span>
                    <select v-model="exercise.groupFilter" @change="onLogExerciseGroupChange(exercise)">
                      <option value="">All groups</option>
                      <option v-for="option in muscleGroupOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </label>
                  <div class="exercise-header">
                    <select v-model="exercise.name">
                      <option value="" disabled>Select exercise...</option>
                      <option v-for="name in logWorkoutOptions(exercise)" :key="name" :value="name">{{ name }}</option>
                    </select>
                    <button class="icon-btn" type="button" @click="removeLogExercise(index)">✕</button>
                  </div>
                  <div class="exercise-fields">
                    <label>
                      <span>Sets</span>
                      <input
                        v-model.number="exercise.sets"
                        type="number"
                        min="1"
                        placeholder="3"
                        @input="onLogExerciseFieldsChange(exercise)"
                      />
                    </label>
                    <label>
                      <span>Reps</span>
                      <input
                        v-model.number="exercise.reps"
                        type="number"
                        min="1"
                        placeholder="10"
                        @input="onLogExerciseFieldsChange(exercise)"
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
                        @input="onLogExerciseFieldsChange(exercise)"
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
                            @input="clearLogDurationError(exercise)"
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
                            @input="clearLogDurationError(exercise)"
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
                      @input="onLogExerciseRpeChange(exercise)"
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
            <button class="btn ghost" type="button" @click="closeLogModal">Cancel</button>
            <button class="btn primary" type="submit">Save Workout</button>
          </footer>
        </form>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import { formatSupabaseError, mapMealEntryRow, mapWaterEntryRow, requireNutritionUser } from '@/lib/nutritionSupabase'
import { buildFallbackNutritionTargetRecommendation } from '@/lib/nutritionGoalSync'
import { getUserStorageKey } from '@/lib/userStorage'
import { buildNutritionSummary } from '@/utils/nutritionCalculations'
import { buildPlanGoalLink } from '@/utils/nutritionGoalMapping'

const AUTH_SERVER_ORIGIN = import.meta.env.VITE_AUTH_SERVER_ORIGIN || 'http://localhost:4000'
const AGENT_STAT_AGENT_ORDER = ['chat', 'analytics', 'nutrition']
const AGENT_STAT_LABELS = {
  chat: 'Chat Agent',
  analytics: 'Analytics Agent',
  nutrition: 'Nutrition Agent'
}

const auth = useAuthStore()
const router = useRouter()
const firstName = computed(() => auth.user?.name?.split(' ')[0] || 'Alex')
const greeting = computed(() => {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()

  if (minutes <= 300) return 'Good Evening'
  if (minutes <= 660) return 'Good Morning'
  if (minutes <= 1079) return 'Good Afternoon'
  return 'Good Evening'
})

function goToLogs() {
  router.push({ name: 'logs' })
}

function openAnalytics() {
  router.push({ name: 'progress' })
}

function openNutrition() {
  router.push({ name: 'nutrition' })
}

function logWorkoutQuick() {
  showTodayMenu.value = false
  openLogModal()
}

function viewDetails() {
  showTodayMenu.value = false
  router.push({ name: 'logs' })
}

function toggleTodayMenu() {
  showTodayMenu.value = !showTodayMenu.value
}

function closeTodayMenu() {
  showTodayMenu.value = false
}

function openLogModal() {
  showLogModal.value = true
  resetLogForm()
}

function closeLogModal() {
  showLogModal.value = false
  resetLogForm()
}

function resetLogForm() {
  logForm.date = ''
  logForm.location = ''
  logForm.exercises = []
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

function addLogExercise() {
  if (!Array.isArray(logForm.exercises)) logForm.exercises = []
  const defaultRpe = 6
  const suggestion = getRpeSuggestion(defaultRpe)
  logForm.exercises.push({
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
    _syncing: false
  })
}

function removeLogExercise(index) {
  logForm.exercises.splice(index, 1)
}

function onLogExerciseRpeChange(exercise) {
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

function onLogExerciseFieldsChange(exercise) {
  if (!exercise || exercise._syncing) return
  const estimated = estimateRpeFromExercise(exercise)
  if (!estimated) return
  exercise._syncing = true
  exercise.rpe = estimated
  setTimeout(() => {
    exercise._syncing = false
  }, 0)
}

function clearLogDurationError(exercise) {
  if (!exercise) return
  exercise.durationError = ''
}

function logWorkoutOptions(exercise) {
  if (!exercise?.groupFilter) return workoutNames
  return workoutNames.filter((name) => workoutGroupMap[name]?.includes(exercise.groupFilter))
}

function onLogExerciseGroupChange(exercise) {
  if (!exercise) return
  const options = logWorkoutOptions(exercise)
  if (exercise.name && !options.includes(exercise.name)) {
    exercise.name = ''
    exercise.tags = []
  }
}

function addLogWorkout() {
  const namedExercises = logForm.exercises.filter((exercise) => exercise.name)
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
  if (logForm.location) subtitleParts.push(logForm.location)
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
    date: logForm.date,
    title,
    subtitle,
    duration: durationDisplay,
    tags,
    location: logForm.location,
    exercises,
    prs: logPrCount.value,
    status: 'pending'
  }

  saveLogs([entry, ...logs.value])
  closeLogModal()
}

function setEnglishValidity(event, message = ENGLISH_REQUIRED) {
  if (!event?.target) return
  event.target.setCustomValidity(message)
}

function clearValidity(event) {
  if (!event?.target) return
  event.target.setCustomValidity('')
}

const logsKey = computed(() => getUserStorageKey('pf_workout_logs', auth.user))
const planKey = computed(() => getUserStorageKey('pf_plan_state', auth.user))
const restKey = computed(() => getUserStorageKey('pf_rest_days', auth.user))
const CALORIES_PER_MINUTE = 6
const planState = ref({
  weight: { current: 0 },
  weightRecords: []
})
const logs = ref([])
const showSchedule = ref(false)
const calendarMonth = ref(new Date())
const selectedDate = ref(new Date())
const recentlyCompletedIds = ref(new Set())
const showWeightFilter = ref(false)
const weightRange = ref('30d')
const showTodayMenu = ref(false)
const showRescheduleModal = ref(false)
const rescheduleDate = ref('')
const rescheduleSelection = ref({})
const restDays = ref(new Set())
const showLogModal = ref(false)
const ENGLISH_REQUIRED = 'Please fill out this field.'
const DURATION_REQUIRED = 'Please enter training time.'
const todayDate = new Date().toISOString().split('T')[0]
const logForm = reactive({
  date: '',
  location: '',
  exercises: []
})
const nutritionGoals = ref(null)
const nutritionMealEntries = ref([])
const nutritionWaterEntries = ref([])
const weeklyWaterDays = ref(0)
const nutritionError = ref('')
const agentStatsLoading = ref(false)
const agentStatsError = ref('')

function createEmptyAgentStats() {
  return {
    scope: 'global',
    days: 7,
    overall: {
      total: 0,
      successCount: 0,
      failureCount: 0,
      fallbackCount: 0,
      directAiCount: 0,
      successRate: 0
    },
    agents: []
  }
}

const agentStats = ref(createEmptyAgentStats())

const locationSuggestions = ["Gold's Gym", 'Home', 'Uni Gym']
const muscleGroupOptions = [
  { value: 'Chest', label: 'Chest 胸' },
  { value: 'Back', label: 'Back 背' },
  { value: 'Legs', label: 'Legs 腿' },
  { value: 'Shoulders', label: 'Shoulders 肩' },
  { value: 'Biceps', label: 'Biceps 二头' },
  { value: 'Triceps', label: 'Triceps 三头' },
  { value: 'Core', label: 'Core 核心' },
  { value: 'Cardio', label: 'Cardio 有氧' },
  { value: 'Glutes', label: 'Glutes 臀' },
  { value: 'Hamstrings', label: 'Hamstrings 腘绳肌' },
  { value: 'Quads', label: 'Quads 股四头' },
  { value: 'Calves', label: 'Calves 小腿' },
  { value: 'Lower Back', label: 'Lower Back 下背' },
  { value: 'Upper Back', label: 'Upper Back 上背' },
  { value: 'Rear Delts', label: 'Rear Delts 后束' },
  { value: 'Traps', label: 'Traps 斜方肌' },
  { value: 'Forearms', label: 'Forearms 前臂' },
  { value: 'Arms', label: 'Arms 手臂' },
  { value: 'Grip', label: 'Grip 握力' },
  { value: 'Full Body', label: 'Full Body 全身' },
  { value: 'Plyometrics', label: 'Plyometrics 爆发力' }
]

const workoutNames = [
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

const logPrCount = computed(() => {
  const exercises = Array.isArray(logForm.exercises) ? logForm.exercises : []
  const current = exercises.filter((exercise) => exercise.name)
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

    if (weight > maxWeight || reps > maxReps || sets > maxSets) {
      count += 1
    }
  })

  return count
})

watch(
  () => (Array.isArray(logForm.exercises) ? logForm.exercises : []).map((exercise) => exercise.name),
  () => {
    const exercises = Array.isArray(logForm.exercises) ? logForm.exercises : []
    exercises.forEach((exercise) => {
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

const weightRangeOptions = [
  { value: '30d', label: 'Last 30 Days', days: 30 },
  { value: '3m', label: 'Last 3 Months', days: 90 },
  { value: '6m', label: 'Last 6 Months', days: 180 },
  { value: '9m', label: 'Last 9 Months', days: 270 },
  { value: '1y', label: 'Last 1 Year', days: 365 }
]

function parseLocalDate(value) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseDuration(text) {
  if (!text) return 0
  const hoursMatch = text.match(/(\d+)\s*h/)
  const minutesMatch = text.match(/(\d+)\s*m/)
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0
  return hours * 60 + minutes
}

function readStorageJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeStorageJson(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function normalizeStatCount(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0
}

function normalizeSuccessRate(total, successCount, value) {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.min(parsed, 1)
  }
  return total ? successCount / total : 0
}

function normalizeAgentStats(payload) {
  const overallPayload = payload?.overall && typeof payload.overall === 'object' ? payload.overall : {}
  const overallTotal = normalizeStatCount(overallPayload.total)
  const overallSuccess = normalizeStatCount(overallPayload.successCount)
  const overallFailure = normalizeStatCount(overallPayload.failureCount)
  const overallFallback = normalizeStatCount(overallPayload.fallbackCount)
  const overallDirectAi = normalizeStatCount(overallPayload.directAiCount)

  return {
    scope: String(payload?.scope || 'global').trim().toLowerCase() === 'me' ? 'me' : 'global',
    days: Math.min(Math.max(normalizeStatCount(payload?.days) || 7, 1), 90),
    overall: {
      total: overallTotal,
      successCount: overallSuccess,
      failureCount: overallFailure,
      fallbackCount: overallFallback,
      directAiCount: overallDirectAi,
      successRate: normalizeSuccessRate(overallTotal, overallSuccess, overallPayload.successRate)
    },
    agents: (Array.isArray(payload?.agents) ? payload.agents : []).map((item) => {
      const total = normalizeStatCount(item?.total)
      const successCount = normalizeStatCount(item?.successCount)
      const failureCount = normalizeStatCount(item?.failureCount)
      const fallbackCount = normalizeStatCount(item?.fallbackCount)
      const directAiCount = normalizeStatCount(item?.directAiCount)
      return {
        agentType: String(item?.agentType || '').trim().toLowerCase(),
        total,
        successCount,
        failureCount,
        fallbackCount,
        directAiCount,
        successRate: normalizeSuccessRate(total, successCount, item?.successRate)
      }
    })
  }
}

function formatAgentRate(value) {
  const percent = Math.round(Math.min(Math.max(Number(value) || 0, 0), 1) * 100)
  return `${percent}%`
}

async function refreshAgentStats() {
  agentStatsLoading.value = true

  try {
    const response = await fetch(`${AUTH_SERVER_ORIGIN}/api/ai/agent-stats?days=7&scope=global`, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Unable to load agent performance right now.')
    }

    const payload = await response.json()
    agentStats.value = normalizeAgentStats(payload)
    agentStatsError.value = ''
  } catch (error) {
    agentStats.value = createEmptyAgentStats()
    agentStatsError.value = error?.message || 'Unable to load agent performance right now.'
  } finally {
    agentStatsLoading.value = false
  }
}

function startOfWeek(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() - next.getDay())
  return next
}

function endOfWeek(date) {
  const next = startOfWeek(date)
  next.setDate(next.getDate() + 6)
  next.setHours(23, 59, 59, 999)
  return next
}

function getWorkoutMinutes(workout) {
  if (!workout) return 0
  const minutesFromExercises = Array.isArray(workout.exercises)
    ? workout.exercises.reduce((acc, exercise) => {
        const hours = Number(exercise.durationHours) || 0
        const mins = Number(exercise.durationMinutes) || 0
        return acc + hours * 60 + mins
      }, 0)
    : 0
  return minutesFromExercises || parseDuration(workout.duration)
}

function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildDailyMinutesMap(items) {
  const map = {}
  items.forEach((workout) => {
    const date = parseLocalDate(workout.date)
    if (!date) return
    const minutes = getWorkoutMinutes(workout)
    if (!minutes) return
    const key = toIsoDate(date)
    map[key] = (map[key] || 0) + minutes
  })
  return map
}

function calcStreak(datesSet, startDate) {
  let count = 0
  const cursor = new Date(startDate)
  while (datesSet.has(toIsoDate(cursor))) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

function calcBestStreak(datesSet) {
  const dates = Array.from(datesSet).sort()
  if (!dates.length) return 0
  let best = 1
  let current = 1
  for (let i = 1; i < dates.length; i += 1) {
    const prev = parseLocalDate(dates[i - 1])
    const curr = parseLocalDate(dates[i])
    if (!prev || !curr) continue
    const diff = (curr.getTime() - prev.getTime()) / 86400000
    if (diff === 1) {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 1
    }
  }
  return best
}

function trendMeta(current, previous) {
  if (!previous && !current) return { label: '0%', tone: 'neutral' }
  if (!previous && current) return { label: '+100%', tone: 'positive' }
  const change = ((current - previous) / previous) * 100
  const rounded = Number.isFinite(change) ? Math.round(change) : 0
  const label = `${rounded > 0 ? '+' : ''}${rounded}%`
  if (rounded > 0) return { label, tone: 'positive' }
  if (rounded < 0) return { label, tone: 'negative' }
  return { label: '0%', tone: 'neutral' }
}

function buildWeeklyWeightSeries(records, fallbackWeight, rangeDays = 30) {
  const today = new Date()
  const start = new Date()
  const safeDays = Math.max(7, rangeDays)
  start.setDate(today.getDate() - (safeDays - 1))
  const bucketCount = 4
  const bucketSize = Math.ceil(safeDays / bucketCount)
  const buckets = Array.from({ length: bucketCount }, () => ({ sum: 0, count: 0 }))
  const sorted = Array.isArray(records)
    ? records
        .map((record) => ({
          date: parseLocalDate(record.date),
          weight: Number(record.weight)
        }))
        .filter((record) => record.date && Number.isFinite(record.weight))
        .sort((a, b) => a.date - b.date)
    : []

  sorted.forEach((record) => {
    if (record.date < start || record.date > today) return
    const diffDays = Math.floor((record.date - start) / 86400000)
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor(diffDays / bucketSize)))
    buckets[index].sum += record.weight
    buckets[index].count += 1
  })

  let lastKnown = Number.isFinite(fallbackWeight) ? fallbackWeight : 0
  if (!lastKnown && sorted.length) {
    lastKnown = sorted[sorted.length - 1].weight
  }

  return buckets.map((bucket) => {
    if (bucket.count) {
      lastKnown = bucket.sum / bucket.count
      return Number(lastKnown.toFixed(1))
    }
    return Number(lastKnown.toFixed(1))
  })
}

function buildWeightChart(values) {
  const width = 520
  const height = 180
  const paddingTop = 20
  const paddingBottom = 26
  const paddingLeft = 12
  const paddingRight = 12
  const usableHeight = height - paddingTop - paddingBottom
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const usableWidth = width - paddingLeft - paddingRight
  const step = values.length > 1 ? usableWidth / (values.length - 1) : usableWidth

  const points = values.map((value, index) => {
    const x = paddingLeft + index * step
    const y = paddingTop + (1 - (value - min) / range) * usableHeight
    return { x, y }
  })

  const line = buildSmoothPath(points)
  const area = `${line} L${width - paddingRight} ${height} L${paddingLeft} ${height} Z`
  return { line, area, points, min, max }
}

function buildSmoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  const d = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`)
  }
  return d.join(' ')
}

function getAxisLabels(minValue, maxValue) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return ['--', '--', '--', '--']
  const range = maxValue - minValue || 1
  const paddedMin = minValue - range * 0.2
  const paddedMax = maxValue + range * 0.2
  const step = (paddedMax - paddedMin) / 3
  return [
    paddedMax,
    paddedMax - step,
    paddedMax - step * 2,
    paddedMin
  ].map((value) => value.toFixed(1))
}

function getWeekLabels(rangeDays = 30) {
  const today = new Date()
  const start = new Date()
  const safeDays = Math.max(7, rangeDays)
  start.setDate(today.getDate() - (safeDays - 1))
  const bucketCount = 4
  const bucketSize = Math.ceil(safeDays / bucketCount)
  return Array.from({ length: bucketCount }).map((_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index * bucketSize)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day}`
  })
}

function toggleWeightFilter() {
  showWeightFilter.value = !showWeightFilter.value
}

function selectWeightRange(value) {
  weightRange.value = value
  showWeightFilter.value = false
}

function closeWeightFilterOnOutside(event) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (target.closest('.filter')) return
  showWeightFilter.value = false
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

function loadLogs() {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(logsKey.value)
  if (!raw) {
    logs.value = []
    return
  }
  try {
    const data = JSON.parse(raw)
    logs.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Failed to parse logs', err)
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
    if (Array.isArray(data)) restDays.value = new Set(data)
  } catch (err) {
    console.error('Failed to parse rest days', err)
    restDays.value = new Set()
  }
}

function saveRestDays() {
  if (typeof window === 'undefined') return
  localStorage.setItem(restKey.value, JSON.stringify(Array.from(restDays.value)))
  window.dispatchEvent(new Event('pf_rest_updated'))
}

function loadPlan() {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(planKey.value)
  if (!raw) {
    planState.value = { weight: { current: 0 }, weightRecords: [] }
    return
  }
  try {
    const data = JSON.parse(raw)
    planState.value = {
      weight: data?.weight || { current: 0 },
      weightRecords: Array.isArray(data?.weightRecords) ? data.weightRecords : []
    }
  } catch (err) {
    console.error('Failed to parse plan', err)
  }
}

const todayWorkouts = computed(() => {
  if (isRestDayToday.value) return []
  const today = new Date()
  return logs.value
    .filter((item) => {
      const date = parseLocalDate(item.date)
      return date ? isSameDay(date, today) : false
    })
    .filter((item) => item.status !== 'completed' || recentlyCompletedIds.value.has(item.id))
    .map((item) => {
      const tags = Array.isArray(item.tags) ? item.tags : []
      const target = tags.length ? tags.join(' / ') : 'General'
      const pills = []
      if (item.duration) pills.push(item.duration)
      const exerciseCount = Array.isArray(item.exercises)
        ? item.exercises.length
        : typeof item.exercises === 'number'
          ? item.exercises
          : 0
      if (exerciseCount) pills.push(`${exerciseCount} Exercises`)
      if (!pills.length) pills.push('Add details')

      return {
        ...item,
        status: item.status || 'pending',
        target,
        pills
      }
    })
})

const todayLogItems = computed(() => {
  const today = new Date()
  return logs.value.filter((item) => {
    const date = parseLocalDate(item.date)
    return date ? isSameDay(date, today) : false
  })
})

const dailyMinutesMap = computed(() => buildDailyMinutesMap(logs.value))
const currentWeekStart = computed(() => startOfWeek(new Date()))
const currentWeekEnd = computed(() => endOfWeek(new Date()))
const currentWeekLogs = computed(() => {
  return logs.value.filter((item) => {
    const date = parseLocalDate(item?.date)
    return date && date >= currentWeekStart.value && date <= currentWeekEnd.value
  })
})
const weeklyCompleted = computed(() => currentWeekLogs.value.filter((item) => item.status === 'completed').length)
const weeklyPending = computed(() => currentWeekLogs.value.filter((item) => item.status !== 'completed').length)
const weeklyCompletedMinutes = computed(() =>
  currentWeekLogs.value
    .filter((item) => item.status === 'completed')
    .reduce((sum, item) => sum + getWorkoutMinutes(item), 0)
)
const weeklyScheduledMinutes = computed(() => currentWeekLogs.value.reduce((sum, item) => sum + getWorkoutMinutes(item), 0))

const todayKey = computed(() => toIsoDate(new Date()))
const isRestDayToday = computed(() => {
  if (!restDays.value.has(todayKey.value)) return false
  const today = new Date()
  const hasWorkout = logs.value.some((item) => {
    const date = parseLocalDate(item.date)
    return date ? isSameDay(date, today) : false
  })
  return !hasWorkout
})
const yesterdayKey = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return toIsoDate(date)
})
const nutritionUserKey = computed(
  () => auth.user?.id || auth.user?.accountKey || auth.user?.email || auth.user?.name || 'nutrition-user'
)
const nutritionGoalsCacheKey = computed(() => `pf_nutrition_goals:${nutritionUserKey.value}`)
const nutritionMealsCacheKey = computed(() => `pf_nutrition_meals:${nutritionUserKey.value}:${todayKey.value}`)
const nutritionWaterCacheKey = computed(() => `pf_nutrition_water:${nutritionUserKey.value}:${todayKey.value}`)
const weeklyWaterDaysCacheKey = computed(
  () => `pf_dashboard_weekly_water_days:${nutritionUserKey.value}:${toIsoDate(currentWeekStart.value)}`
)

const activeMinutes = computed(() => dailyMinutesMap.value[todayKey.value] || 0)
const activeMinutesPrev = computed(() => dailyMinutesMap.value[yesterdayKey.value] || 0)
const caloriesBurned = computed(() => Math.round(activeMinutes.value * CALORIES_PER_MINUTE))
const caloriesPrev = computed(() => Math.round(activeMinutesPrev.value * CALORIES_PER_MINUTE))

const minutesDisplay = computed(() => activeMinutes.value || 0)
const caloriesDisplay = computed(() => caloriesBurned.value || 0)
const minutesTrend = computed(() => trendMeta(activeMinutes.value, activeMinutesPrev.value))
const caloriesTrend = computed(() => trendMeta(caloriesBurned.value, caloriesPrev.value))

function loadDashboardNutritionCache() {
  const cachedGoals = readStorageJson(nutritionGoalsCacheKey.value, nutritionGoals.value)
  const cachedMeals = readStorageJson(nutritionMealsCacheKey.value, nutritionMealEntries.value)
  const cachedWater = readStorageJson(nutritionWaterCacheKey.value, nutritionWaterEntries.value)
  const cachedWaterDays = readStorageJson(weeklyWaterDaysCacheKey.value, weeklyWaterDays.value)

  nutritionGoals.value = cachedGoals && typeof cachedGoals === 'object' ? cachedGoals : null
  nutritionMealEntries.value = Array.isArray(cachedMeals) ? cachedMeals : []
  nutritionWaterEntries.value = Array.isArray(cachedWater) ? cachedWater : []
  weeklyWaterDays.value = Number.isFinite(Number(cachedWaterDays)) ? Number(cachedWaterDays) : 0
}

async function refreshDashboardNutrition() {
  if (!supabase) return

  try {
    const user = await requireNutritionUser()
    const weekStartKey = toIsoDate(currentWeekStart.value)
    const weekEndKey = toIsoDate(currentWeekEnd.value)

    const [goalsResponse, mealsResponse, waterResponse, weeklyWaterResponse] = await Promise.all([
      supabase.from('user_nutrition_goals').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', todayKey.value)
        .order('created_at', { ascending: true }),
      supabase
        .from('water_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', todayKey.value)
        .order('created_at', { ascending: false }),
      supabase
        .from('water_entries')
        .select('entry_date')
        .eq('user_id', user.id)
        .gte('entry_date', weekStartKey)
        .lte('entry_date', weekEndKey)
    ])

    if (goalsResponse.error && goalsResponse.error.code !== 'PGRST116') throw goalsResponse.error
    if (mealsResponse.error) throw mealsResponse.error
    if (waterResponse.error) throw waterResponse.error
    if (weeklyWaterResponse.error) throw weeklyWaterResponse.error

    nutritionGoals.value = goalsResponse.data || nutritionGoals.value
    nutritionMealEntries.value = Array.isArray(mealsResponse.data)
      ? mealsResponse.data.map((row) => mapMealEntryRow(row))
      : []
    nutritionWaterEntries.value = Array.isArray(waterResponse.data)
      ? waterResponse.data.map((row) => mapWaterEntryRow(row))
      : []
    weeklyWaterDays.value = new Set(
      (weeklyWaterResponse.data || []).map((item) => item.entry_date).filter(Boolean)
    ).size

    writeStorageJson(nutritionGoalsCacheKey.value, nutritionGoals.value)
    writeStorageJson(nutritionMealsCacheKey.value, nutritionMealEntries.value)
    writeStorageJson(nutritionWaterCacheKey.value, nutritionWaterEntries.value)
    writeStorageJson(weeklyWaterDaysCacheKey.value, weeklyWaterDays.value)
    nutritionError.value = ''
  } catch (error) {
    nutritionError.value = formatSupabaseError(error, 'Unable to refresh dashboard nutrition data.')
  }
}

const fallbackNutritionGoals = computed(() =>
  buildFallbackNutritionTargetRecommendation({
    authUser: auth.user,
    planState: planState.value,
    goalType: buildPlanGoalLink(planState.value).nutritionGoalType
  })
)

const dashboardNutritionGoals = computed(() => nutritionGoals.value || fallbackNutritionGoals.value)
const dashboardNutritionSummary = computed(() =>
  buildNutritionSummary({
    mealEntries: nutritionMealEntries.value,
    waterEntries: nutritionWaterEntries.value,
    goals: dashboardNutritionGoals.value,
    exerciseBurn: caloriesBurned.value
  })
)

const weightRecordsSorted = computed(() => {
  const records = Array.isArray(planState.value.weightRecords) ? planState.value.weightRecords : []
  return records.slice().sort((a, b) => (a.date > b.date ? 1 : -1))
})

const hasWeightData = computed(() => {
  if (weightRecordsSorted.value.length) return true
  return Number(planState.value.weight?.current) > 0
})

const latestWeight = computed(() => {
  if (weightRecordsSorted.value.length) {
    return Number(weightRecordsSorted.value[weightRecordsSorted.value.length - 1].weight) || 0
  }
  return Number(planState.value.weight?.current) || 0
})

const weightDisplay = computed(() => (hasWeightData.value ? latestWeight.value.toFixed(1) : '--'))

const weightTrend = computed(() => {
  if (!hasWeightData.value) return { label: '0%', tone: 'neutral' }
  if (weightRecordsSorted.value.length < 2) return { label: '0%', tone: 'neutral' }
  const last = Number(weightRecordsSorted.value[weightRecordsSorted.value.length - 1].weight)
  const prev = Number(weightRecordsSorted.value[weightRecordsSorted.value.length - 2].weight)
  return trendMeta(last, prev)
})

const activityDatesSet = computed(() => {
  const set = new Set()
  Object.keys(dailyMinutesMap.value).forEach((key) => {
    if (dailyMinutesMap.value[key] > 0) set.add(key)
  })
  return set
})

const streakDisplay = computed(() => {
  const today = new Date()
  return calcStreak(activityDatesSet.value, today)
})

const bestStreak = computed(() => calcBestStreak(activityDatesSet.value))

const weightChart = computed(() => {
  if (!hasWeightData.value) {
    return { line: '', area: '', points: [], min: NaN, max: NaN }
  }
  const rangeDays = weightRangeOptions.find((item) => item.value === weightRange.value)?.days || 30
  const values = buildWeeklyWeightSeries(planState.value.weightRecords, latestWeight.value, rangeDays)
  return buildWeightChart(values)
})

const weightChartAxis = computed(() => {
  const labels = getAxisLabels(weightChart.value.min, weightChart.value.max)
  const rangeDays = weightRangeOptions.find((item) => item.value === weightRange.value)?.days || 30
  const xLabels = getWeekLabels(rangeDays)
  return { yLabels: labels, xLabels }
})

const activeRangeLabel = computed(() => {
  return weightRangeOptions.find((item) => item.value === weightRange.value)?.label || 'Last 30 Days'
})

const visibleWeightRecords = computed(() => {
  const rangeDays = weightRangeOptions.find((item) => item.value === weightRange.value)?.days || 30
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setDate(end.getDate() - (rangeDays - 1))
  start.setHours(0, 0, 0, 0)
  return weightRecordsSorted.value.filter((record) => {
    const date = parseLocalDate(record.date)
    return date && date >= start && date <= end
  })
})

const weightVisibleLogCount = computed(() => visibleWeightRecords.value.length)

const weightHeadline = computed(() => {
  if (!hasWeightData.value) return 'No weight logs yet'
  return `${weightDisplay.value} kg latest`
})

const weightStatusLine = computed(() => {
  const rangeDays = weightRangeOptions.find((item) => item.value === weightRange.value)?.days || 30
  if (visibleWeightRecords.value.length < 2) return `Stable in the last ${rangeDays} days`
  const first = Number(visibleWeightRecords.value[0]?.weight) || 0
  const last = Number(visibleWeightRecords.value[visibleWeightRecords.value.length - 1]?.weight) || 0
  const delta = last - first
  if (Math.abs(delta) < 0.3) return `Stable in the last ${rangeDays} days`
  if (delta > 0) return `Up ${delta.toFixed(1)} kg in the last ${rangeDays} days`
  return `Down ${Math.abs(delta).toFixed(1)} kg in the last ${rangeDays} days`
})

const weightSummaryHint = computed(() => {
  if (!weightVisibleLogCount.value) return 'Add more weigh-ins to start your trend.'
  if (weightVisibleLogCount.value < 4) return 'Add more weigh-ins for a clearer trend.'
  return 'The trend is becoming clearer with consistent logging.'
})

const todaySummary = computed(() => {
  if (isRestDayToday.value) return 'Rest Day'
  if (!todayWorkouts.value.length) return 'No workout logged today'
  const primary = todayWorkouts.value[0]
  if (primary.duration) return `${primary.title} - ${primary.duration}`
  return primary.title
})

const todayWorkoutMetaItems = computed(() => {
  if (isRestDayToday.value) return ['Rest day', 'Recovery focus']
  const primary = todayWorkouts.value[0]
  if (!primary) return ['No session scheduled', 'Add a workout']
  const items = ['Scheduled today']
  const exerciseCount = Array.isArray(primary.exercises) ? primary.exercises.length : 0
  if (exerciseCount) items.push(`${exerciseCount} exercise${exerciseCount > 1 ? 's' : ''}`)
  if (primary.duration) items.push(`Estimated ${primary.duration}`)
  return items
})

const weeklyMinutesTarget = computed(() => {
  const configured = Number(planState.value?.challengeValues?.duration) || 0
  if (configured > 0) return configured * 7
  return weeklyScheduledMinutes.value
})

const goalProgressItems = computed(() => {
  const workoutsTarget = weeklyCompleted.value + weeklyPending.value
  return [
    {
      label: 'Workouts',
      helper: 'Scheduled sessions this week',
      badge: workoutsTarget ? 'Primary weekly goal' : '',
      current: weeklyCompleted.value,
      target: workoutsTarget,
      progress: workoutsTarget ? Math.round((weeklyCompleted.value / workoutsTarget) * 100) : 0
    },
    {
      label: 'Minutes',
      helper: 'Completed training minutes',
      badge: '',
      current: weeklyCompletedMinutes.value,
      target: weeklyMinutesTarget.value,
      progress: weeklyMinutesTarget.value
        ? Math.round((weeklyCompletedMinutes.value / weeklyMinutesTarget.value) * 100)
        : 0
    },
    {
      label: 'Water days',
      helper: 'Days hydrated this week',
      badge: '',
      current: weeklyWaterDays.value,
      target: 7,
      progress: Math.round((weeklyWaterDays.value / 7) * 100)
    }
  ].map((item) => ({
    ...item,
    progress: Math.min(100, Math.max(0, item.progress))
  }))
})

const goalProgressNote = computed(() => {
  if (weeklyCompleted.value + weeklyPending.value === 0 && weeklyCompletedMinutes.value === 0) {
    return 'No weekly plan is scheduled yet. Start by adding your next session.'
  }
  if (weeklyPending.value > 0) return 'Keep momentum going by closing out the remaining scheduled sessions.'
  if (weeklyCompleted.value > 0) return 'You are on track this week. Keep the routine steady.'
  return 'This week is still open. Start with one focused session today.'
})

const nutritionSnapshotItems = computed(() => {
  const summary = dashboardNutritionSummary.value
  return [
    {
      label: 'Calories',
      current: `${Math.round(summary.consumedCalories)}`,
      target: `${Math.round(summary.targets.calories)} kcal`,
      progress: summary.completion.caloriesPercent
    },
    {
      label: 'Protein',
      current: `${Math.round(summary.proteinG)} g`,
      target: `${Math.round(summary.targets.protein)} g`,
      progress: summary.completion.proteinPercent
    },
    {
      label: 'Water',
      current: `${Math.round(summary.waterMl)} ml`,
      target: `${Math.round(summary.targets.water)} ml`,
      progress: summary.completion.waterPercent
    }
  ]
})

const nutritionStatusLine = computed(() => {
  const summary = dashboardNutritionSummary.value
  const gaps = [
    { key: 'protein', label: 'Protein is your main focus today', percent: summary.completion.proteinPercent },
    { key: 'water', label: 'Hydration is your main focus today', percent: summary.completion.waterPercent },
    { key: 'calories', label: 'Calories are still low for today', percent: summary.completion.caloriesPercent }
  ].sort((left, right) => left.percent - right.percent)

  if (summary.consumedCalories === 0 && summary.waterMl === 0) {
    return 'Nothing has been logged yet for today.'
  }
  if (gaps[0].percent >= 100) return 'Today looks balanced across your main targets.'
  return gaps[0].label
})

const nutritionStatusHint = computed(() => {
  if (nutritionError.value && nutritionMealEntries.value.length === 0 && nutritionWaterEntries.value.length === 0) {
    return 'Showing your latest saved nutrition targets while cloud data sync catches up.'
  }
  return 'Live summary from today’s meals, water entries, and active nutrition targets.'
})

const agentStatsHasData = computed(() => agentStats.value.overall.total > 0)

const agentStatsRangeLabel = computed(() => `${agentStats.value.days} Days`)

const agentSummaryItems = computed(() => {
  const overall = agentStats.value.overall
  return [
    {
      label: 'Success rate',
      value: formatAgentRate(overall.successRate),
      helper: `${overall.successCount} answered successfully`
    },
    {
      label: 'Total runs',
      value: String(overall.total),
      helper: 'Tracked chat, analytics, and nutrition calls'
    },
    {
      label: 'Failed runs',
      value: String(overall.failureCount),
      helper: 'Requests that did not deliver an answer'
    },
    {
      label: 'Fallback answers',
      value: String(overall.fallbackCount),
      helper: `${overall.directAiCount} delivered directly by AI`
    }
  ]
})

const agentBreakdownItems = computed(() => {
  const byType = new Map(
    agentStats.value.agents.map((item) => [item.agentType, item])
  )

  return AGENT_STAT_AGENT_ORDER.map((agentType) => {
    const item = byType.get(agentType) || {
      agentType,
      total: 0,
      successCount: 0,
      failureCount: 0,
      fallbackCount: 0,
      directAiCount: 0,
      successRate: 0
    }

    return {
      ...item,
      label: AGENT_STAT_LABELS[agentType] || agentType,
      successRateLabel: formatAgentRate(item.successRate),
      successRatePercent: Math.round(Math.min(Math.max(item.successRate || 0, 0), 1) * 100)
    }
  })
})

const todayFocusItems = computed(() => {
  const summary = dashboardNutritionSummary.value
  const workoutValue = isRestDayToday.value
    ? 'Recovery day'
    : todayWorkouts.value.length
      ? `${todayWorkouts.value[0].title}${todayWorkouts.value[0].duration ? ` · ${todayWorkouts.value[0].duration}` : ''}`
      : 'No workout scheduled yet'
  const proteinRemaining = Math.max(0, Math.round(summary.targets.protein - summary.proteinG))
  const waterRemaining = Math.max(0, Math.round(summary.targets.water - summary.waterMl))

  return [
    {
      label: 'Workout',
      value: workoutValue
    },
    {
      label: 'Nutrition',
      value: summary.targets.protein
        ? `Protein remaining: ${proteinRemaining} g`
        : 'Protein target not set'
    },
    {
      label: 'Hydration',
      value: summary.targets.water
        ? `${waterRemaining} ml left today`
        : 'Water target not set'
    }
  ]
})

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const calendarTitle = computed(() => {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calendarMonth.value)
})

const calendarCells = computed(() => {
  const year = calendarMonth.value.getFullYear()
  const month = calendarMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const cells = []

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day)
    const hasWorkout = logs.value.some((item) => {
      const itemDate = parseLocalDate(item.date)
      return itemDate ? isSameDay(itemDate, date) : false
    })
    cells.push({
      date,
      label: day,
      inMonth: true,
      hasWorkout,
      isSelected: isSameDay(date, selectedDate.value)
    })
  }

  while (cells.length < 42) {
    cells.push(null)
  }

  return cells
})

const selectedWorkouts = computed(() => {
  const selected = selectedDate.value
  return logs.value.filter((item) => {
    const date = parseLocalDate(item.date)
    return date ? isSameDay(date, selected) : false
  })
})

const selectedTitle = computed(() => {
  if (!selectedDate.value) return 'Selected day'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(selectedDate.value)
})

function openSchedule() {
  router.push('/schedule')
}

function closeSchedule() {
  showSchedule.value = false
}

function openReschedule() {
  showTodayMenu.value = false
  showRescheduleModal.value = true
  rescheduleSelection.value = {}
  todayLogItems.value.forEach((item) => {
    rescheduleSelection.value[item.id] = false
  })
  setRescheduleDate(1)
}

function closeReschedule() {
  showRescheduleModal.value = false
}

function setRescheduleDate(offsetDays) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  rescheduleDate.value = toIsoDate(date)
}

function applyReschedule() {
  if (!rescheduleDate.value) return
  const selectedIds = Object.keys(rescheduleSelection.value).filter(
    (id) => rescheduleSelection.value[id]
  )
  if (!selectedIds.length) return
  const next = logs.value.map((item) =>
    selectedIds.includes(String(item.id))
      ? { ...item, date: rescheduleDate.value }
      : item
  )
  saveLogs(next)
  closeReschedule()
}

function markRestDay() {
  showTodayMenu.value = false
  restDays.value.add(todayKey.value)
  saveRestDays()
  const next = logs.value.filter((item) => {
    const date = parseLocalDate(item.date)
    return date ? !isSameDay(date, new Date()) : true
  })
  saveLogs(next)
}

function goPrevMonth() {
  calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() - 1, 1)
}

function goNextMonth() {
  calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + 1, 1)
}

function selectDate(date) {
  if (!date) return
  selectedDate.value = date
}

function handleStorage(event) {
  if (!event || event.key === logsKey.value || event.key === planKey.value || event.key === restKey.value) {
    loadLogs()
    loadPlan()
    loadRestDays()
  }
}

function saveLogs(next) {
  logs.value = next
  if (typeof window !== 'undefined') {
    localStorage.setItem(logsKey.value, JSON.stringify(next))
    window.dispatchEvent(new Event('pf_logs_updated'))
  }
}

function toggleWorkoutStatus(id) {
  if (!id) return
  const next = logs.value.map((item) => {
    if (item.id !== id) return item
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed'
    return { ...item, status: nextStatus }
  })
  const updated = next.find((item) => item.id === id)
  if (updated?.status === 'completed') {
    const nextSet = new Set(recentlyCompletedIds.value)
    nextSet.add(id)
    recentlyCompletedIds.value = nextSet
  } else {
    const nextSet = new Set(recentlyCompletedIds.value)
    nextSet.delete(id)
    recentlyCompletedIds.value = nextSet
  }
  saveLogs(next)
}

watch(
  [logsKey, planKey, restKey],
  () => {
    loadLogs()
    loadPlan()
    loadRestDays()
    loadDashboardNutritionCache()
    refreshDashboardNutrition()
  },
  { immediate: true }
)

onMounted(() => {
  loadLogs()
  loadPlan()
  loadRestDays()
  loadDashboardNutritionCache()
  refreshDashboardNutrition()
  refreshAgentStats()
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage)
    window.addEventListener('pf_logs_updated', loadLogs)
    window.addEventListener('pf_plan_updated', loadPlan)
    window.addEventListener('pf_nutrition_updated', refreshDashboardNutrition)
    window.addEventListener('pf_rest_updated', loadRestDays)
    window.addEventListener('pf_ai_agent_run', refreshAgentStats)
    window.addEventListener('click', closeWeightFilterOnOutside)
    window.addEventListener('click', closeTodayMenu)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener('pf_logs_updated', loadLogs)
    window.removeEventListener('pf_plan_updated', loadPlan)
    window.removeEventListener('pf_nutrition_updated', refreshDashboardNutrition)
    window.removeEventListener('pf_rest_updated', loadRestDays)
    window.removeEventListener('pf_ai_agent_run', refreshAgentStats)
    window.removeEventListener('click', closeWeightFilterOnOutside)
    window.removeEventListener('click', closeTodayMenu)
  }
})
</script>

<style scoped>
.dashboard-page {
  padding: 36px clamp(20px, 4vw, 48px) 60px;
  display: grid;
  gap: 32px;
  background: transparent;
}

.dashboard-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.dashboard-hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(30px, 4vw, 40px);
}

.subtitle {
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 15px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 14px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  box-shadow: var(--shadow-soft);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn svg {
  width: 18px;
  height: 18px;
}

.btn:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: var(--shadow-strong);
}

.btn.primary {
  background: var(--accent);
  color: #fff;
  border-color: transparent;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.btn.full {
  width: 100%;
  justify-content: center;
  margin-top: 18px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  display: grid;
  place-items: center;
  font-size: 18px;
  color: var(--text-muted);
}

.stats-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  background: transparent;
}

.stat-card {
  background: var(--surface);
  border-radius: 18px;
  padding: 18px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 14px;
  animation: rise 0.6s ease both;
}

.stat-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.stat-card p {
  margin: 0 0 6px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
}

.stat-card h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.stat-card h3 span {
  font-size: 14px;
  color: var(--text-muted);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
}

.stat-icon svg {
  width: 20px;
  height: 20px;
}

.stat-icon.weight {
  background: #f87171;
}

.stat-icon.fire {
  background: #fb923c;
}

.stat-icon.move {
  background: #60a5fa;
}

.stat-icon.bolt {
  background: #a78bfa;
}

.stat-trend {
  font-size: 13px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  width: fit-content;
}

.stat-trend.positive {
  background: #dcfce7;
  color: #15803d;
}

.stat-trend.neutral {
  background: var(--surface-soft);
  color: var(--text-muted);
}

.stat-trend.negative {
  background: #fee2e2;
  color: #b91c1c;
}

.dashboard-main {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  align-items: stretch;
}

.chart-card,
.workout-card,
.focus-card,
.goal-progress-card,
.nutrition-snapshot-card,
.agent-success-card {
  background: var(--surface);
  border-radius: 22px;
  padding: 22px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
}

.chart-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-header h2 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
}

.card-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 12px;
  background: var(--surface-muted);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.chart-area {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 10px;
}

.chart-grid {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
  flex: 1;
  min-height: 280px;
}

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 12px;
  padding: 4px 0;
}

.chart-plot {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.chart-plot svg {
  width: 100%;
  height: 100%;
  min-height: 280px;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 12px;
  padding-left: 54px;
}

.chart-labels.x-axis {
  margin-top: 0;
}

.filter {
  position: relative;
}

.filter-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-strong);
  padding: 8px;
  min-width: 170px;
  display: grid;
  gap: 6px;
  z-index: 10;
}

.filter-item {
  border: none;
  background: transparent;
  padding: 8px 12px;
  border-radius: 10px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-muted);
}

.filter-item.active,
.filter-item:hover {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.side-stack {
  display: grid;
  gap: 20px;
  grid-template-rows: auto auto;
  align-content: stretch;
}

.chart-status {
  margin: 10px 0 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.focus-card,
.goal-progress-card,
.nutrition-snapshot-card,
.workout-card,
.agent-success-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.focus-list,
.progress-list,
.snapshot-grid {
  margin-top: 18px;
}

.focus-list {
  display: grid;
  gap: 12px;
}

.focus-item {
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--surface-muted);
  border: 1px solid color-mix(in srgb, var(--border) 78%, white);
  display: grid;
  gap: 6px;
  justify-items: center;
  text-align: center;
}

.focus-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent-strong);
}

.focus-item p {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.45;
}

.focus-value {
  font-size: 15px !important;
  font-weight: 700;
  line-height: 1.35 !important;
}

.dashboard-secondary {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  background: transparent;
}

.dashboard-tertiary {
  display: grid;
  gap: 24px;
  background: transparent;
}

.agent-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 4px;
}

.agent-summary-item,
.agent-breakdown-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, white);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 96%, transparent),
      color-mix(in srgb, var(--surface-muted) 92%, transparent)
    );
}

.agent-summary-item {
  display: grid;
  gap: 6px;
}

.agent-summary-item span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.agent-summary-item strong {
  font-size: 28px;
  line-height: 1;
  color: var(--text-primary);
}

.agent-summary-item p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.45;
}

.agent-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.agent-breakdown-card {
  display: grid;
  gap: 10px;
}

.agent-breakdown-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.agent-breakdown-head strong {
  display: block;
  margin: 0;
  font-size: 15px;
}

.agent-breakdown-head p,
.agent-meta span,
.agent-empty p,
.agent-error {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.agent-rate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-soft) 78%, white);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.agent-bar {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-track) 82%, transparent);
}

.agent-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #60a5fa);
}

.agent-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.agent-empty {
  margin-top: 4px;
  padding: 20px;
  border-radius: 16px;
  border: 1px dashed color-mix(in srgb, var(--border) 82%, white);
  background: color-mix(in srgb, var(--surface-muted) 74%, transparent);
}

.agent-error {
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff1f2;
  color: #be123c;
  font-weight: 600;
}

.progress-list {
  display: grid;
  gap: 18px;
}

.chart-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--border) 76%, white);
  color: var(--text-muted);
  font-size: 13px;
}

.chart-summary span:last-child {
  text-align: right;
}

.progress-item {
  display: grid;
  gap: 10px;
}

.progress-topline,
.snapshot-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.progress-topline strong,
.snapshot-topline strong {
  display: block;
  color: var(--text-primary);
  font-size: 15px;
}

.progress-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.micro-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-strong);
  background: color-mix(in srgb, var(--accent-soft) 78%, white);
}

.progress-topline p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.progress-topline span,
.snapshot-topline span {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
}

.progress-track,
.snapshot-track {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-track) 82%, transparent);
}

.progress-track span,
.snapshot-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f87171, #fb7185);
}

.snapshot-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.snapshot-item {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 94%, transparent),
      color-mix(in srgb, var(--surface-muted) 92%, transparent)
    );
  border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface) 72%, transparent);
}

.snapshot-status {
  margin: 18px 0 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.section-note {
  margin: 16px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.card-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 18px;
}

.card-actions.split {
  padding-top: 16px;
}

.card-actions .wide {
  flex: 1;
}

.schedule-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: 24px;
}

.schedule-modal {
  width: min(780px, 100%);
  background: var(--surface);
  border-radius: 24px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-strong);
  padding: 24px;
  display: grid;
  gap: 18px;
}

.reschedule-modal {
  width: min(620px, 100%);
  background: var(--surface);
  border-radius: 24px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-strong);
  padding: 24px;
  display: grid;
  gap: 18px;
}

.reschedule-body {
  display: grid;
  gap: 16px;
}

.reschedule-list {
  display: grid;
  gap: 10px;
}

.reschedule-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
}

.reschedule-item strong {
  display: block;
  margin-bottom: 4px;
}

.reschedule-item span {
  color: var(--text-muted);
  font-size: 12px;
}

.reschedule-controls {
  display: grid;
  gap: 10px;
}

.reschedule-controls .field {
  display: grid;
  gap: 6px;
}

.reschedule-controls input[type='date'] {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff;
  font-weight: 600;
}

.quick-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.schedule-header .close {
  border: none;
  background: var(--surface-soft);
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 700;
  color: var(--text-muted);
}

.schedule-header h2 {
  margin: 0 0 6px;
}

.calendar-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
}

.calendar-controls span {
  font-size: 16px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.calendar-head {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}

.calendar-cell {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 0;
  background: var(--surface);
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.calendar-cell.muted {
  opacity: 0.35;
  cursor: default;
}

.calendar-cell.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.calendar-cell.hasWorkout::after {
  content: '';
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  margin: 6px auto 0;
}

.schedule-list {
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.schedule-list h3 {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--text-muted);
}

.schedule-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.schedule-list li {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
}

.schedule-list li span {
  font-size: 12px;
  color: var(--text-muted);
}

.schedule-list .empty {
  color: var(--text-muted);
  margin: 0;
}

.accent {
  color: var(--accent-strong);
  font-weight: 600;
}

.more {
  border: none;
  background: var(--surface-soft);
  border-radius: 10px;
  padding: 6px 10px;
  font-weight: 700;
  color: var(--text-muted);
}

.more-menu {
  position: relative;
}

.today-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
  display: grid;
  gap: 4px;
  padding: 8px;
  min-width: 180px;
  z-index: 20;
}

.menu-item {
  border: none;
  background: transparent;
  padding: 8px 10px;
  border-radius: 10px;
  text-align: left;
  font-weight: 600;
  color: var(--text-dark);
  cursor: pointer;
}

.menu-item:hover {
  background: var(--surface-muted);
}

.workout-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 6px;
}

.task-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.task-meta-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.workout-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: start;
  background: var(--surface-muted);
  border-radius: 16px;
  padding: 14px;
}

.index {
  width: 30px;
  height: 30px;
  border-radius: 12px;
  background: var(--surface-soft);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--text-muted);
}

.workout-copy h4 {
  margin: 0 0 4px;
  font-size: 15px;
}

.workout-copy p {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.check-toggle {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  display: grid;
  place-items: center;
  color: var(--text-muted);
}

.check-toggle svg {
  width: 16px;
  height: 16px;
  opacity: 0;
}

.workout-item.completed .check-toggle {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.workout-item.completed .check-toggle svg {
  opacity: 1;
}

.workout-empty {
  padding: 12px 4px 4px;
  color: var(--text-muted);
  font-size: 13px;
}

.rest-day-text {
  font-size: 20px;
  font-weight: 700;
  color: #ef4444;
  text-align: center;
  margin: 6px 0;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1100px) {
  .dashboard-main {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .dashboard-secondary {
    grid-template-columns: 1fr;
  }

  .agent-summary-grid,
  .agent-breakdown-grid {
    grid-template-columns: 1fr;
  }

  .side-stack {
    grid-template-rows: auto;
  }

  .chart-summary {
    flex-direction: column;
  }

  .chart-grid {
    min-height: 220px;
  }

  .chart-plot svg {
    min-height: 220px;
  }
}

@media (min-width: 1280px) {
  .dashboard-page {
    padding: 28px clamp(18px, 3vw, 36px) 44px;
    gap: 20px;
  }

  .dashboard-hero {
    gap: 14px;
  }

  .dashboard-hero h1 {
    font-size: clamp(28px, 3.2vw, 36px);
  }

  .subtitle {
    margin-top: 6px;
  }

  .hero-actions,
  .stats-grid,
  .dashboard-main,
  .dashboard-secondary,
  .dashboard-tertiary {
    gap: 12px;
  }

  .dashboard-main {
    align-items: stretch;
  }

  .btn {
    padding: 9px 14px;
    border-radius: 12px;
  }

  .stat-card {
    padding: 16px;
    gap: 10px;
    border-radius: 16px;
  }

  .stat-card h3 {
    font-size: 20px;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .stat-icon svg {
    width: 18px;
    height: 18px;
  }

  .chart-card,
  .workout-card,
  .focus-card,
  .goal-progress-card,
  .nutrition-snapshot-card,
  .agent-success-card {
    padding: 16px;
    border-radius: 18px;
  }

  .chart-card {
    height: 100%;
  }

  .side-stack {
    height: 100%;
  }

  .card-header h2 {
    font-size: 17px;
  }

  .chart-area {
    margin-top: 10px;
    gap: 6px;
  }

  .chart-grid {
    min-height: 188px;
  }

  .chart-plot svg {
    min-height: 188px;
  }

  .chart-card.compact .chart-grid,
  .chart-card.compact .chart-plot svg {
    min-height: 166px;
  }

  .chart-card.empty .chart-grid,
  .chart-card.empty .chart-plot svg {
    min-height: 142px;
  }

  .chart-summary {
    margin-top: 8px;
    padding-top: 10px;
  }

  .side-stack,
  .focus-list,
  .progress-list,
  .snapshot-grid {
    gap: 12px;
  }

  .agent-summary-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .agent-summary-item,
  .agent-breakdown-card {
    padding: 12px 14px;
    border-radius: 14px;
  }

  .agent-summary-item strong {
    font-size: 24px;
  }

  .agent-breakdown-grid {
    gap: 12px;
    margin-top: 12px;
  }

  .focus-list,
  .progress-list,
  .snapshot-grid,
  .workout-list {
    margin-top: 12px;
  }

  .focus-item,
  .snapshot-item {
    padding: 10px 12px;
    border-radius: 14px;
  }

  .task-meta-row {
    margin-top: 8px;
  }

  .workout-list {
    gap: 8px;
    max-height: 196px;
  }

  .workout-item {
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
  }

  .workout-empty {
    padding: 8px 2px 0;
  }

  .index {
    width: 28px;
    height: 28px;
    border-radius: 10px;
  }

  .check-toggle {
    width: 26px;
    height: 26px;
  }

  .card-actions,
  .card-actions.split {
    padding-top: 10px;
  }

  .section-note,
  .snapshot-status {
    margin-top: 12px;
  }
}

@media (max-width: 720px) {
  .dashboard-hero {
    align-items: flex-start;
  }

  .snapshot-grid {
    grid-template-columns: 1fr;
  }

  .agent-summary-grid {
    grid-template-columns: 1fr;
  }

  .agent-meta,
  .agent-breakdown-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .progress-topline,
  .snapshot-topline {
    flex-direction: column;
  }

  .card-actions,
  .card-actions.split {
    flex-direction: column;
  }
}
</style>
