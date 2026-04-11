import { supabase } from './supabaseClient'

const EXPERIENCE_VALUES = new Set(['foundation', 'intermediate', 'advanced'])
const GOAL_VALUES = new Set(['fat-loss', 'muscle-gain', 'performance'])
const FREQUENCY_VALUES = new Set(['2-sessions', '3-4-sessions', '5-plus-sessions'])
const NUTRITION_VALUES = new Set(['calorie-deficit', 'maintenance', 'calorie-surplus'])

function normalizeChoice(value, allowed) {
  const normalized = String(value || '').trim()
  return allowed.has(normalized) ? normalized : ''
}

function normalizeCompletedAt(value) {
  const raw = String(value || '').trim()
  if (!raw) return new Date().toISOString()
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export function normalizeOnboardingAnswers(source = null) {
  if (!source || typeof source !== 'object') return null

  const normalized = {
    experience: normalizeChoice(source.experience, EXPERIENCE_VALUES),
    goal: normalizeChoice(source.goal, GOAL_VALUES),
    frequency: normalizeChoice(source.frequency, FREQUENCY_VALUES),
    nutrition: normalizeChoice(source.nutrition, NUTRITION_VALUES),
    completedAt: normalizeCompletedAt(source.completedAt || source.completed_at)
  }

  if (!normalized.experience || !normalized.goal || !normalized.frequency || !normalized.nutrition) {
    return null
  }

  return normalized
}

function mapOnboardingRow(row) {
  return normalizeOnboardingAnswers({
    experience: row?.experience,
    goal: row?.goal,
    frequency: row?.frequency,
    nutrition: row?.nutrition,
    completed_at: row?.completed_at
  })
}

function buildOnboardingPayload(answers, userId) {
  const normalized = normalizeOnboardingAnswers(answers)
  if (!normalized || !userId) return null

  return {
    user_id: userId,
    experience: normalized.experience,
    goal: normalized.goal,
    frequency: normalized.frequency,
    nutrition: normalized.nutrition,
    completed_at: normalized.completedAt
  }
}

export async function getOnboardingSupabaseUser() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user || null
  } catch {
    return null
  }
}

export async function loadUserOnboardingAnswers() {
  const user = await getOnboardingSupabaseUser()
  if (!user?.id) return null

  const { data, error } = await supabase
    .from('user_onboarding_answers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  return mapOnboardingRow(data)
}

export async function saveUserOnboardingAnswers(answers) {
  const user = await getOnboardingSupabaseUser()
  if (!user?.id) return null

  const payload = buildOnboardingPayload(answers, user.id)
  if (!payload) {
    throw new Error('Onboarding answers are incomplete.')
  }

  const { data, error } = await supabase
    .from('user_onboarding_answers')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error) throw error
  return mapOnboardingRow(data)
}
