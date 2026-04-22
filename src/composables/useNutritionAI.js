import { computed, ref, unref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { buildNutritionAlerts } from '@/utils/nutritionAlerts'
import { resolveMealTypeLabel, toDateKey } from '@/utils/mealTimeResolver'
import { toNumber } from '@/utils/nutritionCalculations'
import { recordAiAgentRun } from '@/lib/aiAgentMetrics'
import { buildAuthServerUrl } from '@/lib/authServerOrigin'
import { fetchJsonWithTimeout } from '@/lib/fetchWithTimeout'

function buildInsightFallback(summary, trendSeries, goalType) {
  const target = summary?.targets || {}
  const lastSeven = Array.isArray(trendSeries) ? trendSeries.slice(-7) : []
  const avgCalories =
    lastSeven.length > 0
      ? Math.round(lastSeven.reduce((sum, item) => sum + toNumber(item.calories), 0) / lastSeven.length)
      : toNumber(summary?.consumedCalories)
  const avgProtein =
    lastSeven.length > 0
      ? Math.round(lastSeven.reduce((sum, item) => sum + toNumber(item.protein), 0) / lastSeven.length)
      : toNumber(summary?.proteinG)

  const lines = [
    `Today you logged ${toNumber(summary?.consumedCalories)} kcal against a ${toNumber(target.calories)} kcal target.`,
    `Average intake over the visible range is about ${avgCalories} kcal and ${avgProtein} g protein per day.`
  ]

  if (goalType === 'fat_loss') {
    lines.push('Keep protein steady and use vegetables or fruit to fill the remaining volume without overshooting calories.')
  } else if (goalType === 'muscle_gain') {
    lines.push('If you are short on calories late in the day, use an easy protein + carb option instead of skipping the last meal.')
  } else {
    lines.push('Aim for even meal timing so protein and hydration stay consistent across the day.')
  }

  return lines
}

function buildRecommendationFallback(summary, activeMealType) {
  const targets = summary?.targets || {}
  const remainingProtein = Math.max(toNumber(targets.protein) - toNumber(summary?.proteinG), 0)
  const remainingCarbs = Math.max(toNumber(targets.carbs) - toNumber(summary?.carbsG), 0)
  const remainingFat = Math.max(toNumber(targets.fat) - toNumber(summary?.fatG), 0)
  const mealLabel = resolveMealTypeLabel(activeMealType).toLowerCase()

  const foods = []
  if (remainingProtein >= 30) foods.push('grilled chicken, Greek yogurt, eggs, tofu, or salmon')
  if (remainingCarbs >= 35) foods.push('rice, oats, potatoes, fruit, or whole-grain bread')
  if (remainingFat >= 15) foods.push('avocado, nuts, olive oil, or peanut butter')
  if (!foods.length) foods.push('a lighter meal with lean protein, vegetables, and extra water')

  return [
    `For your next ${mealLabel}, prioritise what is still missing from today’s targets.`,
    `Good options: ${foods.slice(0, 2).join('; ')}.`,
    'Keep the portion moderate and avoid stacking high-fat and high-sugar choices in the same meal.'
  ]
}

export function useNutritionAI({ selectedDate, activeMealType, goals, summary, trendSeries }) {
  const auth = useAuthStore()
  const loading = ref(false)
  const error = ref('')
  const insightLines = ref([])
  const recommendationLines = ref([])
  let activeRequestId = 0

  const alertItems = computed(() =>
    buildNutritionAlerts({
      summary: unref(summary),
      selectedDate: unref(selectedDate)
    })
  )

  let timer = null

  async function refreshAI() {
    const requestId = ++activeRequestId
    const startedAt = Date.now()
    loading.value = true
    error.value = ''

    const summaryValue = unref(summary)
    const goalsValue = unref(goals)
    const payload = {
      selected_date: toDateKey(unref(selectedDate)),
      active_meal_type: unref(activeMealType),
      goal_type: goalsValue?.goal_type || 'maintenance',
      summary: {
        consumedCalories: summaryValue?.consumedCalories || 0,
        remainingCalories: summaryValue?.remainingCalories || 0,
        proteinG: summaryValue?.proteinG || 0,
        carbsG: summaryValue?.carbsG || 0,
        fatG: summaryValue?.fatG || 0,
        waterMl: summaryValue?.waterMl || 0,
        targets: summaryValue?.targets || {},
        completion: summaryValue?.completion || {}
      },
      trends: (unref(trendSeries) || []).slice(-7),
      user_profile: {
        name: auth.user?.name || 'KeepFit user',
        sex: auth.user?.sex || '',
        weightKg: auth.user?.weightKg || auth.user?.weight || null,
        goalType: goalsValue?.goal_type || 'maintenance'
      }
    }

    try {
      const { response, data } = await fetchJsonWithTimeout(
        buildAuthServerUrl('/api/ai/nutrition/cards'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        },
        8000,
        'Nutrition AI request'
      )

      if (!response.ok) {
        throw new Error(data?.error || `Nutrition AI request failed (${response.status}).`)
      }

      const nextInsightLines = Array.isArray(data?.insight)
        ? data.insight
        : String(data?.insight || '')
            .split('\n')
            .map((line) => line.replace(/^[\-\d\.\s]+/, '').trim())
            .filter(Boolean)
      const nextRecommendationLines = Array.isArray(data?.recommendation)
        ? data.recommendation
        : String(data?.recommendation || '')
            .split('\n')
            .map((line) => line.replace(/^[\-\d\.\s]+/, '').trim())
            .filter(Boolean)

      const resolvedInsightLines = nextInsightLines.length
        ? nextInsightLines
        : buildInsightFallback(summaryValue, unref(trendSeries), goalsValue?.goal_type || 'maintenance')
      const resolvedRecommendationLines = nextRecommendationLines.length
        ? nextRecommendationLines
        : buildRecommendationFallback(summaryValue, unref(activeMealType))

      if (requestId !== activeRequestId) return
      insightLines.value = resolvedInsightLines
      recommendationLines.value = resolvedRecommendationLines

      void recordAiAgentRun({
        agentType: 'nutrition',
        success: resolvedInsightLines.length > 0 || resolvedRecommendationLines.length > 0,
        usedFallback: !nextInsightLines.length || !nextRecommendationLines.length,
        latencyMs: Date.now() - startedAt
      })
    } catch (err) {
      if (requestId !== activeRequestId) return
      error.value = err.message || 'Unable to load nutrition AI suggestions.'
      insightLines.value = buildInsightFallback(
        summaryValue,
        unref(trendSeries),
        goalsValue?.goal_type || 'maintenance'
      )
      recommendationLines.value = buildRecommendationFallback(summaryValue, unref(activeMealType))
      void recordAiAgentRun({
        agentType: 'nutrition',
        success: insightLines.value.length > 0 || recommendationLines.value.length > 0,
        usedFallback: true,
        latencyMs: Date.now() - startedAt,
        errorMessage: err?.message || 'Unable to load nutrition AI suggestions.'
      })
    } finally {
      if (requestId === activeRequestId) {
        loading.value = false
      }
    }
  }

  watch(
    () => JSON.stringify({
      date: toDateKey(unref(selectedDate)),
      meal: unref(activeMealType),
      goalType: unref(goals)?.goal_type || 'maintenance',
      summary: {
        calories: unref(summary)?.consumedCalories,
        protein: unref(summary)?.proteinG,
        carbs: unref(summary)?.carbsG,
        fat: unref(summary)?.fatG,
        water: unref(summary)?.waterMl,
        targetCalories: unref(summary)?.targets?.calories,
        targetProtein: unref(summary)?.targets?.protein,
        targetCarbohydrates: unref(summary)?.targets?.carbs,
        targetFat: unref(summary)?.targets?.fat,
        targetWater: unref(summary)?.targets?.water
      },
      trend: (unref(trendSeries) || []).map((item) => [item.key, item.calories, item.protein])
    }),
    () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        refreshAI()
      }, 280)
    },
    { immediate: true }
  )

  return {
    loading,
    error,
    insightLines,
    recommendationLines,
    alertItems,
    refreshAI
  }
}
