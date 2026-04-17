import { getUserStorageKey } from './userStorage'
import { buildAuthServerUrl } from './authServerOrigin'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function getLocalAppState(user) {
  return {
    planState: readJson(getUserStorageKey('pf_plan_state', user), null),
    workoutLogs: readJson(getUserStorageKey('pf_workout_logs', user), []),
    restDays: readJson(getUserStorageKey('pf_rest_days', user), [])
  }
}

export async function fetchCloudAppState() {
  const response = await fetch(buildAuthServerUrl('/api/user/app-state'), {
    credentials: 'include'
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load cloud app state.')
  }
  return payload?.appState || null
}

export function applyCloudAppStateToLocal(user, appState) {
  if (!user || !appState || typeof window === 'undefined') return

  const planKey = getUserStorageKey('pf_plan_state', user)
  const logsKey = getUserStorageKey('pf_workout_logs', user)
  const restKey = getUserStorageKey('pf_rest_days', user)

  if (appState.planState && typeof appState.planState === 'object') {
    localStorage.setItem(planKey, JSON.stringify(appState.planState))
  } else {
    localStorage.removeItem(planKey)
  }

  localStorage.setItem(logsKey, JSON.stringify(Array.isArray(appState.workoutLogs) ? appState.workoutLogs : []))
  localStorage.setItem(restKey, JSON.stringify(Array.isArray(appState.restDays) ? appState.restDays : []))

  window.dispatchEvent(new Event('pf_plan_updated'))
  window.dispatchEvent(new Event('pf_logs_updated'))
  window.dispatchEvent(new Event('pf_rest_updated'))
}

export async function saveLocalAppStateToCloud(user) {
  if (!user) {
    throw new Error('User is required to save cloud app state.')
  }
  const state = getLocalAppState(user)
  const response = await fetch(buildAuthServerUrl('/api/user/app-state'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(state)
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to save cloud app state.')
  }
  return payload?.appState || null
}
