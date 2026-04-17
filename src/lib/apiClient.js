import { supabase } from './supabaseClient'
import { AUTH_SERVER_ORIGIN } from './authServerOrigin'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || AUTH_SERVER_ORIGIN

const SUPABASE_TABLES = {
  muscles: ['muscles', 'Muscle', 'muscle', 'muscle_groups'],
  equipments: ['equipments', 'Equipment', 'equipment', 'equipment_types'],
  exercises: ['exercises', 'Exercise', 'exercise'],
  exerciseEquipments: [
    'exercise_equipments',
    'exercise_equipment',
    'ExerciseEquipment',
    'exerciseEquipment'
  ]
}

const supabaseCache = {
  musclesPromise: null,
  equipmentsPromise: null,
  exercisesPromise: null,
  linksPromise: null
}

function createError(message, code, extras = {}) {
  const error = new Error(message)
  error.code = code
  Object.assign(error, extras)
  return error
}

function getStoredToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('pf_api_token') || ''
}

function buildUrl(path, params) {
  if (!API_BASE_URL) {
    throw createError(
      'API base URL is not configured for this deployment. Please set VITE_AUTH_SERVER_ORIGIN.',
      'API_BASE_URL_MISSING'
    )
  }
  const url = new URL(path, API_BASE_URL)
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === '') return
      if (Array.isArray(value)) {
        const cleaned = value.filter(Boolean)
        if (cleaned.length) url.searchParams.set(key, cleaned.join(','))
        return
      }
      url.searchParams.set(key, String(value))
    })
  }
  return url.toString()
}

function isHtmlLike(value) {
  if (!value || typeof value !== 'string') return false
  return /<\s*(!doctype|html|head|body|pre)\b/i.test(value)
}

function sanitizeErrorMessage(value) {
  if (!value) return 'Request failed'
  if (typeof value === 'string') {
    if (isHtmlLike(value)) {
      return 'API response was not JSON. Check that the backend is running and the base URL is correct.'
    }
    return value
  }
  if (typeof value === 'object') {
    const message = value.error || value.message || ''
    if (typeof message === 'string' && isHtmlLike(message)) {
      return 'API response was not JSON. Check that the backend is running and the base URL is correct.'
    }
    return message || 'Request failed'
  }
  return 'Request failed'
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  const text = String(value).trim().replace(/\uFFFD/g, '')
  return text || fallback
}

function toId(value) {
  if (value == null) return ''
  if (typeof value === 'object') {
    if (value.id != null) return String(value.id)
    return ''
  }
  return String(value)
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch (err) {
      return value
    }
  }
  return value
}

function toStringList(value) {
  if (value == null) return []
  if (Array.isArray(value)) return value.flatMap((item) => toStringList(item))
  if (typeof value === 'object') {
    const label = value.name || value.label || value.slug || value.code
    if (label) return [String(label)]
    return Object.values(value).flatMap((item) => toStringList(item))
  }
  if (typeof value === 'string') {
    const parsed = parseMaybeJson(value)
    if (parsed !== value) return toStringList(parsed)
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return [String(value)]
}

function normalizeItemNames(values) {
  return [...new Set(toStringList(values).map((item) => safeText(item)).filter(Boolean))]
}

function isMissingRelationError(error) {
  const message = safeText(error?.message || error?.details)
  const code = safeText(error?.code)
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /relation .* does not exist/i.test(message) ||
    /Could not find the table/i.test(message)
  )
}

async function queryFirstSupabaseTable(tableNames, runQuery) {
  if (!supabase) {
    throw createError('Supabase is not configured for fallback.', 'SUPABASE_DISABLED')
  }
  let lastError = null
  for (const table of tableNames) {
    const { data, error } = await runQuery(supabase.from(table), table)
    if (!error) {
      return {
        table,
        data: Array.isArray(data) ? data : []
      }
    }
    lastError = error
    if (isMissingRelationError(error)) {
      continue
    }
  }
  throw createError(
    `Supabase fallback query failed. ${safeText(lastError?.message, 'Unknown error.')}`,
    'SUPABASE_QUERY_FAILED',
    { cause: lastError }
  )
}

function mapMuscleRow(row) {
  const id = row.id ?? row.muscleId ?? row.muscle_id
  const slug = safeText(row.slug || row.code || normalizeToken(row.name || row.label || id))
  const name = safeText(row.name || row.label || slug, slug || 'Muscle')
  return {
    id,
    name,
    slug,
    side: safeText(row.side || row.view || ''),
    regionId: safeText(row.regionId || row.region_id || row.region || '')
  }
}

function mapEquipmentRow(row) {
  const id = row.id ?? row.equipmentId ?? row.equipment_id
  const slug = safeText(row.slug || row.code || normalizeToken(row.name || row.label || id))
  const name = safeText(row.name || row.label || slug, slug || 'Equipment')
  return {
    id,
    name,
    slug
  }
}

function getExerciseId(row) {
  return row.id ?? row.exerciseId ?? row.exercise_id ?? row.exercise_id_fk
}

function getPrimaryMuscleId(row) {
  const fromObject = row.primaryMuscle?.id ?? row.primary_muscle?.id ?? row.muscle?.id
  return (
    fromObject ??
    row.primaryMuscleId ??
    row.primary_muscle_id ??
    row.muscleId ??
    row.muscle_id ??
    row.primary_muscle
  )
}

function mapExerciseEquipmentLinks(rows) {
  return rows
    .map((row) => {
      const exerciseId =
        row.exerciseId ?? row.exercise_id ?? row.exercise?.id ?? row.exercise_fk ?? row.exercise
      const equipmentId =
        row.equipmentId ?? row.equipment_id ?? row.equipment?.id ?? row.equipment_fk ?? row.equipment
      return {
        exerciseId: toId(exerciseId),
        equipmentId: toId(equipmentId)
      }
    })
    .filter((item) => item.exerciseId && item.equipmentId)
}

function toMapById(rows) {
  const map = new Map()
  rows.forEach((row) => {
    const id = toId(row.id)
    if (id) map.set(id, row)
  })
  return map
}

function normalizePrimaryMuscle(value) {
  if (!value) return null
  if (typeof value === 'string') {
    return {
      id: '',
      name: safeText(value),
      slug: normalizeToken(value),
      regionId: '',
      side: ''
    }
  }
  return {
    id: value.id,
    name: safeText(value.name || value.label || ''),
    slug: safeText(value.slug || normalizeToken(value.name || value.label || '')),
    regionId: safeText(value.regionId || value.region_id || ''),
    side: safeText(value.side || '')
  }
}

function attachExerciseRelations(exerciseRows, muscles, equipments, links) {
  const musclesById = toMapById(muscles)
  const equipmentsById = toMapById(equipments)
  const linksByExerciseId = new Map()

  links.forEach((link) => {
    if (!linksByExerciseId.has(link.exerciseId)) {
      linksByExerciseId.set(link.exerciseId, [])
    }
    linksByExerciseId.get(link.exerciseId).push(link.equipmentId)
  })

  return exerciseRows.map((row) => {
    const id = getExerciseId(row)
    const exerciseId = toId(id)
    const primaryMuscleId = toId(getPrimaryMuscleId(row))
    const linkedMuscle = musclesById.get(primaryMuscleId)
    const inlineMuscle = normalizePrimaryMuscle(row.primaryMuscle || row.primary_muscle || row.muscle)
    const primaryMuscle = linkedMuscle
      ? {
          id: linkedMuscle.id,
          name: linkedMuscle.name,
          slug: linkedMuscle.slug,
          regionId: linkedMuscle.regionId,
          side: linkedMuscle.side
        }
      : inlineMuscle

    const linkedEquipmentNames = (linksByExerciseId.get(exerciseId) || [])
      .map((equipmentId) => equipmentsById.get(equipmentId)?.name)
      .filter(Boolean)

    const inlineEquipmentNames = normalizeItemNames(
      row.equipments || row.equipment || row.equipmentLabel || row.equipmentType
    )

    const equipmentsList = [...new Set([...linkedEquipmentNames, ...inlineEquipmentNames])]

    return {
      ...row,
      id: id ?? row.id,
      name: safeText(row.name || row.title || row.exerciseName || 'Exercise'),
      slug: safeText(row.slug || normalizeToken(row.name || row.title || id)),
      difficulty: safeText(row.difficulty || row.level || ''),
      instructions: row.instructions || row.steps || [],
      notes: row.notes || row.description || '',
      media: row.media || row.media_json || null,
      primaryMuscle: primaryMuscle || null,
      equipments: equipmentsList
    }
  })
}

function matchesFilterToken(candidate, target) {
  if (!candidate || !target) return false
  if (candidate === target) return true
  return candidate.includes(target) || target.includes(candidate)
}

function filterExercisesByMuscle(exercises, muscle) {
  const target = normalizeToken(muscle)
  if (!target) return exercises
  return exercises.filter((exercise) => {
    const tokens = [
      exercise.primaryMuscle?.slug,
      exercise.primaryMuscle?.name,
      exercise.primaryMuscle?.id,
      exercise.primaryMuscleId,
      exercise.primary_muscle_id,
      exercise.muscle,
      exercise.mainMuscle
    ]
      .map((item) => normalizeToken(item))
      .filter(Boolean)

    return tokens.some((token) => matchesFilterToken(token, target))
  })
}

function filterExercisesByEquipments(exercises, equipments) {
  const selected = Array.isArray(equipments)
    ? [...new Set(equipments.map((item) => normalizeToken(item)).filter(Boolean))]
    : []
  if (!selected.length) return exercises

  return exercises.filter((exercise) => {
    const tokens = [
      ...normalizeItemNames(exercise.equipments),
      ...normalizeItemNames(exercise.equipment),
      ...normalizeItemNames(exercise.equipmentType)
    ]
      .map((item) => normalizeToken(item))
      .filter(Boolean)

    return selected.some((item) => tokens.some((token) => matchesFilterToken(token, item)))
  })
}

function shouldFallbackToSupabase(error) {
  if (!supabase) return false
  if (!error) return true
  if (error.code === 'NETWORK_ERROR') return true
  if (String(error.code || '').startsWith('HTTP_')) return true
  const message = safeText(error.message)
  return (
    /Failed to fetch|NetworkError|Load failed/i.test(message) ||
    /Unable to connect to exercise API/i.test(message) ||
    /API response was not JSON/i.test(message)
  )
}

function buildCombinedError(primaryError, fallbackError) {
  return createError(
    `${safeText(primaryError?.message, 'Primary exercise API failed.')} Supabase fallback also failed: ${safeText(fallbackError?.message, 'Unknown error.')}`,
    'EXERCISE_DATA_UNAVAILABLE',
    { cause: fallbackError }
  )
}

async function loadSupabaseMuscles() {
  if (!supabaseCache.musclesPromise) {
    supabaseCache.musclesPromise = queryFirstSupabaseTable(SUPABASE_TABLES.muscles, (query) =>
      query.select('*')
    ).then((result) => result.data.map((row) => mapMuscleRow(row)))
  }
  return supabaseCache.musclesPromise
}

async function loadSupabaseEquipments() {
  if (!supabaseCache.equipmentsPromise) {
    supabaseCache.equipmentsPromise = queryFirstSupabaseTable(
      SUPABASE_TABLES.equipments,
      (query) => query.select('*')
    ).then((result) => result.data.map((row) => mapEquipmentRow(row)))
  }
  return supabaseCache.equipmentsPromise
}

async function loadSupabaseExercises() {
  if (!supabaseCache.exercisesPromise) {
    supabaseCache.exercisesPromise = queryFirstSupabaseTable(SUPABASE_TABLES.exercises, (query) =>
      query.select('*')
    ).then((result) => result.data)
  }
  return supabaseCache.exercisesPromise
}

async function loadSupabaseExerciseLinks() {
  if (!supabaseCache.linksPromise) {
    supabaseCache.linksPromise = queryFirstSupabaseTable(
      SUPABASE_TABLES.exerciseEquipments,
      (query) => query.select('*')
    )
      .then((result) => mapExerciseEquipmentLinks(result.data))
      .catch((error) => {
        if (error?.code === 'SUPABASE_QUERY_FAILED') return []
        return []
      })
  }
  return supabaseCache.linksPromise
}

async function getMusclesFromSupabase() {
  const muscles = await loadSupabaseMuscles()
  return muscles.sort((a, b) => a.name.localeCompare(b.name))
}

async function getEquipmentsFromSupabase() {
  const equipments = await loadSupabaseEquipments()
  return equipments.sort((a, b) => a.name.localeCompare(b.name))
}

async function getExercisesFromSupabase({ muscle, equipments } = {}) {
  const [muscles, equipmentRows, exerciseRows, links] = await Promise.all([
    loadSupabaseMuscles(),
    loadSupabaseEquipments(),
    loadSupabaseExercises(),
    loadSupabaseExerciseLinks()
  ])

  let exercises = attachExerciseRelations(exerciseRows, muscles, equipmentRows, links)
  exercises = filterExercisesByMuscle(exercises, muscle)
  exercises = filterExercisesByEquipments(exercises, equipments)
  exercises.sort((a, b) => safeText(a.name).localeCompare(safeText(b.name)))
  return exercises
}

async function getExerciseByIdFromSupabase(id) {
  if (!id) return null
  const exercises = await getExercisesFromSupabase({})
  const target = String(id)
  return exercises.find((exercise) => String(exercise.id) === target) || null
}

export async function apiFetch(path, options = {}) {
  const { method = 'GET', params, body, headers, token, credentials = 'include' } = options
  const authToken = token || getStoredToken()
  const requestHeaders = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(headers || {})
  }
  if (authToken) requestHeaders.Authorization = `Bearer ${authToken}`

  let res
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers: requestHeaders,
      credentials,
      body: body ? JSON.stringify(body) : undefined
    })
  } catch (error) {
    throw createError(
      'Unable to connect to exercise API. Check backend URL or use Supabase fallback.',
      'NETWORK_ERROR',
      { cause: error }
    )
  }

  if (res.status === 204) return null
  let payload = null
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    payload = await res.json()
  } else {
    payload = await res.text()
  }
  if (!res.ok) {
    const message = sanitizeErrorMessage(payload)
    throw createError(message, `HTTP_${res.status}`, { status: res.status, payload })
  }
  return payload
}

export const exerciseApi = {
  async getMuscles() {
    try {
      return await apiFetch('/api/muscles')
    } catch (error) {
      if (!shouldFallbackToSupabase(error)) throw error
      try {
        return await getMusclesFromSupabase()
      } catch (fallbackError) {
        throw buildCombinedError(error, fallbackError)
      }
    }
  },
  async getEquipments() {
    try {
      return await apiFetch('/api/equipments')
    } catch (error) {
      if (!shouldFallbackToSupabase(error)) throw error
      try {
        return await getEquipmentsFromSupabase()
      } catch (fallbackError) {
        throw buildCombinedError(error, fallbackError)
      }
    }
  },
  async getExercises({ muscle, equipments } = {}) {
    try {
      return await apiFetch('/api/exercises', {
        params: {
          muscle,
          equipments: Array.isArray(equipments) ? equipments : undefined
        }
      })
    } catch (error) {
      if (!shouldFallbackToSupabase(error)) throw error
      try {
        return await getExercisesFromSupabase({ muscle, equipments })
      } catch (fallbackError) {
        throw buildCombinedError(error, fallbackError)
      }
    }
  },
  async getExerciseById(id) {
    if (!id) return null
    try {
      return await apiFetch(`/api/exercises/${id}`)
    } catch (error) {
      if (!shouldFallbackToSupabase(error)) throw error
      try {
        return await getExerciseByIdFromSupabase(id)
      } catch (fallbackError) {
        throw buildCombinedError(error, fallbackError)
      }
    }
  }
}
