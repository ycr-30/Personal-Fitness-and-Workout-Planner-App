import { computed, onBeforeUnmount, onMounted, ref, unref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import { formatSupabaseError, requireNutritionUser } from '@/lib/nutritionSupabase'
import {
  buildFallbackNutritionTargetRecommendation,
  generateNutritionTargetRecommendationsMap,
  readStoredPlanState,
  readStoredWorkoutLogs,
  syncNutritionGoalsWithPlan
} from '@/lib/nutritionGoalSync'
import {
  buildNutritionSummary,
  buildTrendSeries,
  resolveEffectiveTargets,
  roundNutrition,
  toNumber
} from '@/utils/nutritionCalculations'
import { buildPlanGoalLink } from '@/utils/nutritionGoalMapping'
import { parseDateValue, toDateKey, shiftDate } from '@/utils/mealTimeResolver'

function readCachedValue(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeCachedValue(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function parseDurationMinutes(text) {
  const source = String(text || '')
  const hourMatch = source.match(/(\d+)\s*h/i)
  const minuteMatch = source.match(/(\d+)\s*m/i)
  const hours = hourMatch ? Number(hourMatch[1]) : 0
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0
  return hours * 60 + minutes
}

function calculateExerciseBurn(logs, selectedDate) {
  const targetDate = toDateKey(selectedDate)
  return roundNutrition(
    (logs || []).reduce((sum, item) => {
      if (item?.status !== 'completed') return sum
      if (toDateKey(item?.date) !== targetDate) return sum
      return sum + parseDurationMinutes(item?.duration) * 6
    }, 0),
    0
  )
}

export function useNutritionSummary({ selectedDate, mealEntries, waterEntries }) {
  const auth = useAuthStore()

  function getGoalsCacheKey() {
    const userKey =
      auth.user?.id || auth.user?.accountKey || auth.user?.email || auth.user?.name || 'nutrition-user'
    return `pf_nutrition_goals:${userKey}`
  }

  function getRecommendationsCacheKey() {
    const userKey =
      auth.user?.id || auth.user?.accountKey || auth.user?.email || auth.user?.name || 'nutrition-user'
    return `pf_nutrition_goal_recommendations:${userKey}`
  }

  function getTrendCacheKey() {
    const userKey =
      auth.user?.id || auth.user?.accountKey || auth.user?.email || auth.user?.name || 'nutrition-user'
    return `pf_nutrition_trends:${userKey}:${toDateKey(unref(selectedDate))}:${trendRange.value}`
  }

  const goals = ref(readCachedValue(getGoalsCacheKey(), null))
  const goalsLoading = ref(false)
  const goalsError = ref('')
  const planStateSnapshot = ref(readStoredPlanState(auth.user) || {})
  const recommendedTargets = ref(readCachedValue(getRecommendationsCacheKey(), {}))
  const recommendedTargetsLoading = ref(false)
  const recommendedTargetsError = ref('')

  const trendRange = ref(7)
  const trendSeries = ref(readCachedValue(getTrendCacheKey(), []))
  const trendsLoading = ref(false)
  const trendsError = ref('')

  const planGoalLink = computed(() => buildPlanGoalLink(planStateSnapshot.value))
  const effectiveTargets = computed(() => resolveEffectiveTargets(goals.value))
  const exerciseBurn = computed(() =>
    calculateExerciseBurn(readStoredWorkoutLogs(auth.user), parseDateValue(unref(selectedDate)))
  )
  const summary = computed(() =>
    buildNutritionSummary({
      mealEntries: unref(mealEntries) || [],
      waterEntries: unref(waterEntries) || [],
      goals: goals.value,
      exerciseBurn: exerciseBurn.value
    })
  )

  function seedRecommendedTargets(planState = planStateSnapshot.value) {
    recommendedTargets.value = {
      fat_loss: buildFallbackNutritionTargetRecommendation({
        authUser: auth.user,
        planState,
        goalType: 'fat_loss'
      }),
      muscle_gain: buildFallbackNutritionTargetRecommendation({
        authUser: auth.user,
        planState,
        goalType: 'muscle_gain'
      }),
      maintenance: buildFallbackNutritionTargetRecommendation({
        authUser: auth.user,
        planState,
        goalType: 'maintenance'
      })
    }
    writeCachedValue(getRecommendationsCacheKey(), recommendedTargets.value)
  }

  async function refreshRecommendedTargets(planState = planStateSnapshot.value) {
    recommendedTargetsLoading.value = true
    recommendedTargetsError.value = ''
    seedRecommendedTargets(planState)

    try {
      recommendedTargets.value = await generateNutritionTargetRecommendationsMap({
        authUser: auth.user,
        planState,
        nutritionSummary: summary.value
      })
      writeCachedValue(getRecommendationsCacheKey(), recommendedTargets.value)
    } catch (err) {
      recommendedTargetsError.value = 'Unable to refresh nutrition recommendations right now.'
    } finally {
      recommendedTargetsLoading.value = false
    }
  }

  async function syncGoalsFromPlan(planState = planStateSnapshot.value) {
    try {
      const synced = await syncNutritionGoalsWithPlan({
        authUser: auth.user,
        planState,
        existingGoals: goals.value,
        nutritionSummary: summary.value
      })
      if (synced) {
        goals.value = synced
        writeCachedValue(getGoalsCacheKey(), goals.value)
      }
    } catch (err) {
      goalsError.value = 'Unable to sync nutrition goals from Plan right now.'
    }
  }

  async function loadGoals() {
    if (!supabase) {
      goalsError.value = 'Supabase is not configured.'
      return
    }

    goalsLoading.value = true
    goalsError.value = ''

    try {
      await requireNutritionUser()
      planStateSnapshot.value = readStoredPlanState(auth.user) || {}
      seedRecommendedTargets(planStateSnapshot.value)
      refreshRecommendedTargets(planStateSnapshot.value)
      await syncGoalsFromPlan(planStateSnapshot.value)
    } catch (err) {
      goalsError.value = 'Unable to load nutrition goals right now.'
    } finally {
      goalsLoading.value = false
    }
  }

  async function saveGoals(nextValues) {
    if (!supabase) throw new Error('Supabase is not configured.')
    goalsError.value = ''

    try {
      const user = await requireNutritionUser()
      const planState = planStateSnapshot.value || readStoredPlanState(auth.user) || {}
      const linkedGoal = buildPlanGoalLink(planState)
      const nextGoalType = linkedGoal.nutritionGoalType || nextValues.goal_type || goals.value?.goal_type || 'maintenance'
      const nextAiTargets =
        recommendedTargets.value[nextGoalType] ||
        buildFallbackNutritionTargetRecommendation({
          authUser: auth.user,
          planState,
          goalType: nextGoalType
        })

      const payload = {
        goal_type: nextGoalType,
        calories_target: toNumber(nextValues.calories_target),
        protein_target_g: toNumber(nextValues.protein_target_g),
        carbs_target_g: toNumber(nextValues.carbs_target_g),
        fat_target_g: toNumber(nextValues.fat_target_g),
        water_target_ml: toNumber(nextValues.water_target_ml, 2500),
        use_ai_targets: false,
        ai_calories_target: toNumber(nextAiTargets.ai_calories_target || nextAiTargets.calories_target),
        ai_protein_target_g: toNumber(nextAiTargets.ai_protein_target_g || nextAiTargets.protein_target_g),
        ai_carbs_target_g: toNumber(nextAiTargets.ai_carbs_target_g || nextAiTargets.carbs_target_g),
        ai_fat_target_g: toNumber(nextAiTargets.ai_fat_target_g || nextAiTargets.fat_target_g),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('user_nutrition_goals')
        .update(payload)
        .eq('user_id', user.id)
        .select('*')
        .single()

      if (error) throw error
      goals.value = data
      writeCachedValue(getGoalsCacheKey(), goals.value)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pf_nutrition_updated'))
      }
    } catch (err) {
      goalsError.value = 'Unable to save nutrition goals right now.'
      throw err
    }
  }

  async function refreshTrends() {
    if (!supabase) {
      trendsError.value = 'Supabase is not configured.'
      trendSeries.value = []
      return
    }

    trendsLoading.value = true
    trendsError.value = ''

    try {
      const user = await requireNutritionUser()
      const endDate = parseDateValue(unref(selectedDate)) || new Date()
      const startDate = shiftDate(endDate, -(trendRange.value - 1))
      const startKey = toDateKey(startDate)
      const endKey = toDateKey(endDate)

      const [mealsRes, waterRes] = await Promise.all([
        supabase
          .from('meal_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('entry_date', startKey)
          .lte('entry_date', endKey),
        supabase
          .from('water_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('entry_date', startKey)
          .lte('entry_date', endKey)
      ])

      if (mealsRes.error) throw mealsRes.error
      if (waterRes.error) throw waterRes.error

      trendSeries.value = buildTrendSeries({
        mealEntries: Array.isArray(mealsRes.data)
          ? mealsRes.data.map((row) => ({
              entryDate: row.entry_date,
              calories: row.calories,
              proteinG: row.protein_g,
              carbsG: row.carbs_g,
              fatG: row.fat_g
            }))
          : [],
        waterEntries: Array.isArray(waterRes.data)
          ? waterRes.data.map((row) => ({
              entryDate: row.entry_date,
              amountMl: row.amount_ml
            }))
          : [],
        startDate,
        endDate
      })
      writeCachedValue(getTrendCacheKey(), trendSeries.value)
    } catch (err) {
      trendsError.value = formatSupabaseError(err, 'Unable to load nutrition trends.')
    } finally {
      trendsLoading.value = false
    }
  }

  watch(
    () => toDateKey(unref(selectedDate)),
    () => {
      trendSeries.value = readCachedValue(getTrendCacheKey(), trendSeries.value || [])
      refreshTrends()
    },
    { immediate: true }
  )

  watch(trendRange, () => {
    trendSeries.value = readCachedValue(getTrendCacheKey(), trendSeries.value || [])
    refreshTrends()
  })

  function handlePlanUpdated() {
    planStateSnapshot.value = readStoredPlanState(auth.user) || {}
    seedRecommendedTargets(planStateSnapshot.value)
    refreshRecommendedTargets(planStateSnapshot.value)
    syncGoalsFromPlan(planStateSnapshot.value)
  }

  onMounted(() => {
    seedRecommendedTargets(planStateSnapshot.value)
    if (typeof window !== 'undefined') {
      window.addEventListener('pf_plan_updated', handlePlanUpdated)
    }
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pf_plan_updated', handlePlanUpdated)
    }
  })

  return {
    goals,
    planGoalLink,
    aiRecommendedTargets: recommendedTargets,
    recommendedTargetsLoading,
    recommendedTargetsError,
    effectiveTargets,
    goalsLoading,
    goalsError,
    summary,
    exerciseBurn,
    trendRange,
    trendSeries,
    trendsLoading,
    trendsError,
    loadGoals,
    saveGoals,
    refreshTrends
  }
}
