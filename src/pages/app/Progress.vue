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
        <div class="stat-delta-main">
          <span class="delta-chip" :class="sessionDeltaSummary.primary.tone">
            {{ sessionDeltaSummary.primary.text }}
          </span>
        </div>
        <p v-if="sessionDeltaSummary.secondaryText" class="stat-secondary">{{ sessionDeltaSummary.secondaryText }}</p>
      </article>
      <article class="stat-card">
        <span>Completion Rate</span>
        <strong>{{ completionRate }}%</strong>
        <small>{{ periodLabel }}</small>
        <div class="stat-delta-main">
          <span class="delta-chip" :class="completionDeltaSummary.primary.tone">
            {{ completionDeltaSummary.primary.text }}
          </span>
        </div>
        <p v-if="completionDeltaSummary.secondaryText" class="stat-secondary">{{ completionDeltaSummary.secondaryText }}</p>
      </article>
      <article class="stat-card">
        <span>Active Minutes</span>
        <strong>{{ totalMinutes }}</strong>
        <small>{{ averageDailyMinutesLabel }}</small>
        <div class="stat-delta-main">
          <span class="delta-chip" :class="minutesDeltaSummary.primary.tone">
            {{ minutesDeltaSummary.primary.text }}
          </span>
        </div>
        <p v-if="minutesDeltaSummary.secondaryText" class="stat-secondary">{{ minutesDeltaSummary.secondaryText }}</p>
      </article>
      <article class="stat-card">
        <span>Calories Burned</span>
        <strong>{{ totalCalories }}</strong>
        <small>Estimated from completed sessions</small>
        <div class="stat-delta-main">
          <span class="delta-chip" :class="caloriesDeltaSummary.primary.tone">
            {{ caloriesDeltaSummary.primary.text }}
          </span>
        </div>
        <p v-if="caloriesDeltaSummary.secondaryText" class="stat-secondary">{{ caloriesDeltaSummary.secondaryText }}</p>
      </article>
      <article class="stat-card">
        <span>Current Streak</span>
        <strong>{{ currentStreakLabel }}</strong>
        <small>Best: {{ bestStreakLabel }}</small>
        <div class="stat-delta-main">
          <span class="delta-chip" :class="streakDeltaSummary.primary.tone">
            {{ streakDeltaSummary.primary.text }}
          </span>
        </div>
        <p v-if="streakDeltaSummary.secondaryText" class="stat-secondary">{{ streakDeltaSummary.secondaryText }}</p>
      </article>
      <article class="stat-card">
        <span>Weight Trend</span>
        <strong>{{ weightTrendLabel }}</strong>
        <small>{{ weightTrendHint }}</small>
        <div class="stat-delta-main">
          <span class="delta-chip" :class="weightDeltaSummary.primary.tone">
            {{ weightDeltaSummary.primary.text }}
          </span>
        </div>
        <p v-if="weightDeltaSummary.secondaryText" class="stat-secondary">{{ weightDeltaSummary.secondaryText }}</p>
      </article>
    </section>

    <section class="panel actions-panel">
      <div class="panel-head">
        <div>
          <h2>Next Actions</h2>
          <span>This week focus based on your current analytics window.</span>
        </div>
      </div>
      <div class="actions-grid">
        <article v-for="item in nextActionItems" :key="item.id" class="action-card">
          <span class="action-kicker">{{ item.kicker }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
          <button
            v-if="item.actionLabel"
            class="btn small"
            type="button"
            @click="handleNextAction(item.action)"
          >
            {{ item.actionLabel }}
          </button>
        </article>
      </div>
    </section>

    <section class="panel body-panel">
      <div class="panel-head">
        <h2>Body Composition Trends</h2>
        <span>{{ periodLabel }}</span>
      </div>

      <div class="body-grid">
        <article class="mini-panel weight-panel">
          <header class="metric-chart-head weight">
            <div class="metric-chart-title-block">
              <span class="metric-chart-kicker">Body composition</span>
              <strong>Weight</strong>
              <p>{{ weightHeaderCaption }}</p>
            </div>
            <div class="metric-chart-value-block">
              <span class="metric-chart-value-caption">Latest</span>
              <strong>{{ weightLatestLabel }}</strong>
              <span class="metric-chart-delta" :class="weightDeltaTone">{{ weightDeltaLabel }}</span>
            </div>
          </header>
          <div v-if="weightSeries.length > 2 && weightTrendChart.path" class="line-chart premium-line-chart weight-chart">
            <div class="chart-with-axis">
              <div class="y-axis-labels">
                <span>{{ weightYMaxLabel }}</span>
                <span>{{ weightYMidLabel }}</span>
                <span>{{ weightYMinLabel }}</span>
              </div>
              <div class="chart-core">
                <div class="chart-surface weight">
                  <div class="chart-meta-row">
                    <span>{{ weightMetaLabel }}</span>
                    <span>{{ weightSeries.length }} records</span>
                  </div>
                  <svg viewBox="0 0 360 170" preserveAspectRatio="none" aria-hidden="true">
                    <g class="grid-lines">
                      <line x1="18" y1="32" x2="342" y2="32"></line>
                      <line x1="18" y1="84" x2="342" y2="84"></line>
                      <line x1="18" y1="136" x2="342" y2="136"></line>
                    </g>
                    <path class="line-area weight" :d="weightTrendChart.area"></path>
                    <path class="line-main weight" :d="weightTrendChart.path"></path>
                    <path class="line-main avg" :d="weightTrendChart.secondaryPath"></path>
                  </svg>
                  <div class="axis-label axis-label--top">{{ weightYMaxLabel }}</div>
                  <div class="axis-label axis-label--bottom">{{ weightYMinLabel }}</div>
                  <div class="points-layer">
                    <button
                      v-for="(point, index) in weightTrendChart.points"
                      :key="`weight-${point.x}-${point.y}`"
                      type="button"
                      class="point-hit"
                      :class="{ clickable: point.interactive, latest: point.isLatest }"
                      :style="{ left: `${point.xPercent}%`, top: `${point.yPercent}%` }"
                      @mouseenter="showMetricTooltip('weight', point, index)"
                      @mouseleave="hideMetricTooltip('weight')"
                      @focus="showMetricTooltip('weight', point, index)"
                      @blur="hideMetricTooltip('weight')"
                      @click="point.interactive && openWeightSource(point)"
                    >
                      <span
                        class="point-dot weight"
                        :class="{
                          latest: point.isLatest,
                          active: metricTooltip.chartId === 'weight' && metricTooltip.index === index
                        }"
                      ></span>
                    </button>
                    <div
                      v-if="metricTooltip.chartId === 'weight'"
                      class="chart-tooltip"
                      :style="{ left: `${metricTooltip.left}%`, top: `${metricTooltip.top}%` }"
                    >
                      <span class="tooltip-date">{{ metricTooltip.point?.dateLabel }}</span>
                      <strong>{{ metricTooltip.point?.valueLabel }}</strong>
                      <span class="tooltip-context">{{ metricTooltip.point?.deltaLabel }}</span>
                    </div>
                  </div>
                </div>
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
            <p class="chart-caption">{{ periodLabel }}</p>
          </div>
          <div v-else-if="weightCompactState" class="trend-compact-state">
            <div class="trend-compact-main">
              <div class="trend-compact-value">
                <span class="trend-compact-label">Current value</span>
                <strong>{{ weightCompactState.currentLabel }}</strong>
                <small>{{ weightCompactState.meta }}</small>
              </div>
              <div v-if="weightCompactState.previousLabel" class="trend-compact-comparison">
                <span>Previous</span>
                <strong>{{ weightCompactState.previousLabel }}</strong>
                <small :class="weightCompactState.deltaTone">{{ weightCompactState.deltaLabel }}</small>
              </div>
            </div>
            <p class="chart-caption">{{ weightCompactState.message }}</p>
            <button class="btn small" type="button" @click="goToPlan">{{ weightCompactState.actionLabel }}</button>
          </div>
          <div v-else class="empty-state">
            <p class="empty">No weight history yet. Record your first weigh-in in Plan to start trend tracking.</p>
            <button class="btn small" type="button" @click="goToPlan">Record weigh-in</button>
          </div>
        </article>

        <article class="mini-panel bodyfat-panel">
          <header class="metric-chart-head bodyfat">
            <div class="metric-chart-title-block">
              <span class="metric-chart-kicker">Body composition</span>
              <strong>Body Fat</strong>
              <p>{{ bodyFatHeaderCaption }}</p>
            </div>
            <div class="metric-chart-value-block">
              <span class="metric-chart-value-caption">Latest</span>
              <strong>{{ bodyFatLatestLabel }}</strong>
              <span class="metric-chart-delta" :class="bodyFatDeltaTone">{{ bodyFatDeltaLabel }}</span>
            </div>
          </header>
          <div v-if="bodyFatSeries.length > 2 && bodyFatTrendChart.path" class="line-chart premium-line-chart bodyfat-chart">
            <div class="chart-surface bodyfat">
              <div class="chart-meta-row">
                <span>{{ bodyFatMetaLabel }}</span>
                <span>{{ bodyFatSeries.length }} records</span>
              </div>
              <svg viewBox="0 0 360 170" preserveAspectRatio="none" aria-hidden="true">
                <g class="grid-lines">
                  <line x1="18" y1="32" x2="342" y2="32"></line>
                  <line x1="18" y1="84" x2="342" y2="84"></line>
                  <line x1="18" y1="136" x2="342" y2="136"></line>
                </g>
                <path class="line-area bodyfat" :d="bodyFatTrendChart.area"></path>
                <path class="line-main bodyfat" :d="bodyFatTrendChart.path"></path>
              </svg>
              <div class="axis-label axis-label--top">{{ bodyFatMaxLabel }}</div>
              <div class="axis-label axis-label--bottom">{{ bodyFatMinLabel }}</div>
              <div class="points-layer">
                <button
                  v-for="(point, index) in bodyFatTrendChart.points"
                  :key="`bodyfat-${point.x}-${point.y}`"
                  type="button"
                  class="point-hit"
                  :class="{ clickable: point.interactive, latest: point.isLatest }"
                  :style="{ left: `${point.xPercent}%`, top: `${point.yPercent}%` }"
                  @mouseenter="showMetricTooltip('bodyfat', point, index)"
                  @mouseleave="hideMetricTooltip('bodyfat')"
                  @focus="showMetricTooltip('bodyfat', point, index)"
                  @blur="hideMetricTooltip('bodyfat')"
                  @click="point.interactive && openBodyFatSource(point)"
                >
                  <span
                    class="point-dot bodyfat"
                    :class="{
                      latest: point.isLatest,
                      active: metricTooltip.chartId === 'bodyfat' && metricTooltip.index === index
                    }"
                  ></span>
                </button>
                <div
                  v-if="metricTooltip.chartId === 'bodyfat'"
                  class="chart-tooltip"
                  :style="{ left: `${metricTooltip.left}%`, top: `${metricTooltip.top}%` }"
                >
                  <span class="tooltip-date">{{ metricTooltip.point?.dateLabel }}</span>
                  <strong>{{ metricTooltip.point?.valueLabel }}</strong>
                  <span class="tooltip-context">{{ metricTooltip.point?.deltaLabel }}</span>
                </div>
              </div>
            </div>
            <div class="chart-foot compact">
              <span>{{ bodyFatXStartLabel }}</span>
              <span>{{ bodyFatXEndLabel }}</span>
            </div>
            <div v-if="bodyFatSparseState" class="chart-inline-state">
              <p>{{ bodyFatSparseState.message }}</p>
              <button class="btn small" type="button" @click="goToPlan">
                {{ bodyFatSparseState.actionLabel }}
              </button>
            </div>
            <div v-if="bodyFatSourceDetail" class="chart-source-card">
              <div class="chart-source-copy">
                <span class="chart-source-label">Body fat source</span>
                <strong>{{ bodyFatSourceDetail.title }}</strong>
                <p>{{ bodyFatSourceDetail.description }}</p>
              </div>
                <div class="chart-source-actions">
                  <span>{{ bodyFatSourceDetail.meta }}</span>
                  <div class="chart-source-buttons">
                  <button class="btn small" type="button" @click="goToPlan">View plan</button>
                  <button
                    v-if="bodyFatSourceSelectionActive"
                    class="btn small subtle"
                    type="button"
                    @click="resetBodyFatSourceSelection"
                  >
                    Latest
                  </button>
                </div>
              </div>
            </div>
            <p class="chart-caption">{{ periodLabel }}</p>
          </div>
          <div v-else-if="bodyFatCompactState" class="trend-compact-state">
            <div class="trend-compact-main">
              <div class="trend-compact-value">
                <span class="trend-compact-label">Current value</span>
                <strong>{{ bodyFatCompactState.currentLabel }}</strong>
                <small>{{ bodyFatCompactState.meta }}</small>
              </div>
              <div v-if="bodyFatCompactState.previousLabel" class="trend-compact-comparison">
                <span>Previous</span>
                <strong>{{ bodyFatCompactState.previousLabel }}</strong>
                <small :class="bodyFatCompactState.deltaTone">{{ bodyFatCompactState.deltaLabel }}</small>
              </div>
            </div>
            <p class="chart-caption">{{ bodyFatCompactState.message }}</p>
            <button class="btn small" type="button" @click="goToPlan">{{ bodyFatCompactState.actionLabel }}</button>
          </div>
          <div v-else class="empty-state">
            <p class="empty">No body fat history yet. Record body fat in Plan to start trend tracking.</p>
            <button class="btn small" type="button" @click="goToPlan">Record body fat</button>
          </div>
        </article>
      </div>
    </section>

    <section class="dashboard-grid">
      <article class="panel dashboard-card consistency-panel">
        <div class="dashboard-card-head consistency-head">
          <h2>Training Consistency</h2>
          <div class="consistency-metrics">
            <span class="metric-pill">
              <em>Current streak</em>
              <strong>{{ consistencyCurrentStreakLabel }}</strong>
            </span>
            <span class="metric-pill">
              <em>Best streak</em>
              <strong>{{ consistencyBestStreakLabel }}</strong>
            </span>
            <span class="metric-pill metric-pill-copy">
              <strong>{{ consistencyActiveDaysMetricCopy }}</strong>
            </span>
          </div>
        </div>

        <div class="consistency-main">
          <div
            v-if="!consistencyDisplayHasData"
            class="consistency-empty-card"
            :style="consistencyEmptyCardStyle"
          >
            <p :style="consistencyEmptyCardTextStyle">No workouts logged yet. Start logging to build your consistency map.</p>
            <button class="btn small" type="button" :style="consistencyEmptyCardButtonStyle" @click="goToLogs">Log workout</button>
          </div>

          <div v-else-if="isSevenDayRange" class="consistency-strip-wrap">
            <div class="consistency-strip">
              <button
                v-for="cell in consistencyStripCells"
                :key="cell.key"
                type="button"
                class="consistency-strip-day"
                :disabled="cell.isFuture || cell.count === 0"
                @mouseenter="showConsistencyTooltip($event, cell)"
                @mousemove="moveConsistencyTooltip($event)"
                @mouseleave="hideConsistencyTooltip"
                @click="openConsistencySource(cell)"
              >
                <span class="consistency-strip-label">{{ cell.weekdayLabel }}</span>
                <span
                  class="heat-cell consistency-strip-cell"
                  :class="[ `lv-${cell.level}`, { today: cell.isToday, future: cell.isFuture } ]"
                ></span>
              </button>
            </div>
          </div>

          <div v-else class="consistency-map">
            <div class="weekday-col">
              <span v-for="label in weekdayLabels" :key="`weekday-${label.row}`">{{ label.text }}</span>
            </div>

            <div class="heatmap-scroll">
              <div class="heatmap-canvas">
                <div class="month-grid" :style="{ gridTemplateColumns: `repeat(${Math.max(consistencyWeekStarts.length, 1)}, 18px)` }">
                  <span
                    v-for="tick in consistencyMonthTicks"
                    :key="tick.key"
                    class="month-tick"
                    :style="{ gridColumn: tick.column }"
                  >
                    {{ tick.label }}
                  </span>
                </div>

                <div
                  class="heatmap-grid"
                  :style="{ gridTemplateColumns: `repeat(${Math.max(consistencyWeekStarts.length, 1)}, 18px)` }"
                >
                  <button
                    v-for="cell in consistencyCells"
                    :key="cell.key"
                    class="heat-cell"
                    :class="[ `lv-${cell.level}`, { today: cell.isToday, future: cell.isFuture, muted: cell.isOutsideRange } ]"
                    type="button"
                    :disabled="cell.isFuture || cell.isOutsideRange || cell.count === 0"
                    @mouseenter="showConsistencyTooltip($event, cell)"
                    @mousemove="moveConsistencyTooltip($event)"
                    @mouseleave="hideConsistencyTooltip"
                    @click="openConsistencySource(cell)"
                  ></button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="consistencyDisplayHasData" class="heatmap-meta">
            <span>{{ consistencyMetaLabel }}</span>
            <span>Based on completed workouts only</span>
          </div>

          <div v-if="consistencyDisplayHasData" class="legend-row consistency-legend">
            <span><i class="legend-dot lv0"></i>0 No workout</span>
            <span><i class="legend-dot lv1"></i>1 1 session</span>
            <span><i class="legend-dot lv2"></i>2 2 sessions</span>
            <span><i class="legend-dot lv3"></i>3+ 3+ sessions</span>
          </div>
          <p v-if="consistencyDisplayHasData" class="consistency-legend-note">Each square = 1 day. Darker = more sessions.</p>
        </div>

        <section v-if="!isSevenDayRange && consistencyDisplayHasData" class="consistency-weekly-section" aria-label="Weekly active days trend">
          <div class="section-title-row">
            <h3>Weekly active days trend</h3>
          </div>
          <div class="consistency-weekly-chart">
            <div class="consistency-weekly-grid-lines">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div
              class="consistency-weekly-bars"
              :style="{ gridTemplateColumns: `repeat(${Math.max(consistencyWeeklyBars.length, 1)}, minmax(0, 1fr))` }"
            >
              <button
                v-for="week in consistencyWeeklyBars"
                :key="week.key"
                type="button"
                class="consistency-week-bar"
                :disabled="week.activeDays === 0"
                :title="week.tooltip"
                @click="openConsistencyWeekSource(week)"
              >
                <span class="consistency-week-bar-fill" :style="{ height: `${week.height}%` }"></span>
              </button>
            </div>
          </div>
          <div class="consistency-weekly-footer">
            <span>{{ periodLabel }}</span>
            <span>0-7 days/week</span>
          </div>
          <p v-if="consistencySparseHint" class="consistency-hint">Log a few more workouts to make your consistency trend meaningful.</p>
        </section>

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

      <article class="panel dashboard-card circumference-panel">
        <div class="dashboard-card-head">
          <h2>Body Circumference </h2>
          <div class="circumference-head-meta">
            <span class="panel-meta">{{ circumferenceSnapshotLabel }}</span>
            <button class="btn small subtle" type="button" @click="goToPlan">Add Measurements</button>
          </div>
        </div>
        <div v-if="circumferenceSummaryItems.length" class="circumference-summary">
          <article v-for="item in circumferenceSummaryItems" :key="item.id" class="circumference-summary-row">
            <strong class="summary-label">{{ item.label }}</strong>
            <div class="summary-value">
              <span>{{ item.valueLabel }}</span>
              <em :class="item.deltaTone">{{ item.deltaText }}</em>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">
          <p class="empty">No body measurements yet.</p>
          <p class="empty-subtext">Add your first circumference snapshot in Plan -> Body Circumference.</p>
          <button class="btn small" type="button" @click="goToPlan">Add Measurements</button>
        </div>
      </article>

      <article class="panel dashboard-card volume-panel">
        <div class="dashboard-card-head volume-head">
          <h2>Training Volume</h2>
          <div class="volume-head-meta">
            <span class="panel-meta">{{ volumeDateRangeLabel }}</span>
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
        </div>

        <div v-if="volumeHasAnyData" class="volume-axis-layout">
          <div class="volume-y-axis">
            <span>{{ formatVolumeAxisTick(volumeAxisMax) }}</span>
            <span>{{ formatVolumeAxisTick(volumeAxisMid) }}</span>
            <span>{{ formatVolumeAxisTick(0) }}</span>
          </div>
          <div class="volume-axis-main">
            <div class="volume-plot">
              <span class="volume-unit-label">{{ volumeUnitLabel }}</span>
              <div class="volume-grid-lines">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div
                v-if="showVolumeGoalLine"
                class="volume-goal-line"
                :style="{ bottom: `${volumeGoalOffset}%` }"
              >
                <span>{{ volumeGoalLabel }}</span>
              </div>
              <div class="volume-bars" :style="{ gridTemplateColumns: `repeat(${Math.max(volumeBars.length, 1)}, minmax(0, 1fr))` }">
                <button
                  v-for="item in volumeBars"
                  :key="item.key"
                  type="button"
                  class="volume-bar-col"
                  @click="openVolumeSource(item)"
                >
                  <em class="volume-bar-value">{{ formatVolumeValue(item.value, activeVolumeMetric.id) }}</em>
                  <span class="volume-bar-fill" :style="{ height: `${item.height}%` }"></span>
                </button>
              </div>
            </div>
            <div class="volume-x-axis" :style="{ gridTemplateColumns: `repeat(${Math.max(volumeBars.length, 1)}, minmax(0, 1fr))` }">
              <span v-for="item in volumeBars" :key="`x-${item.key}`">{{ item.displayLabel }}</span>
            </div>
          </div>
        </div>
        <div v-else class="volume-empty-state">
          <p class="empty">No training volume yet in this range.</p>
          <p class="empty-subtext">Log a completed workout to start building your volume trend.</p>
          <button class="btn small" type="button" @click="goToLogs">Log workout</button>
        </div>
        <p v-if="volumeHasAnyData" class="dashboard-card-footer-note">{{ volumeHelperText }}</p>
        <div v-if="volumeSparseState && volumeHasAnyData" class="chart-inline-state">
          <p>{{ volumeSparseState.message }}</p>
          <button class="btn small" type="button" @click="goToLogs">{{ volumeSparseState.actionLabel }}</button>
        </div>
      </article>

      <article class="panel dashboard-card circumference-trend-panel">
        <div class="dashboard-card-head">
          <h2>Circumference Trend</h2>
          <div class="inline-tabs compact scrollable">
            <button
              v-for="option in circumferenceMetricOptions"
              :key="option.id"
              type="button"
              class="inline-tab"
              :class="{ active: selectedCircumferenceMetric === option.id }"
              @click="selectedCircumferenceMetric = option.id"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div v-if="circumferenceHasData" class="circumference-trend">
          <header class="metric-chart-head circumference">
            <div class="metric-chart-title-block">
              <span class="metric-chart-kicker">Measurement history</span>
              <strong>{{ selectedCircumferenceMetricOption.label }}</strong>
              <p>{{ circumferenceHeaderCaption }}</p>
            </div>
            <div v-if="selectedCircumferenceSeries.length" class="metric-chart-value-block">
              <span class="metric-chart-value-caption">Latest</span>
              <strong>{{ circumferenceLatestLabel }}</strong>
              <span class="metric-chart-delta" :class="circumferenceDeltaTone">{{ circumferenceDeltaLabel }}</span>
            </div>
          </header>
          <div v-if="selectedCircumferenceSeries.length > 2" class="line-chart premium-line-chart circumference-chart">
            <div class="chart-with-axis">
              <div class="y-axis-labels">
                <span>{{ circumferenceYMaxLabel }}</span>
                <span>{{ circumferenceYMidLabel }}</span>
                <span>{{ circumferenceYMinLabel }}</span>
              </div>
              <div class="chart-core">
                <div class="chart-surface circumference">
                  <div class="chart-meta-row">
                    <span>{{ circumferenceMetaLabel }}</span>
                    <span>{{ selectedCircumferenceSeries.length }} records</span>
                  </div>
                  <svg viewBox="0 0 360 170" preserveAspectRatio="none" aria-hidden="true">
                    <g class="grid-lines">
                      <line x1="18" y1="32" x2="342" y2="32"></line>
                      <line x1="18" y1="84" x2="342" y2="84"></line>
                      <line x1="18" y1="136" x2="342" y2="136"></line>
                    </g>
                    <path class="line-area circumference" :d="selectedCircumferenceChart.area"></path>
                    <path class="line-main circumference" :d="selectedCircumferenceChart.path"></path>
                  </svg>
                  <div class="axis-label axis-label--top">{{ circumferenceYMaxLabel }}</div>
                  <div class="axis-label axis-label--bottom">{{ circumferenceYMinLabel }}</div>
                  <div class="points-layer">
                    <button
                      v-for="(point, index) in selectedCircumferenceChart.points"
                      :key="`circumference-${selectedCircumferenceMetric}-${point.x}-${point.y}`"
                      type="button"
                      class="point-hit"
                      :class="{ latest: point.isLatest }"
                      :style="{ left: `${point.xPercent}%`, top: `${point.yPercent}%` }"
                      @mouseenter="showMetricTooltip('circumference', point, index)"
                      @mouseleave="hideMetricTooltip('circumference')"
                      @focus="showMetricTooltip('circumference', point, index)"
                      @blur="hideMetricTooltip('circumference')"
                    >
                      <span
                        class="point-dot circumference"
                        :class="{
                          latest: point.isLatest,
                          active: metricTooltip.chartId === 'circumference' && metricTooltip.index === index
                        }"
                      ></span>
                    </button>
                    <div
                      v-if="metricTooltip.chartId === 'circumference'"
                      class="chart-tooltip"
                      :style="{ left: `${metricTooltip.left}%`, top: `${metricTooltip.top}%` }"
                    >
                      <span class="tooltip-date">{{ metricTooltip.point?.dateLabel }}</span>
                      <strong>{{ metricTooltip.point?.valueLabel }}</strong>
                      <span class="tooltip-context">{{ metricTooltip.point?.deltaLabel }}</span>
                    </div>
                  </div>
                </div>
                <div class="x-axis-labels">
                  <span>{{ circumferenceXStartLabel }}</span>
                  <span>{{ circumferenceXMidLabel }}</span>
                  <span>{{ circumferenceXEndLabel }}</span>
                </div>
              </div>
            </div>
            <div class="axis-note">Y-axis: cm · X-axis: Date</div>
          </div>

          <div v-else-if="circumferenceCompactState" class="circumference-single-state">
            <div class="single-point-card">
              <strong>{{ selectedCircumferenceMetricOption.label }}</strong>
              <span>{{ circumferenceCompactState.currentLabel }}</span>
              <small>{{ circumferenceCompactState.meta }}</small>
            </div>
            <p>{{ circumferenceCompactState.message }}</p>
          </div>

          <div v-else class="circumference-single-state">
            <p>No saved measurements for {{ selectedCircumferenceMetricOption.label.toLowerCase() }} in {{ periodLabel.toLowerCase() }}.</p>
          </div>

          <p class="dashboard-card-footer-note">{{ periodLabel }} · Based on saved measurements</p>
        </div>

        <div v-else class="empty-state">
          <p class="empty">No body measurements yet.</p>
          <p class="empty-subtext">Add your first circumference snapshot in Plan -> Body Circumference.</p>
          <button class="btn small" type="button" @click="goToPlan">Add Measurements</button>
        </div>
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
          <p>{{ item.summaryLine }}</p>
          <div class="progress-track">
            <span :class="item.statusTone" :style="{ width: `${item.progressPercent}%` }"></span>
          </div>
          <small :class="item.statusTone">{{ item.statusText }}</small>
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
            {{ aiLoading ? 'Refreshing...' : aiInsightReady || aiUnavailable ? 'Refresh insights' : 'Generate insights' }}
          </button>
        </div>
      </div>
      <p v-if="aiError" class="ai-error">{{ aiError }}</p>
      <div v-else-if="aiInsightReady" class="ai-summary-grid">
        <article class="ai-summary-card">
          <span class="ai-summary-label">Key Insight</span>
          <p>{{ aiInsight.keyInsight }}</p>
          <small v-if="aiInsight.insufficientData" class="ai-summary-note">Low confidence · based on limited data.</small>
        </article>
        <article class="ai-summary-card">
          <span class="ai-summary-label">Risks & Bottlenecks</span>
          <ul v-if="aiInsight.risks.length" class="ai-summary-list">
            <li v-for="item in aiInsight.risks" :key="item">{{ item }}</li>
          </ul>
          <p v-else class="ai-summary-placeholder">No clear risks surfaced for this period.</p>
        </article>
        <article class="ai-summary-card">
          <span class="ai-summary-label">Next 7 Days</span>
          <ul v-if="aiInsight.next7Days.length" class="ai-summary-list">
            <li v-for="item in aiInsight.next7Days" :key="item">{{ item }}</li>
          </ul>
          <p v-else class="ai-summary-placeholder">Refresh insights after more data is logged.</p>
        </article>
      </div>
      <div v-else-if="aiUnavailable" class="ai-unavailable">
        <p>Insight unavailable.</p>
        <button class="btn primary small" type="button" :disabled="aiLoading" @click="fetchAiInsight">Refresh insights</button>
      </div>
      <p v-else class="empty">No AI insight yet. Click "Generate insights" to create one.</p>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { buildAuthServerUrl } from '@/lib/authServerOrigin'
import { loadCloudClientState, saveCloudClientState } from '@/lib/cloudClientState'
import { getUserStorageKey } from '@/lib/userStorage'

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
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 }
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

const circumferenceMetricOptions = [
  { id: 'waist', label: 'Waist' },
  { id: 'chest', label: 'Chest' },
  { id: 'hips', label: 'Hips' },
  { id: 'thigh', label: 'Thigh' },
  { id: 'calf', label: 'Calf' }
]

const circumferenceSummaryConfig = [
  { id: 'waist', label: 'Waist', accessor: (item) => toNumber(item?.waist) },
  { id: 'chest', label: 'Chest', accessor: (item) => toNumber(item?.chest) },
  { id: 'hips', label: 'Hips', accessor: (item) => toNumber(item?.hip) },
  {
    id: 'thigh',
    label: 'Thigh',
    accessor: (item) => averageMeasurements(item?.leftThigh, item?.rightThigh)
  },
  {
    id: 'calf',
    label: 'Calf',
    accessor: (item) => averageMeasurements(item?.leftCalf, item?.rightCalf)
  },
  {
    id: 'arm',
    label: 'Arm',
    accessor: (item) => averageMeasurements(item?.leftArm, item?.rightArm)
  }
]

function normalizeCircumferenceLog(raw = {}) {
  return {
    chest: raw?.chest ?? '',
    waist: raw?.waist ?? '',
    hip: raw?.hip ?? '',
    leftThigh: raw?.leftThigh ?? raw?.thigh ?? '',
    rightThigh: raw?.rightThigh ?? raw?.thigh ?? '',
    leftCalf: raw?.leftCalf ?? raw?.calf ?? '',
    rightCalf: raw?.rightCalf ?? raw?.calf ?? '',
    leftArm: raw?.leftArm ?? raw?.arm ?? '',
    rightArm: raw?.rightArm ?? raw?.arm ?? ''
  }
}

function averageMeasurements(...values) {
  const numeric = values.map((value) => toNumber(value)).filter((value) => value != null)
  if (!numeric.length) return null
  return Number((numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(1))
}

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
      leftThigh: '',
      rightThigh: '',
      leftCalf: '',
      rightCalf: '',
      leftArm: '',
      rightArm: ''
    },
    circumferenceRecords: [],
    performance: { strength: {} }
  }
}

const auth = useAuthStore()
const router = useRouter()
const logsKey = computed(() => getUserStorageKey('pf_workout_logs', auth.user))
const planKey = computed(() => getUserStorageKey('pf_plan_state', auth.user))
const aiInsightKey = computed(() => getUserStorageKey('pf_progress_ai_insight', auth.user))

const logs = ref([])
const planState = ref(createEmptyAnalyticsPlan())

const rangeDays = ref(30)
const volumeMetric = ref('minutes')
const selectedStrengthMetric = ref('bench')
const selectedCircumferenceMetric = ref('waist')

const aiInsight = ref(null)
const aiMeta = ref(createEmptyAiMeta())
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
const metricTooltip = ref({
  chartId: '',
  index: -1,
  left: 0,
  top: 0,
  point: null
})
const activeTheme = ref('light')
let themeObserver = null
const sourcePanel = ref({
  visible: false,
  title: '',
  subtitle: '',
  items: [],
  targetRoute: null,
  targetLabel: '',
  emptyMessage: 'No source records for this selection.'
})
const selectedBodyFatSourceDate = ref(null)

const consistencyEmptyCardStyle = computed(() => (
  activeTheme.value === 'dark'
    ? {
        backgroundColor: '#0f172a',
        backgroundImage:
          'linear-gradient(180deg, rgba(242, 111, 111, 0.05), transparent 26%), linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.94))',
        borderColor: 'rgba(71, 85, 105, 0.64)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03), inset 0 -1px 0 rgba(255, 255, 255, 0.02)'
      }
    : {
        backgroundColor: '#f8fafc',
        backgroundImage: 'linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.92))',
        borderColor: 'rgba(226, 232, 240, 0.96)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.82)'
      }
))

const consistencyEmptyCardTextStyle = computed(() => (
  activeTheme.value === 'dark'
    ? { color: 'rgba(203, 213, 225, 0.82)' }
    : { color: '#94a3b8' }
))

const consistencyEmptyCardButtonStyle = computed(() => (
  activeTheme.value === 'dark'
    ? {
        background: 'rgba(15, 23, 42, 0.96)',
        borderColor: 'rgba(71, 85, 105, 0.7)',
        color: '#f8fafc'
      }
    : {}
))

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

function formatWeekdayShort(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
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

function stripNumericSign(value) {
  return String(value || '').replace(/^[+-]/, '')
}

function formatCountLabel(value, singular, plural = `${singular}s`, options = {}) {
  if (value == null || Number.isNaN(Number(value))) return `-- ${plural}`
  const numeric = Number(value)
  const decimals = Number.isInteger(options.decimals) ? options.decimals : 0
  const unit = Math.abs(numeric) === 1 ? singular : plural
  return `${numeric.toFixed(decimals)} ${unit}`
}

function formatSignedCountLabel(value, singular, plural = `${singular}s`, options = {}) {
  if (value == null || Number.isNaN(Number(value))) return '--'
  const numeric = Number(value)
  const decimals = Number.isInteger(options.decimals) ? options.decimals : 0
  const unit = Math.abs(numeric) === 1 ? singular : plural
  const sign = numeric > 0 ? '+' : ''
  return `${sign}${numeric.toFixed(decimals)} ${unit}`
}

function createDeltaItems(current, previous, yearAgo, options = {}) {
  const decimals = Number.isInteger(options.decimals) ? options.decimals : 0
  const suffix = options.suffix || ''
  const positiveIsGood = options.positiveIsGood !== false
  const colorize = options.colorize !== false
  const warningRatio = Number.isFinite(options.warningRatio) ? options.warningRatio : 1
  const formatValue = typeof options.formatValue === 'function'
    ? options.formatValue
    : (value) => formatSignedNumber(value, { decimals, suffix })

  const makeItem = (label, baseline) => {
    if (current == null || baseline == null || Number.isNaN(Number(current)) || Number.isNaN(Number(baseline))) {
      return { label, value: '--', tone: 'neutral', diff: null }
    }
    const diff = Number((Number(current) - Number(baseline)).toFixed(decimals))
    if (diff === 0) {
      return { label, value: formatValue(0), tone: 'neutral', diff: 0 }
    }
    let tone = 'neutral'
    if (colorize) {
      const positive = diff > 0
      const harmful = positiveIsGood ? !positive : positive
      if (!harmful) {
        tone = 'up'
      } else {
        const baselineAbs = Math.max(Math.abs(Number(baseline)) || 0, 1)
        const relativeChange = Math.abs(diff) / baselineAbs
        tone = relativeChange < warningRatio ? 'warning' : 'down'
      }
    }
    return {
      label,
      value: formatValue(diff),
      tone,
      diff
    }
  }

  return [makeItem('Previous period', previous), makeItem('Year over year', yearAgo)]
}

function formatDeltaSummaryLabel(label) {
  return label === 'Previous period' ? 'Vs previous' : 'Year over year'
}

function formatDeltaSummaryText(item) {
  if (!item || item.diff == null || item.value === '--') {
    return item?.label === 'Year over year' ? 'No year-over-year comparison available' : 'No previous comparison available'
  }
  if (item.diff === 0) {
    return item.label === 'Year over year' ? 'No change year over year' : 'No change versus previous period'
  }
  const direction = item.diff > 0 ? 'Up' : 'Down'
  const amount = stripNumericSign(item.value)
  return item.label === 'Year over year'
    ? `${direction} ${amount} year over year`
    : `${direction} ${amount} vs previous period`
}

function createPrimaryDeltaSummary(items = []) {
  const [primary, secondary] = Array.isArray(items) ? items : []
  return {
    primary: primary
      ? { ...primary, label: formatDeltaSummaryLabel(primary.label), text: formatDeltaSummaryText(primary) }
      : { label: 'Vs previous', value: '--', tone: 'neutral', text: 'No previous comparison available' },
    secondaryText: secondary ? formatDeltaSummaryText(secondary) : ''
  }
}

function createEmptyAiMeta() {
  return { source: '', generatedAt: '', unavailable: false }
}

function normalizeAiInsightText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^[•\-]\s*/, '')
    .trim()
}

function isDirtyAiInsightText(value) {
  return /\b(?:WORKOUT ADVICE|NUTRITION ADVICE|Draft response|Key conclusions?|Risks?\s*\/\s*bottlenecks?|Next\s*7[- ]day action plan|Sources?)\b/i.test(
    normalizeAiInsightText(value)
  )
}

function uniqueAiInsightItems(values = []) {
  const seen = new Set()
  return values.filter((item) => {
    const key = String(item).toLowerCase()
    if (!item || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeAiInsightList(value, limit = 3) {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? value.split('\n') : []
  return uniqueAiInsightItems(
    source
      .map((item) => normalizeAiInsightText(item))
      .filter((item) => item && !isDirtyAiInsightText(item))
  ).slice(0, limit)
}

function normalizeAiInsightPayload(value) {
  if (!value || typeof value !== 'object') return null

  const keyInsight = normalizeAiInsightText(value.keyInsight || '')
  if (!keyInsight || isDirtyAiInsightText(keyInsight)) return null

  return {
    keyInsight,
    risks: normalizeAiInsightList(value.risks, 3),
    next7Days: normalizeAiInsightList(value.next7Days, 3),
    confidence: ['low', 'medium', 'high'].includes(String(value.confidence || '').toLowerCase())
      ? String(value.confidence).toLowerCase()
      : 'low',
    insufficientData: Boolean(value.insufficientData),
    basedOn: {
      timeRange: normalizeAiInsightText(value?.basedOn?.timeRange || ''),
      snapshotVersion: normalizeAiInsightText(value?.basedOn?.snapshotVersion || '')
    }
  }
}

function buildBodyFatSourceDetail(pointDate = null) {
  const pointIso = pointDate ? toIsoDate(pointDate) : ''
  const latestPoint = bodyFatSeries.value.length
    ? bodyFatSeries.value[bodyFatSeries.value.length - 1]
    : null
  const fallbackIso = latestPoint?.date ? toIsoDate(latestPoint.date) : ''
  const targetIso = pointIso || fallbackIso
  const matched = targetIso
    ? rawBodyRecords.value.find((item) => item.iso === targetIso && item.bodyFat != null)
    : null

  const bodyFatValue = matched?.bodyFat ?? toNumber(planState.value.bodyMetrics?.bodyFat)
  if (bodyFatValue == null) return null

  return {
    id: targetIso || 'current',
    title: `${Number(bodyFatValue).toFixed(1)}% body fat`,
    meta: matched
      ? `${formatLongDate(matched.date)} · Recorded body composition entry`
      : 'Current plan body fat',
    description: matched?.weight != null
      ? `Same-day body weight: ${Number(matched.weight).toFixed(1)} kg`
      : 'Saved from your current Plan body metrics.'
  }
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
      ...normalizeCircumferenceLog(data?.bodyCircumferenceLog || {})
    }
    next.circumferenceRecords = Array.isArray(data?.circumferenceRecords)
      ? data.circumferenceRecords
        .map((item) => ({
          date: item?.date || '',
          recordedAt: item?.recordedAt || item?.date || '',
          measurements: normalizeCircumferenceLog(item?.measurements || item || {})
        }))
        .filter((item) => item.date)
      : []
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

function buildAnalyticsSummaryFingerprint(summary, range) {
  return JSON.stringify({
    range,
    summary: summary || {}
  })
}

function loadCachedAiInsight() {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(aiInsightKey.value)
  if (!raw) {
    aiInsight.value = null
    aiMeta.value = createEmptyAiMeta()
    return
  }
  try {
    const parsed = JSON.parse(raw)
    const expectedFingerprint = buildAnalyticsSummaryFingerprint(analyticsSummary.value, rangeDays.value)
    if (parsed?.fingerprint !== expectedFingerprint) {
      localStorage.removeItem(aiInsightKey.value)
      aiInsight.value = null
      aiMeta.value = createEmptyAiMeta()
      return
    }
    const normalizedInsight = normalizeAiInsightPayload(parsed?.insight)
    aiInsight.value = normalizedInsight
    aiMeta.value = {
      source: String(parsed?.meta?.source || ''),
      generatedAt: String(parsed?.meta?.generatedAt || ''),
      unavailable:
        Boolean(parsed?.meta?.unavailable) ||
        (!normalizedInsight && Boolean(parsed?.insight || parsed?.meta?.source || parsed?.meta?.generatedAt))
    }
  } catch (error) {
    console.error('Failed to parse cached AI insight', error)
    aiInsight.value = null
    aiMeta.value = createEmptyAiMeta()
  }
}

function saveCachedAiInsight() {
  if (typeof window === 'undefined') return
  const fingerprint = buildAnalyticsSummaryFingerprint(analyticsSummary.value, rangeDays.value)
  localStorage.setItem(aiInsightKey.value, JSON.stringify({
    insight: aiInsight.value,
    meta: aiMeta.value,
    fingerprint
  }))
  saveCloudClientState({
    scope: 'user',
    stateKey: 'analytics_ai_insight',
    stateValue: {
      insight: aiInsight.value,
      meta: aiMeta.value,
      fingerprint
    }
  }).catch((error) => {
    console.error('Failed to save analytics insight to cloud', error)
  })
}

async function loadCloudAiInsight() {
  try {
    const state = await loadCloudClientState({
      scope: 'user',
      keys: ['analytics_ai_insight']
    })
    const payload = state?.analytics_ai_insight
    if (!payload || typeof payload !== 'object') return
    const expectedFingerprint = buildAnalyticsSummaryFingerprint(analyticsSummary.value, rangeDays.value)
    if (payload?.fingerprint !== expectedFingerprint) {
      aiInsight.value = null
      aiMeta.value = createEmptyAiMeta()
      return
    }
    const normalizedInsight = normalizeAiInsightPayload(payload?.insight)
    aiInsight.value = normalizedInsight
    aiMeta.value = {
      source: String(payload?.meta?.source || ''),
      generatedAt: String(payload?.meta?.generatedAt || ''),
      unavailable:
        Boolean(payload?.meta?.unavailable) ||
        (!normalizedInsight && Boolean(payload?.insight || payload?.meta?.source || payload?.meta?.generatedAt))
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(aiInsightKey.value, JSON.stringify({
        insight: aiInsight.value,
        meta: aiMeta.value,
        fingerprint: expectedFingerprint
      }))
    }
  } catch (error) {
    console.error('Failed to load analytics insight from cloud', error)
  }
}

function handleStorage(event) {
  if (!event || event.key === logsKey.value || event.key === planKey.value) {
    loadLogs()
    loadPlan()
  }
  if (!event || event.key === aiInsightKey.value) {
    loadCachedAiInsight()
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
const periodDateLabel = computed(() => `${formatShortDate(rangeStartDate.value)} - ${formatShortDate(rangeEndDate.value)}`)
const isSevenDayRange = computed(() => rangeDays.value === 7)

const rangeWeekStarts = computed(() => {
  const list = []
  let cursor = startOfWeekMonday(rangeStartDate.value)
  const lastWeekStart = startOfWeekMonday(rangeEndDate.value)
  while (cursor <= lastWeekStart) {
    list.push(new Date(cursor))
    cursor = shiftDays(cursor, 7)
  }
  return list
})

function clampDateRange(date, minDate, maxDate) {
  if (date < minDate) return new Date(minDate)
  if (date > maxDate) return new Date(maxDate)
  return new Date(date)
}

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

const completedLogsDetailedInRange = computed(() =>
  completedLogsInRange.value
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
const averageDailyMinutesLabel = computed(() =>
  `${formatCountLabel(avgDailyMinutes.value, 'minute')} per day on average`
)
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

const weeklyTrend = computed(() =>
  rangeWeekStarts.value.map((weekStart, index) => {
    const weekEnd = endOfDay(shiftDays(weekStart, 6))
    const effectiveStart = clampDateRange(weekStart, rangeStartDate.value, rangeEndDate.value)
    const effectiveEnd = endOfDay(clampDateRange(weekEnd, rangeStartDate.value, rangeEndDate.value))
    const weekLogs = completedLogsDetailedInRange.value.filter((item) =>
      item.dateObj >= effectiveStart && item.dateObj <= effectiveEnd
    )
    const sessions = weekLogs.length
    const minutes = weekLogs.reduce((sum, item) => sum + item.minutes, 0)
    const load = weekLogs.reduce((sum, item) => sum + getWorkoutLoad(item), 0)
    return {
      key: `${toIsoDate(weekStart)}-${index}`,
      start: effectiveStart,
      end: effectiveEnd,
      label: formatShortDate(effectiveStart),
      sessions,
      minutes,
      load
    }
  })
)

const dailyTrend = computed(() => {
  const days = []
  for (let offset = 0; offset < rangeDays.value; offset += 1) {
    const dayStart = shiftDays(rangeStartDate.value, offset)
    const dayEnd = endOfDay(dayStart)
    const dayLogs = completedLogsDetailedInRange.value.filter((item) =>
      item.dateObj >= dayStart && item.dateObj <= dayEnd
    )
    days.push({
      key: `${toIsoDate(dayStart)}-${offset}`,
      start: dayStart,
      end: dayEnd,
      label: formatShortDate(dayStart),
      displayLabel: formatWeekdayShort(dayStart),
      sessions: dayLogs.length,
      minutes: dayLogs.reduce((sum, item) => sum + item.minutes, 0),
      load: dayLogs.reduce((sum, item) => sum + getWorkoutLoad(item), 0)
    })
  }
  return days
})

const activeVolumeMetric = computed(() => {
  return volumeMetricOptions.find((item) => item.id === volumeMetric.value) || volumeMetricOptions[0]
})

const volumeDateRangeLabel = computed(() => periodLabel.value)

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

const volumeBars = computed(() => {
  const metricId = activeVolumeMetric.value.id
  const source = isSevenDayRange.value ? dailyTrend.value : weeklyTrend.value
  const maxValue = Math.max(...source.map((item) => Number(item[metricId]) || 0), 0)
  const axisMax = getVolumeAxisMax(Math.max(maxValue, volumeGoalValue.value || 0), metricId)
  const total = source.length
  return source.map((item, index) => {
    const value = Number(item[metricId]) || 0
    const showLabel = isSevenDayRange.value
      ? true
      : total <= 4
        ? index === 0 || index === total - 1
        : total <= 8
          ? index % 2 === 0 || index === total - 1
          : index === 0 || index === total - 1
    return {
      ...item,
      value,
      height: axisMax > 0 ? Math.max(0, Math.round((value / axisMax) * 100)) : 0,
      displayLabel: showLabel ? (isSevenDayRange.value ? item.displayLabel : item.label) : ''
    }
  })
})

const weeklyMinutesGoal = computed(() => {
  const durationTarget = toNumber(planState.value.challengeValues?.duration)
  if (durationTarget == null || durationTarget <= 0) return null
  return Math.round(durationTarget * 7)
})

const volumeGoalValue = computed(() =>
  activeVolumeMetric.value.id !== 'minutes'
    ? null
    : weeklyMinutesGoal.value == null
      ? null
      : isSevenDayRange.value
        ? Math.round(weeklyMinutesGoal.value / 7)
        : weeklyMinutesGoal.value
)

const volumeRawMax = computed(() =>
  Math.max(...volumeBars.value.map((item) => Number(item.value) || 0), 0)
)

const volumeAxisMax = computed(() =>
  getVolumeAxisMax(Math.max(volumeRawMax.value, volumeGoalValue.value || 0), activeVolumeMetric.value.id)
)

const volumeAxisMid = computed(() => volumeAxisMax.value / 2)

const volumeAxisLabel = computed(() => {
  const metricId = activeVolumeMetric.value.id
  if (metricId === 'minutes') return 'Minutes'
  if (metricId === 'sessions') return 'Sessions'
  return 'Load (kg)'
})

const volumeUnitLabel = computed(() => {
  const metricId = activeVolumeMetric.value.id
  const cadence = isSevenDayRange.value ? 'day' : 'week'
  if (metricId === 'minutes') return `mins/${cadence}`
  if (metricId === 'sessions') return `sessions/${cadence}`
  return `load/${cadence}`
})

const volumeHelperText = computed(() => {
  const metricId = activeVolumeMetric.value.id
  if (metricId === 'minutes') {
    if (isSevenDayRange.value) {
      return weeklyMinutesGoal.value == null
        ? 'Completed workout minutes per day · No goal set'
        : `Completed workout minutes per day · Target ${Math.round(weeklyMinutesGoal.value / 7)} min/day`
    }
    return weeklyMinutesGoal.value == null
      ? 'Total workout minutes per week · Goal not set in Plan'
      : `Total workout minutes per week · Goal ${weeklyMinutesGoal.value} min/week`
  }
  if (metricId === 'sessions') return isSevenDayRange.value ? 'Completed sessions per day' : 'Total completed sessions per week'
  return isSevenDayRange.value ? 'Estimated training load per day' : 'Estimated training load per week'
})

const showVolumeGoalLine = computed(() =>
  activeVolumeMetric.value.id === 'minutes' && weeklyMinutesGoal.value != null
)

const volumeGoalOffset = computed(() => {
  if (!showVolumeGoalLine.value || !volumeAxisMax.value || volumeGoalValue.value == null) return 0
  return Math.min(100, Math.max(0, Math.round((volumeGoalValue.value / volumeAxisMax.value) * 100)))
})

const volumeGoalLabel = computed(() =>
  weeklyMinutesGoal.value == null
    ? 'Goal not set'
    : isSevenDayRange.value
      ? `${Math.round(weeklyMinutesGoal.value / 7)} min/day goal`
      : `${weeklyMinutesGoal.value} min/week goal`
)

function formatVolumeValue(value, metricId) {
  const rounded = Math.round(value || 0)
  if (metricId === 'load') return rounded.toLocaleString('en-US')
  return `${rounded}`
}

function formatVolumeAxisTick(value) {
  const metricId = activeVolumeMetric.value.id
  if (metricId === 'sessions') return `${Math.round(value)}`
  if (metricId === 'load') return Math.round(value || 0).toLocaleString('en-US')
  return `${Math.round(value || 0)}`
}

const volumePeakText = computed(() => {
  const metricId = activeVolumeMetric.value.id
  const peak = Math.max(...weeklyTrend.value.map((item) => Number(item[metricId]) || 0), 0)
  if (metricId === 'minutes') return `${formatVolumeValue(peak, metricId)} min peak`
  if (metricId === 'sessions') return `${formatVolumeValue(peak, metricId)} sessions peak`
  return `${formatVolumeValue(peak, metricId)} kg peak`
})

const volumeHasAnyData = computed(() => volumeBars.value.some((item) => item.value > 0))

const volumeSparseState = computed(() => {
  if (isSevenDayRange.value) {
    const activeDays = volumeBars.value.filter((item) => item.value > 0).length
    if (activeDays > 0) return null
    return {
      message: 'No completed workouts logged in this 7-day window yet.',
      actionLabel: 'Log workout'
    }
  }
  const activeWeeks = volumeBars.value.filter((item) => item.value > 0).length
  if (activeWeeks >= 2) return null
  return {
    message: 'Log workouts across at least 2 different weeks to unlock a reliable trend.',
    actionLabel: 'Log workout'
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
  const currentLast = weightRangeSeries.value[weightRangeSeries.value.length - 1].value
  const previousLast = previousWeightSeries.value.length
    ? previousWeightSeries.value[previousWeightSeries.value.length - 1].value
    : null
  return {
    currentLast,
    changeKg: previousLast == null ? null : Number((currentLast - previousLast).toFixed(1))
  }
})

const weightTrendLabel = computed(() => {
  if (!weightTrend.value) return '--'
  if (weightTrend.value.changeKg == null) return '--'
  return formatSignedCountLabel(weightTrend.value.changeKg, 'kilogram', 'kilograms', { decimals: 1 })
})

const weightTrendHint = computed(() => {
  if (!weightTrend.value) return 'No weight records in this period'
  if (weightTrend.value.changeKg == null) return 'No previous comparison available'
  if (weightTrend.value.changeKg > 0) return 'Up versus previous period'
  if (weightTrend.value.changeKg < 0) return 'Down versus previous period'
  return 'No change versus previous period'
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
  createDeltaItems(totalSessions.value, previousPeriodStats.value.totalSessions, yearAgoPeriodStats.value.totalSessions, {
    formatValue: (value) => formatSignedCountLabel(value, 'session')
  })
)
const sessionDeltaSummary = computed(() => createPrimaryDeltaSummary(sessionDeltaItems.value))

const completionDeltaItems = computed(() =>
  createDeltaItems(
    completionRate.value,
    previousPeriodStats.value.completionRate,
    yearAgoPeriodStats.value.completionRate,
    { formatValue: (value) => formatSignedCountLabel(value, 'percentage point') }
  )
)
const completionDeltaSummary = computed(() => createPrimaryDeltaSummary(completionDeltaItems.value))

const minutesDeltaItems = computed(() =>
  createDeltaItems(totalMinutes.value, previousPeriodStats.value.totalMinutes, yearAgoPeriodStats.value.totalMinutes, {
    formatValue: (value) => formatSignedCountLabel(value, 'minute')
  })
)
const minutesDeltaSummary = computed(() => createPrimaryDeltaSummary(minutesDeltaItems.value))

const caloriesDeltaItems = computed(() =>
  createDeltaItems(
    totalCalories.value,
    previousPeriodStats.value.totalCalories,
    yearAgoPeriodStats.value.totalCalories,
    { formatValue: (value) => formatSignedCountLabel(value, 'calorie') }
  )
)
const caloriesDeltaSummary = computed(() => createPrimaryDeltaSummary(caloriesDeltaItems.value))

const streakDeltaItems = computed(() =>
  createDeltaItems(
    currentStreak.value,
    previousPeriodStats.value.currentStreak,
    yearAgoPeriodStats.value.currentStreak,
    { formatValue: (value) => formatSignedCountLabel(value, 'day') }
  )
)
const streakDeltaSummary = computed(() => createPrimaryDeltaSummary(streakDeltaItems.value))

const weightDeltaItems = computed(() =>
  createDeltaItems(
    currentWeightValue.value,
    previousPeriodStats.value.latestWeight,
    yearAgoPeriodStats.value.latestWeight,
    {
      decimals: 1,
      colorize: false,
      formatValue: (value) => formatSignedCountLabel(value, 'kilogram', 'kilograms', { decimals: 1 })
    }
  )
)
const weightDeltaSummary = computed(() => createPrimaryDeltaSummary(weightDeltaItems.value))

const currentStreakLabel = computed(() => formatCountLabel(currentStreak.value, 'day'))
const bestStreakLabel = computed(() => formatCountLabel(bestStreak.value, 'day'))

const bodyRecordsInRange = computed(() =>
  rawBodyRecords.value.filter((item) => {
    return item.date >= rangeStartDate.value && item.date <= rangeEndDate.value
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
  const formatValue = typeof options.formatValue === 'function'
    ? options.formatValue
    : (value) => formatChartMetricValue(value)
  const formatDelta = typeof options.formatDelta === 'function'
    ? options.formatDelta
    : (diff) => formatChartDeltaLabel(diff)
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
    const previousValue = index > 0 ? Number(series[index - 1]?.value) : NaN
    return {
      x,
      y,
      xPercent: (x / width) * 100,
      yPercent: (y / height) * 100,
      value: item.value,
      date: item.date,
      dateLabel: item.date ? formatLongDate(item.date) : '--',
      valueLabel: formatValue(item.value),
      deltaLabel: formatDelta(item.value - previousValue),
      interactive: Boolean(item.date),
      isLatest: index === series.length - 1
    }
  })

  const path = buildSmoothPath(points)

  let area = ''
  if (includeArea && points.length) {
    const first = points[0]
    const last = points[points.length - 1]
    area = `${path} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`
  }

  return { path, area, points, min: rawMin, max: rawMax }
}

function buildDualSeriesChart(primarySeries, secondarySeries) {
  const formatValue = (value) => formatChartMetricValue(value, { decimals: 1, suffix: ' kg' })
  const formatDelta = (diff) => formatChartDeltaLabel(diff, { decimals: 1, suffix: ' kg' })
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
    const previousValue = index > 0 ? Number(primarySeries[index - 1]?.value) : NaN
    return {
      x,
      y,
      xPercent: (x / width) * 100,
      yPercent: (y / height) * 100,
      value: item.value,
      date: item.date,
      dateLabel: item.date ? formatLongDate(item.date) : '--',
      valueLabel: formatValue(item.value),
      deltaLabel: formatDelta(item.value - previousValue),
      interactive: Boolean(item.date),
      isLatest: index === primarySeries.length - 1
    }
  })

  const secondaryPoints = secondarySeries.map((item, index) => {
    const x = padding + index * step
    const y = height - padding - ((item.value - scaledMin) / scaledRange) * (height - padding * 2)
    return { x, y, value: item.value, date: item.date }
  })

  const path = buildSmoothPath(primaryPoints)
  const secondaryPath = buildSmoothPath(secondaryPoints)

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
  buildSeriesChart(bodyFatSeries.value, {
    includeArea: true,
    formatValue: (value) => formatChartMetricValue(value, { decimals: 1, suffix: '%' }),
    formatDelta: (diff) => formatChartDeltaLabel(diff, { decimals: 1, suffix: '%' })
  })
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
const weightLatestLabel = computed(() =>
  weightSeries.value.length
    ? formatChartMetricValue(weightSeries.value[weightSeries.value.length - 1].value, { decimals: 1, suffix: ' kg' })
    : '--'
)
const weightHeaderCaption = computed(() =>
  weightSeries.value.length ? `${weightSeries.value.length} logs in the selected range` : 'No records in the selected range'
)
const weightMetaLabel = computed(() =>
  weightSeries.value.length ? `Range ${periodDateLabel.value}` : 'Waiting for weight entries'
)
const weightDeltaValue = computed(() => {
  if (weightSeries.value.length < 2) return NaN
  return Number((weightSeries.value[weightSeries.value.length - 1].value - weightSeries.value[weightSeries.value.length - 2].value).toFixed(1))
})
const weightDeltaLabel = computed(() => formatChartDeltaLabel(weightDeltaValue.value, { decimals: 1, suffix: ' kg' }))
const weightDeltaTone = computed(() => formatChartDeltaTone(weightDeltaValue.value, { threshold: 0.05 }))
const bodyFatMinLabel = computed(() =>
  Number.isFinite(bodyFatTrendChart.value.min) ? `${bodyFatTrendChart.value.min.toFixed(1)}%` : '--'
)
const bodyFatMaxLabel = computed(() =>
  Number.isFinite(bodyFatTrendChart.value.max) ? `${bodyFatTrendChart.value.max.toFixed(1)}%` : '--'
)
const bodyFatXStartLabel = computed(() =>
  bodyFatSeries.value.length ? formatShortDate(bodyFatSeries.value[0].date) : '--'
)
const bodyFatXEndLabel = computed(() =>
  bodyFatSeries.value.length ? formatShortDate(bodyFatSeries.value[bodyFatSeries.value.length - 1].date) : '--'
)
const bodyFatLatestLabel = computed(() =>
  bodyFatSeries.value.length
    ? formatChartMetricValue(bodyFatSeries.value[bodyFatSeries.value.length - 1].value, { decimals: 1, suffix: '%' })
    : '--'
)
const bodyFatHeaderCaption = computed(() =>
  bodyFatSeries.value.length ? `${bodyFatSeries.value.length} records in the selected range` : 'No records in the selected range'
)
const bodyFatMetaLabel = computed(() =>
  bodyFatSeries.value.length ? `Range ${periodDateLabel.value}` : 'Waiting for body fat entries'
)
const bodyFatDeltaValue = computed(() => {
  if (bodyFatSeries.value.length < 2) return NaN
  return Number((bodyFatSeries.value[bodyFatSeries.value.length - 1].value - bodyFatSeries.value[bodyFatSeries.value.length - 2].value).toFixed(1))
})
const bodyFatDeltaLabel = computed(() => formatChartDeltaLabel(bodyFatDeltaValue.value, { decimals: 1, suffix: '%' }))
const bodyFatDeltaTone = computed(() => formatChartDeltaTone(bodyFatDeltaValue.value, { threshold: 0.05 }))

const weightSparseState = computed(() => {
  if (!weightSeries.value.length || weightSeries.value.length >= 3) return null
  return {
    message: `Record ${Math.max(1, 3 - weightSeries.value.length)} more weigh-in${3 - weightSeries.value.length === 1 ? '' : 's'} to unlock a full trend chart.`,
    actionLabel: 'Record weigh-in'
  }
})

const bodyFatSparseState = computed(() => {
  if (!bodyFatSeries.value.length || bodyFatSeries.value.length >= 3) return null
  return {
    message: `Record ${Math.max(1, 3 - bodyFatSeries.value.length)} more body fat entr${3 - bodyFatSeries.value.length === 1 ? 'y' : 'ies'} to unlock a full trend chart.`,
    actionLabel: 'Record body fat'
  }
})

function buildCompactTrendState(series, options = {}) {
  if (!Array.isArray(series) || !series.length || series.length > 2) return null
  const latest = series[series.length - 1]
  const previous = series.length > 1 ? series[series.length - 2] : null
  const decimals = Number.isInteger(options.decimals) ? options.decimals : 1
  const suffix = options.suffix || ''
  const noun = options.noun || 'entry'
  const actionLabel = options.actionLabel || 'View plan'
  const remaining = Math.max(1, 3 - series.length)
  const diff = previous ? Number((latest.value - previous.value).toFixed(decimals)) : NaN

  return {
    currentLabel: `${latest.value.toFixed(decimals)}${suffix}`,
    previousLabel: previous ? `${previous.value.toFixed(decimals)}${suffix}` : '',
    deltaLabel: previous
      ? formatChartDeltaLabel(diff, { decimals, suffix })
      : 'No previous comparison available',
    deltaTone: previous ? formatChartDeltaTone(diff, { threshold: 0.05 }) : 'neutral',
    meta: previous
      ? `${formatShortDate(previous.date)} - ${formatShortDate(latest.date)}`
      : formatLongDate(latest.date),
    message: previous
      ? `Record ${remaining} more ${noun}${remaining === 1 ? '' : 's'} to unlock the full trend chart.`
      : `Record ${remaining} more ${noun}${remaining === 1 ? '' : 's'} to compare with your latest value.`,
    actionLabel
  }
}

const weightCompactState = computed(() =>
  buildCompactTrendState(weightSeries.value, {
    suffix: ' kg',
    noun: 'weigh-in',
    actionLabel: 'Record weigh-in'
  })
)

const bodyFatCompactState = computed(() =>
  buildCompactTrendState(bodyFatSeries.value, {
    suffix: '%',
    noun: 'body fat entry',
    actionLabel: 'Record body fat'
  })
)

const bodyFatSourceDetail = computed(() => buildBodyFatSourceDetail(selectedBodyFatSourceDate.value))
const bodyFatSourceSelectionActive = computed(() => Boolean(selectedBodyFatSourceDate.value))

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
  buildSeriesChart(selectedStrengthSeries.value, {
    includeArea: true,
    formatValue: (value) => formatChartMetricValue(value, { decimals: 1, suffix: ' kg' }),
    formatDelta: (diff) => formatChartDeltaLabel(diff, { decimals: 1, suffix: ' kg' })
  })
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
    actionLabel: 'Log workout'
  }
})

function formatLongDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

function buildSmoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  const d = [`M ${points[0].x} ${points[0].y}`]
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] || p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`)
  }
  return d.join(' ')
}

function formatChartMetricValue(value, options = {}) {
  if (value == null || Number.isNaN(Number(value))) return '--'
  const numeric = Number(value)
  const decimals = Number.isInteger(options.decimals) ? options.decimals : 1
  const suffix = options.suffix || ''
  return `${numeric.toFixed(decimals)}${suffix}`
}

function formatChartDeltaLabel(diff, options = {}) {
  if (!Number.isFinite(diff)) return 'No previous comparison available'
  const decimals = Number.isInteger(options.decimals) ? options.decimals : 1
  const suffix = options.suffix || ''
  const threshold = Number.isFinite(options.threshold) ? options.threshold : 0.05
  if (Math.abs(diff) < threshold) {
    return 'No change versus previous entry'
  }
  const direction = diff > 0 ? 'Up' : 'Down'
  return `${direction} ${Math.abs(diff).toFixed(decimals)}${suffix} versus previous entry`
}

function formatChartDeltaTone(diff, options = {}) {
  if (!Number.isFinite(diff)) return 'neutral'
  const threshold = Number.isFinite(options.threshold) ? options.threshold : 0.05
  if (Math.abs(diff) < threshold) return 'neutral'
  return diff > 0 ? 'positive' : 'negative'
}

function showMetricTooltip(chartId, point, index) {
  metricTooltip.value = {
    chartId,
    index,
    point,
    left: Math.min(Math.max(point.xPercent, 18), 82),
    top: point.yPercent < 30 ? point.yPercent + 16 : point.yPercent - 12
  }
}

function hideMetricTooltip(chartId) {
  if (metricTooltip.value.chartId === chartId) {
    metricTooltip.value = { chartId: '', index: -1, left: 0, top: 0, point: null }
  }
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

const completedLogsByIso = computed(() => {
  const map = new Map()
  completedLogsDetailedInRange.value.forEach((item) => {
    if (!map.has(item.iso)) map.set(item.iso, [])
    map.get(item.iso).push(item)
  })
  return map
})

const completedDaySummaryMap = computed(() => {
  const map = new Map()
  completedLogsDetailedInRange.value.forEach((item) => {
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

const allCompletedDateSet = computed(() => completionDates.value)

const consistencyCurrentStreak = computed(() => currentStreak.value)

const consistencyWeekStarts = computed(() => rangeWeekStarts.value)

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
      const isOutsideRange = date < rangeStartDate.value || date > rangeEndDate.value
      const level = isFuture || isOutsideRange ? 0 : toCellLevel(count)
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
        isOutsideRange,
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

const consistencyActiveDays = computed(() => completionDates.value.size)

const consistencyHasData = computed(() => consistencyActiveDays.value > 0)

const consistencyBestStreak = computed(() => bestStreak.value)

const consistencyCurrentStreakLabel = computed(() =>
  formatCountLabel(consistencyCurrentStreak.value, 'day')
)

const consistencyBestStreakLabel = computed(() =>
  formatCountLabel(consistencyBestStreak.value, 'day')
)

const consistencyThisWeekActiveDays = computed(() => {
  const weekStart = startOfWeekMonday(today.value)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  let activeDays = 0

  completionDates.value.forEach((iso) => {
    const date = parseLocalDate(iso)
    if (!date) return
    if (date >= weekStart && date <= weekEnd && date >= rangeStartDate.value && date <= rangeEndDate.value) {
      activeDays += 1
    }
  })

  return activeDays
})

const consistencyThisWeekLabel = computed(() =>
  `${consistencyThisWeekActiveDays.value} / 7 active days this week`
)

const consistencyActiveDaysMetricCopy = computed(() =>
  isSevenDayRange.value
    ? `Active days this week: ${consistencyThisWeekActiveDays.value}/7`
    : `${consistencyActiveDays.value} active days in ${periodLabel.value.toLowerCase()}`
)

const consistencyStripCells = computed(() => {
  const weekStart = startOfWeekMonday(today.value)
  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftDays(weekStart, index)
    const key = toIsoDate(date)
    const summary = completedDaySummaryMap.value.get(key)
    const count = summary?.count || 0
    const minutes = summary?.minutes || 0
    const labels = summary ? Array.from(summary.labels).slice(0, 2) : []
    return {
      key,
      date,
      count,
      minutes,
      level: toCellLevel(count),
      isFuture: date > today.value,
      isToday: key === todayIso.value,
      weekdayLabel: formatWeekdayShort(date),
      dateLabel: formatShortDate(date),
      summaryLabel: count ? (labels.length ? labels.join(' · ') : 'Completed workout') : 'No completed workout',
      sessionsLabel: count ? `${count} completed session${count > 1 ? 's' : ''}` : 'No workouts logged',
      minutesLabel: count ? `${minutes} min` : '0 min'
    }
  })
})

const consistencyDisplayHasData = computed(() =>
  isSevenDayRange.value
    ? consistencyStripCells.value.some((cell) => cell.count > 0)
    : consistencyHasData.value
)

const consistencyMetaLabel = computed(() =>
  isSevenDayRange.value ? 'This week' : periodLabel.value
)

const consistencyWeeklyBars = computed(() => {
  return consistencyWeekStarts.value.map((weekStart, index) => {
    const rawWeekEnd = new Date(weekStart)
    rawWeekEnd.setDate(weekStart.getDate() + 6)
    const weekRangeStart = clampDateRange(weekStart, rangeStartDate.value, rangeEndDate.value)
    const weekRangeEnd = clampDateRange(rawWeekEnd, rangeStartDate.value, rangeEndDate.value)
    const activeDays = consistencyCells.value.filter(
      (cell) => cell.weekIndex === index && !cell.isFuture && !cell.isOutsideRange && cell.count > 0
    ).length
    return {
      key: `${toIsoDate(weekStart)}-${index}`,
      start: weekRangeStart,
      end: weekRangeEnd,
      label: formatShortDate(weekRangeStart),
      activeDays,
      height: activeDays > 0 ? Math.max(14, Math.round((activeDays / 7) * 100)) : 0,
      tooltip: `${formatShortDate(weekRangeStart)} - ${formatShortDate(weekRangeEnd)} · ${activeDays} active day${activeDays === 1 ? '' : 's'}`
    }
  })
})

const consistencySparseHint = computed(() =>
  !isSevenDayRange.value && consistencyActiveDays.value > 0 && consistencyActiveDays.value < 2
)

function moveConsistencyTooltip(event) {
  if (!consistencyTooltip.value.visible || !event) return
  if (typeof window === 'undefined') return
  const maxX = window.innerWidth - 280
  const maxY = window.innerHeight - 150
  consistencyTooltip.value.x = Math.max(12, Math.min(maxX, event.clientX + 14))
  consistencyTooltip.value.y = Math.max(12, Math.min(maxY, event.clientY + 14))
}

function showConsistencyTooltip(event, cell) {
  if (!cell || cell.isFuture || cell.isOutsideRange || cell.count === 0) {
    hideConsistencyTooltip()
    return
  }
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
    targetLabel: config.targetLabel || 'View source',
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
    targetLabel: 'Record weigh-in',
    emptyMessage: 'No weight source found for this point.'
  })
}

function openBodyFatSource(point) {
  if (!point?.date) return
  selectedBodyFatSourceDate.value = point.date
}

function resetBodyFatSourceSelection() {
  selectedBodyFatSourceDate.value = null
}

function openVolumeSource(item) {
  const workouts = completedLogsDetailedInRange.value.filter((log) =>
    log.dateObj >= item.start && log.dateObj <= item.end
  )
  showSourcePanel({
    title: 'Training Volume',
    subtitle: `${formatShortDate(item.start)} - ${formatShortDate(item.end)}`,
    items: getWorkoutSourceItems(workouts),
    targetRoute: { name: 'logs' },
    targetLabel: 'Log workout',
    emptyMessage: 'No completed workouts were logged in this week.'
  })
}

function openConsistencyWeekSource(item) {
  if (!item?.activeDays) return
  const workouts = completedLogsDetailedInRange.value.filter((log) =>
    log.dateObj >= item.start && log.dateObj <= item.end
  )
  showSourcePanel({
    title: 'Weekly Active Days',
    subtitle: `${formatShortDate(item.start)} - ${formatShortDate(item.end)}`,
    items: getWorkoutSourceItems(workouts),
    targetRoute: { name: 'logs' },
    targetLabel: 'Log workout',
    emptyMessage: 'No completed workouts were logged in this week.'
  })
}

function openConsistencySource(cell) {
  if (!cell || cell.isFuture || cell.isOutsideRange || cell.count === 0) return
  const workouts = completedLogsByIso.value.get(cell.key) || []
  showSourcePanel({
    title: 'Completed Workouts',
    subtitle: formatLongDate(cell.date),
    items: getWorkoutSourceItems(workouts),
    targetRoute: { name: 'logs' },
    targetLabel: 'Log workout',
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
    targetLabel: 'Log workout',
    emptyMessage: `No completed ${metric.label.toLowerCase()} entries were logged on this day.`
  })
}

const normalizedCircumferenceRecords = computed(() => {
  const rawRecords = Array.isArray(planState.value.circumferenceRecords) ? planState.value.circumferenceRecords : []
  const mapped = rawRecords
    .map((item) => ({
      date: parseLocalDate(item?.recordedAt || item?.date),
      iso: item?.date || '',
      recordedAt: item?.recordedAt || item?.date || '',
      measurements: normalizeCircumferenceLog(item?.measurements || item || {})
    }))
    .filter((item) => item.date && item.iso)
    .sort((a, b) => a.date - b.date)

  if (mapped.length) return mapped

  const fallback = normalizeCircumferenceLog(planState.value.bodyCircumferenceLog || {})
  const hasFallback = Object.values(fallback).some((value) => toNumber(value) != null)
  if (!hasFallback) return []
  return [{
    date: new Date(today.value),
    iso: todayIso.value,
    measurements: fallback
  }]
})

const latestCircumferenceSnapshot = computed(() =>
  normalizedCircumferenceRecords.value.length
    ? normalizedCircumferenceRecords.value[normalizedCircumferenceRecords.value.length - 1]
    : null
)

const previousCircumferenceSnapshot = computed(() =>
  normalizedCircumferenceRecords.value.length > 1
    ? normalizedCircumferenceRecords.value[normalizedCircumferenceRecords.value.length - 2]
    : null
)

function formatCircumferenceDelta(delta) {
  if (delta == null) {
    return { text: 'New', label: 'First snapshot', tone: 'neutral' }
  }
  if (Math.abs(delta) < 0.05) {
    return { text: 'No change', label: 'No change vs previous', tone: 'neutral' }
  }
  const direction = delta > 0 ? 'up' : 'down'
  const arrow = delta > 0 ? '↑' : '↓'
  const magnitude = `${Math.abs(delta).toFixed(1)} cm`
  const tone = direction === 'down' ? 'positive' : 'negative'
  return {
    text: `${arrow} ${magnitude} vs previous`,
    label: `${arrow} ${magnitude} vs previous`,
    tone
  }
}

const circumferenceSummaryItems = computed(() =>
  circumferenceSummaryConfig
    .slice(0, 5)
    .map((item) => {
      const latestValue = item.accessor(latestCircumferenceSnapshot.value?.measurements || {})
      if (latestValue == null) return null
      const previousValue = item.accessor(previousCircumferenceSnapshot.value?.measurements || {})
      const delta = previousValue == null ? null : Number((latestValue - previousValue).toFixed(1))
      const formattedDelta = formatCircumferenceDelta(delta)
      return {
        id: item.id,
        label: item.label,
        value: latestValue,
        valueLabel: `${latestValue.toFixed(1)} cm`,
        deltaText: formattedDelta.text,
        deltaLabel: formattedDelta.label,
        deltaTone: formattedDelta.tone
      }
    })
    .filter(Boolean)
)

const circumferenceHasData = computed(() => normalizedCircumferenceRecords.value.length > 0)

const circumferenceSnapshotLabel = computed(() => {
  if (!latestCircumferenceSnapshot.value?.date) return 'Latest overall snapshot'
  return `Latest overall snapshot · ${formatShortDate(latestCircumferenceSnapshot.value.date)}`
})

const selectedCircumferenceMetricOption = computed(
  () => circumferenceMetricOptions.find((item) => item.id === selectedCircumferenceMetric.value) || circumferenceMetricOptions[0]
)

const availableCircumferenceMetricId = computed(() => {
  const latestMeasurements = latestCircumferenceSnapshot.value?.measurements
  if (!latestMeasurements) return 'waist'
  const available = circumferenceMetricOptions.find((item) =>
    getCircumferenceMetricValue(item.id, latestMeasurements) != null
  )
  return available?.id || 'waist'
})

function getCircumferenceMetricValue(metricId, measurements) {
  if (!measurements) return null
  if (metricId === 'waist') return toNumber(measurements.waist)
  if (metricId === 'chest') return toNumber(measurements.chest)
  if (metricId === 'hips') return toNumber(measurements.hip)
  if (metricId === 'thigh') return averageMeasurements(measurements.leftThigh, measurements.rightThigh)
  if (metricId === 'calf') return averageMeasurements(measurements.leftCalf, measurements.rightCalf)
  return null
}

const selectedCircumferenceSeries = computed(() =>
  normalizedCircumferenceRecords.value
    .map((item) => ({
      date: item.date,
      value: getCircumferenceMetricValue(selectedCircumferenceMetric.value, item.measurements)
    }))
    .filter((item) =>
      item.date &&
      item.value != null &&
      item.date >= rangeStartDate.value &&
      item.date <= rangeEndDate.value
    )
)

const selectedCircumferenceChart = computed(() =>
  buildSeriesChart(selectedCircumferenceSeries.value, {
    includeArea: true,
    formatValue: (value) => formatChartMetricValue(value, { decimals: 1, suffix: ' cm' }),
    formatDelta: (diff) => formatChartDeltaLabel(diff, { decimals: 1, suffix: ' cm' })
  })
)

const circumferenceAxisBounds = computed(() => {
  const min = selectedCircumferenceChart.value.min
  const max = selectedCircumferenceChart.value.max
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: null, mid: null, max: null }
  }
  if (Math.abs(max - min) < 0.001) {
    const pad = Math.max(Math.abs(max) * 0.05, 0.5)
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

const circumferenceYMinLabel = computed(() =>
  circumferenceAxisBounds.value.min == null ? '--' : `${circumferenceAxisBounds.value.min.toFixed(1)}`
)
const circumferenceYMidLabel = computed(() =>
  circumferenceAxisBounds.value.mid == null ? '--' : `${circumferenceAxisBounds.value.mid.toFixed(1)}`
)
const circumferenceYMaxLabel = computed(() =>
  circumferenceAxisBounds.value.max == null ? '--' : `${circumferenceAxisBounds.value.max.toFixed(1)}`
)
const circumferenceXStartLabel = computed(() =>
  selectedCircumferenceSeries.value.length ? formatShortDate(selectedCircumferenceSeries.value[0].date) : '--'
)
const circumferenceXMidLabel = computed(() => {
  if (!selectedCircumferenceSeries.value.length) return '--'
  const midIndex = Math.floor((selectedCircumferenceSeries.value.length - 1) / 2)
  return formatShortDate(selectedCircumferenceSeries.value[midIndex].date)
})
const circumferenceXEndLabel = computed(() =>
  selectedCircumferenceSeries.value.length
    ? formatShortDate(selectedCircumferenceSeries.value[selectedCircumferenceSeries.value.length - 1].date)
    : '--'
)
const circumferenceLatestLabel = computed(() =>
  selectedCircumferenceSeries.value.length
    ? formatChartMetricValue(selectedCircumferenceSeries.value[selectedCircumferenceSeries.value.length - 1].value, { decimals: 1, suffix: ' cm' })
    : '--'
)
const circumferenceHeaderCaption = computed(() =>
  selectedCircumferenceSeries.value.length
    ? `${selectedCircumferenceSeries.value.length} records in the selected range`
    : `No saved measurements for ${selectedCircumferenceMetricOption.value.label.toLowerCase()} in the selected range`
)
const circumferenceMetaLabel = computed(() =>
  selectedCircumferenceSeries.value.length
    ? `${periodLabel.value} · ${selectedCircumferenceMetricOption.value.label}`
    : `Waiting for ${selectedCircumferenceMetricOption.value.label.toLowerCase()} measurements`
)
const circumferenceDeltaValue = computed(() => {
  if (selectedCircumferenceSeries.value.length < 2) return NaN
  return Number((
    selectedCircumferenceSeries.value[selectedCircumferenceSeries.value.length - 1].value -
    selectedCircumferenceSeries.value[selectedCircumferenceSeries.value.length - 2].value
  ).toFixed(1))
})
const circumferenceDeltaLabel = computed(() =>
  formatChartDeltaLabel(circumferenceDeltaValue.value, { decimals: 1, suffix: ' cm' })
)
const circumferenceDeltaTone = computed(() =>
  formatChartDeltaTone(circumferenceDeltaValue.value, { threshold: 0.05 })
)

const circumferenceCompactState = computed(() =>
  buildCompactTrendState(selectedCircumferenceSeries.value, {
    suffix: ' cm',
    noun: 'measurement',
    actionLabel: 'Add measurements'
  })
)

watch(
  availableCircumferenceMetricId,
  (metricId) => {
    if (!circumferenceMetricOptions.some((item) => item.id === selectedCircumferenceMetric.value)) {
      selectedCircumferenceMetric.value = metricId
      return
    }
    if (!selectedCircumferenceSeries.value.length) {
      selectedCircumferenceMetric.value = metricId
    }
  },
  { immediate: true }
)

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
      const rawTarget = toNumber(planState.value.challengeValues?.[id])
      const target = rawTarget != null && rawTarget > 0 ? rawTarget : null
      const actual = challengeActualValue(id)
      const progress = target && actual != null && target > 0 ? Math.min(1, Math.max(0, actual / target)) : 0
      const progressPercent = Math.round(progress * 100)
      const actualLabel = actual == null ? 'Not logged' : `${actual}${meta.unit ? ` ${meta.unit}` : ''}`
      const targetLabel = target != null ? `${target}${meta.unit ? ` ${meta.unit}` : ''}` : 'No goal set'
      let statusText = 'No goal set'
      let statusTone = 'neutral'
      if (target && actual != null) {
        if (progress >= 1) {
          statusText = 'On track'
          statusTone = 'positive'
        } else if (progress >= 0.65) {
          statusText = 'Slightly behind'
          statusTone = 'warning'
        } else {
          statusText = 'Needs attention'
          statusTone = 'negative'
        }
      } else if (target) {
        statusText = 'No progress logged yet'
        statusTone = 'warning'
      }
      return {
        id,
        title: meta.title,
        cadence: meta.cadence,
        progressPercent,
        actualLabel,
        targetLabel,
        statusText,
        statusTone,
        summaryLine: target != null
          ? `Current ${actualLabel} · Goal ${targetLabel}`
          : 'No goal set',
        targetValue: target,
        actualValue: actual
      }
    })
    .filter(Boolean)
)

const analyticsSummaryFingerprint = computed(() =>
  buildAnalyticsSummaryFingerprint(analyticsSummary.value, rangeDays.value)
)

const averageWeeklyMinutes = computed(() =>
  Math.round(totalMinutes.value / weekFactor.value)
)

const nextActionItems = computed(() => {
  const items = []

  if (pendingSessions.value > 0) {
    items.push({
      id: 'pending-session',
      kicker: 'Training',
      title: 'Finish your pending session',
      description: `${pendingSessions.value} planned session${pendingSessions.value === 1 ? '' : 's'} still need attention in ${periodLabel.value.toLowerCase()}.`,
      actionLabel: 'Log workout',
      action: 'logs'
    })
  }

  if (weeklyMinutesGoal.value != null && averageWeeklyMinutes.value < weeklyMinutesGoal.value) {
    items.push({
      id: 'minutes-goal',
      kicker: 'Volume',
      title: 'Close your weekly minutes gap',
      description: `You are averaging ${averageWeeklyMinutes.value} min/week against a ${weeklyMinutesGoal.value} min/week goal.`,
      actionLabel: 'Log workout',
      action: 'logs'
    })
  }

  if (bodyFatSeries.value.length < 2) {
    items.push({
      id: 'body-fat',
      kicker: 'Body data',
      title: 'Record one more body fat entry',
      description: 'Body fat trend unlocks after at least 2 entries in the selected window.',
      actionLabel: 'Record body fat',
      action: 'plan'
    })
  } else if (weightSeries.value.length < 2) {
    items.push({
      id: 'weight',
      kicker: 'Body data',
      title: 'Add another weigh-in',
      description: 'A second weigh-in is needed before weight changes can be compared reliably.',
      actionLabel: 'Record weigh-in',
      action: 'plan'
    })
  }

  if (challengeCards.value.some((item) => item.targetValue == null)) {
    items.push({
      id: 'goal',
      kicker: 'Targets',
      title: 'Set missing goals in Plan',
      description: 'Some adherence cards still have no target, so progress is harder to interpret.',
      actionLabel: 'View plan',
      action: 'plan'
    })
  }

  if (!aiInsight.value) {
    items.push({
      id: 'insight',
      kicker: 'Insights',
      title: 'Generate fresh analytics insight',
      description: `Refresh the AI summary so it reflects the current ${periodLabel.value.toLowerCase()} window.`,
      actionLabel: 'Refresh insights',
      action: 'insight'
    })
  }

  if (!items.length) {
    items.push({
      id: 'maintain',
      kicker: 'Consistency',
      title: 'Keep the current momentum',
      description: 'Your main metrics are aligned. Keep logging workouts and body data to maintain the signal quality.',
      actionLabel: 'Log workout',
      action: 'logs'
    })
  }

  return items.slice(0, 3)
})

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
    circumference: normalizedCircumferenceRecords.value.map((item) => ({
      date: item.iso,
      measurements: item.measurements
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
  goal: {
    primary: String(auth.user?.onboarding?.answers?.goal || '').trim(),
    experience: String(auth.user?.onboarding?.answers?.experience || '').trim(),
    frequency: String(auth.user?.onboarding?.answers?.frequency || '').trim(),
    nutrition: String(auth.user?.onboarding?.answers?.nutrition || '').trim()
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
const aiInsightReady = computed(() => Boolean(aiInsight.value?.keyInsight))
const aiUnavailable = computed(() => Boolean(aiMeta.value.unavailable))

const aiMetaLabel = computed(() => {
  if (!aiMeta.value.generatedAt) {
    return aiUnavailable.value ? 'Insight unavailable' : 'Awaiting analysis'
  }
  const when = new Date(aiMeta.value.generatedAt)
  const timestamp = Number.isNaN(when.getTime())
    ? aiMeta.value.generatedAt
    : new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(when)
  const confidenceLabel = aiInsightReady.value ? `${aiInsight.value.confidence} confidence` : ''
  return ['Last updated', timestamp, confidenceLabel].filter(Boolean).join(' · ')
})

async function fetchAiInsight() {
  aiError.value = ''
  aiLoading.value = true
  try {
    const response = await fetch(buildAuthServerUrl('/api/ai/analytics/insights'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        rangeDays: rangeDays.value,
        snapshotVersion: analyticsSummaryFingerprint.value,
        summary: analyticsSummary.value
      })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to generate analytics insight.')
    }
    const normalizedInsight = normalizeAiInsightPayload(payload?.insight)
    aiInsight.value = normalizedInsight
    aiMeta.value = {
      source: payload?.meta?.source || '',
      generatedAt: payload?.meta?.generatedAt || new Date().toISOString(),
      unavailable:
        Boolean(payload?.meta?.unavailable) ||
        (!normalizedInsight && Boolean(payload?.insight || payload?.meta?.source || payload?.meta?.generatedAt))
    }
    saveCachedAiInsight()
  } catch (error) {
    aiError.value = error?.message || 'Failed to generate analytics insight.'
  } finally {
    aiLoading.value = false
  }
}

function handleNextAction(action) {
  if (action === 'logs') {
    goToLogs()
    return
  }
  if (action === 'plan') {
    goToPlan()
    return
  }
  if (action === 'insight') {
    fetchAiInsight()
  }
}

function syncThemeSnapshot() {
  if (typeof document === 'undefined') return
  activeTheme.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

watch(analyticsSummaryFingerprint, async () => {
  aiInsight.value = null
  aiMeta.value = createEmptyAiMeta()
  aiError.value = ''
  loadCachedAiInsight()
  await loadCloudAiInsight()
})

watch(
  [logsKey, planKey],
  () => {
    loadLogs()
    loadPlan()
  },
  { immediate: true }
)

watch(aiInsightKey, () => {
  loadCachedAiInsight()
  loadCloudAiInsight()
}, { immediate: true })

watch(rangeDays, () => {
  resetBodyFatSourceSelection()
})

onMounted(() => {
  loadLogs()
  loadPlan()
  loadCachedAiInsight()
  loadCloudAiInsight()
  syncThemeSnapshot()
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage)
    window.addEventListener('pf_logs_updated', loadLogs)
    window.addEventListener('pf_plan_updated', loadPlan)
    if (typeof MutationObserver !== 'undefined' && document?.documentElement) {
      themeObserver = new MutationObserver(syncThemeSnapshot)
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      })
    }
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener('pf_logs_updated', loadLogs)
    window.removeEventListener('pf_plan_updated', loadPlan)
  }
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<style scoped>
.analytics-page {
  padding: 34px clamp(20px, 4vw, 52px) 60px;
  display: grid;
  gap: 20px;
  --analytics-mini-panel-border: rgba(148, 163, 184, 0.14);
  --analytics-mini-panel-bg:
    radial-gradient(circle at top right, rgba(148, 163, 184, 0.08), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 252, 0.96));
  --analytics-mini-panel-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 16px 34px rgba(15, 23, 42, 0.04);
  --analytics-delta-base-text: rgba(71, 85, 105, 0.88);
  --analytics-delta-base-bg: rgba(241, 245, 249, 0.95);
  --analytics-delta-positive-text: rgba(18, 115, 70, 0.95);
  --analytics-delta-positive-bg: rgba(34, 197, 94, 0.12);
  --analytics-delta-warning-text: rgba(161, 98, 7, 0.96);
  --analytics-delta-warning-bg: rgba(245, 158, 11, 0.16);
  --analytics-delta-negative-text: rgba(185, 28, 28, 0.95);
  --analytics-delta-negative-bg: rgba(239, 68, 68, 0.12);
  --analytics-delta-neutral-text: rgba(71, 85, 105, 0.9);
  --analytics-delta-neutral-bg: rgba(148, 163, 184, 0.14);
  --analytics-chart-surface-border: rgba(148, 163, 184, 0.1);
  --analytics-chart-surface-bg:
    linear-gradient(180deg, rgba(248, 250, 252, 0.88), rgba(255, 255, 255, 0.98)),
    #ffffff;
  --analytics-chart-surface-weight-bg:
    linear-gradient(180deg, rgba(242, 111, 111, 0.05), rgba(255, 255, 255, 0.96) 42%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.88), rgba(255, 255, 255, 0.98));
  --analytics-chart-surface-bodyfat-bg:
    linear-gradient(180deg, rgba(77, 126, 240, 0.05), rgba(255, 255, 255, 0.96) 42%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.88), rgba(255, 255, 255, 0.98));
  --analytics-chart-surface-circumference-bg:
    linear-gradient(180deg, rgba(34, 183, 122, 0.05), rgba(255, 255, 255, 0.96) 42%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.88), rgba(255, 255, 255, 0.98));
  --analytics-chart-surface-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
  --analytics-chart-label: rgba(100, 116, 139, 0.8);
  --analytics-chart-label-strong: rgba(100, 116, 139, 0.86);
  --analytics-chart-axis: rgba(100, 116, 139, 0.7);
  --analytics-chart-grid: rgba(148, 163, 184, 0.14);
  --analytics-chart-inline-bg: rgba(255, 255, 255, 0.7);
  --analytics-point-ring: rgba(255, 255, 255, 0.96);
  --analytics-point-outline: rgba(148, 163, 184, 0.14);
  --analytics-tooltip-bg: rgba(255, 255, 255, 0.98);
  --analytics-tooltip-border: rgba(148, 163, 184, 0.12);
  --analytics-tooltip-shadow:
    0 14px 30px rgba(15, 23, 42, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  --analytics-tooltip-text: #475569;
  --analytics-tooltip-title: #0f172a;
  --analytics-plot-bg: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.92));
  --analytics-plot-label: #64748b;
  --analytics-plot-grid: rgba(148, 163, 184, 0.24);
  --analytics-heat-label: #94a3b8;
  --analytics-heat-cell-0: #e5e7eb;
  --analytics-heat-cell-0-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.24);
  --analytics-heat-cell-1: #fecdd3;
  --analytics-heat-cell-1-shadow: inset 0 0 0 1px rgba(251, 113, 133, 0.22);
  --analytics-heat-cell-2: #fb7185;
  --analytics-heat-cell-2-shadow: inset 0 0 0 1px rgba(225, 29, 72, 0.26);
  --analytics-heat-cell-3: #be123c;
  --analytics-heat-cell-3-shadow: inset 0 0 0 1px rgba(136, 19, 55, 0.35);
  --analytics-heat-today-outline: #0f172a;
  --analytics-heat-today-inset: rgba(255, 255, 255, 0.6);
  --analytics-heat-tooltip-bg: #ffffff;
  --analytics-heat-tooltip-border: rgba(15, 23, 42, 0.12);
  --analytics-heat-tooltip-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
  --analytics-heat-tooltip-text: #475569;
  --analytics-heat-tooltip-title: #0f172a;
  --analytics-progress-track: #e5e7eb;
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
  grid-template-rows: auto auto minmax(40px, auto) minmax(58px, auto) minmax(34px, auto);
  align-items: start;
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

.stat-delta-main {
  margin-top: 6px;
  min-height: 58px;
  display: flex;
  align-items: flex-start;
}

.stat-secondary {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--text-muted);
}

.delta-chip {
  display: inline-flex;
  align-items: center;
  width: 100%;
  min-height: 58px;
  max-width: 100%;
  padding: 8px 12px;
  border-radius: 22px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-muted);
  white-space: normal;
  overflow-wrap: normal;
  word-break: normal;
}

.delta-chip.up {
  color: #166534;
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.18);
}

.delta-chip.warning {
  color: var(--analytics-delta-warning-text);
  background: var(--analytics-delta-warning-bg);
  border-color: rgba(245, 158, 11, 0.22);
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

.actions-panel .panel-head > div {
  display: grid;
  gap: 4px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.action-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-muted);
  padding: 14px;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 8px;
  align-content: start;
  height: 100%;
}

.action-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-strong);
}

.action-card strong {
  font-size: 16px;
}

.action-card p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.action-card .btn.small {
  align-self: end;
  width: 100%;
  justify-content: center;
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
  border: 1px solid var(--analytics-mini-panel-border);
  border-radius: 24px;
  background: var(--analytics-mini-panel-bg);
  box-shadow: var(--analytics-mini-panel-shadow);
  padding: 18px;
  display: grid;
  gap: 14px;
  height: 100%;
  align-content: start;
}

.metric-chart-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.metric-chart-title-block {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.metric-chart-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(100, 116, 139, 0.78);
}

.metric-chart-head.weight .metric-chart-kicker {
  color: rgba(226, 74, 98, 0.9);
}

.metric-chart-head.bodyfat .metric-chart-kicker {
  color: rgba(61, 132, 240, 0.9);
}

.metric-chart-head.circumference .metric-chart-kicker {
  color: rgba(17, 185, 129, 0.9);
}

.metric-chart-title-block strong {
  font-size: 25px;
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.metric-chart-title-block p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.metric-chart-value-block {
  min-width: 138px;
  display: grid;
  justify-items: end;
  gap: 6px;
}

.metric-chart-value-caption {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--analytics-chart-axis);
}

.metric-chart-value-block strong {
  font-size: 28px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.metric-chart-delta {
  max-width: 220px;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  text-align: right;
  color: var(--analytics-delta-base-text);
  background: var(--analytics-delta-base-bg);
}

.metric-chart-delta.positive {
  color: var(--analytics-delta-positive-text);
  background: var(--analytics-delta-positive-bg);
}

.metric-chart-delta.negative {
  color: var(--analytics-delta-negative-text);
  background: var(--analytics-delta-negative-bg);
}

.metric-chart-delta.neutral {
  color: var(--analytics-delta-neutral-text);
  background: var(--analytics-delta-neutral-bg);
}

.line-chart {
  display: grid;
  gap: 10px;
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
  font-weight: 600;
  color: var(--analytics-chart-axis);
  padding: 12px 0 22px;
}

.chart-core {
  display: grid;
  gap: 8px;
}

.chart-surface {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid var(--analytics-chart-surface-border);
  background: var(--analytics-chart-surface-bg);
  box-shadow: var(--analytics-chart-surface-shadow);
}

.chart-surface.weight {
  background: var(--analytics-chart-surface-weight-bg);
}

.chart-surface.bodyfat {
  background: var(--analytics-chart-surface-bodyfat-bg);
}

.chart-surface.circumference {
  background: var(--analytics-chart-surface-circumference-bg);
}

.chart-meta-row {
  position: absolute;
  top: 12px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--analytics-chart-label-strong);
  font-size: 12px;
  z-index: 1;
}

.line-chart svg {
  width: 100%;
  height: 190px;
  display: block;
}

.grid-lines line {
  stroke: var(--analytics-chart-grid);
  stroke-width: 1;
  stroke-dasharray: 2 6;
}

.line-area.weight {
  fill: rgba(242, 111, 111, 0.14);
}

.line-area.bodyfat {
  fill: rgba(77, 126, 240, 0.14);
}

.line-area.strength {
  fill: rgba(22, 163, 74, 0.16);
}

.line-area.circumference {
  fill: rgba(34, 183, 122, 0.14);
}

.line-main {
  fill: none;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line-main.weight {
  stroke: #f26f6f;
}

.line-main.avg {
  stroke: #f59e0b;
  stroke-dasharray: 4 4;
}

.line-main.bodyfat {
  stroke: #4d7ef0;
}

.line-main.strength {
  stroke: #16a34a;
}

.x-axis-labels {
  display: flex;
  justify-content: space-between;
  color: var(--analytics-chart-label);
  font-size: 11px;
  font-weight: 600;
}

.axis-label {
  position: absolute;
  left: 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--analytics-chart-axis);
  pointer-events: none;
}

.axis-label--top {
  top: 34px;
}

.axis-label--bottom {
  bottom: 16px;
}

.chart-axis {
  display: flex;
  justify-content: space-between;
  color: var(--analytics-chart-label);
  font-size: 12px;
  font-weight: 600;
}

.chart-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--analytics-chart-label-strong);
  font-size: 12px;
}

.chart-foot.compact {
  font-size: 11px;
  font-weight: 600;
}

.axis-note {
  color: var(--analytics-chart-label-strong);
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
  background: var(--analytics-chart-inline-bg);
}

.chart-inline-state p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.chart-source-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
}

.chart-source-copy {
  display: grid;
  gap: 5px;
}

.chart-source-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.chart-source-copy strong {
  font-size: 15px;
  line-height: 1.2;
}

.chart-source-copy p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.chart-source-actions {
  min-width: 180px;
  display: grid;
  justify-items: end;
  gap: 8px;
}

.chart-source-actions span {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
}

.chart-source-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.trend-compact-state {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface-muted);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.trend-compact-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(140px, 180px);
  gap: 14px;
}

.trend-compact-value,
.trend-compact-comparison {
  display: grid;
  gap: 4px;
}

.trend-compact-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.trend-compact-value strong,
.trend-compact-comparison strong {
  font-size: 28px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.trend-compact-value small,
.trend-compact-comparison small {
  color: var(--text-muted);
  font-size: 12px;
}

.trend-compact-comparison small.warning {
  color: var(--analytics-delta-warning-text);
}

.trend-compact-comparison small.negative {
  color: var(--analytics-delta-negative-text);
}

.trend-compact-comparison small.positive {
  color: var(--analytics-delta-positive-text);
}

.points-layer {
  position: absolute;
  inset: 0;
}

.point-hit {
  position: absolute;
  width: 18px;
  height: 18px;
  transform: translate(-50%, -50%);
  border: none;
  background: transparent;
  padding: 0;
  display: grid;
  place-items: center;
  cursor: default;
}

.point-hit.clickable {
  cursor: pointer;
}

.point-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid var(--analytics-point-ring);
  box-shadow: 0 0 0 1px var(--analytics-point-outline);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.point-dot.weight {
  background: rgba(242, 111, 111, 0.74);
}

.point-dot.bodyfat {
  background: rgba(77, 126, 240, 0.74);
}

.point-dot.circumference {
  background: rgba(34, 183, 122, 0.74);
}

.point-dot.latest {
  width: 12px;
  height: 12px;
}

.point-dot.weight.latest {
  background: rgba(242, 111, 111, 0.98);
  box-shadow:
    0 0 0 4px rgba(242, 111, 111, 0.14),
    0 10px 22px rgba(242, 111, 111, 0.18);
}

.point-dot.bodyfat.latest {
  background: rgba(77, 126, 240, 0.98);
  box-shadow:
    0 0 0 4px rgba(77, 126, 240, 0.14),
    0 10px 22px rgba(77, 126, 240, 0.18);
}

.point-dot.circumference.latest {
  background: rgba(34, 183, 122, 0.98);
  box-shadow:
    0 0 0 4px rgba(34, 183, 122, 0.14),
    0 10px 22px rgba(34, 183, 122, 0.18);
}

.point-dot.active {
  transform: scale(1.12);
  box-shadow:
    0 0 0 5px rgba(148, 163, 184, 0.16),
    0 12px 24px rgba(15, 23, 42, 0.08);
}

.chart-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  min-width: 160px;
  max-width: 208px;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid var(--analytics-tooltip-border);
  background: var(--analytics-tooltip-bg);
  box-shadow: var(--analytics-tooltip-shadow);
  display: grid;
  gap: 4px;
  pointer-events: none;
  z-index: 3;
}

.tooltip-date,
.tooltip-context {
  font-size: 11px;
  color: var(--analytics-tooltip-text);
}

.chart-tooltip strong {
  font-size: 14px;
  line-height: 1.2;
  color: var(--analytics-tooltip-title);
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
  background: var(--analytics-heat-cell-0);
}

.legend-dot.lv1 {
  background: var(--analytics-heat-cell-1);
}

.legend-dot.lv2 {
  background: var(--analytics-heat-cell-2);
}

.legend-dot.lv3 {
  background: var(--analytics-heat-cell-3);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

.dashboard-card {
  height: 100%;
  padding: 20px;
  border-radius: 24px;
  gap: 18px;
  align-content: start;
}

.dashboard-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  flex-wrap: wrap;
}

.dashboard-card-head h2 {
  margin: 0;
  font-size: 18px;
}

.panel-meta,
.dashboard-card-footer-note {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.btn.subtle {
  background: var(--surface-muted);
}

.volume-panel,
.circumference-trend-panel {
  grid-template-rows: auto 1fr auto auto;
}

.volume-head-meta,
.circumference-head-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.volume-head-meta {
  justify-content: flex-end;
}

.volume-axis-layout {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
}

.volume-y-axis {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  justify-items: end;
  align-items: center;
  font-size: 11px;
  color: var(--text-muted);
  padding: 10px 0 28px;
}

.volume-axis-main {
  display: grid;
  gap: 10px;
}

.volume-plot {
  position: relative;
  height: 252px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--analytics-plot-bg);
  overflow: hidden;
}

.volume-goal-line {
  position: absolute;
  left: 12px;
  right: 12px;
  z-index: 3;
  border-top: 1px dashed rgba(245, 158, 11, 0.9);
}

.volume-goal-line span {
  position: absolute;
  right: 0;
  top: -18px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  font-size: 10px;
  font-weight: 700;
}

.volume-unit-label {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 3;
  font-size: 13px;
  font-weight: 700;
  color: var(--analytics-plot-label);
}

.volume-grid-lines {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  pointer-events: none;
}

.volume-grid-lines span {
  border-top: 1px dashed var(--analytics-plot-grid);
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
  gap: 10px;
  padding: 40px 12px 12px;
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
  gap: 8px;
  cursor: pointer;
}

.volume-bar-value {
  font-style: normal;
  font-size: 11px;
  color: var(--analytics-plot-label);
  font-weight: 700;
  min-height: 16px;
  line-height: 16px;
}

.volume-bar-fill {
  width: min(44px, 82%);
  min-height: 0;
  border-radius: 10px 10px 4px 4px;
  background: linear-gradient(180deg, #fb7185, #ef4444);
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.18);
}

.volume-x-axis {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
  color: var(--text-muted);
  font-size: 11px;
}

.volume-x-axis span {
  text-align: center;
}

.consistency-panel {
  position: relative;
}

.consistency-head {
  align-items: center;
}

.consistency-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1;
}

.metric-pill em {
  font-style: normal;
}

.metric-pill strong {
  color: var(--text-primary);
  font-size: 12px;
}

.metric-pill-copy {
  min-width: max-content;
}

.consistency-main,
.consistency-weekly-section,
.circumference-trend {
  display: grid;
  gap: 12px;
}

.consistency-map {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
}

.consistency-strip-wrap,
.consistency-empty-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--analytics-plot-bg);
}

.consistency-strip-wrap {
  padding: 16px;
}

.consistency-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
}

.consistency-strip-day {
  border: none;
  background: transparent;
  padding: 0;
  display: grid;
  justify-items: center;
  gap: 8px;
  cursor: pointer;
}

.consistency-strip-day:disabled {
  cursor: default;
}

.consistency-strip-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--analytics-heat-label);
}

.consistency-strip-cell {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.consistency-empty-card {
  padding: 24px;
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;
}

.consistency-empty-card p {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-muted);
}

.weekday-col {
  display: grid;
  grid-template-rows: repeat(7, 18px);
  gap: 6px;
  align-items: center;
  justify-items: end;
  padding-top: 28px;
}

.weekday-col span {
  height: 18px;
  line-height: 18px;
  font-size: 11px;
  font-weight: 600;
  color: var(--analytics-heat-label);
}

.heatmap-scroll {
  overflow-x: auto;
  padding-bottom: 2px;
}

.heatmap-canvas {
  position: relative;
  min-width: max-content;
  display: grid;
  gap: 10px;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(12, 18px);
  gap: 6px;
  min-height: 18px;
  align-items: center;
}

.month-tick {
  font-size: 12px;
  color: var(--analytics-heat-label);
  font-weight: 700;
  white-space: nowrap;
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(12, 18px);
  grid-template-rows: repeat(7, 18px);
  gap: 6px;
  min-width: max-content;
}

.heat-cell {
  border: none;
  border-radius: 5px;
  padding: 0;
  width: 18px;
  height: 18px;
  cursor: pointer;
  outline: none;
  background: var(--analytics-heat-cell-0);
  box-shadow: var(--analytics-heat-cell-0-shadow);
}

.heat-cell:disabled {
  cursor: default;
}

.heat-cell.lv-1 {
  background: var(--analytics-heat-cell-1);
  box-shadow: var(--analytics-heat-cell-1-shadow);
}

.heat-cell.lv-2 {
  background: var(--analytics-heat-cell-2);
  box-shadow: var(--analytics-heat-cell-2-shadow);
}

.heat-cell.lv-3 {
  background: var(--analytics-heat-cell-3);
  box-shadow: var(--analytics-heat-cell-3-shadow);
}

.heat-cell.future {
  opacity: 0.4;
}

.heat-cell.muted {
  opacity: 0.28;
}

.heat-cell.today {
  box-shadow:
    0 0 0 1px var(--analytics-heat-today-outline),
    inset 0 0 0 1px var(--analytics-heat-today-inset);
}

.heatmap-meta,
.consistency-weekly-footer {
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

.consistency-legend-note {
  margin: -4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.section-title-row h3 {
  margin: 0;
  font-size: 15px;
}

.consistency-empty-note {
  margin: -2px 0 0;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-muted);
}

.consistency-weekly-chart {
  position: relative;
  height: 88px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--analytics-plot-bg);
  overflow: hidden;
}

.consistency-weekly-grid-lines {
  position: absolute;
  inset: 10px 12px;
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  pointer-events: none;
}

.consistency-weekly-grid-lines span {
  border-top: 1px dashed var(--analytics-plot-grid);
}

.consistency-weekly-grid-lines span:first-child {
  border-top: none;
}

.consistency-weekly-bars {
  position: relative;
  z-index: 2;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 8px;
  padding: 12px;
  align-items: end;
}

.consistency-week-bar {
  border: none;
  background: transparent;
  padding: 0;
  height: 100%;
  display: flex;
  align-items: flex-end;
  cursor: pointer;
}

.consistency-week-bar:disabled {
  cursor: default;
}

.consistency-week-bar-fill {
  width: 100%;
  min-height: 0;
  border-radius: 999px 999px 6px 6px;
  background: linear-gradient(180deg, #fb7185, #e11d48);
  box-shadow: 0 8px 18px rgba(225, 29, 72, 0.16);
}

.consistency-hint {
  margin: 0;
  font-size: 12px;
  color: var(--analytics-heat-label);
}

.heatmap-tooltip {
  position: fixed;
  width: min(260px, calc(100vw - 20px));
  border-radius: 12px;
  border: 1px solid var(--analytics-heat-tooltip-border);
  background: var(--analytics-heat-tooltip-bg);
  box-shadow: var(--analytics-heat-tooltip-shadow);
  padding: 10px 12px;
  z-index: 120;
  pointer-events: none;
}

.heatmap-tooltip p {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--analytics-heat-tooltip-text);
}

.heatmap-tooltip p:first-child {
  color: var(--analytics-heat-tooltip-title);
  font-weight: 700;
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

.circumference-summary {
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  background: var(--surface-muted);
}

.circumference-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.circumference-summary-row:last-child {
  border-bottom: none;
}

.summary-label {
  font-size: 16px;
}

.summary-value {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.summary-value span {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.summary-value em {
  font-size: 13px;
  font-style: normal;
  font-weight: 700;
}

.summary-value em.positive {
  color: #0f9f6e;
}

.summary-value em.negative {
  color: #f04438;
}

.summary-value em.neutral {
  color: var(--text-muted);
}

.circumference-chart .line-area.circumference {
  fill: rgba(34, 183, 122, 0.14);
}

.circumference-chart .line-main.circumference {
  fill: none;
  stroke: #22b77a;
  stroke-width: 2.6;
}

.circumference-single-state {
  border: 1px dashed var(--border);
  border-radius: 18px;
  background: var(--surface-muted);
  padding: 20px;
  display: grid;
  gap: 12px;
}

.volume-empty-state {
  border: 1px dashed var(--border);
  border-radius: 18px;
  background: var(--surface-muted);
  padding: 18px;
  display: grid;
  gap: 8px;
  align-content: start;
}

.single-point-card {
  display: grid;
  gap: 4px;
}

.single-point-card strong {
  font-size: 15px;
}

.single-point-card span {
  font-size: 24px;
  font-weight: 800;
}

.single-point-card small,
.empty-subtext {
  color: var(--text-muted);
  font-size: 13px;
}

@media (max-width: 720px) {
  .actions-grid,
  .body-grid,
  .dashboard-grid,
  .ai-summary-grid {
    grid-template-columns: 1fr;
  }

  .trend-compact-main {
    grid-template-columns: 1fr;
  }

  .circumference-summary-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-value {
    justify-content: flex-start;
  }
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
  background: var(--analytics-progress-track);
  overflow: hidden;
}

.progress-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #f43f5e, #ef4444);
  border-radius: inherit;
}

.progress-track span.positive {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.progress-track span.warning {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.progress-track span.negative {
  background: linear-gradient(90deg, #fb7185, #ef4444);
}

.progress-track span.neutral {
  background: linear-gradient(90deg, #cbd5e1, #94a3b8);
}

.challenge-card small {
  color: var(--text-muted);
  font-size: 12px;
}

.challenge-card small.positive {
  color: #15803d;
}

.challenge-card small.warning {
  color: #a16207;
}

.challenge-card small.negative {
  color: #b91c1c;
}

.challenge-card small.neutral {
  color: var(--text-muted);
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

.ai-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.ai-summary-card {
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.28);
  display: grid;
  gap: 8px;
}

.ai-summary-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #93c5fd;
}

.ai-summary-card p {
  margin: 0;
  color: #e2e8f0;
  line-height: 1.6;
  font-size: 14px;
}

.ai-summary-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: #e2e8f0;
}

.ai-summary-list li {
  line-height: 1.55;
  font-size: 14px;
}

.ai-summary-placeholder {
  color: #cbd5e1;
  opacity: 0.88;
}

.ai-summary-note {
  color: #93c5fd;
  font-size: 12px;
  font-weight: 600;
}

.ai-unavailable {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.22);
}

.ai-unavailable p {
  margin: 0;
  color: #e2e8f0;
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

@media (min-width: 1280px) {
  .analytics-page {
    padding: 28px clamp(18px, 3vw, 36px) 44px;
    gap: 16px;
  }

  .analytics-header {
    gap: 12px;
  }

  h1 {
    font-size: clamp(28px, 3vw, 38px);
  }

  .subtitle {
    margin-top: 6px;
  }

  .header-right {
    gap: 8px;
  }

  .range-tabs {
    padding: 3px;
  }

  .range-tab {
    padding: 6px 11px;
  }

  .btn {
    padding: 9px 12px;
  }

  .btn.small {
    padding: 7px 10px;
  }

  .stat-grid,
  .actions-grid,
  .body-grid,
  .dashboard-grid {
    gap: 10px;
  }

  .dashboard-grid {
    align-items: stretch;
  }

  .stat-card {
    padding: 12px;
    border-radius: 14px;
    grid-template-rows: auto auto minmax(44px, auto) minmax(60px, auto) minmax(36px, auto);
  }

  .stat-card strong {
    font-size: 21px;
  }

  .panel {
    padding: 14px;
    gap: 10px;
    border-radius: 18px;
  }

  .panel-head h2,
  .dashboard-card-head h2 {
    font-size: 17px;
  }

  .action-card {
    padding: 12px;
    border-radius: 14px;
  }

  .mini-panel,
  .dashboard-card {
    padding: 14px;
    gap: 12px;
    border-radius: 20px;
  }

  .dashboard-card {
    height: 100%;
  }

  .consistency-panel {
    grid-template-rows: auto 1fr auto;
  }

  .consistency-main {
    height: 100%;
  }

  .consistency-empty-card,
  .volume-empty-state,
  .circumference-single-state {
    height: 100%;
    align-content: center;
  }

  .metric-chart-head {
    gap: 12px;
  }

  .metric-chart-title-block strong {
    font-size: 22px;
  }

  .metric-chart-value-block strong,
  .trend-compact-value strong,
  .trend-compact-comparison strong {
    font-size: 24px;
  }

  .line-chart svg,
  .circumference-trend-panel .line-chart svg {
    height: 148px;
  }

  .strength-chart svg {
    height: 212px;
  }

  .volume-plot {
    height: 170px;
    border-radius: 16px;
  }

  .chart-inline-state,
  .trend-compact-state,
  .chart-source-card {
    padding: 9px 10px;
  }

  .trend-compact-state {
    gap: 10px;
  }

  .volume-axis-layout {
    gap: 8px;
  }

  .volume-bars,
  .volume-x-axis {
    gap: 8px;
  }

  .volume-bars {
    padding: 34px 10px 10px;
  }

  .volume-bar-col {
    gap: 6px;
  }

  .volume-empty-state {
    padding: 14px;
    border-radius: 16px;
  }

  .strength-empty-card {
    min-height: 252px;
    padding: 18px;
  }

  .consistency-strip-wrap {
    padding: 10px 12px;
  }

  .consistency-empty-card {
    min-height: 128px;
    padding: 16px;
    gap: 10px;
    border-radius: 16px;
  }

  .consistency-empty-card p {
    font-size: 13px;
  }

  .consistency-main,
  .consistency-weekly-section,
  .circumference-trend {
    gap: 10px;
  }

  .consistency-strip {
    gap: 10px;
  }

  .consistency-weekly-chart {
    height: 68px;
    border-radius: 16px;
  }

  .consistency-weekly-bars {
    gap: 6px;
    padding: 10px;
  }

  .circumference-summary {
    border-radius: 16px;
  }

  .circumference-summary-row {
    padding: 14px 16px;
  }

  .circumference-single-state {
    padding: 14px;
    gap: 10px;
    border-radius: 16px;
  }

  .empty-state {
    padding-top: 4px;
    gap: 8px;
  }
}

:global(:root[data-theme='dark']) .analytics-page {
  --analytics-mini-panel-border: rgba(71, 85, 105, 0.42);
  --analytics-mini-panel-bg:
    radial-gradient(circle at top right, rgba(51, 65, 85, 0.34), transparent 42%),
    linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.96));
  --analytics-mini-panel-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 36px rgba(0, 0, 0, 0.24);
  --analytics-delta-base-text: rgba(226, 232, 240, 0.88);
  --analytics-delta-base-bg: rgba(51, 65, 85, 0.56);
  --analytics-delta-positive-text: #86efac;
  --analytics-delta-positive-bg: rgba(34, 197, 94, 0.18);
  --analytics-delta-warning-text: #fcd34d;
  --analytics-delta-warning-bg: rgba(245, 158, 11, 0.18);
  --analytics-delta-negative-text: #fda4af;
  --analytics-delta-negative-bg: rgba(239, 68, 68, 0.18);
  --analytics-delta-neutral-text: rgba(203, 213, 225, 0.84);
  --analytics-delta-neutral-bg: rgba(71, 85, 105, 0.52);
  --analytics-chart-surface-border: rgba(71, 85, 105, 0.55);
  --analytics-chart-surface-bg:
    linear-gradient(180deg, rgba(17, 24, 39, 0.94), rgba(15, 23, 42, 0.98)),
    #0f172a;
  --analytics-chart-surface-weight-bg:
    linear-gradient(180deg, rgba(248, 113, 113, 0.12), rgba(15, 23, 42, 0) 48%),
    linear-gradient(180deg, rgba(17, 24, 39, 0.94), rgba(15, 23, 42, 0.98));
  --analytics-chart-surface-bodyfat-bg:
    linear-gradient(180deg, rgba(96, 165, 250, 0.12), rgba(15, 23, 42, 0) 48%),
    linear-gradient(180deg, rgba(17, 24, 39, 0.94), rgba(15, 23, 42, 0.98));
  --analytics-chart-surface-circumference-bg:
    linear-gradient(180deg, rgba(52, 211, 153, 0.12), rgba(15, 23, 42, 0) 48%),
    linear-gradient(180deg, rgba(17, 24, 39, 0.94), rgba(15, 23, 42, 0.98));
  --analytics-chart-surface-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  --analytics-chart-label: rgba(203, 213, 225, 0.78);
  --analytics-chart-label-strong: rgba(226, 232, 240, 0.86);
  --analytics-chart-axis: rgba(203, 213, 225, 0.7);
  --analytics-chart-grid: rgba(148, 163, 184, 0.16);
  --analytics-chart-inline-bg: rgba(15, 23, 42, 0.62);
  --analytics-point-ring: rgba(15, 23, 42, 0.96);
  --analytics-point-outline: rgba(148, 163, 184, 0.24);
  --analytics-tooltip-bg: rgba(15, 23, 42, 0.96);
  --analytics-tooltip-border: rgba(71, 85, 105, 0.62);
  --analytics-tooltip-shadow:
    0 18px 36px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  --analytics-tooltip-text: rgba(203, 213, 225, 0.84);
  --analytics-tooltip-title: #f8fafc;
  --analytics-plot-bg: linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.92));
  --analytics-plot-label: rgba(203, 213, 225, 0.76);
  --analytics-plot-grid: rgba(71, 85, 105, 0.62);
  --analytics-heat-label: rgba(203, 213, 225, 0.72);
  --analytics-heat-cell-0: #1f2937;
  --analytics-heat-cell-0-shadow: inset 0 0 0 1px rgba(71, 85, 105, 0.56);
  --analytics-heat-cell-1: rgba(244, 63, 94, 0.24);
  --analytics-heat-cell-1-shadow: inset 0 0 0 1px rgba(251, 113, 133, 0.24);
  --analytics-heat-cell-2: rgba(244, 63, 94, 0.52);
  --analytics-heat-cell-2-shadow: inset 0 0 0 1px rgba(251, 113, 133, 0.26);
  --analytics-heat-cell-3: #fb7185;
  --analytics-heat-cell-3-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
  --analytics-heat-today-outline: #f8fafc;
  --analytics-heat-today-inset: rgba(15, 23, 42, 0.3);
  --analytics-heat-tooltip-bg: rgba(15, 23, 42, 0.96);
  --analytics-heat-tooltip-border: rgba(71, 85, 105, 0.62);
  --analytics-heat-tooltip-shadow: 0 18px 36px rgba(0, 0, 0, 0.32);
  --analytics-heat-tooltip-text: rgba(203, 213, 225, 0.84);
  --analytics-heat-tooltip-title: #f8fafc;
  --analytics-progress-track: rgba(71, 85, 105, 0.55);
}

.weight-panel,
.volume-panel,
.consistency-panel {
  --trend-accent-rgb: 242, 111, 111;
}

.bodyfat-panel {
  --trend-accent-rgb: 77, 126, 240;
}

.circumference-trend-panel {
  --trend-accent-rgb: 34, 183, 122;
}

.mini-panel {
  border: 1px solid color-mix(in srgb, var(--border) 76%, rgba(var(--trend-accent-rgb), 0.24));
  background:
    radial-gradient(circle at top right, rgba(var(--trend-accent-rgb), 0.14), transparent 42%),
    linear-gradient(180deg, rgba(var(--trend-accent-rgb), 0.055), transparent 34%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 94%, transparent),
      color-mix(in srgb, var(--surface-muted) 92%, transparent)
    );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--surface) 72%, transparent),
    0 18px 44px color-mix(in srgb, var(--shadow-soft) 42%, transparent);
}

.weight-panel .chart-surface,
.bodyfat-panel .chart-surface,
.circumference-trend-panel .chart-surface,
.volume-panel .volume-plot,
.consistency-panel .consistency-weekly-chart {
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  background:
    linear-gradient(180deg, rgba(var(--trend-accent-rgb), 0.055), transparent 28%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-soft) 96%, transparent),
      color-mix(in srgb, var(--surface) 98%, transparent)
    );
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface) 72%, transparent);
}

.weight-panel .chart-meta-row,
.bodyfat-panel .chart-meta-row,
.circumference-trend-panel .chart-meta-row,
.weight-panel .x-axis-labels,
.bodyfat-panel .chart-foot,
.circumference-trend-panel .x-axis-labels,
.circumference-trend-panel .axis-note,
.volume-panel .volume-unit-label,
.volume-panel .volume-bar-value,
.consistency-panel .weekday-col span,
.consistency-panel .month-tick,
.consistency-panel .consistency-hint {
  color: color-mix(in srgb, var(--text-muted) 90%, transparent);
}

.weight-panel .y-axis-labels,
.bodyfat-panel .axis-label,
.weight-panel .axis-label,
.circumference-trend-panel .y-axis-labels,
.circumference-trend-panel .axis-label {
  color: color-mix(in srgb, var(--text-muted) 82%, transparent);
}

.weight-panel .grid-lines line,
.bodyfat-panel .grid-lines line,
.circumference-trend-panel .grid-lines line,
.volume-panel .volume-grid-lines span,
.consistency-panel .consistency-weekly-grid-lines span {
  stroke: color-mix(in srgb, var(--border) 62%, transparent);
  border-top-color: color-mix(in srgb, var(--border) 62%, transparent);
}

.weight-panel .point-dot,
.bodyfat-panel .point-dot,
.circumference-trend-panel .point-dot {
  border-color: var(--surface);
  box-shadow: 0 0 0 1px rgba(var(--trend-accent-rgb), 0.16);
}

.weight-panel .chart-tooltip,
.bodyfat-panel .chart-tooltip,
.circumference-trend-panel .chart-tooltip,
.consistency-panel .heatmap-tooltip {
  border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
  background: color-mix(in srgb, var(--surface) 98%, transparent);
  box-shadow:
    0 14px 30px color-mix(in srgb, var(--shadow-soft) 64%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--surface) 72%, transparent);
}

.weight-panel .tooltip-date,
.weight-panel .tooltip-context,
.bodyfat-panel .tooltip-date,
.bodyfat-panel .tooltip-context,
.circumference-trend-panel .tooltip-date,
.circumference-trend-panel .tooltip-context,
.consistency-panel .heatmap-tooltip p {
  color: color-mix(in srgb, var(--text-muted) 90%, transparent);
}

.consistency-panel .heatmap-tooltip p:first-child,
.weight-panel .chart-tooltip strong,
.bodyfat-panel .chart-tooltip strong,
.circumference-trend-panel .chart-tooltip strong {
  color: var(--text-primary);
}

.weight-panel .chart-inline-state,
.bodyfat-panel .chart-inline-state,
.volume-panel .chart-inline-state,
.circumference-trend-panel .chart-inline-state {
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface) 70%, transparent);
}

:global(:root[data-theme='dark']) .mini-panel {
  box-shadow:
    0 18px 44px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

:global(:root[data-theme='dark']) .weight-panel .chart-surface,
:global(:root[data-theme='dark']) .bodyfat-panel .chart-surface,
:global(:root[data-theme='dark']) .circumference-trend-panel .chart-surface,
:global(:root[data-theme='dark']) .volume-panel .volume-plot,
:global(:root[data-theme='dark']) .consistency-panel .consistency-weekly-chart {
  background:
    linear-gradient(180deg, rgba(var(--trend-accent-rgb), 0.07), transparent 26%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-soft) 96%, transparent),
      color-mix(in srgb, var(--surface-muted) 94%, transparent)
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 -1px 0 rgba(255, 255, 255, 0.02);
}

:global(:root[data-theme='dark']) .weight-panel .chart-tooltip,
:global(:root[data-theme='dark']) .bodyfat-panel .chart-tooltip,
:global(:root[data-theme='dark']) .circumference-trend-panel .chart-tooltip,
:global(:root[data-theme='dark']) .consistency-panel .heatmap-tooltip {
  background: color-mix(in srgb, var(--surface-muted) 96%, transparent);
  box-shadow:
    0 18px 34px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

@media (max-width: 1200px) {
  .body-grid,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .ai-summary-grid {
    grid-template-columns: 1fr;
  }

  .chart-source-card {
    grid-template-columns: 1fr;
    display: grid;
  }

  .chart-source-actions {
    min-width: 0;
    justify-items: start;
  }

  .chart-source-actions span,
  .chart-source-buttons {
    text-align: left;
    justify-content: flex-start;
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

  .ai-unavailable {
    align-items: stretch;
    flex-direction: column;
  }

  .dashboard-card {
    padding: 18px;
  }

  .dashboard-card-head,
  .volume-head-meta,
  .circumference-head-meta {
    width: 100%;
    justify-content: space-between;
  }

  .consistency-map {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .consistency-metrics {
    width: 100%;
  }

  .metric-pill {
    flex: 1;
    justify-content: space-between;
  }

  .month-grid {
    grid-template-columns: repeat(12, 14px);
    gap: 5px;
  }

  .heatmap-grid {
    grid-template-columns: repeat(12, 14px);
    grid-template-rows: repeat(7, 14px);
    gap: 5px;
  }

  .heat-cell {
    width: 14px;
    height: 14px;
  }

  .weekday-col {
    grid-template-rows: repeat(7, 14px);
    gap: 5px;
    padding-top: 24px;
  }

  .weekday-col span {
    height: 14px;
    line-height: 14px;
  }

  .volume-axis-layout {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .volume-bars,
  .volume-x-axis,
  .consistency-weekly-bars {
    gap: 6px;
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
