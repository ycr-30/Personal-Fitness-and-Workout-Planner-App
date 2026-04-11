<template>
  <section class="nutrition-page">
    <NutritionHeader
      :selected-date="selectedDate"
      @update:date="setSelectedDate($event)"
      @previous="goPreviousDay"
      @next="goNextDay"
      @open-goals="goalDrawerOpen = true"
    />

    <div v-if="pageWarning" class="page-warning">
      <strong>Nutrition cloud sync notice</strong>
      <p>{{ pageWarning }}</p>
    </div>

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
const pageWarning = computed(() => goalsError.value || mealError.value || waterError.value || '')
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
  await saveEntry(payload)
  closeFoodModal()
  refreshTrends()
}

async function handleDeleteFood(entry) {
  await deleteEntry(entry.id)
  refreshTrends()
}

async function handleQuickWater(amount) {
  await addWater(amount)
  refreshTrends()
}

async function handleDeleteWater(entryId) {
  await deleteWater(entryId)
  refreshTrends()
}

async function handleSaveGoals(payload) {
  await saveGoals(payload)
  goalDrawerOpen.value = false
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

@media (max-width: 1180px) {
  .top-grid {
    grid-template-columns: 1fr;
  }

  .ai-grid {
    grid-template-columns: 1fr;
  }
}
</style>
