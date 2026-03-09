<template>
  <section class="analytics-page">
    <header class="analytics-header">
      <div>
        <p class="eyebrow">Performance Intelligence</p>
        <h1>Analytics</h1>
        <p class="subtitle">Trends, adherence, and AI recommendations from your actual training data.</p>
      </div>
      <div class="header-right">
        <div class="range-tabs">
          <button
            v-for="option in rangeOptions"
            :key="option.days"
            type="button"
            class="range-tab"
            :class="{ active: rangeDays === option.days }"
            @click="rangeDays = option.days"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </header>

    <section class="stat-grid">
      <article class="stat-card">
        <span>Sessions</span>
        <strong>{{ totalSessions }}</strong>
        <small>{{ completedSessions }} completed · {{ pendingSessions }} pending</small>
        <div class="stat-deltas">
          <span
            v-for="item in sessionDeltaItems"
            :key="`sessions-${item.label}`"
            class="delta-chip"
            :class="item.tone"
          >
            {{ item.label }} {{ item.value }}
          </span>
        </div>
      </article>
      <article class="stat-card">
        <span>Completion Rate</span>
        <strong>{{ completionRate }}%</strong>
        <small>{{ periodLabel }}</small>
        <div class="stat-deltas">
          <span
            v-for="item in completionDeltaItems"
            :key="`completion-${item.label}`"
            class="delta-chip"
            :class="item.tone"
          >
            {{ item.label }} {{ item.value }}
          </span>
        </div>
      </article>
      <article class="stat-card">
        <span>Active Minutes</span>
        <strong>{{ totalMinutes }}</strong>
        <small>{{ avgDailyMinutes }} min/day avg</small>
        <div class="stat-deltas">
          <span
            v-for="item in minutesDeltaItems"
            :key="`minutes-${item.label}`"
            class="delta-chip"
            :class="item.tone"
          >
            {{ item.label }} {{ item.value }}
          </span>
        </div>
      </article>
      <article class="stat-card">
        <span>Calories Burned</span>
        <strong>{{ totalCalories }}</strong>
        <small>Estimated from completed sessions</small>
        <div class="stat-deltas">
          <span
            v-for="item in caloriesDeltaItems"
            :key="`calories-${item.label}`"
            class="delta-chip"
            :class="item.tone"
          >
            {{ item.label }} {{ item.value }}
          </span>
        </div>
      </article>
      <article class="stat-card">
        <span>Current Streak</span>
        <strong>{{ currentStreak }} days</strong>
        <small>Best: {{ bestStreak }} days</small>
        <div class="stat-deltas">
          <span
            v-for="item in streakDeltaItems"
            :key="`streak-${item.label}`"
            class="delta-chip"
            :class="item.tone"
          >
            {{ item.label }} {{ item.value }}
          </span>
        </div>
      </article>
      <article class="stat-card">
        <span>Weight Trend</span>
        <strong>{{ weightTrendLabel }}</strong>
        <small>{{ weightTrendHint }}</small>
        <div class="stat-deltas">
          <span
            v-for="item in weightDeltaItems"
            :key="`weight-${item.label}`"
            class="delta-chip"
            :class="item.tone"
          >
            {{ item.label }} {{ item.value }}
          </span>
        </div>
      </article>
    </section>

    <section class="panel body-panel">
      <div class="panel-head">
        <h2>Body Composition Trends</h2>
        <div class="inline-tabs">
          <button
            v-for="option in bodyRangeOptions"
            :key="option.value"
            type="button"
            class="inline-tab"
            :class="{ active: bodyRange === option.value }"
            @click="bodyRange = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="body-grid">
        <article class="mini-panel">
          <header class="mini-head">
            <strong>Weight (kg)</strong>
            <span v-if="weightSeries.length">{{ weightSeries.length }} records</span>
            <span v-else>No records</span>
          </header>
          <div v-if="weightTrendChart.path" class="line-chart">
            <div class="chart-with-axis">
              <div class="y-axis-labels">
                <span>{{ weightYMaxLabel }}</span>
                <span>{{ weightYMidLabel }}</span>
                <span>{{ weightYMinLabel }}</span>
              </div>
              <div class="chart-core">
                <svg viewBox="0 0 360 170" preserveAspectRatio="none">
                  <g class="grid-lines">
                    <line x1="18" y1="18" x2="342" y2="18"></line>
                    <line x1="18" y1="85" x2="342" y2="85"></line>
                    <line x1="18" y1="152" x2="342" y2="152"></line>
                  </g>
                  <path class="line-area weight" :d="weightTrendChart.area"></path>
                  <path class="line-main weight" :d="weightTrendChart.path"></path>
                  <path class="line-main avg" :d="weightTrendChart.secondaryPath"></path>
                  <circle
                    v-for="point in weightTrendChart.points"
                    :key="`weight-${point.x}-${point.y}`"
                    class="line-point weight"
                    :class="{ clickable: point.interactive }"
                    :cx="point.x"
                    :cy="point.y"
                    r="2.8"
                    @click="openWeightSource(point)"
                  />
                </svg>
                <div class="x-axis-labels">
                  <span>{{ weightXStartLabel }}</span>
                  <span>{{ weightXMidLabel }}</span>
                  <span>{{ weightXEndLabel }}</span>
                </div>
              </div>
            </div>
            <div class="legend-row">
              <span><i class="legend-dot weight"></i>Weight</span>
              <span><i class="legend-dot avg"></i>7-day average</span>
            </div>
            <div class="axis-note">Y-axis: Weight (kg) · X-axis: Date</div>
            <div v-if="weightSparseState" class="chart-inline-state">
              <p>{{ weightSparseState.message }}</p>
              <button class="btn small" type="button" @click="goToPlan">
                {{ weightSparseState.actionLabel }}
              </button>
            </div>
            <p class="chart-caption">{{ bodyRangeCaption }}</p>
          </div>
          <div v-else class="empty-state">
            <p class="empty">Add weight records in Plan to unlock this chart.</p>
            <button class="btn small" type="button" @click="goToPlan">Open Plan</button>
          </div>
        </article>

        <article class="mini-panel">
          <header class="mini-head">
            <strong>Body Fat (%)</strong>
            <span v-if="bodyFatSeries.length">{{ bodyFatSeries.length }} records</span>
            <span v-else>No records</span>
          </header>
          <div v-if="bodyFatTrendChart.path" class="line-chart">
            <svg viewBox="0 0 360 170" preserveAspectRatio="none">
              <path class="line-area bodyfat" :d="bodyFatTrendChart.area"></path>
              <path class="line-main bodyfat" :d="bodyFatTrendChart.path"></path>
              <circle
                v-for="point in bodyFatTrendChart.points"
                :key="`bodyfat-${point.x}-${point.y}`"
                class="line-point bodyfat"
                :class="{ clickable: point.interactive }"
                :cx="point.x"
                :cy="point.y"
                r="2.8"
                @click="openBodyFatSource(point)"
              />
            </svg>
            <div class="chart-axis">
              <span>{{ bodyFatMinLabel }}</span>
              <span>{{ bodyFatMaxLabel }}</span>
            </div>
            <div v-if="bodyFatSparseState" class="chart-inline-state">
              <p>{{ bodyFatSparseState.message }}</p>
              <button class="btn small" type="button" @click="goToPlan">
                {{ bodyFatSparseState.actionLabel }}
              </button>
            </div>
            <p class="chart-caption">{{ bodyRangeCaption }}</p>
          </div>
          <div v-else class="empty-state">
            <p class="empty">No body fat history yet. Update body fat in Plan to start trend tracking.</p>
            <button class="btn small" type="button" @click="goToPlan">Open Plan</button>
          </div>
        </article>
      </div>
    </section>

    <section class="chart-grid">
      <article class="panel weekly-panel">
        <div class="panel-head">
          <h2>Training Volume (Last 8 Weeks)</h2>
          <div class="inline-tabs compact">
            <button
              v-for="option in volumeMetricOptions"
              :key="option.id"
              type="button"
              class="inline-tab"
              :class="{ active: volumeMetric === option.id }"
              @click="volumeMetric = option.id"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <p class="metric-note">{{ volumePeakText }}</p>
        <div class="volume-axis-layout">
          <div class="volume-y-axis">
            <span>{{ formatVolumeAxisTick(volumeAxisMax) }}</span>
            <span>{{ formatVolumeAxisTick(volumeAxisMid) }}</span>
            <span>{{ formatVolumeAxisTick(0) }}</span>
          </div>
          <div class="volume-axis-main">
            <div class="volume-plot">
              <div class="volume-grid-lines">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div class="volume-bars">
                <button
                  v-for="item in weeklyTrendBars"
                  :key="item.label"
                  type="button"
                  class="volume-bar-col"
                  @click="openVolumeSource(item)"
                >
                  <em class="volume-bar-value">{{ formatVolumeValue(item.value, activeVolumeMetric.id) }}</em>
                  <span class="volume-bar-fill" :style="{ height: `${item.height}%` }"></span>
                </button>
              </div>
            </div>
            <div class="volume-x-axis">
              <span v-for="item in weeklyTrendBars" :key="`x-${item.label}`">{{ item.label }}</span>
            </div>
          </div>
        </div>
        <div class="axis-note">Y-axis: {{ volumeAxisLabel }} · X-axis: Week start</div>
        <div v-if="volumeSparseState" class="chart-inline-state">
          <p>{{ volumeSparseState.message }}</p>
          <button class="btn small" type="button" @click="goToLogs">{{ volumeSparseState.actionLabel }}</button>
        </div>
      </article>

      <article class="panel strength-panel">
        <div class="panel-head">
          <h2>Strength Progress (Estimated 1RM)</h2>
          <div class="inline-tabs compact scrollable">
            <button
              v-for="option in strengthMetricOptions"
              :key="option.id"
              type="button"
              class="inline-tab"
              :class="{ active: selectedStrengthMetric === option.id }"
              @click="selectedStrengthMetric = option.id"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div v-if="selectedStrengthSeries.length" class="line-chart strength-chart">
          <div class="chart-with-axis">
            <div class="y-axis-labels">
              <span>{{ selectedStrengthYMaxLabel }}</span>
              <span>{{ selectedStrengthYMidLabel }}</span>
              <span>{{ selectedStrengthYMinLabel }}</span>
            </div>
            <div class="chart-core">
              <svg viewBox="0 0 360 170" preserveAspectRatio="none">
                <g class="grid-lines">
                  <line x1="18" y1="18" x2="342" y2="18"></line>
                  <line x1="18" y1="85" x2="342" y2="85"></line>
                  <line x1="18" y1="152" x2="342" y2="152"></line>
                </g>
                <path
                  v-if="selectedStrengthSeries.length > 1"
                  class="line-area strength"
                  :d="selectedStrengthChart.area"
                ></path>
                <path
                  v-if="selectedStrengthSeries.length > 1"
                  class="line-main strength"
                  :d="selectedStrengthChart.path"
                ></path>
                <circle
                  v-for="point in selectedStrengthChart.points"
                  :key="`strength-${point.x}-${point.y}`"
                  class="line-point strength"
                  :class="{ clickable: point.interactive }"
                  :cx="point.x"
                  :cy="point.y"
                  r="3.2"
                  @click="openStrengthSource(point)"
                />
              </svg>
              <div class="x-axis-labels">
                <span>{{ selectedStrengthXStartLabel }}</span>
                <span>{{ selectedStrengthXMidLabel }}</span>
                <span>{{ selectedStrengthXEndLabel }}</span>
              </div>
            </div>
          </div>
          <div v-if="strengthSparseState" class="chart-inline-state">
            <p>{{ strengthSparseState.message }}</p>
            <button class="btn small" type="button" @click="goToLogs">
              {{ strengthSparseState.actionLabel }}
            </button>
          </div>
          <p v-if="selectedStrengthLatestSummary" class="latest-strength-note">
            {{ selectedStrengthLatestSummary }}
          </p>
          <div class="axis-note">Y-axis: Estimated 1RM (kg) · X-axis: Date</div>
          <p class="chart-caption">Estimated from your logged sets using the selected lift.</p>
        </div>
        <div v-else class="strength-empty-state">
          <div class="strength-empty-card">
            <div class="strength-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 17.5h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                <path
                  d="M6.5 15l3.4-3.4 3.1 2.8 4.5-5"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle cx="6.5" cy="15" r="1.2" fill="currentColor" />
                <circle cx="9.9" cy="11.6" r="1.2" fill="currentColor" />
                <circle cx="13" cy="14.4" r="1.2" fill="currentColor" />
                <circle cx="17.5" cy="9.4" r="1.2" fill="currentColor" />
              </svg>
            </div>
            <strong>No completed strength records yet</strong>
            <p>
              Complete bench, squat, deadlift, press, or row sessions to unlock your 1RM trend.
            </p>
            <button class="btn small" type="button" @click="goToLogs">Open Workout Log</button>
          </div>
        </div>
      </article>
    </section>

    <section class="chart-grid support-grid">
      <article class="panel consistency-panel">
        <div class="consistency-head">
          <h2>Training Consistency</h2>
          <div class="consistency-metrics">
            <span class="metric-chip">
              <em>Current streak</em>
              <strong>{{ consistencyCurrentStreak }} days</strong>
            </span>
            <span class="metric-chip">
              <em>Best streak</em>
              <strong>{{ consistencyBestStreak }} days</strong>
            </span>
            <span class="metric-chip">
              <em>Active days</em>
              <strong>{{ consistencyActiveDays }} / 84</strong>
            </span>
          </div>
        </div>

        <div class="consistency-map">
          <div class="weekday-col">
            <span v-for="label in weekdayLabels" :key="`weekday-${label.row}`">{{ label.text }}</span>
          </div>

          <div class="heatmap-scroll">
            <div class="heatmap-canvas">
              <div class="month-grid">
                <span
                  v-for="tick in consistencyMonthTicks"
                  :key="tick.key"
                  class="month-tick"
                  :style="{ gridColumn: tick.column }"
                >
                  {{ tick.label }}
                </span>
              </div>

              <div class="heatmap-grid">
                <button
                  v-for="cell in consistencyCells"
                  :key="cell.key"
                  class="heat-cell"
                  :class="[ `lv-${cell.level}`, { today: cell.isToday, future: cell.isFuture } ]"
                  type="button"
                  @mouseenter="showConsistencyTooltip($event, cell)"
                  @mousemove="moveConsistencyTooltip($event)"
                  @mouseleave="hideConsistencyTooltip"
                  @click="openConsistencySource(cell)"
                ></button>
              </div>
            </div>
          </div>
        </div>

        <div class="heatmap-meta">
          <span>Last 12 weeks</span>
          <span>Based on completed workouts only</span>
        </div>

        <div class="legend-row consistency-legend">
          <span><i class="legend-dot lv0"></i>0 No workout</span>
          <span><i class="legend-dot lv1"></i>1 1 session</span>
          <span><i class="legend-dot lv2"></i>2 2 sessions</span>
          <span><i class="legend-dot lv3"></i>3+ 3+ sessions</span>
        </div>

        <div class="mini-weekly-trend">
          <span
            v-for="week in consistencyWeeklyBars"
            :key="week.key"
            class="mini-bar"
            :title="week.tooltip"
          >
            <em :style="{ height: `${week.height}%` }"></em>
          </span>
        </div>
        <div class="mini-weekly-meta">
          <span>Weekly active days trend</span>
          <span>0-7 days/week</span>
        </div>
        <p v-if="consistencySparseHint" class="consistency-hint">Start logging workouts to build your consistency map.</p>

        <div
          v-if="consistencyTooltip.visible"
          class="heatmap-tooltip"
          :style="{ left: `${consistencyTooltip.x}px`, top: `${consistencyTooltip.y}px` }"
        >
          <p>{{ consistencyTooltip.dateLabel }}</p>
          <p>{{ consistencyTooltip.sessionsLabel }}</p>
          <p>{{ consistencyTooltip.minutesLabel }}</p>
          <p>{{ consistencyTooltip.summaryLabel }}</p>
        </div>
      </article>

      <article class="panel circumference-panel">
        <div class="panel-head">
          <h2>Body Circumference</h2>
          <span>Latest snapshot</span>
        </div>
        <div v-if="circumferenceEntries.length" class="circumference-bars">
          <article v-for="item in circumferenceEntries" :key="item.id" class="circumference-row">
            <span class="name">{{ item.label }}</span>
            <div class="track">
              <span :style="{ width: `${circumferencePercent(item.value)}%` }"></span>
            </div>
            <strong>{{ item.value.toFixed(1) }} cm</strong>
          </article>
        </div>
        <p v-else class="empty">No circumference values yet. Add them in Plan -> Body Circumference.</p>
      </article>
    </section>

    <section v-if="sourcePanel.visible" class="panel source-panel">
      <div class="panel-head">
        <div class="source-head-copy">
          <h2>{{ sourcePanel.title }}</h2>
          <p class="source-subtitle">{{ sourcePanel.subtitle }}</p>
        </div>
        <div class="source-actions">
          <button
            v-if="sourcePanel.targetRoute"
            class="btn small"
            type="button"
            @click="openSourceRoute"
          >
            {{ sourcePanel.targetLabel }}
          </button>
          <button class="btn small" type="button" @click="closeSourcePanel">Close</button>
        </div>
      </div>
      <div v-if="sourcePanel.items.length" class="source-list">
        <article v-for="item in sourcePanel.items" :key="item.id" class="source-item">
          <div class="source-item-head">
            <strong>{{ item.title }}</strong>
            <span>{{ item.meta }}</span>
          </div>
          <p>{{ item.description }}</p>
        </article>
      </div>
      <div v-else class="empty-state">
        <p class="empty">{{ sourcePanel.emptyMessage }}</p>
        <button
          v-if="sourcePanel.targetRoute"
          class="btn small"
          type="button"
          @click="openSourceRoute"
        >
          {{ sourcePanel.targetLabel }}
        </button>
      </div>
    </section>

    <section class="panel challenge-panel">
      <div class="panel-head">
        <h2>Challenge Adherence</h2>
        <span>{{ challengeCards.length }} tracked metrics</span>
      </div>
      <div class="challenge-list">
        <article v-for="item in challengeCards" :key="item.id" class="challenge-card">
          <header>
            <strong>{{ item.title }}</strong>
            <span>{{ item.cadence }}</span>
          </header>
          <p>{{ item.actualLabel }} / {{ item.targetLabel }}</p>
          <div class="progress-track">
            <span :style="{ width: `${item.progressPercent}%` }"></span>
          </div>
          <small>{{ item.statusText }}</small>
        </article>
      </div>
      <p v-if="!challengeCards.length" class="empty">No challenge targets selected in Plan yet.</p>
    </section>

    <section class="panel ai-panel">
      <div class="panel-head">
        <h2>AI Conclusions & Suggestions</h2>
        <div class="ai-head-actions">
          <span>{{ aiMetaLabel }}</span>
          <button class="btn primary small" type="button" :disabled="aiLoading" @click="fetchAiInsight">
            {{ aiLoading ? 'Analyzing...' : aiInsight ? 'Regenerate Insight' : 'Get AI Insight' }}
          </button>
        </div>
      </div>
      <p v-if="aiError" class="ai-error">{{ aiError }}</p>
      <div v-else-if="aiInsight" class="ai-copy">
        <p v-for="(line, index) in aiInsightLines" :key="`line-${index}`">{{ line }}</p>
      </div>
      <p v-else class="empty">No AI insight yet. Click "Get AI Insight" to generate one.</p>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUserStorageKey } from '@/lib/userStorage'

const AUTH_SERVER_ORIGIN = import.meta.env.VITE_AUTH_SERVER_ORIGIN || 'http://localhost:4000'
const CALORIES_PER_MINUTE = 6
const DAY_MS = 86400000

const challengeMetaMap = {
  activity: { title: 'Activity burn', unit: 'kcal', cadence: 'Daily' },
  intake: { title: 'Food intake', unit: 'kcal', cadence: 'Daily' },
  deficit: { title: 'Calorie deficit', unit: 'kcal', cadence: 'Daily' },
  duration: { title: 'Workout duration', unit: 'min', cadence: 'Daily' },
  burn: { title: 'Exercise burn', unit: 'kcal', cadence: 'Daily' },
  fatBurn: { title: 'Fat burn', unit: 'kcal', cadence: 'Daily' },
  runDistance: { title: 'Running distance', unit: 'km', cadence: 'Weekly' },
  walkDistance: { title: 'Walking distance', unit: 'km', cadence: 'Weekly' },
  rideDistance: { title: 'Cycling distance', unit: 'km', cadence: 'Weekly' },
  steps: { title: 'Step count', unit: 'steps', cadence: 'Daily' },
  strengthSets: { title: 'Strength sets', unit: 'sets', cadence: 'Weekly' }
}

const rangeOptions = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 }
]

const bodyRangeOptions = [
  { label: '7D', value: '7' },
  { label: '30D', value: '30' },
  { label: '90D', value: '90' },
  { label: 'ALL', value: 'all' }
]

const volumeMetricOptions = [
  { id: 'minutes', label: 'Minutes' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'load', label: 'Load' }
]

const strengthMetricOptions = [
  { id: 'bench', label: 'Bench', pattern: /bench/i },
  { id: 'squat', label: 'Squat', pattern: /squat/i },
  { id: 'deadlift', label: 'Deadlift', pattern: /deadlift/i },
  { id: 'press', label: 'Press', pattern: /overhead press|shoulder press|military press|dumbbell shoulder press/i },
  { id: 'row', label: 'Row', pattern: /row/i }
]

const circumferenceConfig = [
  { id: 'waist', label: 'Waist' },
  { id: 'chest', label: 'Chest' },
  { id: 'hip', label: 'Hip' },
  { id: 'thigh', label: 'Thigh' },
  { id: 'arm', label: 'Arm' },
  { id: 'calf', label: 'Calf' }
]

function createEmptyAnalyticsPlan() {
  return {
    challengeValues: {},
    selectedChallenges: [],
    weight: { current: '' },
    bodyMetrics: { bodyFat: '' },
    weightRecords: [],
    dailyLogs: {},
    bodyCircumferenceLog: {
      chest: '',
      waist: '',
      hip: '',
      thigh: '',
      calf: '',
      arm: ''
    },
    performance: { strength: {} }
  }
}

const auth = useAuthStore()
const router = useRouter()
const logsKey = computed(() => getUserStorageKey('pf_workout_logs', auth.user))
const planKey = computed(() => getUserStorageKey('pf_plan_state', auth.user))

const logs = ref([])
const planState = ref(createEmptyAnalyticsPlan())

const rangeDays = ref(30)
const bodyRange = ref('90')
const volumeMetric = ref('minutes')
const selectedStrengthMetric = ref('bench')

const aiInsight = ref('')
const aiMeta = ref({ source: '', generatedAt: '' })
const aiLoading = ref(false)
const aiError = ref('')
const consistencyTooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  dateLabel: '',
  sessionsLabel: '',
  minutesLabel: '',
  summaryLabel: ''
})
const sourcePanel = ref({
  visible: false,
  title: '',
  subtitle: '',
  items: [],
  targetRoute: null,
  targetLabel: '',
  emptyMessage: 'No source records for this selection.'
})

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

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

function formatMonthShort(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)
}

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function startOfWeekMonday(date) {
  const next = startOfDay(date)
  const day = next.getDay()
  const offset = (day + 6) % 7
  next.setDate(next.getDate() - offset)
  return next
}

function shiftDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function shiftYears(date, years) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

function formatSignedNumber(value, options = {}) {
  if (value == null || Number.isNaN(Number(value))) return '--'
  const numeric = Number(value)
  const decimals = Number.isInteger(options.decimals) ? options.decimals : 0
  const suffix = options.suffix || ''
  const sign = numeric > 0 ? '+' : ''
  return `${sign}${numeric.toFixed(decimals)}${suffix}`
}

function createDeltaItems(current, previous, yearAgo, options = {}) {
  const decimals = Number.isInteger(options.decimals) ? options.decimals : 0
  const suffix = options.suffix || ''
  const positiveIsGood = options.positiveIsGood !== false
  const colorize = options.colorize !== false

  const makeItem = (label, baseline) => {
    if (current == null || baseline == null || Number.isNaN(Number(current)) || Number.isNaN(Number(baseline))) {
      return { label, value: '--', tone: 'neutral' }
    }
    const diff = Number((Number(current) - Number(baseline)).toFixed(decimals))
    if (diff === 0) {
      return { label, value: `0${suffix}`, tone: 'neutral' }
    }
    let tone = 'neutral'
    if (colorize) {
      const positive = diff > 0
      tone = positiveIsGood ? (positive ? 'up' : 'down') : (positive ? 'down' : 'up')
    }
    return {
      label,
      value: formatSignedNumber(diff, { decimals, suffix }),
      tone
    }
  }

  return [makeItem('Prev', previous), makeItem('YoY', yearAgo)]
}

function parseDurationMinutes(workout) {
  if (Array.isArray(workout?.exercises) && workout.exercises.length) {
    const fromExercises = workout.exercises.reduce((sum, exercise) => {
      const hours = Number(exercise?.durationHours) || 0
      const mins = Number(exercise?.durationMinutes) || 0
      return sum + hours * 60 + mins
    }, 0)
    if (fromExercises > 0) return fromExercises
  }
  const text = String(workout?.duration || '')
  const hoursMatch = text.match(/(\d+)\s*h/i)
  const minsMatch = text.match(/(\d+)\s*m/i)
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0
  const mins = minsMatch ? Number(minsMatch[1]) : 0
  return hours * 60 + mins
}

function getExerciseLoad(exercise) {
  const sets = Number(exercise?.sets) || 0
  const reps = Number(exercise?.reps) || 0
  const weight = Number(exercise?.weight) || 0
  const load = sets * reps * weight
  return Number.isFinite(load) ? load : 0
}

function getWorkoutLoad(workout) {
  if (!Array.isArray(workout?.exercises)) return 0
  return workout.exercises.reduce((sum, exercise) => sum + getExerciseLoad(exercise), 0)
}

function estimateOneRm(weight, reps) {
  if (!weight || !reps) return 0
  const safeReps = Math.min(Math.max(Number(reps) || 0, 1), 15)
  const oneRm = Number(weight) * (1 + safeReps / 30)
  return Number.isFinite(oneRm) ? oneRm : 0
}

function normalizeWorkout(item) {
  const tags = Array.isArray(item?.tags)
    ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : typeof item?.tags === 'string'
      ? item.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : []
  return {
    id: item?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: item?.date || '',
    title: item?.title || 'Workout Session',
    subtitle: item?.subtitle || '',
    duration: item?.duration || '',
    tags,
    status: item?.status === 'completed' ? 'completed' : 'pending',
    exercises: Array.isArray(item?.exercises) ? item.exercises : []
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
    console.error('Failed to parse logs', error)
    logs.value = []
  }
}

function loadPlan() {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(planKey.value)
  if (!raw) {
    planState.value = createEmptyAnalyticsPlan()
    return
  }
  try {
    const data = JSON.parse(raw)
    const next = createEmptyAnalyticsPlan()
    next.challengeValues = data?.challengeValues || {}
    next.selectedChallenges = Array.isArray(data?.selectedChallenges) ? data.selectedChallenges : []
    next.weight = { ...next.weight, ...(data?.weight || {}) }
    next.bodyMetrics = { ...next.bodyMetrics, ...(data?.bodyMetrics || {}) }
    next.weightRecords = Array.isArray(data?.weightRecords) ? data.weightRecords : []
    next.dailyLogs = data?.dailyLogs || {}
    next.bodyCircumferenceLog = {
      ...next.bodyCircumferenceLog,
      ...(data?.bodyCircumferenceLog || {})
    }
    next.performance = {
      ...next.performance,
      ...(data?.performance || {}),
      strength: {
        ...(next.performance?.strength || {}),
        ...(data?.performance?.strength || {})
      }
    }
    planState.value = next
  } catch (error) {
    console.error('Failed to parse plan state', error)
    planState.value = createEmptyAnalyticsPlan()
  }
}

function handleStorage(event) {
  if (!event || event.key === logsKey.value || event.key === planKey.value) {
    loadLogs()
    loadPlan()
  }
}

const today = computed(() => startOfDay(new Date()))
const todayIso = computed(() => toIsoDate(today.value))

const rangeStartDate = computed(() => {
  const value = new Date(today.value)
  value.setDate(value.getDate() - (rangeDays.value - 1))
  return startOfDay(value)
})
const rangeEndDate = computed(() => {
  const value = new Date(today.value)
  value.setHours(23, 59, 59, 999)
  return value
})

const previousRangeEndDate = computed(() => endOfDay(shiftDays(rangeStartDate.value, -1)))
const previousRangeStartDate = computed(() => startOfDay(shiftDays(previousRangeEndDate.value, -(rangeDays.value - 1))))
const yearAgoRangeStartDate = computed(() => startOfDay(shiftYears(rangeStartDate.value, -1)))
const yearAgoRangeEndDate = computed(() => endOfDay(shiftYears(rangeEndDate.value, -1)))

const periodLabel = computed(() => `Last ${rangeDays.value} days`)
const periodStartIso = computed(() => toIsoDate(rangeStartDate.value))
const periodEndIso = computed(() => toIsoDate(rangeEndDate.value))

function getLogsWithinRange(startDate, endDate) {
  return logs.value.filter((item) => {
    const date = parseLocalDate(item.date)
    return date && date >= startDate && date <= endDate
  })
}

function getCompletedLogDateSet(items) {
  const set = new Set()
  items.forEach((item) => {
    if (item.status === 'completed' && item.date) set.add(item.date)
  })
  return set
}

function computeCurrentStreakFromSet(dateSet, endDate) {
  let streak = 0
  const cursor = startOfDay(endDate)
  while (dateSet.has(toIsoDate(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function computeBestStreakFromSet(dateSet, startDate, endDate) {
  let best = 0
  let current = 0
  const cursor = startOfDay(startDate)
  const end = startOfDay(endDate)
  while (cursor <= end) {
    const iso = toIsoDate(cursor)
    if (dateSet.has(iso)) {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 0
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return best
}

function getWeightSeriesWithin(startDate, endDate) {
  return rawBodyRecords.value
    .filter((item) => item.weight != null && item.date >= startDate && item.date <= endDate)
    .map((item) => ({ date: item.date, value: Number(item.weight) }))
}

function buildWindowStats(startDate, endDate) {
  const windowLogs = getLogsWithinRange(startDate, endDate)
  const completed = windowLogs.filter((item) => item.status === 'completed')
  const dateSet = getCompletedLogDateSet(windowLogs)
  const totalMinutesValue = completed.reduce((sum, item) => sum + parseDurationMinutes(item), 0)
  const weightSeries = getWeightSeriesWithin(startDate, endDate)

  return {
    totalSessions: windowLogs.length,
    completionRate: windowLogs.length ? Math.round((completed.length / windowLogs.length) * 100) : 0,
    totalMinutes: totalMinutesValue,
    totalCalories: Math.round(totalMinutesValue * CALORIES_PER_MINUTE),
    currentStreak: computeCurrentStreakFromSet(dateSet, endDate),
    activeDays: dateSet.size,
    bestStreak: computeBestStreakFromSet(dateSet, startDate, endDate),
    latestWeight: weightSeries.length ? weightSeries[weightSeries.length - 1].value : null
  }
}

const logsInRange = computed(() =>
  logs.value
    .filter((item) => {
      const date = parseLocalDate(item.date)
      return date && date >= rangeStartDate.value && date <= rangeEndDate.value
    })
    .sort((a, b) => (a.date > b.date ? 1 : -1))
)

const completedLogsInRange = computed(() =>
  logsInRange.value.filter((item) => item.status === 'completed')
)

const totalSessions = computed(() => logsInRange.value.length)
const completedSessions = computed(() => completedLogsInRange.value.length)
const pendingSessions = computed(() => totalSessions.value - completedSessions.value)
const completionRate = computed(() => {
  if (!totalSessions.value) return 0
  return Math.round((completedSessions.value / totalSessions.value) * 100)
})

const totalMinutes = computed(() =>
  completedLogsInRange.value.reduce((sum, item) => sum + parseDurationMinutes(item), 0)
)
const avgDailyMinutes = computed(() => Math.round(totalMinutes.value / rangeDays.value))
const totalCalories = computed(() => Math.round(totalMinutes.value * CALORIES_PER_MINUTE))

const completionDates = computed(() => {
  const set = new Set()
  logsInRange.value.forEach((item) => {
    if (item.status === 'completed') set.add(item.date)
  })
  return set
})

const currentStreak = computed(() => {
  let streak = 0
  const cursor = new Date(today.value)
  while (completionDates.value.has(toIsoDate(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
})

const bestStreak = computed(() => {
  const dates = Array.from(completionDates.value).sort()
  if (!dates.length) return 0
  let best = 1
  let current = 1
  for (let i = 1; i < dates.length; i += 1) {
    const prev = parseLocalDate(dates[i - 1])
    const currentDate = parseLocalDate(dates[i])
    if (!prev || !currentDate) continue
    const diff = Math.round((currentDate.getTime() - prev.getTime()) / DAY_MS)
    if (diff === 1) {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 1
    }
  }
  return best
})

const weeklyTrend = computed(() => {
  const buckets = []
  const latestWeekStart = new Date(today.value)
  latestWeekStart.setDate(latestWeekStart.getDate() - latestWeekStart.getDay())
  latestWeekStart.setHours(0, 0, 0, 0)

  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(latestWeekStart)
    start.setDate(latestWeekStart.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    const weekLogs = logs.value.filter((item) => {
      const date = parseLocalDate(item.date)
      return date && date >= start && date <= end && item.status === 'completed'
    })

    const sessions = weekLogs.length
    const minutes = weekLogs.reduce((sum, item) => sum + parseDurationMinutes(item), 0)
    const load = weekLogs.reduce((sum, item) => sum + getWorkoutLoad(item), 0)

    buckets.push({
      key: toIsoDate(start),
      start,
      end,
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      sessions,
      minutes,
      load
    })
  }

  return buckets
})

const activeVolumeMetric = computed(() => {
  return volumeMetricOptions.find((item) => item.id === volumeMetric.value) || volumeMetricOptions[0]
})

function getVolumeAxisMax(maxValue, metricId) {
  const value = Number(maxValue) || 0
  if (metricId === 'sessions') {
    if (value <= 0) return 4
    return Math.max(4, Math.ceil(value))
  }
  if (value <= 0) return metricId === 'load' ? 1000 : 60
  const roughHalf = value / 2
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughHalf, 1)))
  const normalized = roughHalf / magnitude
  let nice = 1
  if (normalized <= 1) nice = 1
  else if (normalized <= 2) nice = 2
  else if (normalized <= 5) nice = 5
  else nice = 10
  return nice * magnitude * 2
}

const weeklyTrendBars = computed(() => {
  const metricId = activeVolumeMetric.value.id
  const maxValue = Math.max(...weeklyTrend.value.map((item) => Number(item[metricId]) || 0), 0)
  const axisMax = getVolumeAxisMax(maxValue, metricId)
  return weeklyTrend.value.map((item) => {
    const value = Number(item[metricId]) || 0
    return {
      ...item,
      value,
      height: axisMax > 0 ? Math.max(0, Math.round((value / axisMax) * 100)) : 0
    }
  })
})

const volumeRawMax = computed(() =>
  Math.max(...weeklyTrendBars.value.map((item) => Number(item.value) || 0), 0)
)

const volumeAxisMax = computed(() =>
  getVolumeAxisMax(volumeRawMax.value, activeVolumeMetric.value.id)
)

const volumeAxisMid = computed(() => volumeAxisMax.value / 2)

const volumeAxisLabel = computed(() => {
  const metricId = activeVolumeMetric.value.id
  if (metricId === 'minutes') return 'Minutes'
  if (metricId === 'sessions') return 'Sessions'
  return 'Load (kg)'
})

function formatVolumeValue(value, metricId) {
  const rounded = Math.round(value || 0)
  if (metricId === 'load') {
    if (rounded >= 1000) return `${(rounded / 1000).toFixed(1)}k`
    return `${rounded}`
  }
  return `${rounded}`
}

function formatVolumeAxisTick(value) {
  const metricId = activeVolumeMetric.value.id
  if (metricId === 'sessions') return `${Math.round(value)}`
  if (metricId === 'load') {
    const rounded = Math.round(value || 0)
    if (rounded >= 1000) return `${(rounded / 1000).toFixed(1)}k`
    return `${rounded}`
  }
  return `${Math.round(value || 0)}`
}

const volumePeakText = computed(() => {
  const metricId = activeVolumeMetric.value.id
  const peak = Math.max(...weeklyTrend.value.map((item) => Number(item[metricId]) || 0), 0)
  if (metricId === 'minutes') return `${formatVolumeValue(peak, metricId)} min peak`
  if (metricId === 'sessions') return `${formatVolumeValue(peak, metricId)} sessions peak`
  return `${formatVolumeValue(peak, metricId)} kg peak`
})

const volumeSparseState = computed(() => {
  const activeWeeks = weeklyTrendBars.value.filter((item) => item.value > 0).length
  if (activeWeeks >= 2) return null
  return {
    message: 'Need a few more completed weeks to make this trend reliable.',
    actionLabel: 'Open Workout Log'
  }
})

const muscleDistribution = computed(() => {
  const counts = {}
  completedLogsInRange.value.forEach((item) => {
    const tags = Array.isArray(item.tags) ? item.tags : []
    tags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1
    })
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }))
})

const rawBodyRecords = computed(() => {
  const records = Array.isArray(planState.value.weightRecords) ? planState.value.weightRecords : []
  const byDate = new Map()
  records.forEach((item) => {
    const date = parseLocalDate(item?.date)
    if (!date) return
    const iso = toIsoDate(date)
    byDate.set(iso, {
      date,
      iso,
      weight: toNumber(item?.weight),
      bodyFat: toNumber(item?.bodyFat)
    })
  })
  return Array.from(byDate.values()).sort((a, b) => a.date - b.date)
})

const weightRangeSeries = computed(() => {
  const points = rawBodyRecords.value
    .filter((item) => item.weight != null && item.date >= rangeStartDate.value && item.date <= rangeEndDate.value)
    .map((item) => ({ date: item.date, value: Number(item.weight) }))
  if (points.length) return points
  const current = toNumber(planState.value.weight?.current)
  if (current != null && current > 0) {
    return [{ date: new Date(today.value), value: current }]
  }
  return []
})

const bodyFatRangeSeries = computed(() =>
  rawBodyRecords.value
    .filter((item) => item.bodyFat != null && item.date >= rangeStartDate.value && item.date <= rangeEndDate.value)
    .map((item) => ({ date: item.date, value: Number(item.bodyFat) }))
)

const previousWeightSeries = computed(() => {
  const previousEnd = new Date(rangeStartDate.value)
  previousEnd.setDate(previousEnd.getDate() - 1)
  previousEnd.setHours(23, 59, 59, 999)

  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousEnd.getDate() - (rangeDays.value - 1))
  previousStart.setHours(0, 0, 0, 0)

  return rawBodyRecords.value
    .filter((item) => item.weight != null && item.date >= previousStart && item.date <= previousEnd)
    .map((item) => ({ date: item.date, value: Number(item.weight) }))
})

const weightTrend = computed(() => {
  if (!weightRangeSeries.value.length) return null
  const currentFirst = weightRangeSeries.value[0].value
  const currentLast = weightRangeSeries.value[weightRangeSeries.value.length - 1].value
  const previousLast = previousWeightSeries.value.length
    ? previousWeightSeries.value[previousWeightSeries.value.length - 1].value
    : currentFirst
  return {
    currentFirst,
    currentLast,
    changeKg: Number((currentLast - previousLast).toFixed(1))
  }
})

const weightTrendLabel = computed(() => {
  if (!weightTrend.value) return '--'
  const sign = weightTrend.value.changeKg > 0 ? '+' : ''
  return `${sign}${weightTrend.value.changeKg} kg`
})

const weightTrendHint = computed(() => {
  if (!weightTrend.value) return 'No weight records in this period'
  if (weightTrend.value.changeKg > 0) return 'Up versus previous period'
  if (weightTrend.value.changeKg < 0) return 'Down versus previous period'
  return 'Stable versus previous period'
})

const previousPeriodStats = computed(() =>
  buildWindowStats(previousRangeStartDate.value, previousRangeEndDate.value)
)

const yearAgoPeriodStats = computed(() =>
  buildWindowStats(yearAgoRangeStartDate.value, yearAgoRangeEndDate.value)
)

const currentWeightValue = computed(() =>
  weightRangeSeries.value.length ? weightRangeSeries.value[weightRangeSeries.value.length - 1].value : null
)

const sessionDeltaItems = computed(() =>
  createDeltaItems(totalSessions.value, previousPeriodStats.value.totalSessions, yearAgoPeriodStats.value.totalSessions)
)

const completionDeltaItems = computed(() =>
  createDeltaItems(
    completionRate.value,
    previousPeriodStats.value.completionRate,
    yearAgoPeriodStats.value.completionRate,
    { suffix: ' pp' }
  )
)

const minutesDeltaItems = computed(() =>
  createDeltaItems(totalMinutes.value, previousPeriodStats.value.totalMinutes, yearAgoPeriodStats.value.totalMinutes, {
    suffix: ' min'
  })
)

const caloriesDeltaItems = computed(() =>
  createDeltaItems(
    totalCalories.value,
    previousPeriodStats.value.totalCalories,
    yearAgoPeriodStats.value.totalCalories,
    { suffix: ' kcal' }
  )
)

const streakDeltaItems = computed(() =>
  createDeltaItems(
    currentStreak.value,
    previousPeriodStats.value.currentStreak,
    yearAgoPeriodStats.value.currentStreak,
    { suffix: ' d' }
  )
)

const weightDeltaItems = computed(() =>
  createDeltaItems(
    currentWeightValue.value,
    previousPeriodStats.value.latestWeight,
    yearAgoPeriodStats.value.latestWeight,
    { suffix: ' kg', decimals: 1, colorize: false }
  )
)

const bodyRangeStartDate = computed(() => {
  if (bodyRange.value === 'all') return null
  const days = Number.parseInt(bodyRange.value, 10)
  if (!Number.isInteger(days) || days <= 0) return null
  const start = new Date(today.value)
  start.setDate(start.getDate() - (days - 1))
  return start
})

const bodyRecordsInRange = computed(() =>
  rawBodyRecords.value.filter((item) => {
    if (bodyRangeStartDate.value && item.date < bodyRangeStartDate.value) return false
    return item.date <= rangeEndDate.value
  })
)

const weightSeries = computed(() => {
  const points = bodyRecordsInRange.value
    .filter((item) => item.weight != null)
    .map((item) => ({ date: item.date, value: Number(item.weight) }))
  if (points.length) return points
  const current = toNumber(planState.value.weight?.current)
  if (current != null && current > 0) {
    return [{ date: new Date(today.value), value: current }]
  }
  return []
})

const weightAverageSeries = computed(() => {
  const source = weightSeries.value
  if (!source.length) return []
  return source.map((point) => {
    const windowStart = point.date.getTime() - 6 * DAY_MS
    const values = source
      .filter((item) => item.date.getTime() >= windowStart && item.date.getTime() <= point.date.getTime())
      .map((item) => item.value)
    const average = values.reduce((sum, value) => sum + value, 0) / values.length
    return { date: point.date, value: Number(average.toFixed(1)) }
  })
})

const bodyFatSeries = computed(() => {
  const points = bodyRecordsInRange.value
    .filter((item) => item.bodyFat != null)
    .map((item) => ({ date: item.date, value: Number(item.bodyFat) }))
  if (points.length) return points
  const current = toNumber(planState.value.bodyMetrics?.bodyFat)
  if (current != null && current > 0) {
    return [{ date: new Date(today.value), value: current }]
  }
  return []
})

function buildSeriesChart(series, options = {}) {
  const includeArea = options.includeArea !== false
  if (!series.length) {
    return { path: '', area: '', points: [], min: NaN, max: NaN }
  }

  const width = 360
  const height = 170
  const padding = 18
  const values = series.map((item) => item.value).filter((value) => Number.isFinite(value))
  if (!values.length) {
    return { path: '', area: '', points: [], min: NaN, max: NaN }
  }

  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const spread = rawMax - rawMin
  const pad = spread > 0 ? spread * 0.12 : Math.max(Math.abs(rawMax) * 0.06, 0.5)
  const scaledMin = rawMin - pad
  const scaledMax = rawMax + pad
  const scaledRange = scaledMax - scaledMin || 1

  const step = series.length > 1 ? (width - padding * 2) / (series.length - 1) : 0
  const points = series.map((item, index) => {
    const x = padding + index * step
    const y = height - padding - ((item.value - scaledMin) / scaledRange) * (height - padding * 2)
    return { x, y, value: item.value, date: item.date, interactive: Boolean(item.date) }
  })

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  let area = ''
  if (includeArea && points.length) {
    const first = points[0]
    const last = points[points.length - 1]
    area = `${path} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`
  }

  return { path, area, points, min: rawMin, max: rawMax }
}

function buildDualSeriesChart(primarySeries, secondarySeries) {
  if (!primarySeries.length) {
    return { path: '', secondaryPath: '', area: '', points: [], min: NaN, max: NaN }
  }

  const width = 360
  const height = 170
  const padding = 18
  const primaryValues = primarySeries.map((item) => item.value).filter((value) => Number.isFinite(value))
  const secondaryValues = secondarySeries.map((item) => item.value).filter((value) => Number.isFinite(value))
  const allValues = [...primaryValues, ...secondaryValues]
  if (!allValues.length) {
    return { path: '', secondaryPath: '', area: '', points: [], min: NaN, max: NaN }
  }

  const rawMin = Math.min(...allValues)
  const rawMax = Math.max(...allValues)
  const spread = rawMax - rawMin
  const pad = spread > 0 ? spread * 0.12 : Math.max(Math.abs(rawMax) * 0.06, 0.5)
  const scaledMin = rawMin - pad
  const scaledMax = rawMax + pad
  const scaledRange = scaledMax - scaledMin || 1

  const step = primarySeries.length > 1 ? (width - padding * 2) / (primarySeries.length - 1) : 0

  const primaryPoints = primarySeries.map((item, index) => {
    const x = padding + index * step
    const y = height - padding - ((item.value - scaledMin) / scaledRange) * (height - padding * 2)
    return { x, y, value: item.value, date: item.date, interactive: Boolean(item.date) }
  })

  const secondaryPoints = secondarySeries.map((item, index) => {
    const x = padding + index * step
    const y = height - padding - ((item.value - scaledMin) / scaledRange) * (height - padding * 2)
    return { x, y, value: item.value, date: item.date }
  })

  const path = primaryPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  const secondaryPath = secondaryPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  const first = primaryPoints[0]
  const last = primaryPoints[primaryPoints.length - 1]
  const area = `${path} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`

  return {
    path,
    secondaryPath,
    area,
    points: primaryPoints,
    min: rawMin,
    max: rawMax
  }
}

const weightTrendChart = computed(() =>
  buildDualSeriesChart(weightSeries.value, weightAverageSeries.value)
)
const bodyFatTrendChart = computed(() =>
  buildSeriesChart(bodyFatSeries.value, { includeArea: true })
)

const weightYMinValue = computed(() =>
  Number.isFinite(weightTrendChart.value.min) ? Number(weightTrendChart.value.min.toFixed(1)) : null
)
const weightYMaxValue = computed(() =>
  Number.isFinite(weightTrendChart.value.max) ? Number(weightTrendChart.value.max.toFixed(1)) : null
)
const weightYMidValue = computed(() => {
  if (weightYMinValue.value == null || weightYMaxValue.value == null) return null
  return Number(((weightYMinValue.value + weightYMaxValue.value) / 2).toFixed(1))
})
const weightYMinLabel = computed(() =>
  weightYMinValue.value == null ? '--' : `${weightYMinValue.value.toFixed(1)}`
)
const weightYMidLabel = computed(() =>
  weightYMidValue.value == null ? '--' : `${weightYMidValue.value.toFixed(1)}`
)
const weightYMaxLabel = computed(() =>
  weightYMaxValue.value == null ? '--' : `${weightYMaxValue.value.toFixed(1)}`
)
const weightXStartLabel = computed(() =>
  weightSeries.value.length ? formatShortDate(weightSeries.value[0].date) : '--'
)
const weightXMidLabel = computed(() => {
  if (!weightSeries.value.length) return '--'
  const midIndex = Math.floor((weightSeries.value.length - 1) / 2)
  return formatShortDate(weightSeries.value[midIndex].date)
})
const weightXEndLabel = computed(() =>
  weightSeries.value.length ? formatShortDate(weightSeries.value[weightSeries.value.length - 1].date) : '--'
)
const bodyFatMinLabel = computed(() =>
  Number.isFinite(bodyFatTrendChart.value.min) ? `${bodyFatTrendChart.value.min.toFixed(1)}%` : '--'
)
const bodyFatMaxLabel = computed(() =>
  Number.isFinite(bodyFatTrendChart.value.max) ? `${bodyFatTrendChart.value.max.toFixed(1)}%` : '--'
)

const bodyRangeCaption = computed(() => {
  if (!bodyRecordsInRange.value.length) return 'No records in this window.'
  if (bodyRange.value === 'all') {
    const first = bodyRecordsInRange.value[0]
    const last = bodyRecordsInRange.value[bodyRecordsInRange.value.length - 1]
    return `${formatShortDate(first.date)} - ${formatShortDate(last.date)}`
  }
  return `Last ${bodyRange.value} days`
})

const weightSparseState = computed(() => {
  if (!weightSeries.value.length || weightSeries.value.length >= 2) return null
  return {
    message: 'Need at least 2 weigh-ins for a clear trend line.',
    actionLabel: 'Add another weigh-in'
  }
})

const bodyFatSparseState = computed(() => {
  if (!bodyFatSeries.value.length || bodyFatSeries.value.length >= 2) return null
  return {
    message: 'Need at least 2 body fat entries for a meaningful trend.',
    actionLabel: 'Update body fat'
  }
})

const strengthSeriesByMetric = computed(() => {
  const maps = Object.fromEntries(strengthMetricOptions.map((option) => [option.id, new Map()]))
  completedLogsInRange.value.forEach((workout) => {
    if (!workout?.date) return
    if (!Array.isArray(workout.exercises)) return
    workout.exercises.forEach((exercise) => {
      const name = String(exercise?.name || '').toLowerCase()
      if (!name) return
      const metric = strengthMetricOptions.find((option) => option.pattern.test(name))
      if (!metric) return
      const weight = Number(exercise?.weight) || 0
      const reps = Number(exercise?.reps) || 0
      const oneRm = estimateOneRm(weight, reps)
      if (!oneRm) return
      const previous = maps[metric.id].get(workout.date) || 0
      if (oneRm > previous) {
        maps[metric.id].set(workout.date, oneRm)
      }
    })
  })

  const result = {}
  strengthMetricOptions.forEach((option) => {
    result[option.id] = Array.from(maps[option.id].entries())
      .map(([date, value]) => ({
        date: parseLocalDate(date),
        value: Number(value.toFixed(1))
      }))
      .filter((item) => item.date && Number.isFinite(item.value))
      .sort((a, b) => a.date - b.date)
  })
  return result
})

const selectedStrengthSeries = computed(() => {
  return strengthSeriesByMetric.value[selectedStrengthMetric.value] || []
})

const selectedStrengthChart = computed(() =>
  buildSeriesChart(selectedStrengthSeries.value, { includeArea: true })
)

const selectedStrengthMetricOption = computed(
  () => strengthMetricOptions.find((item) => item.id === selectedStrengthMetric.value) || strengthMetricOptions[0]
)

const selectedStrengthAxisBounds = computed(() => {
  const min = selectedStrengthChart.value.min
  const max = selectedStrengthChart.value.max
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: null, mid: null, max: null }
  }

  if (Math.abs(max - min) < 0.001) {
    const pad = Math.max(Math.abs(max) * 0.06, 2)
    return {
      min: Number((min - pad).toFixed(1)),
      mid: Number(min.toFixed(1)),
      max: Number((max + pad).toFixed(1))
    }
  }

  return {
    min: Number(min.toFixed(1)),
    mid: Number((((min + max) / 2)).toFixed(1)),
    max: Number(max.toFixed(1))
  }
})

const selectedStrengthYMinLabel = computed(() =>
  selectedStrengthAxisBounds.value.min == null ? '--' : `${selectedStrengthAxisBounds.value.min.toFixed(1)}`
)
const selectedStrengthYMidLabel = computed(() =>
  selectedStrengthAxisBounds.value.mid == null ? '--' : `${selectedStrengthAxisBounds.value.mid.toFixed(1)}`
)
const selectedStrengthYMaxLabel = computed(() =>
  selectedStrengthAxisBounds.value.max == null ? '--' : `${selectedStrengthAxisBounds.value.max.toFixed(1)}`
)
const selectedStrengthXStartLabel = computed(() =>
  selectedStrengthSeries.value.length ? formatShortDate(selectedStrengthSeries.value[0].date) : '--'
)
const selectedStrengthXMidLabel = computed(() => {
  if (!selectedStrengthSeries.value.length) return '--'
  const midIndex = Math.floor((selectedStrengthSeries.value.length - 1) / 2)
  return formatShortDate(selectedStrengthSeries.value[midIndex].date)
})
const selectedStrengthXEndLabel = computed(() =>
  selectedStrengthSeries.value.length
    ? formatShortDate(selectedStrengthSeries.value[selectedStrengthSeries.value.length - 1].date)
    : '--'
)

const selectedStrengthLatestSummary = computed(() => {
  const series = selectedStrengthSeries.value
  if (!series.length) return ''
  const latest = series[series.length - 1]
  return `Latest ${selectedStrengthMetricOption.value.label.toLowerCase()} estimate: ${latest.value.toFixed(1)} kg on ${formatShortDate(latest.date)}`
})

const strengthSparseState = computed(() => {
  if (!selectedStrengthSeries.value.length || selectedStrengthSeries.value.length >= 2) return null
  return {
    message: 'One completed record found. Add another session to show progression.',
    actionLabel: 'Open Workout Log'
  }
})

function formatLongDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

function toCellLevel(count) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  return 3
}

function summarizeWorkoutLabel(item) {
  const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim()).filter(Boolean) : []
  if (tags.length) {
    const unique = Array.from(new Set(tags))
    if (unique.length <= 2) return unique.join(' + ')
    return `${unique.slice(0, 2).join(' + ')} +${unique.length - 2}`
  }
  const title = String(item.title || '').trim()
  if (title && title !== 'Workout Session') return title
  const subtitle = String(item.subtitle || '').trim()
  if (subtitle) return subtitle.split(' · ')[0]
  return 'Workout'
}

const completedLogsAll = computed(() =>
  logs.value
    .filter((item) => item.status === 'completed')
    .map((item) => {
      const date = parseLocalDate(item.date)
      if (!date) return null
      return {
        ...item,
        dateObj: date,
        iso: toIsoDate(date),
        minutes: parseDurationMinutes(item)
      }
    })
    .filter(Boolean)
)

const completedLogsByIso = computed(() => {
  const map = new Map()
  completedLogsAll.value.forEach((item) => {
    if (!map.has(item.iso)) map.set(item.iso, [])
    map.get(item.iso).push(item)
  })
  return map
})

const completedDaySummaryMap = computed(() => {
  const map = new Map()
  completedLogsAll.value.forEach((item) => {
    const key = item.iso
    if (!map.has(key)) {
      map.set(key, {
        count: 0,
        minutes: 0,
        labels: new Set()
      })
    }
    const bucket = map.get(key)
    bucket.count += 1
    bucket.minutes += item.minutes
    bucket.labels.add(summarizeWorkoutLabel(item))
  })
  return map
})

const allCompletedDateSet = computed(() => new Set(Array.from(completedDaySummaryMap.value.keys())))

const consistencyCurrentStreak = computed(() => {
  let streak = 0
  const cursor = new Date(today.value)
  while (allCompletedDateSet.value.has(toIsoDate(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
})

const consistencyWeekStart = computed(() => startOfWeekMonday(today.value))

const consistencyWeekStarts = computed(() => {
  const list = []
  const start = new Date(consistencyWeekStart.value)
  start.setDate(start.getDate() - 11 * 7)
  for (let i = 0; i < 12; i += 1) {
    const weekStart = new Date(start)
    weekStart.setDate(start.getDate() + i * 7)
    list.push(weekStart)
  }
  return list
})

const consistencyGridStart = computed(() => consistencyWeekStarts.value[0] || today.value)

const consistencyMonthTicks = computed(() => {
  const ticks = []
  let previousMonth = null
  consistencyWeekStarts.value.forEach((weekStart, index) => {
    const month = weekStart.getMonth()
    if (index === 0 || month !== previousMonth) {
      ticks.push({
        key: `${weekStart.getFullYear()}-${month}`,
        label: formatMonthShort(weekStart),
        column: index + 1
      })
    }
    previousMonth = month
  })
  return ticks
})

const weekdayLabels = computed(() => ([
  { row: 1, text: 'Mon' },
  { row: 2, text: '' },
  { row: 3, text: 'Wed' },
  { row: 4, text: '' },
  { row: 5, text: 'Fri' },
  { row: 6, text: '' },
  { row: 7, text: 'Sun' }
]))

const consistencyCells = computed(() => {
  const cells = []
  consistencyWeekStarts.value.forEach((weekStart, weekIndex) => {
    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + dayOffset)
      const key = toIsoDate(date)
      const summary = completedDaySummaryMap.value.get(key)
      const count = summary?.count || 0
      const minutes = summary?.minutes || 0
      const labels = summary ? Array.from(summary.labels).slice(0, 2) : []
      const isFuture = date > today.value
      const level = isFuture ? 0 : toCellLevel(count)
      const summaryLabel = count
        ? (labels.length ? labels.join(' · ') : 'Completed workout')
        : 'No completed workout'

      cells.push({
        key,
        date,
        weekIndex,
        rowIndex: dayOffset,
        level,
        count,
        minutes,
        summaryLabel,
        isFuture,
        isToday: key === todayIso.value,
        sessionsLabel: count
          ? `${count} completed session${count > 1 ? 's' : ''}`
          : 'No completed workout',
        minutesLabel: count ? `${minutes} min` : '0 min'
      })
    }
  })
  return cells
})

const consistencyActiveDays = computed(() =>
  consistencyCells.value.filter((cell) => !cell.isFuture && cell.count > 0).length
)

const consistencyBestStreak = computed(() => {
  const start = new Date(consistencyGridStart.value)
  const end = new Date(today.value)
  let best = 0
  let current = 0
  const cursor = new Date(start)

  while (cursor <= end) {
    const iso = toIsoDate(cursor)
    if (allCompletedDateSet.value.has(iso)) {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 0
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return best
})

const consistencyWeeklyBars = computed(() => {
  return consistencyWeekStarts.value.map((weekStart, index) => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const activeDays = consistencyCells.value.filter(
      (cell) => cell.weekIndex === index && !cell.isFuture && cell.count > 0
    ).length
    return {
      key: `${toIsoDate(weekStart)}-${index}`,
      activeDays,
      height: Math.max(6, Math.round((activeDays / 7) * 100)),
      tooltip: `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)} · ${activeDays} active day${activeDays === 1 ? '' : 's'}`
    }
  })
})

const consistencySparseHint = computed(() => consistencyActiveDays.value < 5)

function moveConsistencyTooltip(event) {
  if (!consistencyTooltip.value.visible || !event) return
  if (typeof window === 'undefined') return
  const maxX = window.innerWidth - 280
  const maxY = window.innerHeight - 150
  consistencyTooltip.value.x = Math.max(12, Math.min(maxX, event.clientX + 14))
  consistencyTooltip.value.y = Math.max(12, Math.min(maxY, event.clientY + 14))
}

function showConsistencyTooltip(event, cell) {
  consistencyTooltip.value = {
    visible: true,
    x: consistencyTooltip.value.x,
    y: consistencyTooltip.value.y,
    dateLabel: formatLongDate(cell.date),
    sessionsLabel: cell.sessionsLabel,
    minutesLabel: cell.minutesLabel,
    summaryLabel: cell.summaryLabel
  }
  moveConsistencyTooltip(event)
}

function hideConsistencyTooltip() {
  consistencyTooltip.value.visible = false
}

function goToPlan() {
  router.push({ name: 'plan' })
}

function goToLogs() {
  router.push({ name: 'logs' })
}

function showSourcePanel(config) {
  sourcePanel.value = {
    visible: true,
    title: config.title || 'Source Details',
    subtitle: config.subtitle || '',
    items: Array.isArray(config.items) ? config.items : [],
    targetRoute: config.targetRoute || null,
    targetLabel: config.targetLabel || 'Open source',
    emptyMessage: config.emptyMessage || 'No source records for this selection.'
  }
}

function closeSourcePanel() {
  sourcePanel.value.visible = false
}

function openSourceRoute() {
  if (!sourcePanel.value.targetRoute) return
  router.push(sourcePanel.value.targetRoute)
}

function getWorkoutDisplayTitle(item) {
  const title = String(item?.title || '').trim()
  if (title && title !== 'Workout Session') return title
  return summarizeWorkoutLabel(item)
}

function getWorkoutSourceItems(items) {
  return items.map((item) => {
    const tagSummary = Array.isArray(item.tags) && item.tags.length
      ? Array.from(new Set(item.tags)).join(' + ')
      : summarizeWorkoutLabel(item)
    const subtitle = String(item.subtitle || '').trim()
    return {
      id: item.id,
      title: getWorkoutDisplayTitle(item),
      meta: [formatLongDate(item.dateObj), item.minutes ? `${item.minutes} min` : null].filter(Boolean).join(' · '),
      description: subtitle ? `${tagSummary} · ${subtitle}` : tagSummary
    }
  })
}

function openWeightSource(point) {
  if (!point?.date) return
  const iso = toIsoDate(point.date)
  const matched = rawBodyRecords.value.find((item) => item.iso === iso && item.weight != null)
  const fallbackWeight = toNumber(planState.value.weight?.current)
  const weightValue = matched?.weight ?? fallbackWeight
  if (weightValue == null) return
  showSourcePanel({
    title: 'Weight Source',
    subtitle: formatLongDate(point.date),
    items: [
      {
        id: `weight-${iso}`,
        title: `${Number(weightValue).toFixed(1)} kg`,
        meta: matched ? 'Recorded weight entry' : 'Current plan weight',
        description: matched?.bodyFat != null
          ? `Same-day body fat: ${Number(matched.bodyFat).toFixed(1)}%`
          : 'Saved from your Plan data.'
      }
    ],
    targetRoute: { name: 'plan' },
    targetLabel: 'Open Plan',
    emptyMessage: 'No weight source found for this point.'
  })
}

function openBodyFatSource(point) {
  if (!point?.date) return
  const iso = toIsoDate(point.date)
  const matched = rawBodyRecords.value.find((item) => item.iso === iso && item.bodyFat != null)
  const fallbackBodyFat = toNumber(planState.value.bodyMetrics?.bodyFat)
  const bodyFatValue = matched?.bodyFat ?? fallbackBodyFat
  if (bodyFatValue == null) return
  showSourcePanel({
    title: 'Body Fat Source',
    subtitle: formatLongDate(point.date),
    items: [
      {
        id: `bodyfat-${iso}`,
        title: `${Number(bodyFatValue).toFixed(1)}% body fat`,
        meta: matched ? 'Recorded body composition entry' : 'Current plan body fat',
        description: matched?.weight != null
          ? `Same-day body weight: ${Number(matched.weight).toFixed(1)} kg`
          : 'Saved from your Plan data.'
      }
    ],
    targetRoute: { name: 'plan' },
    targetLabel: 'Open Plan',
    emptyMessage: 'No body fat source found for this point.'
  })
}

function openVolumeSource(item) {
  const workouts = completedLogsAll.value.filter((log) =>
    log.dateObj >= item.start && log.dateObj <= item.end
  )
  showSourcePanel({
    title: 'Weekly Training Volume',
    subtitle: `${formatShortDate(item.start)} - ${formatShortDate(item.end)}`,
    items: getWorkoutSourceItems(workouts),
    targetRoute: { name: 'logs' },
    targetLabel: 'Open Workout Log',
    emptyMessage: 'No completed workouts were logged in this week.'
  })
}

function openConsistencySource(cell) {
  const workouts = completedLogsByIso.value.get(cell.key) || []
  showSourcePanel({
    title: 'Completed Workouts',
    subtitle: formatLongDate(cell.date),
    items: getWorkoutSourceItems(workouts),
    targetRoute: { name: 'logs' },
    targetLabel: 'Open Workout Log',
    emptyMessage: 'No completed workouts were logged on this day.'
  })
}

function openStrengthSource(point) {
  if (!point?.date) return
  const iso = toIsoDate(point.date)
  const metric = strengthMetricOptions.find((item) => item.id === selectedStrengthMetric.value)
  if (!metric) return
  const workouts = (completedLogsByIso.value.get(iso) || []).filter((item) =>
    Array.isArray(item.exercises) && item.exercises.some((exercise) => metric.pattern.test(String(exercise?.name || '')))
  )
  const items = workouts.map((item) => {
    const matches = item.exercises.filter((exercise) => metric.pattern.test(String(exercise?.name || '')))
    const bestOneRm = Math.max(...matches.map((exercise) => estimateOneRm(Number(exercise?.weight) || 0, Number(exercise?.reps) || 0)), 0)
    return {
      id: `${item.id}-${metric.id}`,
      title: getWorkoutDisplayTitle(item),
      meta: [formatLongDate(item.dateObj), bestOneRm ? `Best est. 1RM ${bestOneRm.toFixed(1)} kg` : null]
        .filter(Boolean)
        .join(' · '),
      description: matches
        .map((exercise) => {
          const name = String(exercise?.name || metric.label).trim()
          const weight = Number(exercise?.weight) || 0
          const reps = Number(exercise?.reps) || 0
          const sets = Number(exercise?.sets) || 0
          return `${name}: ${weight} kg x ${reps} reps${sets ? ` x ${sets} sets` : ''}`
        })
        .join(' · ')
    }
  })
  showSourcePanel({
    title: `${metric.label} Source`,
    subtitle: formatLongDate(point.date),
    items,
    targetRoute: { name: 'logs' },
    targetLabel: 'Open Workout Log',
    emptyMessage: `No completed ${metric.label.toLowerCase()} entries were logged on this day.`
  })
}

const circumferenceEntries = computed(() =>
  circumferenceConfig
    .map((item) => ({
      id: item.id,
      label: item.label,
      value: toNumber(planState.value.bodyCircumferenceLog?.[item.id])
    }))
    .filter((item) => item.value != null && item.value > 0)
)

const circumferenceMax = computed(() =>
  Math.max(...circumferenceEntries.value.map((item) => item.value), 0)
)

function circumferencePercent(value) {
  if (!circumferenceMax.value) return 0
  return Math.max(8, Math.round((value / circumferenceMax.value) * 100))
}

function extractDistance(text) {
  const match = /(\d+(?:\.\d+)?)\s*km/i.exec(String(text || ''))
  if (!match) return 0
  const value = Number(match[1])
  return Number.isFinite(value) ? value : 0
}

const distanceSummary = computed(() => {
  const totals = { run: 0, walk: 0, ride: 0 }
  completedLogsInRange.value.forEach((item) => {
    const combinedText = `${item.title || ''} ${item.subtitle || ''}`
    const fromText = extractDistance(combinedText)
    const lower = combinedText.toLowerCase()
    if (fromText > 0) {
      if (/run|jog|treadmill/.test(lower)) totals.run += fromText
      else if (/walk|hike/.test(lower)) totals.walk += fromText
      else if (/cycle|ride|bike/.test(lower)) totals.ride += fromText
    }

    if (!Array.isArray(item.exercises)) return
    item.exercises.forEach((exercise) => {
      const exerciseName = String(exercise?.name || '').toLowerCase()
      const distanceValue = Number(exercise?.distanceKm) || extractDistance(exercise?.notes)
      if (!distanceValue) return
      if (/run|jog|treadmill/.test(exerciseName)) totals.run += distanceValue
      else if (/walk|hike/.test(exerciseName)) totals.walk += distanceValue
      else if (/cycle|ride|bike/.test(exerciseName)) totals.ride += distanceValue
    })
  })
  return totals
})

const totalStrengthSets = computed(() =>
  completedLogsInRange.value.reduce((sum, item) => {
    if (!Array.isArray(item.exercises)) return sum
    const sets = item.exercises.reduce((acc, exercise) => acc + (Number(exercise?.sets) || 0), 0)
    return sum + sets
  }, 0)
)

const weekFactor = computed(() => Math.max(1, rangeDays.value / 7))

function challengeActualValue(id) {
  if (id === 'activity') return Math.round(totalMinutes.value * CALORIES_PER_MINUTE / rangeDays.value)
  if (id === 'burn') return Math.round(totalMinutes.value * CALORIES_PER_MINUTE / rangeDays.value)
  if (id === 'fatBurn') return Math.round(totalMinutes.value * CALORIES_PER_MINUTE * 0.6 / rangeDays.value)
  if (id === 'duration') return Math.round(totalMinutes.value / rangeDays.value)
  if (id === 'runDistance') return Number((distanceSummary.value.run / weekFactor.value).toFixed(1))
  if (id === 'walkDistance') return Number((distanceSummary.value.walk / weekFactor.value).toFixed(1))
  if (id === 'rideDistance') return Number((distanceSummary.value.ride / weekFactor.value).toFixed(1))
  if (id === 'strengthSets') return Math.round(totalStrengthSets.value / weekFactor.value)
  if (id === 'intake') return toNumber(planState.value.dailyLogs?.intakeKcal)
  if (id === 'deficit') return toNumber(planState.value.dailyLogs?.deficitKcal)
  if (id === 'steps') return null
  return null
}

const selectedChallengeIds = computed(() => {
  const selected = Array.isArray(planState.value.selectedChallenges) ? planState.value.selectedChallenges : []
  if (selected.length) return selected
  return ['activity', 'duration', 'strengthSets']
})

const challengeCards = computed(() =>
  selectedChallengeIds.value
    .map((id) => {
      const meta = challengeMetaMap[id]
      if (!meta) return null
      const target = toNumber(planState.value.challengeValues?.[id])
      const actual = challengeActualValue(id)
      const progress = target && actual != null && target > 0 ? Math.min(1, Math.max(0, actual / target)) : 0
      const progressPercent = Math.round(progress * 100)
      const actualLabel = actual == null ? '--' : `${actual}${meta.unit ? ` ${meta.unit}` : ''}`
      const targetLabel = target != null ? `${target}${meta.unit ? ` ${meta.unit}` : ''}` : '--'
      let statusText = 'No target set'
      if (target && actual != null) {
        if (progress >= 1) statusText = 'On track'
        else if (progress >= 0.7) statusText = 'Almost there'
        else statusText = 'Needs focus'
      }
      return {
        id,
        title: meta.title,
        cadence: meta.cadence,
        progressPercent,
        actualLabel,
        targetLabel,
        statusText,
        targetValue: target,
        actualValue: actual
      }
    })
    .filter(Boolean)
)

const analyticsSummary = computed(() => ({
  period: {
    start: periodStartIso.value,
    end: periodEndIso.value,
    days: rangeDays.value
  },
  totals: {
    sessions: totalSessions.value,
    completed: completedSessions.value,
    pending: pendingSessions.value,
    completionRate: completionRate.value,
    minutes: totalMinutes.value,
    avgDailyMinutes: avgDailyMinutes.value,
    calories: totalCalories.value
  },
  streaks: {
    current: currentStreak.value,
    best: bestStreak.value
  },
  body: {
    weightTrend: weightTrend.value,
    weightRecords: weightRangeSeries.value.map((item) => ({
      date: toIsoDate(item.date),
      value: Number(item.value.toFixed(1))
    })),
    bodyFatRecords: bodyFatRangeSeries.value.map((item) => ({
      date: toIsoDate(item.date),
      value: Number(item.value.toFixed(1))
    })),
    circumference: circumferenceEntries.value.map((item) => ({
      id: item.id,
      label: item.label,
      value: Number(item.value.toFixed(1))
    }))
  },
  trainingVolume: weeklyTrend.value,
  muscles: muscleDistribution.value,
  strength: strengthMetricOptions.map((item) => ({
    id: item.id,
    label: item.label,
    records: (strengthSeriesByMetric.value[item.id] || []).map((point) => ({
      date: toIsoDate(point.date),
      oneRm: Number(point.value.toFixed(1))
    }))
  })),
  consistency: {
    currentStreak: consistencyCurrentStreak.value,
    bestStreak: consistencyBestStreak.value,
    activeDays: consistencyActiveDays.value,
    weeklyActiveDays: consistencyWeeklyBars.value.map((week) => week.activeDays)
  },
  nutrition: {
    intakeKcal: toNumber(planState.value.dailyLogs?.intakeKcal),
    deficitKcal: toNumber(planState.value.dailyLogs?.deficitKcal),
    intakeNote: String(planState.value.dailyLogs?.intakeNote || '').trim()
  },
  challenges: challengeCards.value.map((item) => ({
    id: item.id,
    title: item.title,
    cadence: item.cadence,
    actual: item.actualValue,
    target: item.targetValue,
    progressPercent: item.progressPercent
  }))
}))

const aiInsightLines = computed(() =>
  String(aiInsight.value || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
)

const aiMetaLabel = computed(() => {
  if (!aiMeta.value.generatedAt) return 'Awaiting analysis'
  const when = new Date(aiMeta.value.generatedAt)
  const timestamp = Number.isNaN(when.getTime())
    ? aiMeta.value.generatedAt
    : new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(when)
  let source = 'AI model'
  if (aiMeta.value.source === 'heuristic') source = 'Rules fallback'
  if (aiMeta.value.source === 'ai_fallback') source = 'AI fallback'
  return `${source} · ${timestamp}`
})

async function fetchAiInsight() {
  aiError.value = ''
  aiLoading.value = true
  try {
    const response = await fetch(`${AUTH_SERVER_ORIGIN}/api/ai/analytics/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        rangeDays: rangeDays.value,
        summary: analyticsSummary.value
      })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to generate analytics insight.')
    }
    aiInsight.value = String(payload?.insight || '').trim()
    aiMeta.value = {
      source: payload?.meta?.source || '',
      generatedAt: payload?.meta?.generatedAt || new Date().toISOString()
    }
  } catch (error) {
    aiError.value = error?.message || 'Failed to generate analytics insight.'
  } finally {
    aiLoading.value = false
  }
}

watch(
  [logsKey, planKey],
  () => {
    loadLogs()
    loadPlan()
  },
  { immediate: true }
)

watch(rangeDays, () => {
  fetchAiInsight()
})

onMounted(() => {
  loadLogs()
  loadPlan()
  fetchAiInsight()
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage)
    window.addEventListener('pf_logs_updated', loadLogs)
    window.addEventListener('pf_plan_updated', loadPlan)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener('pf_logs_updated', loadLogs)
    window.removeEventListener('pf_plan_updated', loadPlan)
  }
})
</script>

<style scoped>
.analytics-page {
  padding: 34px clamp(20px, 4vw, 52px) 60px;
  display: grid;
  gap: 20px;
}

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
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
  font-size: clamp(30px, 3.4vw, 42px);
  font-family: var(--font-display);
}

.subtitle {
  margin: 8px 0 0;
  color: var(--text-muted);
}

.header-right {
  display: grid;
  gap: 10px;
  justify-items: end;
}

.range-tabs {
  background: var(--surface-muted);
  border-radius: 999px;
  padding: 4px;
  border: 1px solid var(--border);
  display: flex;
  gap: 4px;
}

.range-tab {
  border: none;
  background: transparent;
  color: var(--text-muted);
  padding: 7px 12px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
}

.range-tab.active {
  background: var(--surface);
  color: var(--text-primary);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
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
  padding: 8px 12px;
  font-size: 12px;
}

.btn.primary {
  border-color: transparent;
  background: var(--accent);
  color: #fff;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  display: grid;
  gap: 4px;
}

.stat-card span {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-card strong {
  font-size: 24px;
}

.stat-card small {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-deltas {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.delta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

.delta-chip.up {
  color: #166534;
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.18);
}

.delta-chip.down {
  color: #b91c1c;
  background: rgba(244, 63, 94, 0.08);
  border-color: rgba(244, 63, 94, 0.16);
}

.delta-chip.neutral {
  color: var(--text-muted);
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow-soft);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.panel-head h2 {
  margin: 0;
  font-size: 18px;
}

.panel-head span {
  color: var(--text-muted);
  font-size: 12px;
}

.inline-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
  border-radius: 999px;
  padding: 4px;
}

.inline-tabs.compact {
  padding: 3px;
}

.inline-tabs.scrollable {
  max-width: min(100%, 420px);
  overflow-x: auto;
}

.inline-tab {
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.inline-tab.active {
  background: var(--surface);
  color: var(--text-primary);
}

.body-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.mini-panel {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-muted);
  padding: 12px;
  display: grid;
  gap: 10px;
  height: 100%;
  align-content: start;
}

.mini-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.mini-head strong {
  font-size: 14px;
}

.mini-head span {
  font-size: 11px;
  color: var(--text-muted);
}

.line-chart {
  display: grid;
  gap: 8px;
}

.chart-with-axis {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 8px;
  align-items: stretch;
}

.y-axis-labels {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  align-items: center;
  justify-items: end;
  font-size: 11px;
  color: var(--text-muted);
  padding: 10px 0;
}

.chart-core {
  display: grid;
  gap: 6px;
}

.line-chart svg {
  width: 100%;
  height: 190px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.08), rgba(148, 163, 184, 0.02));
}

.grid-lines line {
  stroke: rgba(148, 163, 184, 0.22);
  stroke-width: 1;
  stroke-dasharray: 2 3;
}

.line-area.weight {
  fill: rgba(244, 63, 94, 0.18);
}

.line-area.bodyfat {
  fill: rgba(14, 165, 233, 0.16);
}

.line-area.strength {
  fill: rgba(22, 163, 74, 0.16);
}

.line-main {
  fill: none;
  stroke-width: 2.2;
}

.line-main.weight {
  stroke: #e11d48;
}

.line-main.avg {
  stroke: #f97316;
  stroke-dasharray: 4 4;
}

.line-main.bodyfat {
  stroke: #0284c7;
}

.line-main.strength {
  stroke: #16a34a;
}

.line-point {
  stroke: #fff;
  stroke-width: 1;
}

.line-point.clickable {
  cursor: pointer;
}

.line-point.weight {
  fill: #e11d48;
}

.line-point.bodyfat {
  fill: #0284c7;
}

.line-point.strength {
  fill: #16a34a;
}

.x-axis-labels {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 11px;
}

.chart-axis {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 12px;
}

.axis-note {
  color: var(--text-muted);
  font-size: 11px;
}

.chart-caption {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.chart-inline-state {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
}

.chart-inline-state p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.strength-chart {
  align-content: start;
}

.strength-chart .y-axis-labels {
  padding: 12px 0 28px;
}

.strength-chart svg {
  height: 244px;
}

.latest-strength-note {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.strength-empty-state {
  display: grid;
  place-items: center;
  min-height: 100%;
}

.strength-empty-card {
  width: 100%;
  min-height: 336px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-muted);
  display: grid;
  place-items: center;
  text-align: center;
  gap: 10px;
  padding: 24px;
}

.strength-empty-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(22, 163, 74, 0.08);
  color: #16a34a;
}

.strength-empty-icon svg {
  width: 22px;
  height: 22px;
}

.strength-empty-card strong {
  font-size: 16px;
  color: var(--text-primary);
}

.strength-empty-card p {
  margin: 0;
  max-width: 360px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.legend-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-muted);
}

.legend-row.small {
  font-size: 11px;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-block;
  margin-right: 5px;
}

.legend-dot.weight {
  background: #e11d48;
}

.legend-dot.avg {
  background: #f97316;
}

.legend-dot.lv0 {
  background: #e5e7eb;
}

.legend-dot.lv1 {
  background: #fecdd3;
}

.legend-dot.lv2 {
  background: #fb7185;
}

.legend-dot.lv3 {
  background: #be123c;
}

.chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.strength-panel {
  align-content: start;
  grid-template-rows: auto 1fr;
}

.weekly-panel {
  grid-template-rows: auto auto 1fr auto auto;
}

.chart-grid > .panel {
  height: 100%;
}

.metric-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.volume-axis-layout {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 8px;
  align-items: stretch;
}

.volume-y-axis {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  justify-items: end;
  align-items: center;
  font-size: 11px;
  color: var(--text-muted);
  padding: 6px 0 28px;
}

.volume-axis-main {
  display: grid;
  gap: 8px;
}

.volume-plot {
  position: relative;
  height: 244px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-muted);
  overflow: hidden;
}

.volume-grid-lines {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  pointer-events: none;
}

.volume-grid-lines span {
  border-top: 1px dashed rgba(148, 163, 184, 0.28);
}

.volume-grid-lines span:first-child {
  border-top: none;
}

.volume-bars {
  position: relative;
  z-index: 2;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 10px 10px;
  align-items: end;
}

.volume-bar-col {
  border: none;
  background: transparent;
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  cursor: pointer;
}

.volume-bar-value {
  font-style: normal;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 700;
  min-height: 16px;
  line-height: 16px;
}

.volume-bar-fill {
  width: min(42px, 80%);
  min-height: 0;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(180deg, #fb7185, #ef4444);
}

.volume-x-axis {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
  color: var(--text-muted);
  font-size: 11px;
}

.volume-x-axis span {
  text-align: center;
}

.support-grid .panel {
  align-content: start;
}

.consistency-panel {
  position: relative;
  gap: 14px;
}

.consistency-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.consistency-head h2 {
  margin: 0;
}

.consistency-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.metric-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
  font-size: 12px;
  color: var(--text-muted);
}

.metric-chip em {
  font-style: normal;
}

.metric-chip strong {
  color: var(--text-primary);
  font-size: 12px;
}

.consistency-map {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 8px;
}

.weekday-col {
  display: grid;
  grid-template-rows: repeat(7, 14px);
  gap: 4px;
  align-items: center;
  justify-items: end;
  padding-top: 24px;
}

.weekday-col span {
  height: 14px;
  line-height: 14px;
  font-size: 10px;
  color: #94a3b8;
}

.heatmap-scroll {
  overflow-x: auto;
  padding-bottom: 4px;
}

.heatmap-canvas {
  min-width: max-content;
  display: grid;
  gap: 8px;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(12, 14px);
  gap: 4px;
  min-height: 16px;
  align-items: center;
}

.month-tick {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  white-space: nowrap;
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(12, 14px);
  grid-template-rows: repeat(7, 14px);
  gap: 4px;
  min-width: max-content;
}

.heat-cell {
  border: none;
  border-radius: 3px;
  padding: 0;
  width: 14px;
  height: 14px;
  cursor: pointer;
  outline: none;
  background: #e5e7eb;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.24);
}

.heat-cell.lv-1 {
  background: #fecdd3;
  box-shadow: inset 0 0 0 1px rgba(251, 113, 133, 0.22);
}

.heat-cell.lv-2 {
  background: #fb7185;
  box-shadow: inset 0 0 0 1px rgba(225, 29, 72, 0.26);
}

.heat-cell.lv-3 {
  background: #be123c;
  box-shadow: inset 0 0 0 1px rgba(136, 19, 55, 0.35);
}

.heat-cell.future {
  opacity: 0.4;
}

.heat-cell.today {
  box-shadow: 0 0 0 1px #0f172a, inset 0 0 0 1px rgba(255, 255, 255, 0.6);
}

.heatmap-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-muted);
  font-size: 12px;
}

.consistency-legend {
  gap: 14px;
  font-size: 12px;
}

.mini-weekly-trend {
  height: 56px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-muted);
  padding: 6px 8px;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 5px;
  align-items: end;
}

.mini-bar {
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.mini-bar em {
  width: 100%;
  min-height: 3px;
  display: block;
  border-radius: 5px 5px 2px 2px;
  background: linear-gradient(180deg, #fb7185, #e11d48);
}

.mini-weekly-meta {
  margin-top: -4px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: #94a3b8;
}

.consistency-hint {
  margin: -2px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.heatmap-tooltip {
  position: fixed;
  width: min(260px, calc(100vw - 20px));
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
  padding: 10px 12px;
  z-index: 120;
  pointer-events: none;
}

.heatmap-tooltip p {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #475569;
}

.heatmap-tooltip p:first-child {
  color: #0f172a;
  font-weight: 700;
}

.circumference-bars {
  display: grid;
  gap: 10px;
}

.source-panel {
  gap: 14px;
}

.source-head-copy {
  display: grid;
  gap: 4px;
}

.source-head-copy h2 {
  margin: 0;
}

.source-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.source-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.source-list {
  display: grid;
  gap: 10px;
}

.source-item {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-muted);
  padding: 12px;
  display: grid;
  gap: 6px;
}

.source-item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.source-item-head strong {
  font-size: 14px;
}

.source-item-head span {
  font-size: 11px;
  color: var(--text-muted);
}

.source-item p {
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;
}

.circumference-row {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  align-items: center;
  gap: 10px;
}

.circumference-row .name {
  font-size: 12px;
  color: var(--text-muted);
}

.circumference-row .track {
  height: 9px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.circumference-row .track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0ea5e9, #0284c7);
}

.circumference-row strong {
  font-size: 12px;
}

.challenge-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
}

.challenge-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  background: var(--surface-muted);
  display: grid;
  gap: 8px;
}

.challenge-card header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.challenge-card header strong {
  font-size: 14px;
}

.challenge-card header span {
  font-size: 11px;
  color: var(--text-muted);
}

.challenge-card p {
  margin: 0;
  font-size: 13px;
}

.progress-track {
  height: 8px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.progress-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #f43f5e, #ef4444);
  border-radius: inherit;
}

.challenge-card small {
  color: var(--text-muted);
  font-size: 12px;
}

.ai-panel {
  background: linear-gradient(140deg, #0f172a, #111827);
  color: #f8fafc;
  border: none;
}

.ai-panel .panel-head span {
  color: #cbd5e1;
}

.ai-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-copy {
  display: grid;
  gap: 8px;
}

.ai-copy p {
  margin: 0;
  line-height: 1.55;
}

.ai-error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 113, 113, 0.2);
  color: #fecaca;
}

.empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 0 2px;
}

.ai-panel .empty {
  color: #cbd5e1;
}

@media (max-width: 1200px) {
  .body-grid,
  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .header-right {
    width: 100%;
    justify-items: stretch;
  }

  .range-tabs {
    width: 100%;
    justify-content: space-between;
  }

  .range-tab {
    flex: 1;
  }

  .consistency-map {
    grid-template-columns: 30px minmax(0, 1fr);
  }

  .consistency-metrics {
    width: 100%;
  }

  .metric-chip {
    flex: 1;
    justify-content: space-between;
  }

  .month-grid {
    grid-template-columns: repeat(12, 12px);
  }

  .heatmap-grid {
    grid-template-columns: repeat(12, 12px);
    grid-template-rows: repeat(7, 12px);
  }

  .heat-cell {
    width: 12px;
    height: 12px;
  }

  .weekday-col {
    grid-template-rows: repeat(7, 12px);
    padding-top: 22px;
  }

  .weekday-col span {
    height: 12px;
    line-height: 12px;
  }

  .ai-head-actions {
    width: 100%;
    justify-content: space-between;
  }

  .chart-inline-state,
  .empty-state,
  .source-item-head {
    align-items: flex-start;
  }
}
</style>
