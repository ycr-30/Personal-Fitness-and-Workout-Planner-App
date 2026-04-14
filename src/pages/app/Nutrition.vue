<template>
  <section class="nutrition-page">
    <NutritionHeader
      :selected-date="selectedDate"
      @update:date="setSelectedDate($event)"
      @previous="goPreviousDay"
      @next="goNextDay"
      @open-goals="goalDrawerOpen = true"
    />

    <section class="top-grid">
      <CaloriesSummaryCard :summary="summary" />
      <MacroTargetsCard :summary="summary" />
    </section>

    <section class="ai-grid">
      <AIInsightCard
        :lines="insightLines"
        :loading="aiLoading"
        :error="aiError"
        :summary="summary"
        :goal-type-label="goalTypeLabel"
      />
      <MealRecommendationCard
        :lines="recommendationLines"
        :loading="aiLoading"
        :error="aiError"
        :summary="summary"
        :goal-type-label="goalTypeLabel"
      />
      <NutritionAlertCard :alerts="alertItems" />
    </section>

    <WaterIntakeCard
      :summary="summary"
      :entries="waterEntries"
      :loading="waterLoading"
      :saving="waterSaving"
      :error="waterError"
      :quick-amounts="waterQuickAmounts"
      @quick-add="handleQuickWater"
      @delete-water="handleDeleteWater"
    />

    <MealLogSection
      :grouped-entries="groupedEntries"
      :active-meal="activeMeal"
      :meal-totals="mealTotals"
      :meal-counts="mealCounts"
      :loading="mealLoading"
      :error="mealError"
      @change-meal="activeMeal = $event"
      @add-food="openAddFood"
      @edit-food="openEditFood"
      @delete-food="handleDeleteFood"
    />

    <NutritionTrends
      :series="trendSeries"
      :range="trendRange"
      :loading="trendsLoading"
      :error="trendsError"
      @update:range="trendRange = $event"
    />

    <AddFoodModal
      :open="foodModalOpen"
      :selected-date="selectedDate"
      :default-meal-type="modalMealType"
      :default-unit="userSettings.nutrition_default_unit"
      :default-search-mode="userSettings.nutrition_default_search_mode"
      :editing-entry="editingEntry"
      :saving="mealSaving"
      :error="mealError"
      @close="closeFoodModal"
      @submit="handleSubmitFood"
    />

    <GoalSettingsDrawer
      :open="goalDrawerOpen"
      :goals="goals"
      :plan-goal-link="planGoalLink"
      :recommended-targets="aiRecommendedTargets"
      :recommended-targets-loading="recommendedTargetsLoading"
      :recommended-targets-error="recommendedTargetsError"
      :loading="goalsLoading"
      :error="goalsError"
      @close="goalDrawerOpen = false"
      @save="handleSaveGoals"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import NutritionHeader from '@/components/nutrition/NutritionHeader.vue'
import CaloriesSummaryCard from '@/components/nutrition/CaloriesSummaryCard.vue'
import MacroTargetsCard from '@/components/nutrition/MacroTargetsCard.vue'
import AIInsightCard from '@/components/nutrition/AIInsightCard.vue'
import MealRecommendationCard from '@/components/nutrition/MealRecommendationCard.vue'
import NutritionAlertCard from '@/components/nutrition/NutritionAlertCard.vue'
import WaterIntakeCard from '@/components/nutrition/WaterIntakeCard.vue'
import MealLogSection from '@/components/nutrition/MealLogSection.vue'
import AddFoodModal from '@/components/nutrition/AddFoodModal.vue'
import NutritionTrends from '@/components/nutrition/NutritionTrends.vue'
import GoalSettingsDrawer from '@/components/nutrition/GoalSettingsDrawer.vue'
import { useMealEntries } from '@/composables/useMealEntries'
import { useWaterIntake } from '@/composables/useWaterIntake'
import { useNutritionSummary } from '@/composables/useNutritionSummary'
import { useNutritionAI } from '@/composables/useNutritionAI'
import { useUserSettings } from '@/composables/useUserSettings'
import { resolveAutoMealType, shiftDate, toDateKey } from '@/utils/mealTimeResolver'

const selectedDate = ref(toDateKey(new Date()))
const activeMeal = ref(resolveAutoMealType(selectedDate.value))
const foodModalOpen = ref(false)
const goalDrawerOpen = ref(false)
const editingEntry = ref(null)
const modalMealType = ref(activeMeal.value)
const { settings: userSettings, loadSettings } = useUserSettings()

const {
  entries: mealEntries,
  groupedEntries,
  mealCounts,
  loading: mealLoading,
  saving: mealSaving,
  error: mealError,
  saveEntry,
  deleteEntry
} = useMealEntries(selectedDate)

const {
  entries: waterEntries,
  loading: waterLoading,
  saving: waterSaving,
  error: waterError,
  addWater,
  deleteWater
} = useWaterIntake(selectedDate)

const {
  goals,
  planGoalLink,
  aiRecommendedTargets,
  recommendedTargetsLoading,
  recommendedTargetsError,
  goalsLoading,
  goalsError,
  summary,
  trendRange,
  trendSeries,
  trendsLoading,
  trendsError,
  loadGoals,
  saveGoals,
  refreshTrends
} = useNutritionSummary({
  selectedDate,
  mealEntries,
  waterEntries
})

const {
  loading: aiLoading,
  error: aiError,
  insightLines,
  recommendationLines,
  alertItems
} = useNutritionAI({
  selectedDate,
  activeMealType: activeMeal,
  goals,
  summary,
  trendSeries
})

const mealTotals = computed(() => summary.value?.mealBreakdown || {})
const waterQuickAmounts = computed(() => [
  userSettings.value?.nutrition_water_quick_add_primary_ml || 250,
  userSettings.value?.nutrition_water_quick_add_secondary_ml || 500
])
const goalTypeLabel = computed(() => {
  if (goals.value?.goal_type === 'fat_loss') return 'Fat loss'
  if (goals.value?.goal_type === 'muscle_gain') return 'Muscle gain'
  return 'Maintenance'
})

watch(selectedDate, (value) => {
  activeMeal.value = resolveAutoMealType(value)
})

function clampDateKey(value) {
  const nextValue = toDateKey(value)
  const todayKey = toDateKey(new Date())
  if (!nextValue) return todayKey
  return nextValue > todayKey ? todayKey : nextValue
}

function setSelectedDate(value) {
  selectedDate.value = clampDateKey(value)
}

function goPreviousDay() {
  setSelectedDate(shiftDate(selectedDate.value, -1))
}

function goNextDay() {
  const todayKey = toDateKey(new Date())
  if (selectedDate.value >= todayKey) return
  setSelectedDate(shiftDate(selectedDate.value, 1))
}

async function handleSubmitFood(payload) {
  try {
    await saveEntry(payload)
    closeFoodModal()
    refreshTrends()
  } catch {}
}

async function handleDeleteFood(entry) {
  try {
    await deleteEntry(entry.id)
    refreshTrends()
  } catch {}
}

async function handleQuickWater(amount) {
  try {
    await addWater(amount)
    refreshTrends()
  } catch {}
}

async function handleDeleteWater(entryId) {
  try {
    await deleteWater(entryId)
    refreshTrends()
  } catch {}
}

async function handleSaveGoals(payload) {
  try {
    await saveGoals(payload)
    goalDrawerOpen.value = false
  } catch {}
}

function openAddFood(mealType) {
  editingEntry.value = null
  modalMealType.value = mealType || activeMeal.value
  foodModalOpen.value = true
}

function openEditFood(entry) {
  editingEntry.value = entry
  modalMealType.value = entry?.mealType || activeMeal.value
  foodModalOpen.value = true
}

function closeFoodModal() {
  foodModalOpen.value = false
  editingEntry.value = null
}

onMounted(() => {
  loadSettings()
  loadGoals()
})
</script>

<style scoped>
.nutrition-page {
  padding: 36px clamp(20px, 4vw, 48px) 60px;
  display: grid;
  gap: 22px;
}

.page-warning {
  border: 1px solid rgba(239, 68, 68, 0.16);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  box-shadow: var(--shadow-soft);
  padding: 16px 18px;
  display: grid;
  gap: 4px;
}

.page-warning strong {
  font-size: 15px;
  color: var(--accent-strong);
}

.page-warning p {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.top-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 16px;
}

.ai-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

@media (min-width: 1280px) {
  .nutrition-page {
    padding: 28px clamp(18px, 3vw, 36px) 44px;
    gap: 18px;
  }

  .page-warning {
    padding: 14px 16px;
    border-radius: 16px;
  }

  .top-grid,
  .ai-grid {
    gap: 12px;
  }

  .nutrition-page :deep(.nutrition-header) {
    gap: 14px;
  }

  .nutrition-page :deep(.header-copy) {
    gap: 6px;
  }

  .nutrition-page :deep(.header-copy h1) {
    font-size: clamp(28px, 3vw, 38px);
  }

  .nutrition-page :deep(.header-actions) {
    gap: 8px;
  }

  .nutrition-page :deep(.ghost-btn) {
    padding: 10px 14px;
  }

  .nutrition-page :deep(.date-control) {
    gap: 6px;
    padding: 5px;
  }

  .nutrition-page :deep(.icon-btn) {
    width: 32px;
    height: 32px;
  }

  .nutrition-page :deep(.date-btn) {
    padding: 7px 12px;
  }

  .nutrition-page :deep(.panel) {
    padding: 15px;
    gap: 12px;
    border-radius: 18px;
  }

  .nutrition-page :deep(.panel-head h2),
  .nutrition-page :deep(.water-copy h2),
  .nutrition-page :deep(.section-head h2),
  .nutrition-page :deep(.section-copy h2) {
    font-size: 18px;
  }

  .nutrition-page :deep(.status-chip),
  .nutrition-page :deep(.target-mode),
  .nutrition-page :deep(.badge),
  .nutrition-page :deep(.badge.alert) {
    padding: 7px 10px;
  }

  .nutrition-page :deep(.summary-layout) {
    grid-template-columns: 188px minmax(0, 1fr);
    gap: 14px;
  }

  .nutrition-page :deep(.ring) {
    width: 152px;
    height: 152px;
  }

  .nutrition-page :deep(.ring-inner) {
    width: 98px;
    height: 98px;
  }

  .nutrition-page :deep(.ring-inner strong) {
    font-size: 24px;
  }

  .nutrition-page :deep(.metric-grid) {
    gap: 10px;
  }

  .nutrition-page :deep(.metric) {
    padding: 12px;
    border-radius: 14px;
  }

  .nutrition-page :deep(.metric strong) {
    font-size: 23px;
  }

  .nutrition-page :deep(.progress-block) {
    gap: 8px;
  }

  .nutrition-page :deep(.progress-bar) {
    height: 8px;
  }

  .nutrition-page :deep(.macro-grid) {
    gap: 10px;
  }

  .nutrition-page :deep(.macro-item) {
    grid-template-columns: 74px minmax(0, 1fr);
    gap: 12px;
    padding: 12px;
    border-radius: 14px;
  }

  .nutrition-page :deep(.mini-ring) {
    width: 74px;
    height: 74px;
  }

  .nutrition-page :deep(.mini-ring-inner) {
    width: 50px;
    height: 50px;
  }

  .nutrition-page :deep(.mini-ring-inner strong) {
    font-size: 14px;
  }

  .nutrition-page :deep(.summary-block) {
    padding: 12px;
    gap: 7px;
    border-radius: 16px;
  }

  .nutrition-page :deep(.summary-block strong) {
    font-size: 20px;
  }

  .nutrition-page :deep(.summary-tags) {
    gap: 6px;
  }

  .nutrition-page :deep(.summary-tags span) {
    padding: 5px 9px;
    font-size: 11px;
  }

  .nutrition-page :deep(.details-block),
  .nutrition-page :deep(.alert-list) {
    gap: 8px;
  }

  .nutrition-page :deep(.ai-card .state) {
    min-height: 110px;
    border-radius: 14px;
  }

  .nutrition-page :deep(.alert-row) {
    padding: 12px;
    border-radius: 14px;
  }

  .nutrition-page :deep(.water-head),
  .nutrition-page :deep(.quick-actions),
  .nutrition-page :deep(.water-meta) {
    gap: 10px;
  }

  .nutrition-page :deep(.water-icon) {
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }

  .nutrition-page :deep(.water-icon svg) {
    width: 18px;
    height: 18px;
  }

  .nutrition-page :deep(.quick-btn) {
    padding: 8px 12px;
    border-radius: 10px;
  }

  .nutrition-page :deep(.progress-line) {
    height: 10px;
  }

  .nutrition-page :deep(.timeline-list) {
    gap: 8px;
    max-height: 172px;
  }

  .nutrition-page :deep(.timeline-row) {
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
  }

  .nutrition-page :deep(.section-head) {
    gap: 10px;
  }

  .nutrition-page :deep(.primary-btn),
  .nutrition-page :deep(.secondary-btn) {
    padding: 10px 14px;
    border-radius: 12px;
  }

  .nutrition-page :deep(.meal-content) {
    padding: 14px;
    gap: 12px;
    border-radius: 16px;
  }

  .nutrition-page :deep(.meal-strip) {
    padding-bottom: 10px;
  }

  .nutrition-page :deep(.meal-section .state) {
    min-height: 128px;
    padding: 14px;
    border-radius: 14px;
  }

  .nutrition-page :deep(.entry-list) {
    gap: 10px;
  }

  .nutrition-page :deep(.trends-panel) {
    padding: 18px;
    gap: 14px;
    border-radius: 22px;
  }

  .nutrition-page :deep(.range-tabs) {
    gap: 4px;
    padding: 4px;
  }

  .nutrition-page :deep(.range-tab) {
    padding: 7px 12px;
  }

  .nutrition-page :deep(.trends-panel .state) {
    min-height: 170px;
    border-radius: 18px;
  }

  .nutrition-page :deep(.trend-grid) {
    gap: 12px;
  }

  .nutrition-page :deep(.trend-card) {
    padding: 14px 14px 13px;
    gap: 12px;
    border-radius: 20px;
  }

  .nutrition-page :deep(.trend-title-block strong) {
    font-size: 19px;
  }

  .nutrition-page :deep(.trend-value-block) {
    min-width: 116px;
    gap: 5px;
  }

  .nutrition-page :deep(.trend-value-block strong) {
    font-size: 24px;
  }

  .nutrition-page :deep(.trend-delta) {
    max-width: 192px;
    padding: 5px 8px;
  }

  .nutrition-page :deep(.trend-chart-shell) {
    gap: 10px;
  }

  .nutrition-page :deep(.trend-chart) {
    border-radius: 18px;
  }

  .nutrition-page :deep(.trend-chart svg) {
    height: 166px;
  }

  .nutrition-page :deep(.trend-empty) {
    min-height: 188px;
    gap: 8px;
    padding: 18px;
    border-radius: 18px;
  }

  .nutrition-page :deep(.trend-empty-icon) {
    width: 36px;
    height: 36px;
    border-radius: 12px;
  }
}

@media (max-width: 1180px) {
  .top-grid {
    grid-template-columns: 1fr;
  }

  .ai-grid {
    grid-template-columns: 1fr;
  }
}
</style>
