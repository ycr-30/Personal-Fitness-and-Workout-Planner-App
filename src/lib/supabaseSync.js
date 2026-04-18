import { supabase } from './supabaseClient'
import { getStorageKeyForId } from './userStorage'
import {
  clearNutritionGoalsDirty,
  clearNutritionMealsDirty,
  clearNutritionWaterDirty,
  getCachedNutritionGoals,
  getCachedNutritionMealsByDate,
  getCachedNutritionWaterByDate,
  getDirtyNutritionMealDates,
  getDirtyNutritionWaterDates,
  hasDirtyNutritionGoals
} from './nutritionSyncState'

const STORAGE_KEYS = {
  plan: 'pf_plan_state',
  logs: 'pf_workout_logs',
  rest: 'pf_rest_days'
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (error) {
    return fallback
  }
}

function readUserJson(baseKey, userId, fallback) {
  const key = getStorageKeyForId(baseKey, userId)
  return readJson(key, fallback)
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

async function upsertByUser(table, userId, payload) {
  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError
  }

  if (existing?.id) {
    const { error } = await supabase
      .from(table)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw error
    return 'updated'
  }

  const { error } = await supabase
    .from(table)
    .insert([{ user_id: userId, ...payload }])
  if (error) throw error
  return 'inserted'
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean)
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function normalizeWorkoutEntry(entry, index) {
  const workoutId = entry?.id ? String(entry.id) : `auto-${index}-${Date.now()}`
  const dateValue = entry?.date ? new Date(entry.date) : null
  const date =
    dateValue && !Number.isNaN(dateValue.getTime())
      ? dateValue.toISOString().split('T')[0]
      : null
  const exercises = Array.isArray(entry?.exercises) ? entry.exercises : []
  return {
    workout_id: workoutId,
    date,
    title: entry?.title || null,
    subtitle: entry?.subtitle || null,
    duration: entry?.duration || null,
    tags: normalizeTags(entry?.tags),
    location: entry?.location || null,
    exercises,
    prs: Number.isFinite(Number(entry?.prs)) ? Number(entry.prs) : null,
    status: entry?.status || null,
    entry: entry ?? null
  }
}

async function syncWorkoutEntries(userId, workouts) {
  const normalized = Array.isArray(workouts)
    ? workouts.map((entry, index) => normalizeWorkoutEntry(entry, index))
    : []
  const rows = normalized.map((entry) => ({
    user_id: userId,
    ...entry
  }))

  const { data: existingRows, error: existingError } = await supabase
    .from('workout_entries')
    .select('workout_id')
    .eq('user_id', userId)

  if (existingError) throw existingError

  const existingIds = new Set((existingRows || []).map((row) => row.workout_id))
  const localIds = new Set(rows.map((row) => row.workout_id))

  if (rows.length) {
    const { error } = await supabase
      .from('workout_entries')
      .upsert(rows, { onConflict: 'user_id,workout_id' })
    if (error) throw error
  }

  const toDelete = [...existingIds].filter((id) => !localIds.has(id))
  if (toDelete.length) {
    const { error } = await supabase
      .from('workout_entries')
      .delete()
      .eq('user_id', userId)
      .in('workout_id', toDelete)
    if (error) throw error
  }
}

async function syncRestDays(userId, restDays) {
  const days = Array.isArray(restDays)
    ? restDays.map((value) => value).filter(Boolean)
    : []
  const rows = days.map((restDate) => ({
    user_id: userId,
    rest_date: restDate
  }))

  const { data: existingRows, error: existingError } = await supabase
    .from('rest_day_entries')
    .select('rest_date')
    .eq('user_id', userId)

  if (existingError) throw existingError

  const existingDates = new Set((existingRows || []).map((row) => row.rest_date))
  const localDates = new Set(rows.map((row) => row.rest_date))

  if (rows.length) {
    const { error } = await supabase
      .from('rest_day_entries')
      .upsert(rows, { onConflict: 'user_id,rest_date' })
    if (error) throw error
  }

  const toDelete = [...existingDates].filter((date) => !localDates.has(date))
  if (toDelete.length) {
    const { error } = await supabase
      .from('rest_day_entries')
      .delete()
      .eq('user_id', userId)
      .in('rest_date', toDelete)
    if (error) throw error
  }
}

function sanitizeNutritionGoalRow(cachedGoals) {
  if (!cachedGoals || typeof cachedGoals !== 'object') return null
  return {
    goal_type: cachedGoals.goal_type || 'maintenance',
    calories_target: Number(cachedGoals.calories_target || 0),
    protein_target_g: Number(cachedGoals.protein_target_g || 0),
    carbs_target_g: Number(cachedGoals.carbs_target_g || 0),
    fat_target_g: Number(cachedGoals.fat_target_g || 0),
    water_target_ml: Number(cachedGoals.water_target_ml || 2500),
    ai_calories_target: cachedGoals.ai_calories_target ?? null,
    ai_protein_target_g: cachedGoals.ai_protein_target_g ?? null,
    ai_carbs_target_g: cachedGoals.ai_carbs_target_g ?? null,
    ai_fat_target_g: cachedGoals.ai_fat_target_g ?? null,
    use_ai_targets: Boolean(cachedGoals.use_ai_targets),
    goal_source: cachedGoals.goal_source || 'plan',
    goal_override: Boolean(cachedGoals.goal_override),
    linked_plan_goal_id: cachedGoals.linked_plan_goal_id || null,
    linked_plan_goal_label: cachedGoals.linked_plan_goal_label || null,
    updated_at: new Date().toISOString()
  }
}

function sanitizeMealRows(userId, dateKey, cachedEntries) {
  if (!Array.isArray(cachedEntries)) return []
  return cachedEntries.map((entry) => {
    const row = {
      user_id: userId,
      entry_date: entry.entryDate || dateKey,
      meal_type: entry.mealType || 'breakfast',
      food_id: isUuidLike(entry.foodId) ? entry.foodId : null,
      food_name_snapshot: entry.foodNameSnapshot || 'Food entry',
      brand_snapshot: entry.brandSnapshot || null,
      quantity: Number(entry.quantity || 0),
      unit: entry.unit === 'serving' ? 'serving' : 'g',
      quantity_g: entry.quantityG ?? null,
      serving_count: entry.servingCount ?? null,
      calories: Number(entry.calories || 0),
      protein_g: Number(entry.proteinG || 0),
      carbs_g: Number(entry.carbsG || 0),
      fat_g: Number(entry.fatG || 0),
      is_custom: Boolean(entry.isCustom),
      notes: entry.notes || null,
      created_at: entry.createdAt || new Date().toISOString(),
      updated_at: entry.updatedAt || new Date().toISOString()
    }
    if (isUuidLike(entry.id)) {
      row.id = entry.id
    }
    return row
  })
}

function sanitizeWaterRows(userId, dateKey, cachedEntries) {
  if (!Array.isArray(cachedEntries)) return []
  return cachedEntries.map((entry) => {
    const row = {
      user_id: userId,
      entry_date: entry.entryDate || dateKey,
      amount_ml: Number(entry.amountMl || 0),
      created_at: entry.createdAt || new Date().toISOString()
    }
    if (isUuidLike(entry.id)) {
      row.id = entry.id
    }
    return row
  })
}

async function syncLocalNutritionDataToSupabase(userId) {
  const user = { id: userId }

  if (hasDirtyNutritionGoals(user)) {
    const cachedGoals = getCachedNutritionGoals(user)
    const payload = sanitizeNutritionGoalRow(cachedGoals)
    if (payload) {
      const { error } = await supabase
        .from('user_nutrition_goals')
        .upsert({ user_id: userId, ...payload }, { onConflict: 'user_id' })
      if (error) throw error
    }
    clearNutritionGoalsDirty(user)
  }

  const dirtyMealDates = getDirtyNutritionMealDates(user)
  for (const dateKey of dirtyMealDates) {
    const rows = sanitizeMealRows(userId, dateKey, getCachedNutritionMealsByDate(user, dateKey))
    const { error: deleteError } = await supabase
      .from('meal_entries')
      .delete()
      .eq('user_id', userId)
      .eq('entry_date', dateKey)
    if (deleteError) throw deleteError
    if (rows.length) {
      const { error: insertError } = await supabase.from('meal_entries').insert(rows)
      if (insertError) throw insertError
    }
    clearNutritionMealsDirty(user, dateKey)
  }

  const dirtyWaterDates = getDirtyNutritionWaterDates(user)
  for (const dateKey of dirtyWaterDates) {
    const rows = sanitizeWaterRows(userId, dateKey, getCachedNutritionWaterByDate(user, dateKey))
    const { error: deleteError } = await supabase
      .from('water_entries')
      .delete()
      .eq('user_id', userId)
      .eq('entry_date', dateKey)
    if (deleteError) throw deleteError
    if (rows.length) {
      const { error: insertError } = await supabase.from('water_entries').insert(rows)
      if (insertError) throw insertError
    }
    clearNutritionWaterDirty(user, dateKey)
  }
}

export async function syncLocalDataToSupabase(options = {}) {
  const { interactive = false } = options
  if (!supabase) {
    throw new Error('Supabase client not configured.')
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  if (!sessionData.session) {
    return { status: 'no-session' }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('No user found.')

  const planState = readUserJson(STORAGE_KEYS.plan, userId, null)
  const workoutLogs = readUserJson(STORAGE_KEYS.logs, userId, [])
  const restDays = readUserJson(STORAGE_KEYS.rest, userId, [])

  if (planState) {
    await upsertByUser('user_plans', userId, { plan_state: planState })
  }
  await syncWorkoutEntries(userId, workoutLogs)
  await syncRestDays(userId, restDays)
  await syncLocalNutritionDataToSupabase(userId)

  return { status: 'done' }
}

function normalizeStoredWorkout(row) {
  if (row?.entry && typeof row.entry === 'object') {
    return { ...row.entry, id: row.workout_id }
  }
  return {
    id: row.workout_id,
    date: row.date,
    title: row.title || '',
    subtitle: row.subtitle || '',
    duration: row.duration || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    location: row.location || '',
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    prs: row.prs ?? 0,
    status: row.status || 'pending'
  }
}

export async function hydrateLocalDataFromSupabase() {
  if (!supabase) {
    throw new Error('Supabase client not configured.')
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!sessionData.session) return { status: 'no-session' }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('No user found.')

  const [planRes, logsRes, restRes] = await Promise.all([
    supabase.from('user_plans').select('plan_state').eq('user_id', userId).maybeSingle(),
    supabase.from('workout_entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('rest_day_entries').select('rest_date').eq('user_id', userId)
  ])

  if (planRes.error) throw planRes.error
  if (logsRes.error) throw logsRes.error
  if (restRes.error) throw restRes.error

  const planKey = getStorageKeyForId(STORAGE_KEYS.plan, userId)
  const logsKey = getStorageKeyForId(STORAGE_KEYS.logs, userId)
  const restKey = getStorageKeyForId(STORAGE_KEYS.rest, userId)

  if (planRes.data?.plan_state) {
    localStorage.setItem(planKey, JSON.stringify(planRes.data.plan_state))
  } else {
    localStorage.removeItem(planKey)
  }

  const workouts = Array.isArray(logsRes.data)
    ? logsRes.data.map((row) => normalizeStoredWorkout(row))
    : []
  localStorage.setItem(logsKey, JSON.stringify(workouts))

  const restDays = Array.isArray(restRes.data)
    ? restRes.data.map((row) => row.rest_date).filter(Boolean)
    : []
  localStorage.setItem(restKey, JSON.stringify(restDays))

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pf_logs_updated'))
    window.dispatchEvent(new Event('pf_plan_updated'))
    window.dispatchEvent(new Event('pf_rest_updated'))
  }

  return { status: 'done' }
}
