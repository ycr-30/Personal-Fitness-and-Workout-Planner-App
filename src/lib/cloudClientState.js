import { supabase } from './supabaseClient'
import { AUTH_SERVER_ORIGIN } from './authServerOrigin'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || AUTH_SERVER_ORIGIN

const DEVICE_ID_KEY = 'pf_cloud_device_id'

function randomToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getStableDeviceId() {
  if (typeof window === 'undefined') return 'server-device'
  const existing = window.localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const created = randomToken()
  window.localStorage.setItem(DEVICE_ID_KEY, created)
  return created
}

async function buildAuthHeaders() {
  if (!supabase) return {}
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    const accessToken = data?.session?.access_token || ''
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  } catch {
    return {}
  }
}

function buildUrl(path, params = {}) {
  if (!API_BASE_URL) {
    throw new Error('Cloud state API is not configured for this deployment. Please set VITE_AUTH_SERVER_ORIGIN.')
  }
  const url = new URL(path, API_BASE_URL)
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return
    if (Array.isArray(value)) {
      const list = value.filter(Boolean)
      if (list.length) url.searchParams.set(key, list.join(','))
      return
    }
    url.searchParams.set(key, String(value))
  })
  return url.toString()
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const stateKey = String(entry.stateKey || '').trim()
  if (!stateKey) return null
  const scope = entry.scope === 'user' ? 'user' : 'device'
  const deviceId = scope === 'device' ? String(entry.deviceId || getStableDeviceId()).trim() : null
  return {
    scope,
    deviceId,
    stateKey,
    stateValue: entry.stateValue ?? null
  }
}

function normalizeEntries(entries) {
  return (Array.isArray(entries) ? entries : [entries])
    .map((entry) => normalizeEntry(entry))
    .filter(Boolean)
}

export async function loadCloudClientState({ scope = 'device', keys = [], deviceId = null } = {}) {
  const requestScope = scope === 'user' ? 'user' : 'device'
  const requestDeviceId = requestScope === 'device' ? (deviceId || getStableDeviceId()) : null
  const headers = await buildAuthHeaders()
  const response = await fetch(
    buildUrl('/api/user/client-state', {
      scope: requestScope,
      deviceId: requestDeviceId,
      keys
    }),
    {
      credentials: 'include',
      headers
    }
  )

  if (response.status === 401) return {}

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load cloud client state.')
  }

  const map = {}
  const entries = Array.isArray(payload?.entries) ? payload.entries : []
  entries.forEach((entry) => {
    const key = String(entry?.stateKey || '').trim()
    if (!key) return
    map[key] = entry?.stateValue ?? null
  })
  return map
}

export async function saveCloudClientState(entries) {
  const normalized = normalizeEntries(entries)
  if (!normalized.length) return []

  const headers = {
    'Content-Type': 'application/json',
    ...(await buildAuthHeaders())
  }

  const response = await fetch(buildUrl('/api/user/client-state'), {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ entries: normalized })
  })

  if (response.status === 401) return []

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to save cloud client state.')
  }

  return Array.isArray(payload?.entries) ? payload.entries : []
}
