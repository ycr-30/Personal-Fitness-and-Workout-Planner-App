import {
  getNutritionGoalsCacheKey,
  getNutritionMealsCachePrefix,
  getNutritionWaterCachePrefix
} from './userSettings'

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function removeKey(key) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {}
}

function userKey(user) {
  return user?.id || user?.accountKey || user?.email || user?.name || 'nutrition-user'
}

function getDirtyGoalsKey(user) {
  return `pf_nutrition_dirty_goals:${userKey(user)}`
}

function getDirtyMealsKey(user) {
  return `pf_nutrition_dirty_meals:${userKey(user)}`
}

function getDirtyWaterKey(user) {
  return `pf_nutrition_dirty_water:${userKey(user)}`
}

function addDirtyDate(key, dateKey) {
  const current = readJson(key, [])
  const next = Array.isArray(current) ? current.slice() : []
  if (!next.includes(dateKey)) next.push(dateKey)
  writeJson(key, next)
}

function removeDirtyDate(key, dateKey) {
  const current = readJson(key, [])
  if (!Array.isArray(current)) {
    removeKey(key)
    return
  }
  const next = current.filter((value) => value !== dateKey)
  if (next.length) {
    writeJson(key, next)
  } else {
    removeKey(key)
  }
}

export function getCachedNutritionGoals(user) {
  return readJson(getNutritionGoalsCacheKey(user), null)
}

export function getCachedNutritionMealsByDate(user, dateKey) {
  return readJson(`${getNutritionMealsCachePrefix(user)}${dateKey}`, [])
}

export function getCachedNutritionWaterByDate(user, dateKey) {
  return readJson(`${getNutritionWaterCachePrefix(user)}${dateKey}`, [])
}

export function markNutritionGoalsDirty(user) {
  writeJson(getDirtyGoalsKey(user), true)
}

export function clearNutritionGoalsDirty(user) {
  removeKey(getDirtyGoalsKey(user))
}

export function hasDirtyNutritionGoals(user) {
  return readJson(getDirtyGoalsKey(user), false) === true
}

export function markNutritionMealsDirty(user, dateKey) {
  addDirtyDate(getDirtyMealsKey(user), dateKey)
}

export function clearNutritionMealsDirty(user, dateKey) {
  removeDirtyDate(getDirtyMealsKey(user), dateKey)
}

export function getDirtyNutritionMealDates(user) {
  const dates = readJson(getDirtyMealsKey(user), [])
  return Array.isArray(dates) ? dates : []
}

export function markNutritionWaterDirty(user, dateKey) {
  addDirtyDate(getDirtyWaterKey(user), dateKey)
}

export function clearNutritionWaterDirty(user, dateKey) {
  removeDirtyDate(getDirtyWaterKey(user), dateKey)
}

export function getDirtyNutritionWaterDates(user) {
  const dates = readJson(getDirtyWaterKey(user), [])
  return Array.isArray(dates) ? dates : []
}
