import { supabase } from './supabaseClient'
import { getUserStorageKey } from './userStorage'
import { buildDefaultNutritionTargets, toNumber } from '@/utils/nutritionCalculations'
import { buildPlanGoalLink } from '@/utils/nutritionGoalMapping'

const NUTRITION_AI_ORIGIN = import.meta.env.VITE_NUTRITION_AGENT_ORIGIN || 'http://localhost:8000'

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    return fallback
  }
}

export function readStoredPlanState(user) {
  if (!user) return null
  return readJson(getUserStorageKey('pf_plan_state', user), null)
}

export function readStoredWorkoutLogs(user) {
  if (!user) return []
  const rows = readJson(getUserStorageKey('pf_workout_logs', user), [])
  return Array.isArray(rows) ? rows : []
}

function parseDurationMinutes(value) {
  const source = String(value || '')
  const hourMatch = source.match(/(\d+)\s*h/i)
  const minuteMatch = source.match(/(\d+)\s*m/i)
  const hours = hourMatch ? Number(hourMatch[1]) : 0
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0
  return hours * 60 + minutes
}

function resolveWeightKg(authUser, planState) {
  return (
    toNumber(planState?.weight?.current) ||
    toNumber(planState?.weight?.start) ||
    toNumber(authUser?.weightKg) ||
    toNumber(authUser?.weight) ||
    70
  )
}

function buildWorkoutContext(workoutLogs) {
  const logs = Array.isArray(workoutLogs) ? workoutLogs : []
  const completed = logs.filter((item) => item?.status === 'completed')
  const totalMinutes = completed.reduce(
    (sum, item) =>
      sum +
      (Array.isArray(item?.exercises)
        ? item.exercises.reduce(
            (exerciseSum, exercise) =>
              exerciseSum +
              (Number(exercise?.durationHours) || 0) * 60 +
              (Number(exercise?.durationMinutes) || 0),
            0
          )
        : parseDurationMinutes(item?.duration)),
    0
  )
  return {
    completed_sessions: completed.length,
    total_minutes: Math.round(totalMinutes)
  }
}

export function buildFallbackNutritionTargetRecommendation({ authUser, planState, goalType }) {
  const fallback = buildDefaultNutritionTargets({
    weightKg: resolveWeightKg(authUser, planState),
    goalType,
    intakeTarget: toNumber(planState?.challengeValues?.intake)
  })

  return {
    ...fallback,
    explanation: 'Calculated from your goal type, body weight, and saved plan target data.',
    source: 'fallback'
  }
}

async function requestNutritionTargetRecommendation({
  authUser,
  planState,
  planGoalLink,
  goalType,
  nutritionSummary
}) {
  const response = await fetch(`${NUTRITION_AI_ORIGIN}/nutrition/targets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal_type: goalType,
      plan_goal_label: planGoalLink?.workoutGoalLabel || '',
      nutrition_summary: nutritionSummary || {},
      workout_context: buildWorkoutContext(readStoredWorkoutLogs(authUser)),
      user_profile: {
        name: authUser?.name || 'KeepFit user',
        sex: authUser?.sex || '',
        weightKg: resolveWeightKg(authUser, planState),
        bodyFat: toNumber(planState?.bodyMetrics?.bodyFat) || null,
        heightCm: toNumber(authUser?.heightCm || authUser?.height) || null
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Nutrition target request failed (${response.status}).`)
  }

  const data = await response.json()
  return {
    goal_type: goalType,
    calories_target: toNumber(data?.calories_target),
    protein_target_g: toNumber(data?.protein_target_g),
    carbs_target_g: toNumber(data?.carbs_target_g),
    fat_target_g: toNumber(data?.fat_target_g),
    water_target_ml: 2500,
    ai_calories_target: toNumber(data?.calories_target),
    ai_protein_target_g: toNumber(data?.protein_target_g),
    ai_carbs_target_g: toNumber(data?.carbs_target_g),
    ai_fat_target_g: toNumber(data?.fat_target_g),
    use_ai_targets: true,
    explanation: String(data?.explanation || '').trim() || 'Generated from your linked workout goal and profile data.',
    source: String(data?.source || 'agent')
  }
}

export async function generateNutritionTargetRecommendation({
  authUser,
  planState,
  goalType,
  nutritionSummary = null
}) {
  const planGoalLink = buildPlanGoalLink(planState)
  try {
    return await requestNutritionTargetRecommendation({
      authUser,
      planState,
      planGoalLink,
      goalType,
      nutritionSummary
    })
  } catch (error) {
    return buildFallbackNutritionTargetRecommendation({
      authUser,
      planState,
      goalType
    })
  }
}

export async function generateNutritionTargetRecommendationsMap({ authUser, planState, nutritionSummary = null }) {
  const goalTypes = ['fat_loss', 'muscle_gain', 'maintenance']
  const entries = await Promise.all(
    goalTypes.map(async (goalType) => [
      goalType,
      await generateNutritionTargetRecommendation({
        authUser,
        planState,
        goalType,
        nutritionSummary
      })
    ])
  )
  return Object.fromEntries(entries)
}

async function getSupabaseUserId() {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user?.id || null
}

export async function syncNutritionGoalsWithPlan({
  authUser,
  planState,
  existingGoals = null,
  nutritionSummary = null
}) {
  if (!supabase || !authUser || !planState) return null

  const userId = await getSupabaseUserId()
  if (!userId) return null

  let goals = existingGoals
  if (!goals) {
    const { data, error } = await supabase
      .from('user_nutrition_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throw error
    goals = data || null
  }

  const planGoalLink = buildPlanGoalLink(planState)
  const goalType = planGoalLink.nutritionGoalType
  const recommendation = await generateNutritionTargetRecommendation({
    authUser,
    planState,
    goalType,
    nutritionSummary
  })

  const payload = {
    goal_type: goalType,
    ai_calories_target: toNumber(recommendation.ai_calories_target ?? recommendation.calories_target),
    ai_protein_target_g: toNumber(recommendation.ai_protein_target_g ?? recommendation.protein_target_g),
    ai_carbs_target_g: toNumber(recommendation.ai_carbs_target_g ?? recommendation.carbs_target_g),
    ai_fat_target_g: toNumber(recommendation.ai_fat_target_g ?? recommendation.fat_target_g),
    use_ai_targets: goals ? Boolean(goals.use_ai_targets) : true,
    updated_at: new Date().toISOString()
  }

  if (!goals) {
    payload.calories_target = toNumber(recommendation.calories_target)
    payload.protein_target_g = toNumber(recommendation.protein_target_g)
    payload.carbs_target_g = toNumber(recommendation.carbs_target_g)
    payload.fat_target_g = toNumber(recommendation.fat_target_g)
    payload.water_target_ml = 2500

    const { data, error } = await supabase
      .from('user_nutrition_goals')
      .insert([{ user_id: userId, ...payload }])
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('user_nutrition_goals')
    .update(payload)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data
}
