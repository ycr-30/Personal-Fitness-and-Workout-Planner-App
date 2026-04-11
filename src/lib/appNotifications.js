import { toDateKey } from '@/utils/mealTimeResolver'
import { getIdentityFromUser, getUserStorageKey } from './userStorage'
import {
  defaultUserSettings,
  getNutritionGoalsCacheKey,
  getNutritionMealsCachePrefix,
  getNutritionWaterCachePrefix,
  normalizeUserSettings
} from './userSettings'

const CHECK_INTERVAL_MS = 60 * 1000
const CHECK_ALIGNMENT_BUFFER_MS = 150
const HYDRATION_WINDOW_START_MIN = 8 * 60
const HYDRATION_WINDOW_END_MIN = 22 * 60

let timerId = null
let stateReader = null

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function canNotify() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

function getNextCheckDelay(now = new Date()) {
  const elapsedMs = now.getSeconds() * 1000 + now.getMilliseconds()
  return Math.max(1000, CHECK_INTERVAL_MS - elapsedMs + CHECK_ALIGNMENT_BUFFER_MS)
}

function timeReached(target, now) {
  if (!target || !/^\d{2}:\d{2}$/.test(target)) return false
  const [hours, minutes] = target.split(':').map(Number)
  return now.getHours() * 60 + now.getMinutes() >= hours * 60 + minutes
}

function notificationKey(user, scope) {
  return `pf_notification_sent:${getIdentityFromUser(user)}:${scope}`
}

function fireOnce(user, scope, title, body) {
  if (typeof window === 'undefined' || !canNotify()) return
  const key = notificationKey(user, scope)
  if (window.localStorage.getItem(key) === '1') return
  const notification = new Notification(title, { body, silent: true })
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
  window.localStorage.setItem(key, '1')
}

function getTodayMeals(user, todayKey) {
  return readJson(`${getNutritionMealsCachePrefix(user)}${todayKey}`, [])
}

function getTodayWater(user, todayKey) {
  return readJson(`${getNutritionWaterCachePrefix(user)}${todayKey}`, [])
}

function getNutritionTargets(user) {
  return readJson(getNutritionGoalsCacheKey(user), null)
}

function getTodayWorkouts(user, todayKey) {
  const logs = readJson(getUserStorageKey('pf_workout_logs', user), [])
  return Array.isArray(logs)
    ? logs.filter((item) => String(item?.date || '') === todayKey)
    : []
}

function getWaterTotal(entries) {
  return (Array.isArray(entries) ? entries : []).reduce(
    (sum, entry) => sum + Number(entry?.amountMl || entry?.amount_ml || 0),
    0
  )
}

function evaluateNotifications() {
  const snapshot = typeof stateReader === 'function' ? stateReader() : null
  const user = snapshot?.user
  if (!user) return

  const settings = normalizeUserSettings({
    ...defaultUserSettings,
    ...(snapshot?.settings || {})
  })

  if (!canNotify()) return

  const now = new Date()
  const todayKey = toDateKey(now)
  const totalMinutes = now.getHours() * 60 + now.getMinutes()
  const workouts = getTodayWorkouts(user, todayKey)
  const meals = getTodayMeals(user, todayKey)
  const waterEntries = getTodayWater(user, todayKey)
  const nutritionTargets = getNutritionTargets(user)

  const pendingWorkouts = workouts.filter((item) => item?.status !== 'completed')
  const waterTarget = Number(nutritionTargets?.water_target_ml || 2500)
  const waterTotal = getWaterTotal(waterEntries)
  const waterRemaining = Math.max(Math.round(waterTarget - waterTotal), 0)

  if (
    settings.notification_workout_enabled &&
    pendingWorkouts.length &&
    timeReached(settings.notification_workout_time, now)
  ) {
    const firstWorkout = pendingWorkouts[0]
    fireOnce(
      user,
      `workout:${todayKey}`,
      'Workout reminder',
      `${firstWorkout?.title || 'Your scheduled session'} is still waiting for today.`
    )
  }

  if (
    settings.notification_meal_enabled &&
    (!Array.isArray(meals) || meals.length === 0) &&
    timeReached(settings.notification_meal_time, now)
  ) {
    fireOnce(
      user,
      `meal:${todayKey}`,
      'Meal log reminder',
      'You have not logged any meals yet today.'
    )
  }

  if (
    settings.notification_hydration_enabled &&
    waterRemaining > 0 &&
    totalMinutes >= HYDRATION_WINDOW_START_MIN &&
    totalMinutes <= HYDRATION_WINDOW_END_MIN
  ) {
    const interval = Math.max(30, Number(settings.notification_hydration_interval_min || 120))
    const slot = Math.floor(totalMinutes / interval)
    fireOnce(
      user,
      `hydration:${todayKey}:${slot}`,
      'Hydration reminder',
      `${waterRemaining} ml remaining to hit today’s water target.`
    )
  }

  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase()
  if (
    settings.notification_weekly_review_enabled &&
    weekday === settings.notification_weekly_review_day &&
    timeReached(settings.notification_weekly_review_time, now)
  ) {
    fireOnce(
      user,
      `weekly-review:${todayKey}`,
      'Weekly review reminder',
      'Open Analytics to review your week and set the next focus.'
    )
  }
}

export function startAppNotificationScheduler(getState) {
  stateReader = getState
  stopAppNotificationScheduler()
  evaluateNotifications()
  if (typeof window === 'undefined') return
  const scheduleNextCheck = () => {
    timerId = window.setTimeout(() => {
      evaluateNotifications()
      scheduleNextCheck()
    }, getNextCheckDelay())
  }
  scheduleNextCheck()
}

export function stopAppNotificationScheduler() {
  if (typeof window !== 'undefined' && timerId) {
    window.clearTimeout(timerId)
  }
  timerId = null
}

export function runAppNotificationCheck() {
  evaluateNotifications()
}
