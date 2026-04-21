import { getUserStorageKey } from './userStorage'

export const defaultUserSettings = Object.freeze({
  unit_system: 'metric',
  theme: 'light',
  nutrition_default_unit: 'g',
  nutrition_default_search_mode: 'recent',
  nutrition_water_quick_add_primary_ml: 250,
  nutrition_water_quick_add_secondary_ml: 500,
  workout_default_location: '',
  workout_default_duration_min: 60,
  workout_default_rpe: 6,
  workout_auto_mark_completed: false,
  updated_at: null
})

function toBoolean(value, fallback = false) {
  if (value === null || value === undefined) return fallback
  return Boolean(value)
}

function toInteger(value, fallback) {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.round(next)
}

function clampInteger(value, fallback, min, max) {
  const next = toInteger(value, fallback)
  return Math.min(max, Math.max(min, next))
}

export function normalizeUserSettings(row = {}) {
  return {
    unit_system: 'metric',
    theme: ['light', 'dark', 'system'].includes(row.theme) ? row.theme : 'light',
    nutrition_default_unit: row.nutrition_default_unit === 'serving' ? 'serving' : 'g',
    nutrition_default_search_mode:
      row.nutrition_default_search_mode === 'all' ? 'all' : 'recent',
    nutrition_water_quick_add_primary_ml: clampInteger(
      row.nutrition_water_quick_add_primary_ml,
      defaultUserSettings.nutrition_water_quick_add_primary_ml,
      100,
      2000
    ),
    nutrition_water_quick_add_secondary_ml: clampInteger(
      row.nutrition_water_quick_add_secondary_ml,
      defaultUserSettings.nutrition_water_quick_add_secondary_ml,
      100,
      3000
    ),
    workout_default_location: String(row.workout_default_location || '').trim(),
    workout_default_duration_min: clampInteger(
      row.workout_default_duration_min,
      defaultUserSettings.workout_default_duration_min,
      5,
      480
    ),
    workout_default_rpe: clampInteger(
      row.workout_default_rpe,
      defaultUserSettings.workout_default_rpe,
      1,
      10
    ),
    workout_auto_mark_completed: toBoolean(
      row.workout_auto_mark_completed,
      defaultUserSettings.workout_auto_mark_completed
    ),
    updated_at: row.updated_at || null
  }
}

export function buildUserSettingsPayload(value = {}) {
  const settings = normalizeUserSettings(value)
  return {
    unit_system: 'metric',
    theme: settings.theme,
    nutrition_default_unit: settings.nutrition_default_unit,
    nutrition_default_search_mode: settings.nutrition_default_search_mode,
    nutrition_water_quick_add_primary_ml: settings.nutrition_water_quick_add_primary_ml,
    nutrition_water_quick_add_secondary_ml: settings.nutrition_water_quick_add_secondary_ml,
    workout_default_location: settings.workout_default_location || null,
    workout_default_duration_min: settings.workout_default_duration_min,
    workout_default_rpe: settings.workout_default_rpe,
    workout_auto_mark_completed: settings.workout_auto_mark_completed,
    updated_at: new Date().toISOString()
  }
}

export function getUserSettingsCacheKey(user) {
  return getUserStorageKey('pf_user_settings', user)
}

export function readCachedUserSettings(user) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(getUserSettingsCacheKey(user))
    return raw ? normalizeUserSettings(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function writeCachedUserSettings(user, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      getUserSettingsCacheKey(user),
      JSON.stringify(normalizeUserSettings(value))
    )
  } catch {}
}

export function removeCachedUserSettings(user) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(getUserSettingsCacheKey(user))
  } catch {}
}

export function getNutritionGoalsCacheKey(user) {
  const key = user?.id || user?.accountKey || user?.email || user?.name || 'nutrition-user'
  return `pf_nutrition_goals:${key}`
}

export function getNutritionRecommendationCacheKey(user) {
  const key = user?.id || user?.accountKey || user?.email || user?.name || 'nutrition-user'
  return `pf_nutrition_goal_recommendations:${key}`
}

export function getNutritionMealsCachePrefix(user) {
  const key = user?.id || user?.accountKey || user?.email || user?.name || 'nutrition-user'
  return `pf_nutrition_meals:${key}:`
}

export function getNutritionWaterCachePrefix(user) {
  const key = user?.id || user?.accountKey || user?.email || user?.name || 'nutrition-user'
  return `pf_nutrition_water:${key}:`
}

export function listUserScopedCacheKeys(user) {
  return [
    getUserSettingsCacheKey(user),
    getNutritionGoalsCacheKey(user),
    getNutritionRecommendationCacheKey(user),
    getUserStorageKey('pf_app_state_meta', user),
    getUserStorageKey('pf_plan_state', user),
    getUserStorageKey('pf_workout_logs', user),
    getUserStorageKey('pf_rest_days', user)
  ]
}
